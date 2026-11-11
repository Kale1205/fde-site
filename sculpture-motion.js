// Explicit page/position slots. Each full presentation rests before repeating.
import {illustration as originalIllustration, renderOriginalScene, SOURCE_SCENES} from './original-pixel-scenes.js';
import {APPROVED_SCENES, approvedIllustration, approvedAssets, renderApprovedScene} from './adopted-sculpture-scenes.js';
import {licenseUpgradeIllustration,licenseUpgradeAssets,renderLicenseUpgrade} from './license-upgrade-scene.js';
import {goals02Illustration,goals02Assets,renderGoals02} from './goals02-scene.js';
import {motionPreference} from './motion-preferences.js';

export const MOTION_DURATION=4800,REST_DURATION=1000,CYCLE_DURATION=MOTION_DURATION+REST_DURATION;
export function motionTargetsForPath(pathname){
 const page=pathname.split('/').at(-1)||'index.html';
 if(page==='index.html')return [
  {kind:'license',slot:'plans-license',selector:'body.quiet-home #plans.quiet-plans .quiet-comparison .plan-top > img.comparison-sculpture[src$="ims-license-update.webp"]'},
  {kind:'plus',slot:'plans-plus',selector:'body.quiet-home #plans.quiet-plans .quiet-comparison .plan-top > img.comparison-sculpture[src$="ims-license-plus-customize.webp"]'}
 ];
 if(page==='goals.html')return [
  {kind:'understand',slot:'goals01',selector:'body.goals-journey #fde.mission-chapter .mission-visual > img.mission-art[src$="goals-understand-work.png"]'},
  {kind:'assemble',slot:'goals02',selector:'body.goals-journey #approach.mission-chapter .mission-visual > img.mission-art[src$="goals-open-system.png"]'},
  {kind:'partner',slot:'goals03',selector:'body.goals-journey #partnership.mission-chapter .mission-visual > img.mission-art[src$="goals-partner-dialogue.png"]'}
 ];
 return [];
}
function sourceRoot(kind,source){
 const file=SOURCE_SCENES[kind]?.file;if(!file)throw Error('Unknown sculpture');source ||= 'assets/'+file;
 if(!/^(?:\.\.\/)*assets\/[\w-]+\.(?:png|webp)$/.test(source)||source.split('/').at(-1)!==file)throw Error('Unexpected source image');
 return source.slice(0,source.lastIndexOf('/')+1);
}
export function illustration(kind,id,source){if(kind==='assemble')return goals02Illustration(id,sourceRoot(kind,source));if(kind==='license')return licenseUpgradeIllustration(id,sourceRoot(kind,source));return APPROVED_SCENES[kind]?approvedIllustration(kind,id,sourceRoot(kind,source)):originalIllustration(kind,id,source);}
export function motionState({visible,hidden,reduced,paused=false,resting=false}){return reduced?'static':visible&&!hidden&&!paused?(resting?'resting':'running'):'paused';}
export function playbackStep(elapsed,delta){
 const current=Math.max(0,elapsed),next=current+Math.max(0,delta);
 // Cross one boundary at a time, so a delayed frame cannot skip the rest.
 const value=current<MOTION_DURATION?Math.min(MOTION_DURATION,next):next>=CYCLE_DURATION?0:next;
 return {elapsed:value,phase:Math.min(1,value/MOTION_DURATION),resting:value>=MOTION_DURATION,restarted:current>=MOTION_DURATION&&value===0};
}

