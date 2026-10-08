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

const lb=$('#lb'),lbi=lb.querySelector('img');
document.querySelectorAll('.gal .g img').forEach((im)=>im.addEventListener('click',()=>{lbi.src=im.src;lbi.alt=im.alt;lb.hidden=false;}));
lb.addEventListener('click',()=>{lb.hidden=true;});
addEventListener('keydown',(e)=>{if(e.key==='Escape')lb.hidden=true;});
