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
 setTimeout(()=>overlay.remove(),560);
 try{sessionStorage.setItem('fde-entry-seen','1')}catch{}
}
function circuitSvg(){return `
 <svg class="fde-circuit-svg" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true">
  <defs>
   <filter id="fdeCircuitGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
   <filter id="fdeNodeGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="7" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <g class="fde-circuit-base fde-left">
   <path d="M0 170 H170 L235 235 H390 L455 300 H585"/><path d="M0 260 H120 L190 330 H340 L415 405 H610"/>
   <path d="M0 350 H205 L270 415 H445 L510 480 H620"/><path d="M0 445 H145 L215 515 H350 L425 590 H590"/>
   <path d="M0 535 H185 L245 595 H405 L475 665 H615"/><path d="M0 630 H110 L185 705 H330 L395 770 H555"/>
   <path d="M65 90 V145 H255 L325 215 H485"/><path d="M95 805 V750 H260 L325 685 H505"/>
  </g>
  <g class="fde-circuit-base fde-right">
   <path d="M1600 170 H1430 L1365 235 H1210 L1145 300 H1015"/><path d="M1600 260 H1480 L1410 330 H1260 L1185 405 H990"/>
   <path d="M1600 350 H1395 L1330 415 H1155 L1090 480 H980"/><path d="M1600 445 H1455 L1385 515 H1250 L1175 590 H1010"/>
   <path d="M1600 535 H1415 L1355 595 H1195 L1125 665 H985"/><path d="M1600 630 H1490 L1415 705 H1270 L1205 770 H1045"/>
   <path d="M1535 90 V145 H1345 L1275 215 H1115"/><path d="M1505 805 V750 H1340 L1275 685 H1095"/>
  </g>
  <g class="fde-circuit-energy fde-left-energy">
   <path d="M0 170 H170 L235 235 H390 L455 300 H585"/><path d="M0 260 H120 L190 330 H340 L415 405 H610"/>
   <path d="M0 350 H205 L270 415 H445 L510 480 H620"/><path d="M0 445 H145 L215 515 H350 L425 590 H590"/>
   <path d="M0 535 H185 L245 595 H405 L475 665 H615"/><path d="M0 630 H110 L185 705 H330 L395 770 H555"/>
  </g>
  <g class="fde-circuit-energy fde-right-energy">
   <path d="M1600 170 H1430 L1365 235 H1210 L1145 300 H1015"/><path d="M1600 260 H1480 L1410 330 H1260 L1185 405 H990"/>
   <path d="M1600 350 H1395 L1330 415 H1155 L1090 480 H980"/><path d="M1600 445 H1455 L1385 515 H1250 L1175 590 H1010"/>
   <path d="M1600 535 H1415 L1355 595 H1195 L1125 665 H985"/><path d="M1600 630 H1490 L1415 705 H1270 L1205 770 H1045"/>
  </g>
  <g class="fde-circuit-nodes">
   <circle cx="170" cy="170" r="6"/><circle cx="235" cy="235" r="5"/><circle cx="390" cy="235" r="5"/><circle cx="455" cy="300" r="7"/>
   <circle cx="190" cy="330" r="6"/><circle cx="415" cy="405" r="6"/><circle cx="270" cy="415" r="5"/><circle cx="510" cy="480" r="7"/>
   <circle cx="215" cy="515" r="6"/><circle cx="425" cy="590" r="5"/><circle cx="245" cy="595" r="5"/><circle cx="475" cy="665" r="7"/>
   <circle cx="1430" cy="170" r="6"/><circle cx="1365" cy="235" r="5"/><circle cx="1210" cy="235" r="5"/><circle cx="1145" cy="300" r="7"/>
   <circle cx="1410" cy="330" r="6"/><circle cx="1185" cy="405" r="6"/><circle cx="1330" cy="415" r="5"/><circle cx="1090" cy="480" r="7"/>
   <circle cx="1385" cy="515" r="6"/><circle cx="1175" cy="590" r="5"/><circle cx="1355" cy="595" r="5"/><circle cx="1125" cy="665" r="7"/>
  </g>
 </svg>`}
function mountIntro(){
 const overlay=document.createElement('div');overlay.id='fdeEntryIntro';overlay.className='fde-entry-intro';overlay.setAttribute('aria-label','Baked Kale');
 overlay.innerHTML=`${circuitSvg()}<div class="fde-entry-center-glow" aria-hidden="true"></div><div class="fde-entry-stage"><div class="fde-entry-logo-wrap"><div class="fde-entry-logo-mask"><img class="fde-entry-logo" src="assets/baked-kale-logo.svg" alt="Baked Kale — FDE / IT Engineering"></div><i class="fde-entry-pulse p1" aria-hidden="true"></i><i class="fde-entry-pulse p2" aria-hidden="true"></i></div></div><button class="fde-entry-skip" type="button" aria-label="Skip intro">SKIP</button>`;
 document.body.prepend(overlay);document.documentElement.style.overflow='hidden';document.body.style.overflow='hidden';
 overlay.querySelector('.fde-entry-skip')?.addEventListener('click',()=>finishIntro(overlay));
 overlay.addEventListener('click',e=>{if(e.target===overlay)finishIntro(overlay)});
 setTimeout(()=>finishIntro(overlay),1900);
}
function init(){revealSections();if(shouldIntro)mountIntro();else heroIn(70)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
