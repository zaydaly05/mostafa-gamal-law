/* Arabic ⇄ English language switching (text + direction + numbers).
   Arabic is the source language; English is applied by translating the DOM
   using the dictionary in i18n-en.js. The choice is remembered. */
(function () {
  'use strict';
  var KEY = 'lang', root = document.documentElement, saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  var lang = saved === 'en' || saved === 'ar' ? saved : 'ar';
  var I = (window.I18N = { lang: lang, dict: {}, pats: [] });
  var AR = /[؀-ۿ]/, AD = /[٠-٩]/;
  root.lang = lang; root.dir = lang === 'ar' ? 'rtl' : 'ltr';

  function fixDigits(s) {
    return s.replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 1632; }).replace(/٪/g, '%').replace(/،/g, ',').replace(/؟/g, '?').replace(/؛/g, ';');
  }
  /* translate one string (keeps leading/trailing whitespace) */
  function tr(s) {
    var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s), core = m[2];
    if (!core) return s;
    var out = I.dict[core];
    if (out === undefined) {
      for (var i = 0; i < I.pats.length; i++) {
        var r = I.pats[i][0].exec(core);
        if (r) { out = I.pats[i][1](r, tr); break; }
      }
    }
    if (out === undefined) { var f = fixDigits(core); if (f !== core && !AR.test(f)) out = f; else return s; }
    return m[1] + fixDigits(out) + m[3];
  }
  /* explicit translation with {0} {1} placeholders (for composed messages) */
  I.t = function (ar, vars) {
    var s = ar;
    if (I.lang === 'en') { var d = I.dict[ar]; if (d !== undefined) s = d; }
    if (vars) s = s.replace(/\{(\d+)\}/g, function (_, n) { return vars[+n]; });
    return s;
  };
  I.locale = function () { return I.lang === 'en' ? 'en-GB' : 'ar-EG'; };
  I.num = function (n) { return new Intl.NumberFormat(I.locale(), { useGrouping: false }).format(n); };

  var ATTRS = ['alt', 'title', 'placeholder', 'aria-label', 'content'];
  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, CODE: 1 };
  var texts = [], busy = false, obs = null;

  function skipEl(el) { return !el || SKIP[el.nodeName] || (el.closest && el.closest('[data-no-i18n]')); }
  function doText(n) {
    var v = n.nodeValue;
    if (n.__t !== undefined && v === n.__t) return;            // our own output
    if (!AR.test(v) && !AD.test(v)) return;
    var out = tr(v);
    if (out !== v) { n.__o = v; n.__t = out; n.nodeValue = out; texts.push(n); }
  }
  function doAttrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i], v = el.getAttribute && el.getAttribute(a);
      if (!v || (!AR.test(v) && !AD.test(v))) continue;
      if (a === 'content' && !(el.nodeName === 'META' && /description|og:title|og:description/.test((el.getAttribute('name') || '') + (el.getAttribute('property') || '')))) continue;
      var key = 'data-o-' + a;
      if (el.getAttribute(key) !== null && el.__ta && el.__ta[a] === v) continue;
      var out = tr(v);
      if (out !== v) { el.setAttribute(key, v); (el.__ta = el.__ta || {})[a] = out; el.setAttribute(a, out); texts.push(el); }
    }
  }
  function walk(node) {
    if (node.nodeType === 3) { if (!skipEl(node.parentNode)) doText(node); return; }
    if (node.nodeType !== 1 || skipEl(node)) return;
    doAttrs(node);
    if (node.nodeName === 'TEXTAREA') return;                 // never touch user-typed text
    for (var c = node.firstChild; c; c = c.nextSibling) walk(c);
  }
  function translateAll() {
    busy = true; walk(root); busy = false;
    var t = document.querySelector('title'); if (t) walk(t);
  }
  function restoreAll() {
    busy = true;
    texts.forEach(function (n) {
      if (n.nodeType === 3) { if (n.__o !== undefined && n.nodeValue === n.__t) n.nodeValue = n.__o; n.__t = undefined; n.__o = undefined; }
      else if (n.nodeType === 1) {
        ATTRS.forEach(function (a) { var k = 'data-o-' + a, o = n.getAttribute(k); if (o !== null) { n.setAttribute(a, o); n.removeAttribute(k); } });
        n.__ta = null;
      }
    });
    texts = []; busy = false;
  }
  function startObserver() {
    if (obs || !window.MutationObserver) return;
    obs = new MutationObserver(function (muts) {
      if (busy || I.lang !== 'en') return;
      busy = true;
      muts.forEach(function (m) {
        if (m.type === 'childList') m.addedNodes.forEach(walk);
        else if (m.type === 'characterData') { if (!skipEl(m.target.parentNode) && m.target.parentNode.nodeName !== 'TEXTAREA') doText(m.target); }
        else if (m.type === 'attributes') { if (!skipEl(m.target)) doAttrs(m.target); }
      });
      busy = false;
    });
    obs.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  function labels() {
    document.querySelectorAll('[data-lang-toggle]').forEach(function (b) {
      b.textContent = I.lang === 'ar' ? 'EN' : 'عربي';
      b.setAttribute('aria-label', I.lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية');
      b.setAttribute('title', I.lang === 'ar' ? 'English' : 'العربية');
      b.lang = I.lang === 'ar' ? 'en' : 'ar';
    });
  }
  function apply(l) {
    if (l === I.lang && l === 'ar' && !texts.length) { root.lang = 'ar'; root.dir = 'rtl'; labels(); return; }
    I.lang = l; root.lang = l; root.dir = l === 'ar' ? 'rtl' : 'ltr';
    if (l === 'en') { translateAll(); startObserver(); } else restoreAll();
    labels();
  }
  I.set = function (l) {
    if (l !== 'ar' && l !== 'en') return;
    try { localStorage.setItem(KEY, l); } catch (e) {}
    root.classList.add('lang-anim'); apply(l);
    setTimeout(function () { root.classList.remove('lang-anim'); }, 500);
    window.dispatchEvent(new Event('langchange'));
  };
  I.toggle = function () { I.set(I.lang === 'ar' ? 'en' : 'ar'); };

  function init() {
    document.querySelectorAll('[data-lang-toggle]').forEach(function (b) { if (!b.__li) { b.__li = 1; b.addEventListener('click', I.toggle); } });
    if (I.lang === 'en') { translateAll(); startObserver(); }
    labels();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
