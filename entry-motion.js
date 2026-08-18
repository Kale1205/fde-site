(()=>{
const HOME_RE=/\/(fde-site\/)?(?:index\.html)?$/;
const isHome=HOME_RE.test(location.pathname);
if(!isHome)return;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const nav=performance.getEntriesByType?.('navigation')?.[0];
let external=true;
try{external=!document.referrer||new URL(document.referrer).origin!==location.origin}catch{}
let seen=false;try{seen=sessionStorage.getItem('fde-entry-seen')==='1'}catch{}
const force=new URLSearchParams(location.search).get('intro')==='1';
const shouldIntro=!reduced&&(force||(!seen&&external&&(!nav||nav.type==='navigate')));

function heroIn(delay=40){setTimeout(()=>document.body?.classList.add('fde-hero-enter'),delay)}
function revealSections(){
 const targets=[
  '.products-visual-copy','.visual-board','.products-flow-rail article',
  '#plans .section-head','#plans .flip-shell','.service-table-wrap',
  '.steps .step','.security-grid article','#demo .demo-box'
 ];
 const els=[...document.querySelectorAll(targets.join(','))];
 if(reduced||!('IntersectionObserver'in window)){els.forEach(el=>el.classList.add('fde-reveal','is-visible'));return}
 els.forEach(el=>el.classList.add('fde-reveal'));
 const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');io.unobserve(entry.target)}}),{rootMargin:'0px 0px -8% 0px',threshold:.08});
 els.forEach(el=>io.observe(el));
}
function finishIntro(overlay){
 if(!overlay||overlay.dataset.done)return;overlay.dataset.done='1';
 overlay.classList.add('is-leaving');document.documentElement.style.overflow='';document.body.style.overflow='';heroIn(120);
 setTimeout(()=>overlay.remove(),520);
 try{sessionStorage.setItem('fde-entry-seen','1')}catch{}
}
function mountIntro(){
 const overlay=document.createElement('div');overlay.id='fdeEntryIntro';overlay.className='fde-entry-intro';overlay.setAttribute('aria-label','Baked Kale');
 overlay.innerHTML='<div class="fde-entry-circuit" aria-hidden="true"><i class="fde-entry-wire w1"></i><i class="fde-entry-wire w2"></i><i class="fde-entry-wire w3"></i><i class="fde-entry-wire w4"></i></div><div class="fde-entry-stage"><div class="fde-entry-logo-wrap"><div class="fde-entry-logo-mask"><img class="fde-entry-logo" src="assets/baked-kale-logo.svg" alt="Baked Kale — FDE / IT Engineering"></div><i class="fde-entry-pulse" aria-hidden="true"></i></div></div><button class="fde-entry-skip" type="button" aria-label="Skip intro">SKIP</button>';
 document.body.prepend(overlay);document.documentElement.style.overflow='hidden';document.body.style.overflow='hidden';
 overlay.querySelector('.fde-entry-skip')?.addEventListener('click',()=>finishIntro(overlay));
 overlay.addEventListener('click',e=>{if(e.target===overlay)finishIntro(overlay)});
 setTimeout(()=>finishIntro(overlay),1580);
}
function init(){revealSections();if(shouldIntro)mountIntro();else heroIn(70)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
