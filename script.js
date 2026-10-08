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


/* gallery filter */
const cards=[...document.querySelectorAll('#masonry .m')];
document.querySelectorAll('#chips .chip').forEach((b)=>b.addEventListener('click',()=>{
  document.querySelectorAll('#chips .chip').forEach((x)=>{x.classList.toggle('on',x===b);x.setAttribute('aria-selected',x===b);});
  cards.forEach((c)=>{c.hidden=!(b.dataset.f==='all'||c.dataset.cat===b.dataset.f);c.classList.add('in');});
}));

/* lightbox with prev/next, swipe, keyboard */
const lb=$('#lb'),lbi=lb.querySelector('.lb-fig img'),lbc=lb.querySelector('figcaption'),cnt=lb.querySelector('.lb-c');
let list=[],idx=0,opener=null;
const show=()=>{const f=list[idx],im=f.querySelector('img');lbi.src=im.currentSrc||im.src;lbi.alt=im.alt;lbc.textContent=f.querySelector('figcaption').textContent;cnt.textContent=(idx+1)+' / '+list.length;};
const open=(fig,group)=>{list=[...group.querySelectorAll('figure')].filter((f)=>!f.hidden);idx=list.indexOf(fig);opener=fig.querySelector('button');show();lb.hidden=false;document.body.style.overflow='hidden';lb.querySelector('.lb-x').focus();};
const close=()=>{lb.hidden=true;document.body.style.overflow='';opener&&opener.focus();};
const step=(d)=>{idx=(idx+d+list.length)%list.length;show();};
document.querySelectorAll('#masonry,#cat').forEach((g)=>g.addEventListener('click',(e)=>{const b=e.target.closest('button');if(b)open(b.closest('figure'),g);}));
lb.querySelector('.lb-x').addEventListener('click',close);
lb.querySelector('.lb-prev').addEventListener('click',()=>step(-1));
lb.querySelector('.lb-next').addEventListener('click',()=>step(1));
lb.addEventListener('click',(e)=>{if(e.target===lb)close();});
addEventListener('keydown',(e)=>{if(lb.hidden)return;if(e.key==='Escape')close();if(e.key==='ArrowLeft')step(1);if(e.key==='ArrowRight')step(-1);});
let sx=null;
lb.addEventListener('touchstart',(e)=>{sx=e.touches[0].clientX;},{passive:true});
lb.addEventListener('touchend',(e)=>{if(sx===null)return;const dx=e.changedTouches[0].clientX-sx;sx=null;if(Math.abs(dx)>50)step(dx<0?1:-1);},{passive:true});

/* ===== motion layer ===== */
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
const fine=matchMedia('(hover:hover) and (pointer:fine)').matches;
const raf=(f)=>requestAnimationFrame(f);

/* loader + hero intro */
const loader=$('#loader'),heroGo=()=>{loader.classList.add('done');document.querySelector('.hero').classList.add('go');};
let started=false;const start=()=>{if(started)return;started=true;setTimeout(heroGo,reduce?0:350);};
addEventListener('load',start);setTimeout(start,2500);

/* stagger reveals inside grids */
document.querySelectorAll('.cards,.masonry,.cat,.strip-in,.hero-tags').forEach((p)=>[...p.children].forEach((c,i)=>c.style.setProperty('--d',Math.min(i,8)*0.07+'s')));
document.querySelectorAll('.timeline,.eyebrow').forEach((el)=>io.observe(el));

/* scroll progress, nav hide/show, parallax, scrollspy */
const prog=$('#progress'),heroBg=$('#heroBg'),links=[...menu.querySelectorAll('a[href^="#"]:not(.btn)')];
const secs=links.map((a)=>document.querySelector(a.getAttribute('href'))).filter(Boolean);
let lastY=0,tick=false;
const onScroll=()=>{tick=false;const y=scrollY,max=document.documentElement.scrollHeight-innerHeight;
  prog.style.transform=`scaleX(${max>0?y/max:0})`;
  if(!menu.classList.contains('open')) nav.classList.toggle('hide',y>lastY&&y>400);
  lastY=y;
  if(!reduce&&y<innerHeight*1.2) heroBg.style.transform=`translate3d(0,${y*.25}px,0)`;
  let cur=null;secs.forEach((s)=>{if(s.getBoundingClientRect().top<innerHeight*.4)cur=s.id;});
  links.forEach((a)=>a.classList.toggle('act',a.getAttribute('href')==='#'+cur));};
