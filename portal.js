/* بوابة العملاء — واجهة المستخدم */
(function () {
  'use strict';
  var API = window.API, ST = window.APP.STATUSES, TYPES = window.APP.TYPES, arError = window.APP.arError;
  var app = document.getElementById('app'), pnav = document.getElementById('pnav');
  var state = { user: null, profile: null };

  /* ---------- أدوات ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var I18 = window.I18N;
  function num(n) { return I18.num(n); }
  function pctSym() { return I18.lang === 'en' ? '%' : '٪'; }
  function fmtDate(d, time) { try { return new Date(d).toLocaleString(I18.locale(), time ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }); } catch (e) { return ''; } }
  function fmtSize(b) { if (!b && b !== 0) return ''; var en = I18.lang === 'en'; if (b < 1024) return num(b) + (en ? ' B' : ' بايت'); if (b < 1048576) return num(Math.round(b / 1024)) + (en ? ' KB' : ' ك.ب'); return num(Math.round(b / 104857.6) / 10) + (en ? ' MB' : ' م.ب'); }
  function caseNo(c) { return (I18.lang === 'en' ? 'No. ' : 'رقم ') + num(c.seq); }
  function st(key) { return ST.find(function (s) { return s.key === key; }) || ST[0]; }
  function badge(key) { var s = st(key); return '<span class="badge b-' + s.tone + '">' + s.label + '</span>'; }
  function isAdmin() { return state.profile && state.profile.role === 'admin'; }
  function toast(msg, type) {
    var t = document.createElement('div'); t.className = 'toast ' + (type || 'ok'); t.setAttribute('role', type === 'err' ? 'alert' : 'status'); t.innerHTML = '<i>' + (type === 'err' ? '✕' : '✓') + '</i><span></span>'; t.lastChild.textContent = msg; t.onclick = function () { t.remove(); };
    document.getElementById('toasts').appendChild(t); setTimeout(function () { t.classList.add('out'); }, 3600); setTimeout(function () { t.remove(); }, 4100);
  }
  function loading() { app.innerHTML = '<div class="pload"><i></i><span>جارٍ التحميل…</span></div>'; }
  function go(h) { if (location.hash === h) route(); else location.hash = h; }
  function btnBusy(b, on, txt) { if (!b) return; if (on) { b.dataset.t = b.textContent; b.disabled = true; b.textContent = txt || 'جارٍ التنفيذ…'; } else { b.disabled = false; b.textContent = b.dataset.t || b.textContent; } }

  /* ---------- النوافذ المنبثقة ---------- */
  var mstack = [], mseq = 0, lockN = 0;
  function lockScroll(on) { lockN += on ? 1 : -1; document.body.style.overflow = lockN > 0 ? 'hidden' : ''; }
  function openModal(o) {
    var id = ++mseq, el = document.createElement('div'), opener = document.activeElement, res = null, done = false;
    el.className = 'mo';
    el.innerHTML = '<div class="mo-box' + (o.tone ? ' t-' + o.tone : '') + (o.wide ? ' wide' : '') + '" role="dialog" aria-modal="true" aria-labelledby="mo-t' + id + '" tabindex="-1">' +
      '<div class="mo-grab" aria-hidden="true"></div>' +
      '<header class="mo-h">' + (o.icon ? '<span class="mo-ico">' + o.icon + '</span>' : '') + '<div class="mo-tt"><h3 id="mo-t' + id + '">' + o.title + '</h3>' + (o.sub ? '<p>' + o.sub + '</p>' : '') + '</div><button type="button" class="mo-x" data-close aria-label="إغلاق">×</button></header>' +
      '<div class="mo-b">' + (o.body || '') + '</div>' + (o.foot ? '<footer class="mo-f">' + o.foot + '</footer>' : '') + '</div>';
    document.body.appendChild(el); lockScroll(true);
    var box = el.firstElementChild;
    requestAnimationFrame(function () { el.classList.add('in'); });
    function focusables() { return Array.from(box.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])')).filter(function (x) { return x.offsetParent !== null; }); }
    var api = {
      el: el, box: box, body: box.querySelector('.mo-b'), foot: box.querySelector('.mo-f'),
      $: function (s) { return box.querySelector(s); },
      close: function (v) {
        if (done) return; done = true; mstack.splice(mstack.indexOf(api), 1); el.classList.remove('in'); el.classList.add('out');
        setTimeout(function () { el.remove(); lockScroll(false); if (opener && opener.focus && document.contains(opener)) try { opener.focus({ preventScroll: true }); } catch (e) {} }, 190);
        if (res) res(v === undefined ? null : v);
      },
      wait: function () { return new Promise(function (r) { res = r; if (done) r(null); }); }
    };
    api.onKey = function (e) {
      if (e.key === 'Escape') { if (o.dismissible !== false) { e.preventDefault(); api.close(null); } }
      else if (e.key === 'Tab') { var f = focusables(); if (!f.length) return; var first = f[0], last = f[f.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
    };
    box.addEventListener('click', function (e) { var c = e.target.closest('[data-close]'); if (c) { api.close(c.dataset.close === 'ok' ? true : null); } });
    el.addEventListener('mousedown', function (e) { if (e.target === el && o.dismissible !== false) api.close(null); });
    mstack.push(api);
    if (o.onMount) o.onMount(api);
    setTimeout(function () { var f = o.focus ? box.querySelector(o.focus) : (box.querySelector('input:not([type=hidden]),select,textarea') || box.querySelector('.mo-f .btn:last-child') || box); if (f) f.focus({ preventScroll: true }); }, 60);
    return api;
  }
  document.addEventListener('keydown', function (e) { var t = mstack[mstack.length - 1]; if (t) t.onKey(e); });
  var ICONS = { danger: '⚠️', warn: '❓', info: 'ℹ️', ok: '✅', user: '👤', plus: '➕', key: '🔑' };
  function confirmBox(o, okText) {
    if (typeof o === 'string') o = { msg: o, okText: okText };
    var tone = o.tone || 'danger';
    var m = openModal({ title: esc(o.title || 'تأكيد الإجراء'), icon: o.icon || ICONS[tone], tone: tone, body: '<p class="mo-msg">' + (o.html || esc(o.msg || '')) + '</p>',
      foot: '<button type="button" class="btn btn-ghost-d" data-close="no">' + esc(o.cancelText || 'إلغاء') + '</button><button type="button" class="btn ' + (tone === 'danger' ? 'btn-danger' : 'btn-gold') + '" data-close="ok">' + esc(o.okText || 'تأكيد') + '</button>', focus: '.mo-f .btn-ghost-d' });
    return m.wait().then(function (v) { return !!v; });
  }
  function copyText(t) { try { return navigator.clipboard.writeText(t).then(function () { toast('تم النسخ'); }, function () { toast('انسخها يدويًا', 'err'); }); } catch (e) { toast('انسخها يدويًا', 'err'); } }
  function waLink(phone, msg) { var ph = String(phone || '').replace(/[^0-9]/g, ''); if (!ph) return ''; if (ph.charAt(0) === '0') ph = '20' + ph.slice(1); return 'https://wa.me/' + ph + '?text=' + encodeURIComponent(msg); }

  /* ---------- الشريط العلوي ---------- */
  function renderNav() {
    var h = location.hash || '';
    var link = function (href, label) { return '<a href="' + href + '" class="' + (h.indexOf(href) === 0 && (href !== '#/admin' || h === '#/admin' || /^#\/admin\?/.test(h)) ? 'act' : '') + '">' + label + '</a>'; };
    if (!state.user) {
      pnav.innerHTML = '<a href="index.html">الرئيسية</a><a href="#/login" class="' + (h.indexOf('#/login') === 0 ? 'act' : '') + '">تسجيل الدخول</a><a href="#/signup" class="btn btn-gold sm">إنشاء حساب</a>';
    } else if (isAdmin()) {
      pnav.innerHTML = '<a href="index.html">الموقع الرئيسي</a>' + link('#/admin', 'لوحة الإدارة') + link('#/admin/users', 'العملاء') + link('#/new', 'فتح قضية') + link('#/profile', 'ملفي') +
        '<button class="btn btn-ghost-d sm" id="logout" type="button">خروج</button>';
    } else {
      pnav.innerHTML = '<a href="index.html">الموقع الرئيسي</a>' + link('#/dashboard', 'قضاياي') + link('#/new', 'فتح قضية') + link('#/profile', 'ملفي الشخصي') +
        '<button class="btn btn-ghost-d sm" id="logout" type="button">خروج</button>';
    }
    var lo = document.getElementById('logout'); if (lo) lo.onclick = async function () { await API.signOut(); toast('تم تسجيل الخروج'); go('#/login'); };
    var who = state.profile && document.querySelector('.pnav .who'); void who;
  }
  document.getElementById('pburger').addEventListener('click', function () {
    var o = pnav.classList.toggle('open'); this.setAttribute('aria-expanded', o);
  });
  pnav.addEventListener('click', function (e) { if (e.target.closest('a,button')) { pnav.classList.remove('open'); document.getElementById('pburger').setAttribute('aria-expanded', 'false'); } });

  /* ---------- الدخول والتسجيل ---------- */
  function authShell(title, sub, body) {
    return '<section class="auth"><div class="auth-card reveal-in"><img class="auth-logo" src="img/logo.webp" width="96" height="96" alt="" ><h1>' + title + '</h1><p class="sub">' + sub + '</p>' + body + '</div></section>';
  }
  function field(id, label, attrs, extra) { return '<label class="f" for="' + id + '"><span>' + label + '</span><input id="' + id + '" name="' + id + '" ' + (attrs || '') + '></label>' + (extra || ''); }

  function viewLogin() {
    app.innerHTML = authShell('تسجيل الدخول', 'مرحبًا بك في بوابة العملاء', '<form id="f" class="form-p" novalidate>' +
      field('email', 'البريد الإلكتروني', 'type="email" autocomplete="email" inputmode="email" dir="ltr" required placeholder="اكتب بريدك الإلكتروني"') +
      field('password', 'كلمة المرور', 'type="password" autocomplete="current-password" required placeholder="••••••••"') +
      '<button class="btn btn-gold block" type="submit">دخول</button>' +
      '<div class="links"><a href="#/forgot">نسيت كلمة المرور؟</a><a href="#/signup">ليس لديك حساب؟ <b>أنشئ حسابًا</b></a></div></form>');
    document.getElementById('f').onsubmit = async function (e) {
      e.preventDefault(); var b = e.target.querySelector('button'), f = e.target;
      if (!f.email.value || !f.password.value) return toast('يرجى إدخال البريد وكلمة المرور', 'err');
      btnBusy(b, true, 'جارٍ الدخول…');
      try { await API.signIn(f.email.value, f.password.value); await boot(); toast('أهلاً بعودتك'); go(isAdmin() ? '#/admin' : '#/dashboard'); }
      catch (er) { toast(er.message, 'err'); btnBusy(b, false); }
    };
  }
  function viewSignup() {
    app.innerHTML = authShell('إنشاء حساب جديد', 'سجّل لفتح قضاياك ومتابعتها ورفع مستنداتك', '<form id="f" class="form-p" novalidate>' +
      field('full_name', 'الاسم الكامل', 'autocomplete="name" required placeholder="الاسم الثلاثي"') +
      field('phone', 'رقم الهاتف', 'type="tel" autocomplete="tel" inputmode="tel" dir="ltr" required placeholder="رقم هاتفك للتواصل"') +
      field('email', 'البريد الإلكتروني', 'type="email" autocomplete="email" inputmode="email" dir="ltr" required placeholder="اكتب بريدك الإلكتروني"') +
      field('password', 'كلمة المرور (٦ أحرف على الأقل)', 'type="password" autocomplete="new-password" minlength="6" required placeholder="••••••••"') +
      field('password2', 'تأكيد كلمة المرور', 'type="password" autocomplete="new-password" required placeholder="••••••••"') +
      '<button class="btn btn-gold block" type="submit">إنشاء الحساب</button>' +
      '<div class="links"><a href="#/login">لديك حساب بالفعل؟ <b>سجّل الدخول</b></a></div></form>');
    document.getElementById('f').onsubmit = async function (e) {
      e.preventDefault(); var f = e.target, b = f.querySelector('button');
      if (f.full_name.value.trim().length < 3) return toast('يرجى كتابة الاسم الكامل', 'err');
      if (!/^[0-9+\s-]{8,16}$/.test(f.phone.value.trim())) return toast('رقم الهاتف غير صحيح', 'err');
      if (f.password.value.length < 6) return toast('كلمة المرور يجب ألا تقل عن ٦ أحرف', 'err');
      if (f.password.value !== f.password2.value) return toast('كلمتا المرور غير متطابقتين', 'err');
      btnBusy(b, true, 'جارٍ إنشاء الحساب…');
      try {
        var r = await API.signUp({ email: f.email.value.trim(), password: f.password.value, full_name: f.full_name.value.trim(), phone: f.phone.value.trim() });
        if (r.needsConfirm) { app.innerHTML = authShell('تحقق من بريدك', 'تم إنشاء حسابك', '<p class="note">أرسلنا رسالة تأكيد إلى <b dir="ltr">' + esc(f.email.value) + '</b>. اضغط على الرابط داخلها ثم سجّل الدخول.</p><a class="btn btn-gold block" href="#/login">الذهاب لتسجيل الدخول</a>'); return; }
        await boot(); toast('تم إنشاء حسابك بنجاح'); go(isAdmin() ? '#/admin' : '#/dashboard');
      } catch (er) { toast(er.message, 'err'); btnBusy(b, false); }
    };
  }
  function viewForgot() {
    app.innerHTML = authShell('استعادة كلمة المرور', 'اكتب بريدك وسنرسل لك رابط إعادة التعيين', '<form id="f" class="form-p" novalidate>' +
      field('email', 'البريد الإلكتروني', 'type="email" dir="ltr" inputmode="email" required placeholder="اكتب بريدك الإلكتروني"') +
      '<button class="btn btn-gold block" type="submit">إرسال الرابط</button><div id="fmsg"></div>' +
      '<div class="note small">إن لم تصلك الرسالة خلال دقائق (راجع البريد المزعج أيضًا)، أو لم تكن مسجّلًا بهذا البريد، تواصل مع المكتب وسيعيدون تعيين كلمة مرورك فورًا:<br><a class="wa-link" href="https://wa.me/201229403351" target="_blank" rel="noopener">راسلنا على واتساب</a> &nbsp;·&nbsp; <a dir="ltr" href="tel:+201229403351">01229403351</a></div>' +
      '<div class="links"><a href="#/login">العودة لتسجيل الدخول</a></div></form>');
    document.getElementById('f').onsubmit = async function (e) {
      e.preventDefault(); var f = e.target, b = f.querySelector('button'), em = f.email.value.trim();
      if (!/^\S+@\S+\.\S{2,}$/.test(em)) return toast('اكتب بريدًا إلكترونيًا صحيحًا', 'err');
      btnBusy(b, true, 'جارٍ الإرسال…');
      try { await API.resetPassword(em); document.getElementById('fmsg').innerHTML = '<div class="note ok">إن كان هذا البريد مسجّلًا لدينا فسيصلك رابط إعادة التعيين خلال دقائق.</div>'; toast('تم الطلب'); } catch (er) { toast(er.message, 'err'); }
      btnBusy(b, false);
    };
  }
  function viewReset() {
    app.innerHTML = authShell('كلمة مرور جديدة', 'اختر كلمة مرور جديدة لحسابك', '<form id="f" class="form-p" novalidate>' +
      field('password', 'كلمة المرور الجديدة', 'type="password" minlength="6" autocomplete="new-password" required') +
      field('password2', 'تأكيد كلمة المرور', 'type="password" autocomplete="new-password" required') +
      '<button class="btn btn-gold block" type="submit">حفظ</button></form>');
    document.getElementById('f').onsubmit = async function (e) {
      e.preventDefault(); var f = e.target, b = f.querySelector('button');
      if (f.password.value.length < 6) return toast('كلمة المرور يجب ألا تقل عن ٦ أحرف', 'err');
      if (f.password.value !== f.password2.value) return toast('كلمتا المرور غير متطابقتين', 'err');
      btnBusy(b, true);
      try { await API.updatePassword(f.password.value); toast('تم تغيير كلمة المرور'); await boot(); go(isAdmin() ? '#/admin' : '#/dashboard'); } catch (er) { toast(er.message, 'err'); btnBusy(b, false); }
    };
  }

  /* ---------- مكونات مشتركة ---------- */
  function progressBar(key) { var s = st(key); return '<div class="prog" role="progressbar" aria-valuenow="' + s.pct + '" aria-valuemin="0" aria-valuemax="100" aria-label="نسبة التقدم"><i style="width:' + s.pct + '%"></i></div><small class="pct">' + num(s.pct) + pctSym() + '</small>'; }
  function caseCard(c, adminView) {
    var who = adminView && c.profiles ? '<span class="who">👤 ' + esc(c.profiles.full_name || c.profiles.email || '—') + '</span>' : '';
    return '<a class="ccard" href="#/case/' + c.id + '"><div class="ctop"><span class="cno">' + caseNo(c) + '</span>' + badge(c.status) + '</div>' +
      '<h3>' + esc(c.title) + '</h3><div class="cmeta"><span>' + esc(c.type) + '</span>' + who + '</div>' + progressBar(c.status) +
      '<div class="cfoot">آخر تحديث: ' + fmtDate(c.updated_at || c.created_at) + '</div></a>';
  }

  /* ---------- لوحة العميل ---------- */
  async function viewDashboard() {
    loading();
    var cases = await API.listCases();
    var open = cases.filter(function (c) { return c.status !== 'closed'; }).length;
    app.innerHTML = '<div class="phead"><div><h1>مرحبًا، ' + esc((state.profile.full_name || '').split(' ')[0] || 'بك') + ' 👋</h1><p class="sub">تابع قضاياك وارفع مستنداتك من مكان واحد.</p></div><a class="btn btn-gold" href="#/new">＋ فتح قضية جديدة</a></div>' +
      '<div class="stats"><div class="stat"><b>' + num(cases.length) + '</b><span>إجمالي القضايا</span></div><div class="stat"><b>' + num(open) + '</b><span>قضايا جارية</span></div><div class="stat"><b>' + num(cases.length - open) + '</b><span>قضايا مغلقة</span></div></div>' +
      (cases.length ? '<div class="cgrid">' + cases.map(function (c) { return caseCard(c); }).join('') + '</div>' :
        '<div class="empty"><div class="eico">📂</div><h3>لا توجد قضايا بعد</h3><p>ابدأ بفتح أول قضية، وسيتواصل معك المستشار بعد مراجعتها.</p><a class="btn btn-gold" href="#/new">فتح قضية جديدة</a></div>');
  }

  /* ---------- فتح قضية ---------- */
  async function viewNew() {
    var owners = null, admin = isAdmin();
    if (admin) owners = await API.listProfiles();
    app.innerHTML = '<div class="phead"><div><h1>فتح قضية جديدة</h1><p class="sub">اكتب تفاصيل قضيتك، ويمكنك إرفاق المستندات الآن أو لاحقًا.</p></div></div>' +
      '<form id="f" class="card-p form-p wide" novalidate>' +
      (admin ? '<label class="f"><span>العميل</span><select name="owner" required>' + owners.map(function (p) { return '<option value="' + p.id + '"' + (p.id === state.user.id ? ' selected' : '') + '>' + esc(p.full_name || p.email) + ' — ' + esc(p.email || '') + '</option>'; }).join('') + '</select></label>' : '') +
      field('title', 'عنوان القضية', 'required minlength="3" maxlength="150" placeholder="مثال: قضية تهرب ضريبي لشركة ..."') +
      '<label class="f"><span>نوع القضية</span><select name="type" id="type">' + TYPES.map(function (t) { return '<option value="' + t + '">' + t + '</option>'; }).join('') + '</select></label>' +
      '<label class="f"><span>شرح مختصر للموقف</span><textarea name="description" rows="6" maxlength="4000" placeholder="اكتب ما حدث وأي معلومات تراها مهمة…"></textarea></label>' +
      '<div class="f"><span>المستندات (اختياري)</span>' + dropzone('files') + '<ul class="flist" id="fl"></ul></div>' +
      '<div class="row end"><a class="btn btn-ghost-d" href="#/dashboard">إلغاء</a><button class="btn btn-gold" type="submit">إرسال الطلب</button></div></form>';
    var files = [];
    bindDropzone('files', function (fs) { fs.forEach(function (f) { if (f.size > window.APP.MAX_FILE) toast('«' + f.name + '» أكبر من ١٠ ميجابايت', 'err'); else files.push(f); }); draw(); });
    function draw() { document.getElementById('fl').innerHTML = files.map(function (f, i) { return '<li><span>📄 ' + esc(f.name) + ' <small>' + fmtSize(f.size) + '</small></span><button type="button" class="x" data-i="' + i + '" aria-label="حذف">×</button></li>'; }).join(''); }
    document.getElementById('fl').onclick = function (e) { var b = e.target.closest('.x'); if (b) { files.splice(+b.dataset.i, 1); draw(); } };
    document.getElementById('f').onsubmit = async function (e) {
      e.preventDefault(); var f = e.target, b = f.querySelector('button[type=submit]');
      if (f.title.value.trim().length < 3) return toast('يرجى كتابة عنوان واضح للقضية', 'err');
      btnBusy(b, true, 'جارٍ الإرسال…');
      try {
        var owner = admin ? f.owner.value : state.user.id;
        var c = await API.createCase({ owner: owner, title: f.title.value.trim(), type: f.type.value, description: f.description.value.trim() });
        var fail = 0; for (var i = 0; i < files.length; i++) { try { await API.uploadDoc(c.id, state.user.id, files[i]); } catch (er) { fail++; } }
        toast(fail ? 'تم فتح القضية، لكن تعذّر رفع ' + num(fail) + ' ملف' : 'تم فتح القضية بنجاح', fail ? 'err' : 'ok'); go('#/case/' + c.id);
      } catch (er) { toast(er.message, 'err'); btnBusy(b, false); }
    };
  }
  function dropzone(id) { return '<label class="drop" id="dz-' + id + '"><input type="file" id="' + id + '" multiple hidden accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.txt,.zip"><span class="dico">⬆️</span><b>اسحب الملفات هنا أو اضغط للاختيار</b><small>PDF، صور، Word، Excel — حتى ١٠ ميجابايت للملف</small></label>'; }
  function bindDropzone(id, cb) {
    var dz = document.getElementById('dz-' + id), inp = document.getElementById(id);
    inp.addEventListener('change', function () { cb(Array.from(inp.files)); inp.value = ''; });
    ['dragenter', 'dragover'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('over'); }); });
    dz.addEventListener('drop', function (e) { cb(Array.from(e.dataTransfer.files)); });
  }

  /* ---------- صفحة القضية ---------- */
  async function viewCase(id) {
    loading();
    var c, ups, docs;
    try { c = await API.getCase(id); ups = await API.listUpdates(id); docs = await API.listDocs(id); }
    catch (er) { app.innerHTML = '<div class="empty"><div class="eico">🔒</div><h3>تعذّر عرض القضية</h3><p>' + esc(er.message) + '</p><a class="btn btn-gold" href="#/dashboard">العودة</a></div>'; return; }
    var admin = isAdmin(), idx = ST.findIndex(function (s) { return s.key === c.status; });
    var steps = '<ol class="steps">' + ST.map(function (s, i) { return '<li class="' + (i < idx ? 'done' : i === idx ? 'cur' : '') + '"><i>' + (i < idx ? '✓' : num(i + 1)) + '</i><span>' + s.label + '</span></li>'; }).join('') + '</ol>';
    var tl = ups.length ? ups.map(function (u) {
      return '<li><i class="dot"></i><div class="tl-b"><div class="tl-h">' + (u.status ? badge(u.status) : '<span class="badge b-info">ملاحظة</span>') + '<time>' + fmtDate(u.created_at, true) + '</time></div>' + (u.note ? '<p>' + esc(u.note).replace(/\n/g, '<br>') + '</p>' : '') + '</div></li>';
    }).reverse().join('') : '<li class="muted">لا توجد تحديثات بعد.</li>';
    var cl = c.profiles || {};
    app.innerHTML = '<a class="back" href="' + (admin ? '#/admin' : '#/dashboard') + '">‹ العودة إلى ' + (admin ? 'لوحة الإدارة' : 'قضاياي') + '</a>' +
      '<div class="chead card-p"><div class="chead-top"><div><span class="cno">' + caseNo(c) + '</span><h1>' + esc(c.title) + '</h1><div class="cmeta"><span>' + esc(c.type) + '</span><span>فُتحت: ' + fmtDate(c.created_at) + '</span></div></div>' + badge(c.status) + '</div>' + steps + '<div class="pbox">' + progressBar(c.status) + '</div>' +
      (c.description ? '<div class="desc"><h4>تفاصيل القضية</h4><p>' + esc(c.description).replace(/\n/g, '<br>') + '</p></div>' : '') +
      (admin ? '<div class="client"><h4>بيانات العميل</h4><p>👤 ' + esc(cl.full_name || '—') + ' &nbsp;·&nbsp; 📞 <a dir="ltr" href="tel:' + esc(cl.phone || '') + '">' + esc(cl.phone || '—') + '</a> &nbsp;·&nbsp; ✉️ <span dir="ltr">' + esc(cl.email || '—') + '</span></p></div>' : '') + '</div>' +
      '<div class="cols"><section class="card-p"><h3>سجل التقدم</h3>' +
      (admin ? '<form id="uf" class="uform"><select name="status"><option value="">بدون تغيير الحالة</option>' + ST.map(function (s) { return '<option value="' + s.key + '"' + (s.key === c.status ? '' : '') + '>' + s.label + '</option>'; }).join('') + '</select><textarea name="note" rows="2" placeholder="اكتب تحديثًا أو ملاحظة للعميل…"></textarea><button class="btn btn-gold sm" type="submit">إضافة تحديث</button></form>' : '') +
      '<ul class="tl" id="tl">' + tl + '</ul></section>' +
      '<section class="card-p"><h3>المستندات <small>(' + num(docs.length) + ')</small></h3>' + dropzone('upl') + '<div class="upbar" id="upbar" hidden><i></i></div><ul class="dlist" id="dl"></ul></section></div>' +
      (admin ? '<div class="danger-z"><button class="btn btn-danger sm" id="delcase" type="button">حذف القضية نهائيًا</button></div>' : '');

    function drawDocs() {
      document.getElementById('dl').innerHTML = docs.length ? docs.map(function (d) {
        var canDel = admin || d.owner === state.user.id;
        return '<li><div class="dinfo"><span class="dname">📄 ' + esc(d.name) + '</span><small>' + fmtSize(d.size) + ' · ' + fmtDate(d.created_at) + '</small></div><div class="dact"><button class="btn btn-ghost-d sm" data-dl="' + d.id + '" type="button">تحميل</button>' + (canDel ? '<button class="btn btn-danger sm" data-rm="' + d.id + '" type="button">حذف</button>' : '') + '</div></li>';
      }).join('') : '<li class="muted">لم يتم رفع أي مستند بعد.</li>';
    }
    drawDocs();
    document.getElementById('dl').onclick = async function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.dl) {
        var d = docs.find(function (x) { return x.id === b.dataset.dl; });
        try { var url = await API.docUrl(d); var a = document.createElement('a'); a.href = url; a.download = d.name; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); } catch (er) { toast(er.message, 'err'); }
      } else if (b.dataset.rm) {
        var dd = docs.find(function (x) { return x.id === b.dataset.rm; });
        if (!(await confirmBox('هل تريد حذف الملف «' + dd.name + '»؟', 'حذف'))) return;
        try { await API.deleteDoc(dd); docs = docs.filter(function (x) { return x.id !== dd.id; }); drawDocs(); toast('تم حذف الملف'); } catch (er) { toast(er.message, 'err'); }
      }
    };
    bindDropzone('upl', async function (fs) {
      var bar = document.getElementById('upbar'); bar.hidden = false;
      for (var i = 0; i < fs.length; i++) {
        bar.firstElementChild.style.width = Math.round((i / fs.length) * 100) + '%';
        if (fs[i].size > window.APP.MAX_FILE) { toast('«' + fs[i].name + '» أكبر من ١٠ ميجابايت', 'err'); continue; }
        try { docs.unshift(await API.uploadDoc(id, state.user.id, fs[i])); toast('تم رفع «' + fs[i].name + '»'); } catch (er) { toast('تعذّر رفع «' + fs[i].name + '»: ' + er.message, 'err'); }
      }
      bar.firstElementChild.style.width = '100%'; setTimeout(function () { bar.hidden = true; bar.firstElementChild.style.width = '0'; }, 600); drawDocs();
    });
    if (admin) {
      document.getElementById('uf').onsubmit = async function (e) {
        e.preventDefault(); var f = e.target, b = f.querySelector('button');
        if (!f.status.value && !f.note.value.trim()) return toast('اختر حالة جديدة أو اكتب ملاحظة', 'err');
        btnBusy(b, true);
        try { await API.addUpdate(id, state.user.id, f.status.value, f.note.value.trim()); toast('تمت إضافة التحديث'); viewCase(id); } catch (er) { toast(er.message, 'err'); btnBusy(b, false); }
      };
      document.getElementById('delcase').onclick = async function () {
        if (!(await confirmBox('سيتم حذف القضية وكل مستنداتها وتحديثاتها نهائيًا. هل أنت متأكد؟', 'حذف نهائي'))) return;
        try { await API.deleteCase(id); toast('تم حذف القضية'); go('#/admin'); } catch (er) { toast(er.message, 'err'); }
      };
    }
  }

  /* ---------- الملف الشخصي ---------- */
  async function viewProfile() {
    var p = state.profile;
    app.innerHTML = '<div class="phead"><div><h1>ملفي الشخصي</h1><p class="sub">حدّث بياناتك لنتمكن من التواصل معك.</p></div>' + (isAdmin() ? '<span class="badge b-done">مدير</span>' : '') + '</div>' +
      '<div class="cols"><form id="pf" class="card-p form-p" novalidate><h3>البيانات الأساسية</h3>' +
      field('full_name', 'الاسم الكامل', 'value="' + esc(p.full_name) + '" required autocomplete="name"') +
      field('phone', 'رقم الهاتف', 'type="tel" dir="ltr" inputmode="tel" value="' + esc(p.phone) + '" autocomplete="tel"') +
      field('address', 'العنوان', 'value="' + esc(p.address) + '" autocomplete="street-address" placeholder="المحافظة، المدينة، الشارع"') +
      '<label class="f"><span>البريد الإلكتروني</span><input dir="ltr" value="' + esc(p.email || state.user.email) + '" disabled></label>' +
      '<button class="btn btn-gold" type="submit">حفظ التعديلات</button></form>' +
      '<form id="pw" class="card-p form-p" novalidate><h3>تغيير كلمة المرور</h3>' +
      field('password', 'كلمة المرور الجديدة', 'type="password" minlength="6" autocomplete="new-password"') +
      field('password2', 'تأكيد كلمة المرور', 'type="password" autocomplete="new-password"') +
      '<button class="btn btn-ghost-d" type="submit">تغيير كلمة المرور</button></form></div>';
    document.getElementById('pf').onsubmit = async function (e) {
      e.preventDefault(); var f = e.target, b = f.querySelector('button');
      if (f.full_name.value.trim().length < 3) return toast('يرجى كتابة الاسم الكامل', 'err');
      btnBusy(b, true);
      try { state.profile = await API.updateProfile(state.user.id, { full_name: f.full_name.value.trim(), phone: f.phone.value.trim(), address: f.address.value.trim() }); toast('تم حفظ التعديلات'); } catch (er) { toast(er.message, 'err'); }
      btnBusy(b, false);
    };
    document.getElementById('pw').onsubmit = async function (e) {
      e.preventDefault(); var f = e.target, b = f.querySelector('button');
      if (f.password.value.length < 6) return toast('كلمة المرور يجب ألا تقل عن ٦ أحرف', 'err');
      if (f.password.value !== f.password2.value) return toast('كلمتا المرور غير متطابقتين', 'err');
      btnBusy(b, true);
      try { await API.updatePassword(f.password.value); toast('تم تغيير كلمة المرور'); f.reset(); } catch (er) { toast(er.message, 'err'); }
      btnBusy(b, false);
    };
  }

  /* ---------- لوحة المدير ---------- */
  async function viewAdmin() {
    loading();
    var cases = await API.listCases(), q = '', fs = '', ft = '';
    var counts = ST.map(function (s) { return { s: s, n: cases.filter(function (c) { return c.status === s.key; }).length }; });
    app.innerHTML = '<div class="phead"><div><h1>لوحة الإدارة</h1><p class="sub">كل القضايا والعملاء في مكان واحد.</p></div><div class="row"><a class="btn btn-ghost-d" href="#/admin/users">إدارة العملاء</a><a class="btn btn-gold" href="#/new">＋ فتح قضية لعميل</a></div></div>' +
      '<div class="stats s6"><div class="stat"><b>' + num(cases.length) + '</b><span>إجمالي القضايا</span></div>' + counts.filter(function (x) { return x.n || ['new', 'progress', 'closed'].indexOf(x.s.key) > -1; }).slice(0, 5).map(function (x) { return '<div class="stat"><b>' + num(x.n) + '</b><span>' + x.s.label + '</span></div>'; }).join('') + '</div>' +
      '<div class="filters"><input id="q" type="search" placeholder="بحث بعنوان القضية أو اسم العميل…" aria-label="بحث"><select id="fs"><option value="">كل الحالات</option>' + ST.map(function (s) { return '<option value="' + s.key + '">' + s.label + '</option>'; }).join('') + '</select><select id="ft"><option value="">كل الأنواع</option>' + TYPES.map(function (t) { return '<option value="' + t + '">' + t + '</option>'; }).join('') + '</select></div><div id="list"></div>';
    function draw() {
      var rows = cases.filter(function (c) {
        var hay = (c.title + ' ' + ((c.profiles || {}).full_name || '') + ' ' + ((c.profiles || {}).email || '')).toLowerCase();
        return (!q || hay.indexOf(q) > -1) && (!fs || c.status === fs) && (!ft || c.type === ft);
      });
      document.getElementById('list').innerHTML = rows.length ? '<div class="cgrid">' + rows.map(function (c) { return caseCard(c, true); }).join('') + '</div>' : '<div class="empty"><div class="eico">🔎</div><h3>لا توجد نتائج</h3><p>جرّب تغيير البحث أو الفلاتر.</p></div>';
    }
    draw();
    document.getElementById('q').oninput = function (e) { q = e.target.value.trim().toLowerCase(); draw(); };
    document.getElementById('fs').onchange = function (e) { fs = e.target.value; draw(); };
    document.getElementById('ft').onchange = function (e) { ft = e.target.value; draw(); };
  }

  async function viewUsers() {
    loading();
    var users = await API.listProfiles(), cases = await API.listCases(), q = '';
    app.innerHTML = '<div class="phead"><div><h1>إدارة العملاء</h1><p class="sub" id="ucount"></p></div><button class="btn btn-gold" id="addu" type="button">＋ إضافة مستخدم</button></div><div class="filters one"><input id="q" type="search" placeholder="بحث بالاسم أو البريد أو الهاتف…" aria-label="بحث"></div><div id="ul" class="ulist"></div>';
    function nCases(u) { return cases.filter(function (c) { return c.owner === u.id; }).length; }
    function draw() {
      document.getElementById('ucount').textContent = num(users.length) + ' حساب مسجّل';
      var rows = users.filter(function (u) { return !q || ((u.full_name || '') + ' ' + (u.email || '') + ' ' + (u.phone || '')).toLowerCase().indexOf(q) > -1; });
      document.getElementById('ul').innerHTML = rows.length ? rows.map(function (u) {
        var self = u.id === state.user.id;
        return '<div class="urow"><div class="uav">' + esc((u.full_name || u.email || '?').trim().charAt(0)) + '</div><div class="uinfo"><b>' + esc(u.full_name || 'بدون اسم') + (self ? ' <small class="you">(أنت)</small>' : '') + ' ' + (u.role === 'admin' ? '<span class="badge b-done">مدير</span>' : '') + '</b>' +
          '<small dir="ltr">' + esc(u.email || '') + '</small><small dir="ltr">' + esc(u.phone || '') + '</small></div><div class="ucnt"><b>' + num(nCases(u)) + '</b><span>قضية</span></div>' +
          '<div class="uact"><button class="btn btn-ghost-d sm" data-e="' + u.id + '" type="button">تعديل</button>' + (self ? '' : '<button class="btn btn-danger-o sm" data-d="' + u.id + '" type="button" aria-label="حذف ' + esc(u.full_name || u.email) + '">حذف</button>') + '</div></div>';
      }).join('') : '<div class="empty"><h3>لا توجد نتائج</h3></div>';
    }
    draw();
    document.getElementById('q').oninput = function (e) { q = e.target.value.trim().toLowerCase(); draw(); };

    async function deleteUser(u, parent) {
      var n = nCases(u);
      var ok = await confirmBox({ tone: 'danger', icon: '🗑️', title: 'حذف المستخدم نهائيًا', okText: 'نعم، احذف نهائيًا',
        html: n ? I18.t('سيتم حذف حساب {0} و{1} قضية ومستنداتها وتحديثاتها بشكل نهائي ولا يمكن التراجع عن ذلك.', ['<b>' + esc(u.full_name || u.email) + '</b>', '<b>' + num(n) + '</b>']) : I18.t('سيتم حذف حساب {0} بشكل نهائي ولا يمكن التراجع عن ذلك.', ['<b>' + esc(u.full_name || u.email) + '</b>'])  });
      if (!ok) return;
      try { await API.adminDeleteUser(u.id); users = users.filter(function (x) { return x.id !== u.id; }); cases = cases.filter(function (c) { return c.owner !== u.id; }); draw(); if (parent) parent.close(true); toast('تم حذف المستخدم'); }
      catch (er) { toast(er.message, 'err'); }
    }

    function credsCard(email, pw, phone, name) {
      var msg = 'السلام عليكم ' + (name || '') + '، تم إنشاء حسابك في بوابة العملاء.\nالبريد الإلكتروني: ' + email + '\nكلمة المرور: ' + pw + '\nرابط الدخول: ' + location.origin + location.pathname.replace(/[^/]*$/, '') + 'portal.html\nيرجى تغيير كلمة المرور من «ملفي الشخصي» بعد الدخول.';
      var wa = waLink(phone, msg);
      return '<div class="pwshow"><span>البريد الإلكتروني</span><b dir="ltr" class="sm">' + esc(email) + '</b><span>كلمة المرور</span><b dir="ltr" id="pwv">' + esc(pw) + '</b><div class="row wrap"><button type="button" class="btn btn-ghost-d sm" id="pwc">نسخ كلمة المرور</button>' + (wa ? '<a class="btn btn-gold sm" target="_blank" rel="noopener" href="' + wa + '">إرسال عبر واتساب</a>' : '') + '</div></div>';
    }

    function addUser() {
      var m = openModal({ title: 'إضافة مستخدم جديد', icon: ICONS.plus, sub: 'يُنشأ الحساب مفعّلًا ويمكنه الدخول فورًا.',
        body: '<form id="cf" class="form-p" novalidate>' + field('full_name', 'الاسم الكامل', 'required autocomplete="off" placeholder="الاسم الثلاثي"') + field('phone', 'رقم الهاتف', 'type="tel" dir="ltr" inputmode="tel" autocomplete="off" placeholder="رقم الهاتف (اختياري)"') +
          field('email', 'البريد الإلكتروني', 'type="email" dir="ltr" inputmode="email" required autocomplete="off" placeholder="اكتب البريد الإلكتروني"') +
          '<label class="f"><span>نوع الحساب</span><select name="role"><option value="customer">عميل</option><option value="admin">مدير (كل الصلاحيات)</option></select></label>' +
          field('password', 'كلمة المرور', 'autocomplete="new-password" minlength="6" placeholder="اتركها فارغة لتوليد كلمة مرور تلقائيًا"') + '</form>',
        foot: '<button type="button" class="btn btn-ghost-d" data-close="no">إلغاء</button><button type="submit" form="cf" class="btn btn-gold" id="csave">إنشاء الحساب</button>' });
      m.$('#cf').onsubmit = async function (e) {
        e.preventDefault(); var f = e.target, b = m.$('#csave');
        if (f.full_name.value.trim().length < 3) return toast('يرجى كتابة الاسم الكامل', 'err');
        if (!/^\S+@\S+\.\S{2,}$/.test(f.email.value.trim())) return toast('صيغة البريد الإلكتروني غير صحيحة', 'err');
        if (f.phone.value.trim() && !/^[0-9+\s-]{8,16}$/.test(f.phone.value.trim())) return toast('رقم الهاتف غير صحيح', 'err');
        if (f.password.value && f.password.value.length < 6) return toast('كلمة المرور يجب ألا تقل عن ٦ أحرف', 'err');
        btnBusy(b, true, 'جارٍ الإنشاء…');
        try {
          var d = { full_name: f.full_name.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(), role: f.role.value, password: f.password.value };
          var r = await API.adminCreateUser(d);
          users = await API.listProfiles(); draw();
          var pw = r.password || d.password;
          m.box.querySelector('.mo-tt h3').textContent = 'تم إنشاء الحساب'; m.box.querySelector('.mo-ico').textContent = ICONS.ok;
          var sub = m.box.querySelector('.mo-tt p'); if (sub) sub.textContent = 'احتفظ ببيانات الدخول أو أرسلها للمستخدم الآن.';
          m.body.innerHTML = credsCard(d.email, pw, d.phone, d.full_name);
          m.foot.innerHTML = '<button type="button" class="btn btn-ghost-d" id="again">إضافة مستخدم آخر</button><button type="button" class="btn btn-gold" data-close="ok">تم</button>';
          m.$('#pwc').onclick = function () { copyText(pw); };
          m.$('#again').onclick = function () { m.close(true); setTimeout(addUser, 220); };
          toast('تم إنشاء الحساب');
        } catch (er) { toast(er.message, 'err'); btnBusy(b, false); }
      };
    }
    document.getElementById('addu').onclick = addUser;

    function editUser(u) {
      var self = u.id === state.user.id;
      var m = openModal({ title: 'تعديل بيانات المستخدم', icon: ICONS.user, sub: nCasesText(u), wide: true,
        body: '<form id="uf2" class="form-p" novalidate><div class="grid2">' + field('full_name', 'الاسم', 'value="' + esc(u.full_name) + '"') + field('phone', 'الهاتف', 'dir="ltr" value="' + esc(u.phone) + '"') + '</div>' +
          field('email', 'البريد الإلكتروني', 'type="email" dir="ltr" value="' + esc(u.email) + '"') + field('address', 'العنوان', 'value="' + esc(u.address) + '"') +
          '<label class="f"><span>الصلاحية</span><select name="role"><option value="customer"' + (u.role === 'customer' ? ' selected' : '') + '>عميل</option><option value="admin"' + (u.role === 'admin' ? ' selected' : '') + '>مدير (كل الصلاحيات)</option></select></label></form>' +
          '<div class="mo-sec"><h4>كلمة المرور</h4><p>توليد كلمة مرور مؤقتة جديدة وإرسالها للمستخدم (مفيدة إن نسيها).</p><button type="button" class="btn btn-ghost-d sm" id="rst">إعادة تعيين كلمة المرور</button><div id="rstout"></div></div>' +
          (self ? '' : '<div class="mo-sec danger"><h4>منطقة الخطر</h4><p>حذف المستخدم يحذف حسابه وجميع قضاياه ومستنداته نهائيًا.</p><button type="button" class="btn btn-danger-o sm" id="delu">حذف هذا المستخدم</button></div>'),
        foot: '<button type="button" class="btn btn-ghost-d" data-close="no">إلغاء</button><button type="submit" form="uf2" class="btn btn-gold" id="usave">حفظ التعديلات</button>' });
      function nCasesText(x) { var n = nCases(x); return n ? 'لديه ' + num(n) + ' قضية' : 'لا توجد قضايا لهذا المستخدم'; }
      m.$('#uf2').onsubmit = async function (ev) {
        ev.preventDefault(); var f = ev.target, b = m.$('#usave');
        if (f.full_name.value.trim().length < 3) return toast('يرجى كتابة الاسم الكامل', 'err');
        if (!/^\S+@\S+\.\S{2,}$/.test(f.email.value.trim())) return toast('صيغة البريد الإلكتروني غير صحيحة', 'err');
        if (f.role.value !== u.role && self && !(await confirmBox({ tone: 'warn', title: 'تغيير صلاحيتك', msg: 'ستفقد صلاحيات المدير على حسابك الحالي. هل أنت متأكد؟', okText: 'نعم، تابع' }))) return;
        btnBusy(b, true, 'جارٍ الحفظ…');
        try {
          if (f.email.value.trim().toLowerCase() !== (u.email || '').toLowerCase()) await API.adminSetEmail(u.id, f.email.value.trim());
          var np = await API.updateProfile(u.id, { full_name: f.full_name.value.trim(), phone: f.phone.value.trim(), address: f.address.value.trim(), role: f.role.value });
          Object.assign(u, np, { email: f.email.value.trim().toLowerCase() }); if (self) state.profile = Object.assign({}, state.profile, np);
          toast('تم حفظ التعديلات'); m.close(true);
          if (self && np.role !== 'admin') { renderNav(); go('#/dashboard'); } else draw();
        } catch (er) { toast(er.message, 'err'); btnBusy(b, false); }
      };
      var armed = false;
      m.$('#rst').onclick = async function () {
        var btn = this;
        if (!armed) { armed = true; btn.textContent = 'اضغط مرة أخرى للتأكيد'; btn.classList.add('btn-danger'); setTimeout(function () { armed = false; btn.textContent = 'إعادة تعيين كلمة المرور'; btn.classList.remove('btn-danger'); }, 5000); return; }
        armed = false; btn.disabled = true; btn.textContent = 'جارٍ التنفيذ…';
        try {
          var pw = await API.adminResetPassword(u.id);
          m.$('#rstout').innerHTML = credsCard(u.email || '', pw, u.phone, u.full_name);
          m.$('#pwc').onclick = function () { copyText(pw); };
          toast('تم توليد كلمة مرور جديدة');
        } catch (er) { toast(er.message, 'err'); }
        btn.disabled = false; btn.textContent = 'إعادة تعيين كلمة المرور'; btn.classList.remove('btn-danger');
      };
      var del = m.$('#delu'); if (del) del.onclick = function () { deleteUser(u, m); };
    }

    document.getElementById('ul').onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.e) editUser(users.find(function (x) { return x.id === b.dataset.e; }));
      else if (b.dataset.d) deleteUser(users.find(function (x) { return x.id === b.dataset.d; }));
    };
  }

  /* ---------- التوجيه ---------- */
  var PUBLIC = ['#/login', '#/signup', '#/forgot'];
  async function route() {
    var h = location.hash || '', path = h.split('?')[0];
    if (/^#(access_token|refresh_token|error)/.test(h)) {
      if (/^#error/.test(h)) { history.replaceState(null, '', '#/login'); toast('الرابط غير صالح أو منتهي، يرجى المحاولة مرة أخرى', 'err'); h = '#/login'; path = h; }
      else { loading(); return; }
    }
    if (!h || h === '#') path = state.user ? (isAdmin() ? '#/admin' : '#/dashboard') : '#/login';
    if (!state.user && PUBLIC.indexOf(path) < 0 && path !== '#/reset') path = '#/login';
    if (state.user && PUBLIC.indexOf(path) > -1) path = isAdmin() ? '#/admin' : '#/dashboard';
    if (state.user && !isAdmin() && /^#\/admin/.test(path)) path = '#/dashboard';
    if (path !== h.split('?')[0] && h) { history.replaceState(null, '', path); } else if (!h) history.replaceState(null, '', path);
    renderNav(); window.scrollTo(0, 0);
    try {
      var m;
      if (path === '#/login') viewLogin();
      else if (path === '#/signup') viewSignup();
      else if (path === '#/forgot') viewForgot();
      else if (path === '#/reset') viewReset();
      else if (path === '#/dashboard') await viewDashboard();
      else if (path === '#/new') await viewNew();
      else if (path === '#/profile') await viewProfile();
      else if (path === '#/admin') await viewAdmin();
      else if (path === '#/admin/users') await viewUsers();
      else if ((m = path.match(/^#\/case\/([\w-]+)$/))) await viewCase(m[1]);
      else go(state.user ? (isAdmin() ? '#/admin' : '#/dashboard') : '#/login');
    } catch (er) { app.innerHTML = '<div class="empty"><div class="eico">⚠️</div><h3>حدث خطأ</h3><p>' + esc(arError(er)) + '</p><button class="btn btn-gold" onclick="location.reload()">إعادة المحاولة</button></div>'; }
    app.focus({ preventScroll: true });
  }

  async function boot() {
    var u = await API.getUser();
    state.user = u; state.profile = null;
    if (u) { try { state.profile = await API.getProfile(u.id); } catch (e) { state.profile = { id: u.id, email: u.email, role: 'customer', full_name: '', phone: '' }; } }
  }

  var banner = document.getElementById('demoBanner');
  if (API.demo) {
    banner.hidden = false;
    banner.innerHTML = '⚠️ <b>وضع تجريبي:</b> البيانات تُحفظ على هذا الجهاز فقط. للتجربة كمدير سجّل بالبريد <b dir="ltr">' + esc((window.APP_CONFIG || {}).DEMO_ADMIN_EMAIL || '') + '</b>.';
  }
  window.addEventListener('hashchange', route);
  window.addEventListener('langchange', function () { var y = window.scrollY; renderNav(); Promise.resolve(route()).then(function () { window.scrollTo(0, y); }); });
  var pendingAuth = /^#(access_token|refresh_token)/.test(location.hash);
  API.onAuth(function (ev) {
    if (ev === 'PASSWORD_RECOVERY') { pendingAuth = false; boot().then(function () { history.replaceState(null, '', '#/reset'); route(); }); }
    else if (ev === 'SIGNED_IN' && pendingAuth) { pendingAuth = false; boot().then(function () { history.replaceState(null, '', '#/dashboard'); route(); }); }
    else if (ev === 'SIGNED_OUT' && state.user) { state.user = null; state.profile = null; route(); }
  });
  if (pendingAuth) setTimeout(function () { if (pendingAuth) { pendingAuth = false; history.replaceState(null, '', '#/login'); boot().then(route); } }, 5000);
  boot().then(route);
})();
