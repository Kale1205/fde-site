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
 overlay.classList.add('is-leaving');document.documentElement.style.overflow='';document.body.style.overflow='';heroIn(110);
 setTimeout(()=>overlay.remove(),620);
 try{sessionStorage.setItem('fde-entry-seen','1')}catch{}
}
function circuitSvg(){return `
 <svg class="fde-circuit-svg" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true">
  <g class="fde-circuit-lines fde-left">
   <path d="M0 250 H185 L245 310 H420 L495 385 H650"/>
   <path d="M0 365 H125 L205 445 H390 L455 510 H635"/>
   <path d="M0 510 H165 L230 575 H410 L485 650 H625"/>
   <path d="M70 140 V195 H285 L350 260 H520"/>
  </g>
  <g class="fde-circuit-lines fde-right">
   <path d="M1600 250 H1415 L1355 310 H1180 L1105 385 H950"/>
   <path d="M1600 365 H1475 L1395 445 H1210 L1145 510 H965"/>
   <path d="M1600 510 H1435 L1370 575 H1190 L1115 650 H975"/>
   <path d="M1530 140 V195 H1315 L1250 260 H1080"/>
  </g>
  <g class="fde-signal-lines">
   <path class="signal-left" d="M0 365 H125 L205 445 H390 L455 510 H635"/>
   <path class="signal-right" d="M1600 365 H1475 L1395 445 H1210 L1145 510 H965"/>
  </g>
  <g class="fde-circuit-nodes">
   <circle cx="205" cy="445" r="4"/><circle cx="455" cy="510" r="4"/><circle cx="350" cy="260" r="3.5"/>
   <circle cx="1395" cy="445" r="4"/><circle cx="1145" cy="510" r="4"/><circle cx="1250" cy="260" r="3.5"/>
  </g>
 </svg>`}
function mountIntro(){
 const overlay=document.createElement('div');overlay.id='fdeEntryIntro';overlay.className='fde-entry-intro';overlay.setAttribute('aria-label','Baked Kale');
 overlay.innerHTML=`${circuitSvg()}<div class="fde-entry-center-glow" aria-hidden="true"></div><div class="fde-entry-stage"><div class="fde-entry-logo-wrap"><img class="fde-entry-logo" src="assets/baked-kale-logo.svg" alt="Baked Kale — FDE / IT Engineering"></div></div><button class="fde-entry-skip" type="button" aria-label="Skip intro">SKIP</button>`;
 document.body.prepend(overlay);document.documentElement.style.overflow='hidden';document.body.style.overflow='hidden';
 overlay.querySelector('.fde-entry-skip')?.addEventListener('click',()=>finishIntro(overlay));
 overlay.addEventListener('click',e=>{if(e.target===overlay)finishIntro(overlay)});
 setTimeout(()=>finishIntro(overlay),1750);
}
function init(){revealSections();if(shouldIntro)mountIntro();else heroIn(70)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