addEventListener('scroll',()=>{if(!tick){tick=true;raf(onScroll);}},{passive:true});onScroll();

/* animated counters */
const fmt=new Intl.NumberFormat('ar-EG');
const co=new IntersectionObserver((es)=>es.forEach((e)=>{if(!e.isIntersecting)return;co.unobserve(e.target);
  const el=e.target,to=+el.dataset.count;if(reduce){el.textContent=fmt.format(to);return;}
  const t0=performance.now(),d=1400;const f=(t)=>{const p=Math.min((t-t0)/d,1),v=1-Math.pow(1-p,3);el.textContent=fmt.format(Math.round(to*v));if(p<1)raf(f);};raf(f);}),{threshold:.6});
document.querySelectorAll('[data-count]').forEach((el)=>{el.textContent=fmt.format(0);co.observe(el);});

/* gallery filter pop animation */
document.querySelectorAll('#chips .chip').forEach((b)=>b.addEventListener('click',()=>{
  let i=0;cards.forEach((c)=>{c.classList.remove('pop');if(!c.hidden){void c.offsetWidth;c.style.setProperty('--pd',Math.min(i++,10)*.04+'s');c.classList.add('pop');}});
}));

if(!reduce&&fine){
  /* card tilt + spotlight */
  document.querySelectorAll('.tilt').forEach((c)=>{
    c.addEventListener('pointermove',(e)=>{const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
      c.style.setProperty('--mx',x*100+'%');c.style.setProperty('--my',y*100+'%');
      c.style.transform=`perspective(700px) rotateX(${(.5-y)*8}deg) rotateY(${(x-.5)*8}deg) translateY(-6px)`;});
    c.addEventListener('pointerleave',()=>{c.style.transform='';});
  });
  /* hero photo 3D tilt */
  const fr=$('#tiltFrame'),hp=fr.parentElement;
  hp.addEventListener('pointermove',(e)=>{const r=hp.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
    fr.classList.add('moving');fr.style.transform=`rotateY(${x*14}deg) rotateX(${-y*10}deg)`;});
  hp.addEventListener('pointerleave',()=>{fr.classList.remove('moving');fr.style.transform='';});
  /* magnetic buttons */
  document.querySelectorAll('.hero .btn,.cta-card .btn,.contact-grid .btn').forEach((b)=>{b.classList.add('mag');
    b.addEventListener('pointermove',(e)=>{const r=b.getBoundingClientRect();b.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.18}px,${(e.clientY-r.top-r.height/2)*.28}px)`;});
    b.addEventListener('pointerleave',()=>{b.style.transform='';});});
}

/* golden dust particles (hero only, paused offscreen) */
(()=>{if(reduce)return;const cv=$('#dust'),cx=cv.getContext('2d'),hero=cv.parentElement;let W,H,ps=[],run=false;
  const size=()=>{const r=hero.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);W=cv.width=r.width*d;H=cv.height=r.height*d;
    const n=Math.round(Math.min(46,r.width/24));ps=Array.from({length:n},()=>({x:Math.random()*W,y:Math.random()*H,r:(Math.random()*1.8+.6)*d,v:(Math.random()*.25+.08)*d,a:Math.random()*.6+.2,p:Math.random()*6}));};
  const draw=(t)=>{if(!run)return;cx.clearRect(0,0,W,H);ps.forEach((p)=>{p.y-=p.v;p.x+=Math.sin(t/1800+p.p)*.25;if(p.y<-5){p.y=H+5;p.x=Math.random()*W;}
      cx.beginPath();cx.fillStyle=`rgba(230,201,122,${p.a*(.6+.4*Math.sin(t/700+p.p))})`;cx.arc(p.x,p.y,p.r,0,6.283);cx.fill();});raf(draw);};
  new IntersectionObserver((es)=>{run=es[0].isIntersecting;if(run)raf(draw);}).observe(hero);
  size();addEventListener('resize',size);})();
document.querySelectorAll('#cat figure').forEach((f)=>f.classList.add('in'));
