/* الوضع الداكن / الفاتح — يُحمَّل في <head> لتفادي الوميض */
(function () {
  var KEY = 'theme', root = document.documentElement, saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  var sys = window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  function labels(t) {
    var en = root.lang === 'en';
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
      var light = t === 'light';
      b.setAttribute('aria-label', en ? (light ? 'Switch to dark mode' : 'Switch to light mode') : (light ? 'التبديل إلى الوضع الداكن' : 'التبديل إلى الوضع الفاتح'));
      b.setAttribute('title', en ? (light ? 'Dark mode' : 'Light mode') : (light ? 'الوضع الداكن' : 'الوضع الفاتح'));
      b.setAttribute('data-no-i18n', '');
    });
  }
  function apply(t) {
    root.setAttribute('data-theme', t);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', t === 'light' ? '#f7f4ee' : '#0b1220');
    labels(t);
  }
  apply(saved === 'light' || saved === 'dark' ? saved : sys);
  window.toggleTheme = function () {
    var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    try { localStorage.setItem(KEY, next); } catch (e) {}
    root.classList.add('theme-anim'); apply(next);
    setTimeout(function () { root.classList.remove('theme-anim'); }, 600);
  };
  window.addEventListener('langchange', function () { labels(root.getAttribute('data-theme')); });
  document.addEventListener('DOMContentLoaded', function () {
    apply(root.getAttribute('data-theme'));
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) { b.addEventListener('click', window.toggleTheme); });
  });
})();
