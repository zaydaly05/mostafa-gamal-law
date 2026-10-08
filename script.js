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

/* puzzle intro */
const loader=$('#loader'),heroGo=()=>document.querySelector('.hero').classList.add('go');
(()=>{
  const N=4,C=512/N,NS='http://www.w3.org/2000/svg',stage=$('#introStage');
  const hues=['#e6c97a','#e8788a','#5fc9c0','#9b8cf0','#6aa8ff','#f0a35e'];
  let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
  // edge signs for jigsaw tabs: h[i][j] horizontal edge below piece(i,j), v[i][j] vertical edge right of piece(i,j)
  const h=[],v=[];for(let i=0;i<N;i++){h.push([]);v.push([]);for(let j=0;j<N;j++){h[i].push(rnd()<.5?1:-1);v[i].push(rnd()<.5?1:-1);}}
  const tab=(x0,y0,x1,y1,s)=>{ // from p0 to p1 with tab bulging to side s (+1 = left of direction)
    const dx=x1-x0,dy=y1-y0,nx=-dy*s,ny=dx*s,P=(t,k)=>`${(x0+dx*t+nx*k).toFixed(1)} ${(y0+dy*t+ny*k).toFixed(1)}`;
    return `L ${P(.38,0)} C ${P(.38,.07)} ${P(.33,.1)} ${P(.33,.17)} C ${P(.33,.29)} ${P(.67,.29)} ${P(.67,.17)} C ${P(.67,.1)} ${P(.62,.07)} ${P(.62,0)} L ${P(1,0)} `;};
  const pieces=[];
  const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','-40 -40 592 592');svg.setAttribute('aria-hidden','true');
  const defs=document.createElementNS(NS,'defs');svg.appendChild(defs);
  const cc=document.createElementNS(NS,'clipPath');cc.id='pzc';const ci=document.createElementNS(NS,'circle');ci.setAttribute('cx','256');ci.setAttribute('cy','256');ci.setAttribute('r','236');cc.appendChild(ci);defs.appendChild(cc);
  for(let i=0;i<N;i++)for(let j=0;j<N;j++){
    const x=j*C,y=i*C;let d=`M ${x} ${y} `;
    d+=i===0?`L ${x+C} ${y} `:tab(x,y,x+C,y,-h[i-1][j]);           // top edge shared with piece above
    d+=j===N-1?`L ${x+C} ${y+C} `:tab(x+C,y,x+C,y+C,v[i][j]);             // right
    d+=i===N-1?`L ${x} ${y+C} `:tab(x+C,y+C,x,y+C,h[i][j]);               // bottom
    d+=j===0?`L ${x} ${y} Z`:tab(x,y+C,x,y,-v[i][j-1])+'Z';          // left shared with left neighbour
    const id='pz'+i+j,cp=document.createElementNS(NS,'clipPath');cp.id=id;
    const cpp=document.createElementNS(NS,'path');cpp.setAttribute('d',d);cp.appendChild(cpp);defs.appendChild(cp);
    const g=document.createElementNS(NS,'g');g.style.transformBox='fill-box';g.style.transformOrigin='center';
    const img=document.createElementNS(NS,'image');img.setAttribute('href','img/logo.webp');img.setAttribute('width','512');img.setAttribute('height','512');img.setAttribute('clip-path',`url(#${id})`);
    const tint=document.createElementNS(NS,'path');tint.setAttribute('d',d);tint.setAttribute('fill',hues[(i+j*2)%hues.length]);tint.style.mixBlendMode='color';tint.style.opacity='.9';
    const edge=document.createElementNS(NS,'path');edge.setAttribute('d',d);edge.setAttribute('fill','none');edge.setAttribute('stroke','#fff1c1');edge.setAttribute('stroke-width','3');edge.setAttribute('clip-path','url(#pzc)');edge.style.opacity='.9';
    g.append(img,tint,edge);svg.appendChild(g);pieces.push({g,tint,edge,i,j});}
  stage.appendChild(svg);
  const bar=$('#introBar'),pct=$('#introPct'),name=$('#introName'),skip=$('#introSkip');
  const setP=(p)=>{bar.style.width=p+'%';pct.textContent=new Intl.NumberFormat('ar-EG').format(Math.round(p))+'٪';};
  let finished=false,loaded=false,assembled=false,tStart=performance.now();
  const finish=()=>{if(finished)return;finished=true;setP(100);stage.classList.add('final');loader.classList.add('done');
    setTimeout(heroGo,reduce?0:450);setTimeout(()=>{loader.classList.add("gone");},reduce?500:1750);};
  skip.addEventListener('click',finish);
  addEventListener('load',()=>{loaded=true;if(assembled)setTimeout(finish,1000);});
  setTimeout(finish,16000);
  if(reduce){pieces.forEach((p)=>{p.tint.style.opacity=0;p.edge.style.opacity=0;});name.classList.add('on');assembled=true;setP(100);setTimeout(()=>{if(loaded||document.readyState==='complete')finish();},500);return;}
  const order=pieces.map((_,k)=>k).sort(()=>rnd()-.5);
  const K=2,total=2100*K;
  pieces.forEach((p,k)=>{
    const rank=order.indexOf(k),delay=(200+rank*(1100/pieces.length))*K,dur=(900+rnd()*300)*K;
    const ang=rnd()*6.283,dist=420+rnd()*380,dx=Math.cos(ang)*dist,dy=Math.sin(ang)*dist,rot=(rnd()-.5)*720,sc=.3+rnd()*1.4;
    p.g.animate([{transform:`translate(${dx}px,${dy}px) rotate(${rot}deg) scale(${sc})`,opacity:0},{opacity:1,offset:.25},{transform:'none',opacity:1}],{duration:dur,delay,easing:'cubic-bezier(.3,1.25,.45,1)',fill:'both'});
    const land=delay+dur*.82;
    p.tint.animate([{opacity:.9},{opacity:.9,offset:.55},{opacity:0}],{duration:land+1000,easing:'ease-out',fill:'both'});
    p.edge.animate([{opacity:.95},{opacity:.95,offset:.8},{opacity:.0}],{duration:land+1500,easing:'ease-in',fill:'both'});
    setTimeout(()=>{p.g.animate([{transform:'scale(1)'},{transform:'scale(1.05)'},{transform:'scale(1)'}],{duration:520,easing:'ease-out'});},land);
  });
  const t0=performance.now(),tick=()=>{const t=performance.now()-t0,p=Math.min(t/(total+300),1);if(!finished)setP(Math.min(p*96,96));if(p<1&&!finished)requestAnimationFrame(tick);};requestAnimationFrame(tick);
  setTimeout(()=>{assembled=true;stage.classList.add('final');stage.animate([{filter:'drop-shadow(0 0 0 rgba(255,241,193,0)) brightness(1)'},{filter:'drop-shadow(0 0 50px rgba(255,241,193,.95)) brightness(1.5)'},{filter:'drop-shadow(0 18px 40px rgba(0,0,0,.6)) brightness(1)'}],{duration:1500,easing:'ease-out'});name.classList.add('on');
    if(loaded||document.readyState==='complete')setTimeout(finish,1200);},total+500);
})();

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
