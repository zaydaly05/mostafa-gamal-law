/* طبقة الاتصال بالبيانات: Supabase (حقيقي) أو وضع تجريبي محلي */
(function () {
  var CFG = window.APP_CONFIG || {};
  var DEMO = !(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase);

  var STATUSES = [
    { key: 'new',      label: 'جديدة',            pct: 10,  tone: 'info' },
    { key: 'review',   label: 'قيد المراجعة',     pct: 25,  tone: 'info' },
    { key: 'docs',     label: 'بانتظار المستندات', pct: 35,  tone: 'warn' },
    { key: 'progress', label: 'قيد المتابعة',     pct: 55,  tone: 'ok' },
    { key: 'court',    label: 'أمام المحكمة',     pct: 75,  tone: 'ok' },
    { key: 'ruling',   label: 'بانتظار الحكم',    pct: 90,  tone: 'ok' },
    { key: 'closed',   label: 'مغلقة',            pct: 100, tone: 'done' }
  ];
  var TYPES = ['قضية جنائية', 'قضية أموال عامة', 'تأسيس شركة', 'تهرب ضريبي', 'إفراج جمركي', 'استشارة قانونية', 'أخرى'];
  var MAX_FILE = 10 * 1024 * 1024;

  var AR_ERRORS = [
    [/invalid login credentials/i, 'البريد الإلكتروني أو كلمة المرور غير صحيحة'],
    [/user already registered|already been registered/i, 'هذا البريد الإلكتروني مسجّل بالفعل، جرّب تسجيل الدخول'],
    [/password should be at least/i, 'كلمة المرور يجب ألا تقل عن ٦ أحرف'],
    [/email not confirmed/i, 'يرجى تأكيد بريدك الإلكتروني من الرسالة المرسلة إليك أولاً'],
    [/rate limit|too many/i, 'محاولات كثيرة، يرجى الانتظار قليلاً ثم المحاولة مرة أخرى'],
    [/invalid email|unable to validate email/i, 'صيغة البريد الإلكتروني غير صحيحة'],
    [/same password|different from the old/i, 'كلمة المرور الجديدة يجب أن تختلف عن القديمة'],
    [/failed to fetch|network/i, 'تعذّر الاتصال بالخادم، تحقق من اتصالك بالإنترنت'],
    [/row-level security|permission denied|not authorized|jwt/i, 'ليست لديك صلاحية لتنفيذ هذا الإجراء'],
    [/payload too large|exceeded the maximum|file size/i, 'حجم الملف أكبر من الحد المسموح (١٠ ميجابايت)'],
    [/duplicate|already exists/i, 'هذا العنصر موجود بالفعل']
  ];
  function arError(e) {
    var m = (e && (e.message || e.error_description || e.error)) || String(e || '');
    if (/[؀-ۿ]/.test(m)) return m;
    for (var i = 0; i < AR_ERRORS.length; i++) if (AR_ERRORS[i][0].test(m)) return AR_ERRORS[i][1];
    return 'حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى';
  }
  function must(res) { if (res.error) throw new Error(arError(res.error)); return res.data; }
  function uuid() { return (crypto.randomUUID && crypto.randomUUID()) || 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2); }

  /* ============================ Supabase ============================ */
  function makeSupabase() {
    var sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    var redirect = location.origin + location.pathname;
    return {
      demo: false,
      async getUser() { var r = await sb.auth.getSession(); return r.data.session ? r.data.session.user : null; },
      onAuth(cb) { sb.auth.onAuthStateChange(function (ev, s) { setTimeout(function () { cb(ev, s && s.user); }, 0); }); },
      async signUp(d) {
        var r = await sb.auth.signUp({ email: d.email, password: d.password, options: { data: { full_name: d.full_name, phone: d.phone }, emailRedirectTo: redirect } });
        if (r.error) throw new Error(arError(r.error));
        return { user: r.data.user, needsConfirm: !r.data.session };
      },
      async signIn(email, password) { must(await sb.auth.signInWithPassword({ email: email, password: password })); },
      async signOut() { await sb.auth.signOut(); },
      async resetPassword(email) { must(await sb.auth.resetPasswordForEmail(email, { redirectTo: redirect })); },
      async updatePassword(pw) { must(await sb.auth.updateUser({ password: pw })); },

      async getProfile(id) { return must(await sb.from('profiles').select('*').eq('id', id).single()); },
      async updateProfile(id, f) { return must(await sb.from('profiles').update(f).eq('id', id).select().single()); },
      async listProfiles() { return must(await sb.from('profiles').select('*').order('created_at', { ascending: false })); },
      async setRole(id, role) { must(await sb.from('profiles').update({ role: role }).eq('id', id)); },

      async createCase(d) {
        return must(await sb.from('cases').insert({ owner: d.owner, title: d.title, type: d.type, description: d.description }).select().single());
      },
      async listCases() {
        return must(await sb.from('cases').select('*, profiles!cases_owner_fkey(full_name,email,phone)').order('created_at', { ascending: false }));
      },
      async getCase(id) {
        return must(await sb.from('cases').select('*, profiles!cases_owner_fkey(full_name,email,phone)').eq('id', id).single());
      },
      async deleteCase(id) {
        var docs = must(await sb.from('documents').select('path').eq('case_id', id));
        if (docs.length) await sb.storage.from('case-docs').remove(docs.map(function (d) { return d.path; }));
        must(await sb.from('cases').delete().eq('id', id));
      },
      async listUpdates(caseId) { return must(await sb.from('case_updates').select('*').eq('case_id', caseId).order('created_at', { ascending: true })); },
      async addUpdate(caseId, authorId, status, note) {
        must(await sb.from('case_updates').insert({ case_id: caseId, author: authorId, status: status || null, note: note || null }));
      },

      async listDocs(caseId) { return must(await sb.from('documents').select('*').eq('case_id', caseId).order('created_at', { ascending: false })); },
      async uploadDoc(caseId, ownerId, file) {
        if (file.size > MAX_FILE) throw new Error('حجم الملف أكبر من الحد المسموح (١٠ ميجابايت)');
        var ext = (file.name.split('.').pop() || 'bin').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'bin';
        var path = caseId + '/' + uuid() + '.' + ext;
        var up = await sb.storage.from('case-docs').upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
        if (up.error) throw new Error(arError(up.error));
        var ins = await sb.from('documents').insert({ case_id: caseId, owner: ownerId, name: file.name, path: path, size: file.size, mime: file.type || null }).select().single();
        if (ins.error) { await sb.storage.from('case-docs').remove([path]); throw new Error(arError(ins.error)); }
        return ins.data;
      },
      async docUrl(doc) {
        var r = await sb.storage.from('case-docs').createSignedUrl(doc.path, 300, { download: doc.name });
        if (r.error) throw new Error(arError(r.error));
        return r.data.signedUrl;
      },
      async deleteDoc(doc) {
        await sb.storage.from('case-docs').remove([doc.path]);
        must(await sb.from('documents').delete().eq('id', doc.id));
      }
    };
  }

  /* ============================ وضع تجريبي ============================ */
  function makeDemo() {
    var DB_KEY = 'demo_db_v1', SES_KEY = 'demo_session_v1', listeners = [];
    function load() { try { return JSON.parse(localStorage.getItem(DB_KEY)) || null; } catch (e) { return null; } }
    var db = load() || { users: [], profiles: [], cases: [], updates: [], docs: [], seq: 0 };
    function save() { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
    function now() { return new Date().toISOString(); }
    async function sha(s) {
      var b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
      return Array.from(new Uint8Array(b)).map(function (x) { return x.toString(16).padStart(2, '0'); }).join('');
    }
    function session() { var id = localStorage.getItem(SES_KEY); return id ? db.users.find(function (u) { return u.id === id; }) || null : null; }
    function emit(ev) { var u = session(); listeners.forEach(function (cb) { cb(ev, u && { id: u.id, email: u.email }); }); }
    function me() { var u = session(); return u && db.profiles.find(function (p) { return p.id === u.id; }); }
    function isAdmin() { var p = me(); return !!p && p.role === 'admin'; }
    function guard(ok) { if (!ok) throw new Error('ليست لديك صلاحية لتنفيذ هذا الإجراء'); }
    function withOwner(c) {
      var p = db.profiles.find(function (x) { return x.id === c.owner; }) || {};
      return Object.assign({}, c, { profiles: { full_name: p.full_name, email: p.email, phone: p.phone } });
    }
    /* ملفات المستندات في IndexedDB */
    function idb() {
      return new Promise(function (res, rej) {
        var r = indexedDB.open('demo_files', 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('f'); };
        r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
      });
    }
    async function idbOp(mode, fn) {
      var d = await idb();
      return new Promise(function (res, rej) {
        var t = d.transaction('f', mode), s = t.objectStore('f'), req = fn(s);
        t.oncomplete = function () { res(req && req.result); }; t.onerror = function () { rej(t.error); };
      });
    }

    return {
      demo: true,
      async getUser() { var u = session(); return u ? { id: u.id, email: u.email } : null; },
      onAuth(cb) { listeners.push(cb); },
      async signUp(d) {
        var email = d.email.trim().toLowerCase();
        if (db.users.some(function (u) { return u.email === email; })) throw new Error('هذا البريد الإلكتروني مسجّل بالفعل، جرّب تسجيل الدخول');
        if (d.password.length < 6) throw new Error('كلمة المرور يجب ألا تقل عن ٦ أحرف');
        var id = uuid();
        db.users.push({ id: id, email: email, hash: await sha(d.password) });
        db.profiles.push({ id: id, email: email, full_name: d.full_name || '', phone: d.phone || '', address: '', role: email === (CFG.DEMO_ADMIN_EMAIL || '').toLowerCase() ? 'admin' : 'customer', created_at: now() });
        save(); localStorage.setItem(SES_KEY, id); emit('SIGNED_IN');
        return { user: { id: id, email: email }, needsConfirm: false };
      },
      async signIn(email, password) {
        var u = db.users.find(function (x) { return x.email === email.trim().toLowerCase(); });
        if (!u || u.hash !== await sha(password)) throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
        localStorage.setItem(SES_KEY, u.id); emit('SIGNED_IN');
      },
      async signOut() { localStorage.removeItem(SES_KEY); emit('SIGNED_OUT'); },
      async resetPassword() { throw new Error('استعادة كلمة المرور غير متاحة في الوضع التجريبي'); },
      async updatePassword(pw) {
        var u = session(); guard(!!u); if (pw.length < 6) throw new Error('كلمة المرور يجب ألا تقل عن ٦ أحرف');
        u.hash = await sha(pw); save();
      },

      async getProfile(id) { var p = db.profiles.find(function (x) { return x.id === id; }); guard(!!p && (isAdmin() || me().id === id)); return Object.assign({}, p); },
      async updateProfile(id, f) {
        guard(isAdmin() || me().id === id);
        var p = db.profiles.find(function (x) { return x.id === id; });
        ['full_name', 'phone', 'address'].forEach(function (k) { if (k in f) p[k] = f[k]; });
        if ('role' in f) { guard(isAdmin()); p.role = f.role; }
        save(); return Object.assign({}, p);
      },
      async listProfiles() { guard(isAdmin()); return db.profiles.slice().reverse().map(function (p) { return Object.assign({}, p); }); },
      async setRole(id, role) { guard(isAdmin()); db.profiles.find(function (x) { return x.id === id; }).role = role; save(); },

      async createCase(d) {
        var m = me(); guard(!!m && (d.owner === m.id || isAdmin()));
        var c = { id: uuid(), seq: ++db.seq, owner: d.owner, title: d.title, type: d.type, description: d.description || '', status: 'new', created_at: now(), updated_at: now() };
        db.cases.push(c);
        db.updates.push({ id: uuid(), case_id: c.id, author: null, status: 'new', note: 'تم استلام طلبك بنجاح، وسيقوم المستشار بمراجعته قريبًا.', created_at: now() });
        save(); return Object.assign({}, c);
      },
      async listCases() {
        var m = me(); guard(!!m);
        return db.cases.filter(function (c) { return isAdmin() || c.owner === m.id; }).slice().reverse().map(withOwner);
      },
      async getCase(id) {
        var m = me(), c = db.cases.find(function (x) { return x.id === id; });
        guard(!!m && !!c && (isAdmin() || c.owner === m.id)); return withOwner(c);
      },
      async deleteCase(id) {
        guard(isAdmin());
        var ds = db.docs.filter(function (d) { return d.case_id === id; });
        for (var i = 0; i < ds.length; i++) await idbOp('readwrite', function (s) { return s.delete(ds[i].path); });
        db.cases = db.cases.filter(function (c) { return c.id !== id; });
        db.updates = db.updates.filter(function (u) { return u.case_id !== id; });
        db.docs = db.docs.filter(function (d) { return d.case_id !== id; });
        save();
      },
      async listUpdates(caseId) { await this.getCase(caseId); return db.updates.filter(function (u) { return u.case_id === caseId; }).map(function (u) { return Object.assign({}, u); }); },
      async addUpdate(caseId, authorId, status, note) {
        guard(isAdmin());
        db.updates.push({ id: uuid(), case_id: caseId, author: authorId, status: status || null, note: note || null, created_at: now() });
        var c = db.cases.find(function (x) { return x.id === caseId; });
        if (status) c.status = status; c.updated_at = now(); save();
      },

      async listDocs(caseId) { await this.getCase(caseId); return db.docs.filter(function (d) { return d.case_id === caseId; }).slice().reverse().map(function (d) { return Object.assign({}, d); }); },
      async uploadDoc(caseId, ownerId, file) {
        await this.getCase(caseId);
        if (file.size > MAX_FILE) throw new Error('حجم الملف أكبر من الحد المسموح (١٠ ميجابايت)');
        var path = caseId + '/' + uuid();
        await idbOp('readwrite', function (s) { return s.put(file, path); });
        var d = { id: uuid(), case_id: caseId, owner: ownerId, name: file.name, path: path, size: file.size, mime: file.type || null, created_at: now() };
        db.docs.push(d); save(); return Object.assign({}, d);
      },
      async docUrl(doc) { var f = await idbOp('readonly', function (s) { return s.get(doc.path); }); if (!f) throw new Error('الملف غير موجود'); return URL.createObjectURL(f); },
      async deleteDoc(doc) {
        guard(isAdmin() || doc.owner === (me() || {}).id);
        await idbOp('readwrite', function (s) { return s.delete(doc.path); });
        db.docs = db.docs.filter(function (d) { return d.id !== doc.id; }); save();
      }
    };
  }

  window.API = DEMO ? makeDemo() : makeSupabase();
  window.APP = { STATUSES: STATUSES, TYPES: TYPES, MAX_FILE: MAX_FILE, arError: arError };
})();