if(typeof document!=='undefined'){
 const preference=motionPreference,art=[],candidates=[],resources=new Map();
 let suspended=false,frameId=0,lastTime=null,serial=0;
 const ticking=item=>['running','resting'].includes(item.element.dataset.motionState);
 const running=()=>art.some(ticking);
 function draw(item,phase){
  if(item.phase===phase)return;item.phase=phase;
  if(item.kind==='assemble')renderGoals02(item.element,phase);
  else if(item.kind==='license')renderLicenseUpgrade(item.element,phase);
  else if(APPROVED_SCENES[item.kind])renderApprovedScene(item.element,item.kind,phase);
  else{
   // Preserve the approved trajectory and fill, with a native-image loop seam.
   if(!item.partner){
    const svg=item.element.querySelector('svg'),active=document.createElementNS('http://www.w3.org/2000/svg','g'),rest=document.createElementNS('http://www.w3.org/2000/svg','image');
    for(const child of [...svg.children])if(child.tagName.toLowerCase()!=='defs')active.append(child);
    rest.setAttribute('href',item.source);rest.setAttribute('width','1536');rest.setAttribute('height','1024');rest.setAttribute('data-final-source','');svg.append(active,rest);item.partner={active,rest};
   }
   const pose=phase*.91;renderOriginalScene(item.element,item.kind,pose);
   if(pose>=.90)for(const bar of item.element.querySelectorAll('[data-filled]'))bar.setAttribute('opacity','1');
   const smooth=v=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);},blend=smooth(phase/.04)*(1-smooth((phase-.94)/.06));
   item.partner.active.setAttribute('opacity',blend.toFixed(7));item.partner.rest.setAttribute('opacity',(1-blend).toFixed(7));
  }
  item.element.dataset.motionPhase=phase.toFixed(7);
 }
 function settle(item){item.elapsed=MOTION_DURATION;draw(item,1);}
 function state(item){
  const value=motionState({visible:item.visible,hidden:document.hidden||suspended,reduced:preference.matches,resting:item.elapsed>=MOTION_DURATION});
  if(item.element.dataset.motionState!==value)item.element.dataset.motionState=value;
 }
 function frame(now){
  frameId=0;const delta=lastTime===null?0:Math.max(0,now-lastTime);lastTime=now;
  for(const item of art)if(ticking(item)){
   const next=playbackStep(item.elapsed,delta);item.elapsed=next.elapsed;if(next.restarted)item.element.dataset.motionCycle=String(++item.cycles);draw(item,next.phase);state(item);
  }
  if(running())frameId=requestAnimationFrame(frame);else lastTime=null;
 }
 function sync(){
  for(const item of art)state(item);
  if(running()){if(!frameId){lastTime=null;frameId=requestAnimationFrame(frame);}}else{if(frameId)cancelAnimationFrame(frameId);frameId=0;lastTime=null;}
 }
 function ready(url){
  if(!resources.has(url))resources.set(url,new Promise((resolve,reject)=>{
   const image=new Image();image.decoding='async';image.onload=()=>{if(image.decode)image.decode().then(()=>resolve(),reject);else resolve();};image.onerror=()=>reject(Error('Sculpture asset unavailable'));image.src=url;
  }));return resources.get(url);
 }
 const visibleObserver='IntersectionObserver'in window?new IntersectionObserver(entries=>{
  for(const entry of entries){const item=art.find(x=>x.element===entry.target);if(item)item.visible=entry.isIntersecting;}sync();
 },{rootMargin:'0px'}):null;
 async function mount(candidate){
  if(candidate.started||preference.matches||!candidate.near)return;candidate.started=true;
  const {image,kind,slot}=candidate,source=image.getAttribute('src');
  try{
   const files=kind==='assemble'?goals02Assets(sourceRoot(kind,source)):kind==='license'?licenseUpgradeAssets(sourceRoot(kind,source)):APPROVED_SCENES[kind]?approvedAssets(kind,sourceRoot(kind,source)):[source];await Promise.all(files.map(file=>ready(new URL(file,document.baseURI).href)));
   if(!image.isConnected)return;if(preference.matches){candidate.started=false;return;}
   const wrapper=document.createElement('span');wrapper.className=`${image.className} animated-sculpture art-${kind}`;
   wrapper.setAttribute('aria-hidden','true');wrapper.dataset.motionKind=kind;wrapper.dataset.motionSlot=slot;wrapper.dataset.motionReach=kind==='assemble'?'reconstructed-parts':kind==='license'?'arrow-upgrade':APPROVED_SCENES[kind]?'approved-parts':'adopted-parts';wrapper.dataset.motionState='paused';wrapper.dataset.motionDuration=String(MOTION_DURATION);wrapper.dataset.motionRest=String(REST_DURATION);wrapper.dataset.motionCycle='0';
   wrapper.innerHTML=illustration(kind,`source-art-${serial++}`,source);
   const item={element:wrapper,kind,source,elapsed:0,phase:null,cycles:0,visible:!visibleObserver};draw(item,0);image.replaceWith(wrapper);art.push(item);loadObserver?.unobserve(image);visibleObserver?.observe(wrapper);sync();
  }catch{image.dataset.motionReach=image.dataset.sourceError?'unavailable':'source-fallback';image.dataset.motionState='static';loadObserver?.unobserve(image);sync();}
 }
 const loadObserver='IntersectionObserver'in window?new IntersectionObserver(entries=>{
  for(const entry of entries){const candidate=candidates.find(x=>x.image===entry.target);if(candidate){candidate.near=entry.isIntersecting;if(candidate.near)mount(candidate);}}
 },{rootMargin:'200px'}):null;
 for(const target of motionTargetsForPath(location.pathname))for(const image of document.querySelectorAll(target.selector)){
  const unavailable=()=>{image.dataset.sourceError='true';image.dataset.motionReach='unavailable';image.style.visibility='hidden';};image.addEventListener('error',unavailable,{once:true});if(image.complete&&!image.naturalWidth)unavailable();
  image.dataset.motionReach='source-pending';candidates.push({image,...target,near:!loadObserver,started:false});
 }
 if(candidates.length){
  document.addEventListener('visibilitychange',sync);
  preference.addEventListener('change',()=>{
   if(preference.matches){for(const item of art)settle(item);}else for(const candidate of candidates)if(candidate.image.isConnected)mount(candidate);sync();
  });
  window.addEventListener('pagehide',()=>{suspended=true;sync();});window.addEventListener('pageshow',()=>{suspended=false;sync();});
  for(const candidate of candidates){if(loadObserver)loadObserver.observe(candidate.image);else mount(candidate);}sync();
 }
}
