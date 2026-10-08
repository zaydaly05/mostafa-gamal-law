-- =====================================================================
--  إعداد قاعدة البيانات لموقع المستشار مصطفى جمال (Supabase)
--  الصق هذا الملف كاملًا في: Supabase → SQL Editor → New query → Run
--  ملاحظة: قاعدة بيانات المشروع الحالي مُطبَّقة بالفعل، هذا الملف للمرجع/إعادة الإنشاء.
-- =====================================================================

-- 1) بريد المديرين: أي حساب يُسجَّل بأحد هذه البريدات يصبح "مدير" تلقائيًا.
--    عدّل القائمة أدناه ببريد المستشار (ويمكنك إضافة أكثر من بريد).
create table if not exists public.admin_emails (email text primary key);
alter table public.admin_emails enable row level security;   -- لا سياسات = لا وصول من المتصفح
insert into public.admin_emails (email) values
  ('zaydaly05@gmail.com')
on conflict do nothing;

-- 2) الجداول
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  phone      text,
  address    text,
  role       text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.cases (
  id          uuid primary key default gen_random_uuid(),
  seq         bigint generated always as identity,
  owner       uuid not null,
  title       text not null check (char_length(title) between 3 and 150),
  type        text not null,
  description text,
  status      text not null default 'new'
              check (status in ('new','review','docs','progress','court','ruling','closed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint cases_owner_fkey foreign key (owner) references public.profiles(id) on delete cascade
);
create index if not exists cases_owner_idx on public.cases(owner);

create table if not exists public.case_updates (
  id         uuid primary key default gen_random_uuid(),
  case_id    uuid not null references public.cases(id) on delete cascade,
  author     uuid references public.profiles(id) on delete set null,
  status     text check (status in ('new','review','docs','progress','court','ruling','closed')),
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists case_updates_case_idx on public.case_updates(case_id);

create table if not exists public.documents (
  id         uuid primary key default gen_random_uuid(),
  case_id    uuid not null references public.cases(id) on delete cascade,
  owner      uuid references public.profiles(id) on delete set null,
  name       text not null,
  path       text not null,
  size       bigint,
  mime       text,
  created_at timestamptz not null default now()
);
create index if not exists documents_case_idx on public.documents(case_id);

-- 3) دالة تحدد إن كان المستخدم الحالي مديرًا
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- 4) إنشاء ملف شخصي تلقائيًا عند التسجيل
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    case when exists (select 1 from public.admin_emails a where lower(a.email) = lower(new.email))
         then 'admin' else 'customer' end
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5) تحديث حالة القضية تلقائيًا عند إضافة تحديث جديد + تحديث وقت التعديل
create or replace function public.apply_case_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.cases
     set status = coalesce(new.status, status), updated_at = now()
   where id = new.case_id;
  return new;
end $$;
drop trigger if exists on_case_update_added on public.case_updates;
create trigger on_case_update_added after insert on public.case_updates
  for each row execute function public.apply_case_update();

-- 6) رسالة استلام تلقائية عند فتح قضية جديدة
create or replace function public.case_created() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.case_updates (case_id, author, status, note)
  values (new.id, null, 'new', 'تم استلام طلبك بنجاح، وسيقوم المستشار بمراجعته قريبًا.');
  return new;
end $$;
drop trigger if exists on_case_created on public.cases;
create trigger on_case_created after insert on public.cases
  for each row execute function public.case_created();

-- 7) الصلاحيات (Row Level Security)
alter table public.profiles     enable row level security;
alter table public.cases        enable row level security;
alter table public.case_updates enable row level security;
alter table public.documents    enable row level security;

-- الملفات الشخصية
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));
drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles for all
  using (public.is_admin()) with check (public.is_admin());

-- القضايا
drop policy if exists cases_select on public.cases;
create policy cases_select on public.cases for select
  using (owner = auth.uid() or public.is_admin());
drop policy if exists cases_insert_own on public.cases;
create policy cases_insert_own on public.cases for insert
  with check (owner = auth.uid() and status = 'new');
drop policy if exists cases_admin_all on public.cases;
create policy cases_admin_all on public.cases for all
  using (public.is_admin()) with check (public.is_admin());

-- تحديثات القضايا (سجل التقدم)
drop policy if exists updates_select on public.case_updates;
create policy updates_select on public.case_updates for select
  using (public.is_admin() or exists (select 1 from public.cases c where c.id = case_id and c.owner = auth.uid()));
drop policy if exists updates_admin_all on public.case_updates;
create policy updates_admin_all on public.case_updates for all
  using (public.is_admin()) with check (public.is_admin());

-- المستندات
drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents for select
  using (public.is_admin() or exists (select 1 from public.cases c where c.id = case_id and c.owner = auth.uid()));
drop policy if exists documents_insert on public.documents;
create policy documents_insert on public.documents for insert
  with check (owner = auth.uid() and (public.is_admin() or exists (select 1 from public.cases c where c.id = case_id and c.owner = auth.uid())));
drop policy if exists documents_delete on public.documents;
create policy documents_delete on public.documents for delete
  using (public.is_admin() or owner = auth.uid());

-- 8) مخزن الملفات (خاص) — حد أقصى ١٠ ميجابايت للملف
insert into storage.buckets (id, name, public, file_size_limit)
values ('case-docs', 'case-docs', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = 10485760;

drop policy if exists case_docs_select on storage.objects;
create policy case_docs_select on storage.objects for select
  using (bucket_id = 'case-docs' and (public.is_admin() or exists (
    select 1 from public.cases c where c.id::text = (storage.foldername(name))[1] and c.owner = auth.uid())));
drop policy if exists case_docs_insert on storage.objects;
create policy case_docs_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'case-docs' and (public.is_admin() or exists (
    select 1 from public.cases c where c.id::text = (storage.foldername(name))[1] and c.owner = auth.uid())));
drop policy if exists case_docs_delete on storage.objects;
create policy case_docs_delete on storage.objects for delete
  using (bucket_id = 'case-docs' and (public.is_admin() or owner = auth.uid()));

-- 8.5) إغلاق دوال مساعدة من واجهة الـ API العامة
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.apply_case_update() from public, anon, authenticated;
revoke execute on function public.case_created() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- 9) إن كان لديك حسابات مسجلة مسبقًا ببريد مدير، فعّلها
update public.profiles set role = 'admin'
 where lower(email) in (select lower(email) from public.admin_emails);
