// Explicit page/position slots. Decorative motion plays once, then rests.
import {illustration as originalIllustration, renderOriginalScene, SOURCE_SCENES} from './original-pixel-scenes.js';
import {APPROVED_SCENES, approvedIllustration, approvedAssets, renderApprovedScene} from './adopted-sculpture-scenes.js';
import {licenseUpgradeIllustration,licenseUpgradeAssets,renderLicenseUpgrade} from './license-upgrade-scene.js';

export const ONCE_DURATION=4800;
export function motionTargetsForPath(pathname){
 const page=pathname.split('/').at(-1)||'index.html';
 if(page==='index.html')return [
  {kind:'license',slot:'plans-license',selector:'body.quiet-home #plans.quiet-plans .quiet-comparison .plan-top > img.comparison-sculpture[src$="ims-license-update.webp"]'},
  {kind:'plus',slot:'plans-plus',selector:'body.quiet-home #plans.quiet-plans .quiet-comparison .plan-top > img.comparison-sculpture[src$="ims-license-plus-customize.webp"]'}
 ];
 if(page==='goals.html')return [
  {kind:'understand',slot:'goals01',selector:'body.goals-journey #fde.mission-chapter .mission-visual > img.mission-art[src$="goals-understand-work.png"]'},
  {kind:'partner',slot:'goals03',selector:'body.goals-journey #partnership.mission-chapter .mission-visual > img.mission-art[src$="goals-partner-dialogue.png"]'}
 ];
 return [];
}
function sourceRoot(kind,source){
 const file=SOURCE_SCENES[kind]?.file;if(!file)throw Error('Unknown sculpture');source ||= 'assets/'+file;
 if(!/^(?:\.\.\/)*assets\/[\w-]+\.(?:png|webp)$/.test(source)||source.split('/').at(-1)!==file)throw Error('Unexpected source image');
 return source.slice(0,source.lastIndexOf('/')+1);
}
export function illustration(kind,id,source){if(kind==='license')return licenseUpgradeIllustration(id,sourceRoot(kind,source));return APPROVED_SCENES[kind]?approvedIllustration(kind,id,sourceRoot(kind,source)):originalIllustration(kind,id,source);}
export function motionState({visible,hidden,reduced,paused=false,completed=false}){return completed?'finished':visible&&!hidden&&!reduced&&!paused?'running':'paused';}
export function playbackStep(elapsed,delta){
 const next=Math.min(ONCE_DURATION,Math.max(0,elapsed)+Math.max(0,delta));
 return {elapsed:next,phase:next/ONCE_DURATION,completed:next===ONCE_DURATION};
}

if(typeof document!=='undefined'){
 const preference=matchMedia('(prefers-reduced-motion: reduce)'),art=[],candidates=[],resources=new Map();
 let suspended=false,frameId=0,lastTime=null,serial=0;
 const running=()=>art.some(item=>item.element.dataset.motionState==='running');
 function draw(item,phase){
  if(item.kind==='license')renderLicenseUpgrade(item.element,phase);
  else if(APPROVED_SCENES[item.kind])renderApprovedScene(item.element,item.kind,phase);
  else{
   // Finish the partner's approved forward/back motion, omitting only the
   // looping reset fade so its completed bars stay filled as it comes to rest.
   const pose=phase*.91;renderOriginalScene(item.element,item.kind,pose);
   if(pose>=.90)for(const bar of item.element.querySelectorAll('[data-filled]'))bar.setAttribute('opacity','1');
  }
  item.element.dataset.motionPhase=phase.toFixed(7);
 }
 function finish(item){
  if(item.completed)return;item.completed=true;item.elapsed=ONCE_DURATION;draw(item,1);item.element.dataset.motionState='finished';
  // The partner's loop renderer fades its bars to restart. A one-shot ends on
  // the unchanged native image instead, with the bars fully visible.
  if(item.kind==='partner'){
   const svg=item.element.querySelector('svg');for(const child of svg.children)if(child.tagName.toLowerCase()!=='defs')child.setAttribute('display','none');
   const image=document.createElementNS('http://www.w3.org/2000/svg','image');image.setAttribute('href',item.source);image.setAttribute('width','1536');image.setAttribute('height','1024');image.setAttribute('data-final-source','');svg.append(image);
  }
 }
 function frame(now){
  frameId=0;const delta=lastTime===null?0:Math.max(0,now-lastTime);lastTime=now;
  for(const item of art)if(item.element.dataset.motionState==='running'){
   const next=playbackStep(item.elapsed,delta);item.elapsed=next.elapsed;if(next.completed)finish(item);else draw(item,next.phase);
  }
  if(running())frameId=requestAnimationFrame(frame);else lastTime=null;
 }
 function sync(){
  for(const item of art)item.element.dataset.motionState=motionState({visible:item.visible,hidden:document.hidden||suspended,reduced:preference.matches,completed:item.completed});
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
   const files=kind==='license'?licenseUpgradeAssets(sourceRoot(kind,source)):APPROVED_SCENES[kind]?approvedAssets(kind,sourceRoot(kind,source)):[source];await Promise.all(files.map(file=>ready(new URL(file,document.baseURI).href)));
   if(!image.isConnected)return;if(preference.matches){candidate.started=false;return;}
   const wrapper=document.createElement('span');wrapper.className=`${image.className} animated-sculpture art-${kind}`;
   wrapper.setAttribute('aria-hidden','true');wrapper.dataset.motionKind=kind;wrapper.dataset.motionSlot=slot;wrapper.dataset.motionReach=kind==='license'?'arrow-upgrade':APPROVED_SCENES[kind]?'approved-parts':'adopted-parts';wrapper.dataset.motionState='paused';wrapper.dataset.motionDuration=String(ONCE_DURATION);
   wrapper.innerHTML=illustration(kind,`source-art-${serial++}`,source);
   const item={element:wrapper,kind,source,elapsed:0,completed:false,visible:!visibleObserver};draw(item,0);image.replaceWith(wrapper);art.push(item);loadObserver?.unobserve(image);visibleObserver?.observe(wrapper);sync();
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
   if(preference.matches){for(const item of art)finish(item);}else for(const candidate of candidates)if(candidate.image.isConnected)mount(candidate);sync();
  });
  window.addEventListener('pagehide',()=>{suspended=true;sync();});window.addEventListener('pageshow',()=>{suspended=false;sync();});
  for(const candidate of candidates){if(loadObserver)loadObserver.observe(candidate.image);else mount(candidate);}sync();
 }
}
