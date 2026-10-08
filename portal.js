/* بوابة العملاء — واجهة المستخدم */
(function () {
  'use strict';
  var API = window.API, ST = window.APP.STATUSES, TYPES = window.APP.TYPES, arError = window.APP.arError;
  var app = document.getElementById('app'), pnav = document.getElementById('pnav');
  var state = { user: null, profile: null };

  /* ---------- أدوات ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var nf = new Intl.NumberFormat('ar-EG', { useGrouping: false });
  function num(n) { return nf.format(n); }
  function fmtDate(d, time) { try { return new Date(d).toLocaleString('ar-EG', time ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }); } catch (e) { return ''; } }
  function fmtSize(b) { if (!b && b !== 0) return ''; if (b < 1024) return num(b) + ' بايت'; if (b < 1048576) return num(Math.round(b / 1024)) + ' ك.ب'; return num(Math.round(b / 104857.6) / 10) + ' م.ب'; }
  function caseNo(c) { return 'رقم ' + num(c.seq); }
  function st(key) { return ST.find(function (s) { return s.key === key; }) || ST[0]; }
  function badge(key) { var s = st(key); return '<span class="badge b-' + s.tone + '">' + s.label + '</span>'; }
  function isAdmin() { return state.profile && state.profile.role === 'admin'; }
  function toast(msg, type) {
    var t = document.createElement('div'); t.className = 'toast ' + (type || 'ok'); t.textContent = msg;
    document.getElementById('toasts').appendChild(t); setTimeout(function () { t.classList.add('out'); }, 3600); setTimeout(function () { t.remove(); }, 4100);
  }
  function loading() { app.innerHTML = '<div class="pload"><i></i><span>جارٍ التحميل…</span></div>'; }
  function go(h) { if (location.hash === h) route(); else location.hash = h; }
  function btnBusy(b, on, txt) { if (!b) return; if (on) { b.dataset.t = b.textContent; b.disabled = true; b.textContent = txt || 'جارٍ التنفيذ…'; } else { b.disabled = false; b.textContent = b.dataset.t || b.textContent; } }

  function modal(html) {
    var m = document.getElementById('modal'), box = m.firstElementChild;
    box.innerHTML = html; m.hidden = false; document.body.style.overflow = 'hidden';
    var close = function (v) { m.hidden = true; document.body.style.overflow = ''; m.onclick = null; document.removeEventListener('keydown', esc_); if (box._res) { box._res(v); box._res = null; } };
    function esc_(e) { if (e.key === 'Escape') close(null); }
    document.addEventListener('keydown', esc_);
    m.onclick = function (e) { if (e.target === m) close(null); };
    box.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', function () { close(b.dataset.close === 'ok' ? true : null); }); });
    var first = box.querySelector('input,select,textarea,button'); if (first) first.focus();
    return { box: box, close: close, wait: function () { return new Promise(function (r) { box._res = r; }); } };
  }
  function confirmBox(msg, okText) {
    var m = modal('<h3>تأكيد الإجراء</h3><p>' + esc(msg) + '</p><div class="row end"><button class="btn btn-ghost-d" data-close="no">إلغاء</button><button class="btn btn-danger" data-close="ok">' + esc(okText || 'تأكيد') + '</button></div>');
    return m.wait().then(function (v) { return !!v; });
  }

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
    app.innerHTML = authShell('استعادة كلمة المرور', 'سنرسل لك رابطًا لإعادة تعيينها', '<form id="f" class="form-p" novalidate>' +
      field('email', 'البريد الإلكتروني', 'type="email" dir="ltr" inputmode="email" required placeholder="اكتب بريدك الإلكتروني"') +
      '<button class="btn btn-gold block" type="submit">إرسال الرابط</button><div class="links"><a href="#/login">العودة لتسجيل الدخول</a></div></form>');
    document.getElementById('f').onsubmit = async function (e) {
      e.preventDefault(); var b = e.target.querySelector('button'); btnBusy(b, true, 'جارٍ الإرسال…');
      try { await API.resetPassword(e.target.email.value.trim()); toast('تم إرسال الرابط إلى بريدك'); } catch (er) { toast(er.message, 'err'); }
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
  function progressBar(key) { var s = st(key); return '<div class="prog" role="progressbar" aria-valuenow="' + s.pct + '" aria-valuemin="0" aria-valuemax="100" aria-label="نسبة التقدم"><i style="width:' + s.pct + '%"></i></div><small class="pct">' + num(s.pct) + '٪</small>'; }
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
      '<label class="f"><span>نوع القضية</span><select name="type" id="type">' + TYPES.map(function (t) { return '<option>' + t + '</option>'; }).join('') + '</select></label>' +
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
      '<div class="filters"><input id="q" type="search" placeholder="بحث بعنوان القضية أو اسم العميل…" aria-label="بحث"><select id="fs"><option value="">كل الحالات</option>' + ST.map(function (s) { return '<option value="' + s.key + '">' + s.label + '</option>'; }).join('') + '</select><select id="ft"><option value="">كل الأنواع</option>' + TYPES.map(function (t) { return '<option>' + t + '</option>'; }).join('') + '</select></div><div id="list"></div>';
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
    app.innerHTML = '<div class="phead"><div><h1>إدارة العملاء</h1><p class="sub">' + num(users.length) + ' حساب مسجّل</p></div></div><div class="filters"><input id="q" type="search" placeholder="بحث بالاسم أو البريد أو الهاتف…" aria-label="بحث"></div><div id="ul" class="ulist"></div>';
    function draw() {
      var rows = users.filter(function (u) { return !q || ((u.full_name || '') + ' ' + (u.email || '') + ' ' + (u.phone || '')).toLowerCase().indexOf(q) > -1; });
      document.getElementById('ul').innerHTML = rows.length ? rows.map(function (u) {
        var n = cases.filter(function (c) { return c.owner === u.id; }).length;
        return '<div class="urow"><div class="uav">' + esc((u.full_name || u.email || '?').trim().charAt(0)) + '</div><div class="uinfo"><b>' + esc(u.full_name || 'بدون اسم') + '</b> ' + (u.role === 'admin' ? '<span class="badge b-done">مدير</span>' : '') +
          '<small dir="ltr">' + esc(u.email || '') + '</small><small dir="ltr">' + esc(u.phone || '') + '</small></div><div class="ucnt"><b>' + num(n) + '</b><span>قضية</span></div><button class="btn btn-ghost-d sm" data-e="' + u.id + '" type="button">تعديل</button></div>';
      }).join('') : '<div class="empty"><h3>لا توجد نتائج</h3></div>';
    }
    draw();
    document.getElementById('q').oninput = function (e) { q = e.target.value.trim().toLowerCase(); draw(); };
    document.getElementById('ul').onclick = function (e) {
      var b = e.target.closest('[data-e]'); if (!b) return; var u = users.find(function (x) { return x.id === b.dataset.e; });
      var m = modal('<h3>تعديل بيانات العميل</h3><form id="uf2" class="form-p" novalidate>' + field('full_name', 'الاسم', 'value="' + esc(u.full_name) + '"') + field('phone', 'الهاتف', 'dir="ltr" value="' + esc(u.phone) + '"') + field('address', 'العنوان', 'value="' + esc(u.address) + '"') +
        '<label class="f"><span>الصلاحية</span><select name="role"><option value="customer"' + (u.role === 'customer' ? ' selected' : '') + '>عميل</option><option value="admin"' + (u.role === 'admin' ? ' selected' : '') + '>مدير (كل الصلاحيات)</option></select></label>' +
        '<div class="row end"><button type="button" class="btn btn-ghost-d" data-close="no">إلغاء</button><button class="btn btn-gold" type="submit">حفظ</button></div></form>');
      m.box.querySelector('#uf2').onsubmit = async function (ev) {
        ev.preventDefault(); var f = ev.target;
        if (f.role.value !== u.role && u.id === state.user.id && !(await confirmBox('ستفقد صلاحيات المدير على حسابك. هل أنت متأكد؟'))) return;
        try { var np = await API.updateProfile(u.id, { full_name: f.full_name.value.trim(), phone: f.phone.value.trim(), address: f.address.value.trim(), role: f.role.value }); Object.assign(u, np); if (u.id === state.user.id) { state.profile = np; } toast('تم حفظ التعديلات'); m.close(true); if (u.id === state.user.id && np.role !== 'admin') { renderNav(); go('#/dashboard'); } else draw(); } catch (er) { toast(er.message, 'err'); }
      };
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
  var pendingAuth = /^#(access_token|refresh_token)/.test(location.hash);
  API.onAuth(function (ev) {
    if (ev === 'PASSWORD_RECOVERY') { pendingAuth = false; boot().then(function () { history.replaceState(null, '', '#/reset'); route(); }); }
    else if (ev === 'SIGNED_IN' && pendingAuth) { pendingAuth = false; boot().then(function () { history.replaceState(null, '', '#/dashboard'); route(); }); }
    else if (ev === 'SIGNED_OUT' && state.user) { state.user = null; state.profile = null; route(); }
  });
  if (pendingAuth) setTimeout(function () { if (pendingAuth) { pendingAuth = false; history.replaceState(null, '', '#/login'); boot().then(route); } }, 5000);
  boot().then(route);
})();
