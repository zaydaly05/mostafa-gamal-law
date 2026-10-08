const $ = (s) => document.querySelector(s);
const nav = $('#nav'), menu = $('#menu');
addEventListener('scroll', () => nav.classList.toggle('solid', scrollY > 40), { passive: true });
$('#burger').addEventListener('click', () => menu.classList.toggle('open'));
menu.addEventListener('click', (e) => { if (e.target.tagName === 'A') menu.classList.remove('open'); });
$('#yr').textContent = new Date().getFullYear();

const io = new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

$('#form').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const text = `السلام عليكم يا مستشار،\nالاسم: ${f.get('name')}\nنوع القضية: ${f.get('type')}\nالتفاصيل: ${f.get('msg') || '-'}`;
  window.open('https://wa.me/201229403351?text=' + encodeURIComponent(text), '_blank', 'noopener');
});
