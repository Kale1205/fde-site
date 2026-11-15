/* Shared by the LP canvas, its native preview and the individual case pages. */
(() => {
 'use strict';
 const html=document.documentElement,themeKey='bk-archive-theme',motionKey='bk-detail-motion';
 const read=key=>{try{return sessionStorage.getItem(key);}catch{return null;}};
 const write=(key,value)=>{try{sessionStorage.setItem(key,value);}catch{}};
 let dark=read(themeKey)==='dark',userPaused=read(motionKey)==='paused',ready=false;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let paused=userPaused||reduced.matches;
 html.toggleAttribute('data-lp-motion-paused',paused);
 const media=new Map(),animations=new Set();
 const scopeSelector='[data-lp-motion-scope]';
 const inScope=element=>element instanceof Element&&!!element.closest(scopeSelector);
 const canResume=element=>element?.isConnected&&inScope(element)&&!element.closest('dialog:not([open]),[hidden]')&&element.getClientRects().length>0&&getComputedStyle(element).visibility!=='hidden';
 const emit=()=>document.dispatchEvent(new CustomEvent('lp:motionchange',{detail:{paused,userPaused,reducedMotion:reduced.matches}}));

 function setTheme(value,persist=true){
  dark=!!value;html.dataset.lpTheme=dark?'dark':'light';
  if(document.body)document.body.dataset.theme=html.dataset.lpTheme;
  if(persist)write(themeKey,html.dataset.lpTheme);
  document.querySelectorAll('button[data-lp-theme]').forEach(button=>{
   const label=dark?'昼の表示に切り替え':'夜の表示に切り替え';
   button.setAttribute('aria-pressed',String(dark));button.setAttribute('aria-label',label);button.title=label;
   const icon=button.querySelector('[data-lp-theme-icon]');if(icon)icon.textContent=dark?'☀':'☾';
  });
 }
 // Execute in the head before styles paint, including a restored navigation.
 setTheme(dark,false);

 function pauseMedia(element){
  if(!inScope(element))return;
  // An already paused/manual video must stay paused when the visitor resumes.
  const playing=!element.paused&&!element.ended;
  if(playing)media.set(element,true);
  if(playing)element.pause();
 }
 function pauseAnimation(animation){
  const target=animation.effect?.target;
  // Hover, focus and form feedback transitions remain responsive while paused.
  if(typeof CSSTransition!=='undefined'&&animation instanceof CSSTransition)return;
  if(!inScope(target?.element||target)||!['running','pending'].includes(animation.playState)&&!animation.pending)return;
  animations.add(animation);animation.pause();
 }
 function scan(){
  if(!paused)return;
  document.querySelectorAll(scopeSelector+' video,'+scopeSelector+' audio').forEach(pauseMedia);
  // Includes CSS animations and animations on pseudo elements.
  document.getAnimations?.().forEach(pauseAnimation);
  for(const element of media.keys())if(!element.isConnected)media.delete(element);
  for(const animation of animations){
   const target=animation.effect?.target,element=target?.element||target;
   if(!element?.isConnected||['idle','finished'].includes(animation.playState))animations.delete(animation);
  }
 }
 function syncButtons(){
  document.querySelectorAll('button[data-lp-motion]').forEach(button=>{
   const label=reduced.matches?'端末の設定により動きを停止中':paused?'動きを再開':'動きを一時停止';
   button.setAttribute('aria-pressed',String(paused));button.setAttribute('aria-label',label);button.title=label;
   button.disabled=reduced.matches;
   const icon=button.querySelector('[data-lp-motion-icon]');if(icon)icon.textContent=paused?'▶':'Ⅱ';
  });
 }
 function updateMotion(){
  const next=userPaused||reduced.matches,changed=next!==paused;paused=next;
  html.toggleAttribute('data-lp-motion-paused',paused);
  // Freeze running WAAPI and media; the root flag also covers pre-init CSS.
  if(paused)scan();
  document.querySelectorAll(scopeSelector).forEach(scope=>scope.toggleAttribute('data-lp-motion-paused',paused));
  if(changed&&!paused){
   const restartMedia=[...media.keys()],restartAnimations=[...animations];media.clear();animations.clear();
   for(const animation of restartAnimations){
    const target=animation.effect?.target;
    if(canResume(target?.element||target)&&animation.playState==='paused')animation.play();
   }
   for(const element of restartMedia)if(canResume(element)&&!element.ended){
    // Browser autoplay policy may require another explicit press on the video.
    try{element.play()?.catch(()=>{});}catch{}
   }
  }
  syncButtons();if(changed)emit();
 }
 function setPaused(value){userPaused=!!value;write(motionKey,userPaused?'paused':'playing');updateMotion();}
 function refresh(){setTheme(dark,false);updateMotion();}

 // WAAPI has no start event. Observe newly created animations at the creation
 // boundary instead of keeping a polling/render loop alive while paused.
 const nativeAnimate=Element.prototype.animate;
 if(nativeAnimate)Element.prototype.animate=function(...args){
  const animation=nativeAnimate.apply(this,args);
  if(paused&&inScope(this))pauseAnimation(animation);
  return animation;
 };
 const nativePlay=typeof Animation!=='undefined'&&Animation.prototype.play;
 if(nativePlay)Animation.prototype.play=function(...args){
  const result=nativePlay.apply(this,args);if(paused)pauseAnimation(this);return result;
 };
 document.addEventListener('play',event=>{if(paused)pauseMedia(event.target);},true);
 document.addEventListener('close',event=>{
  if(event.target.tagName!=='DIALOG')return;
  for(const element of media.keys())if(event.target.contains(element))media.delete(element);
 },true);
 document.addEventListener('animationstart',scan,true);
 document.addEventListener('click',event=>{
  const themeButton=event.target.closest('button[data-lp-theme]'),motionButton=event.target.closest('button[data-lp-motion]');
  if(themeButton)setTheme(!dark);
  if(motionButton&&!reduced.matches)setPaused(!userPaused);
 });
 function init(){
  if(ready)return;ready=true;refresh();
  new MutationObserver(records=>{
   if(records.some(record=>record.type==='childList'||record.attributeName==='autoplay')){
    if(paused){scan();document.querySelectorAll(scopeSelector).forEach(scope=>scope.setAttribute('data-lp-motion-paused',''));}
   }
  }).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['autoplay']});
 }
 reduced.addEventListener('change',updateMotion);
 addEventListener('pageshow',()=>{
  dark=read(themeKey)==='dark';userPaused=read(motionKey)==='paused';refresh();
 });
 addEventListener('storage',event=>{
  if(event.key===themeKey){dark=event.newValue==='dark';setTheme(dark,false);}
  if(event.key===motionKey){userPaused=event.newValue==='paused';updateMotion();}
 });
 // Custom JS artwork can subscribe to lp:motionchange and read motionPaused.
 // Current case material uses native media, CSS animations and WAAPI.
 window.BakedKaleDisplay={setTheme,setPaused,refresh,get motionPaused(){return paused;}};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
