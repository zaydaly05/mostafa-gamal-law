/* الوضع الداكن / الفاتح — يُحمَّل في <head> لتفادي الوميض */
(function () {
  var KEY = 'theme', root = document.documentElement, saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  var sys = window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  function apply(t) {
    root.setAttribute('data-theme', t);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', t === 'light' ? '#f7f4ee' : '#0b1220');
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
      b.setAttribute('aria-label', t === 'light' ? 'التبديل إلى الوضع الداكن' : 'التبديل إلى الوضع الفاتح');
      b.setAttribute('title', t === 'light' ? 'الوضع الداكن' : 'الوضع الفاتح');
    });
  }
  apply(saved === 'light' || saved === 'dark' ? saved : sys);
  window.toggleTheme = function () {
    var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    try { localStorage.setItem(KEY, next); } catch (e) {}
    root.classList.add('theme-anim'); apply(next);
    setTimeout(function () { root.classList.remove('theme-anim'); }, 600);
  };
  document.addEventListener('DOMContentLoaded', function () {
    apply(root.getAttribute('data-theme'));
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) { b.addEventListener('click', window.toggleTheme); });
  });
})();
