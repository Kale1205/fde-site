const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs');const path=require('node:path');
async function verifyPhotoInspectMotion(target,touch=false){
 const samples=[],viewport=target.viewportSize();
 const equalRect=(a,b)=>a.every((value,i)=>Math.abs(value-b[i])<2);
 const paintIsClear=paint=>paint.every(item=>['filter','backdrop','webkit'].every(key=>!item[key]||item[key]==='none')&&item.image==='none');
 const setReduced=async value=>{
  await target.emulateMedia({reducedMotion:value?'reduce':'no-preference'});
  // Media-query change listeners also update the shared pause controller.
  // Wait for that observable application state before the next user action.
  try{
   await target.waitForFunction(value=>matchMedia('(prefers-reduced-motion: reduce)').matches===value&&window.BakedKaleDisplay?.motionPaused===value,value,{timeout:5000});
  }catch{
   const state=await target.evaluate(()=>({matches:matchMedia('(prefers-reduced-motion: reduce)').matches,paused:window.BakedKaleDisplay?.motionPaused,rootPaused:document.documentElement.hasAttribute('data-lp-motion-paused'),userPaused:sessionStorage.getItem('bk-detail-motion')}));
   throw Error('Application motion preference did not settle '+JSON.stringify({requested:value,...state}));
  }
 };
 await target.evaluate(()=>{
  window.__lpInspectPaint=()=>{
   const dialog=document.querySelector('#inspect');
   return [[dialog,null],[dialog,'::backdrop'],[dialog.querySelector('.inspect-sheet'),null]].map(([node,pseudo])=>{
    const style=getComputedStyle(node,pseudo);return {filter:style.filter,backdrop:style.getPropertyValue('backdrop-filter'),webkit:style.getPropertyValue('-webkit-backdrop-filter'),image:style.backgroundImage,color:style.backgroundColor};
   });
  };
  window.__lpInspectPose=flight=>{const r=flight.getBoundingClientRect();return {rect:[r.x,r.y,r.width,r.height],opacity:[...flight.children].map(child=>Number(getComputedStyle(child).opacity))};};
 });
 const pick=()=>target.locator('.material-print').evaluateAll(nodes=>{
  const candidates=nodes.filter(node=>Number(node.dataset.material)>=0).map(node=>{
   const r=node.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,key=node.dataset.archiveSource||node.dataset.slot;
   const copies=nodes.filter(other=>(other.dataset.archiveSource||other.dataset.slot)===key);
   return {x,y,copy:copies.indexOf(node),copies:copies.length,hit:document.elementFromPoint(x,y)?.closest('.material-print')===node};
  }).filter(p=>p.x>25&&p.x<innerWidth-25&&p.y>110&&p.y<innerHeight-80&&p.hit).sort((a,b)=>(b.copy>0)-(a.copy>0)||Math.hypot(a.x-innerWidth/2,a.y-innerHeight/2)-Math.hypot(b.x-innerWidth/2,b.y-innerHeight/2));
  if(!candidates.length)throw Error('No visible repeated photo for inspect motion');return candidates[0];
 });
 const activate=point=>touch?target.touchscreen.tap(point.x,point.y):target.mouse.click(point.x,point.y);
 const queue=(phase,point=null)=>target.evaluate(({phase,point})=>{
  const dialog=document.querySelector('#inspect');
  if(point)window.__lpInspectTile=document.elementFromPoint(point.x,point.y)?.closest('.material-print');
  window.__lpInspectSample=new Promise(resolve=>{
   const observer=new MutationObserver(()=>{
    const flight=dialog.querySelector('.inspect-return-flight');if(!flight||!dialog.classList.contains(phase==='open'?'is-opening':'is-returning'))return;
    const animation=flight.getAnimations()[0];if(!animation)return;
    observer.disconnect();clearTimeout(timeout);
    const animations=flight.getAnimations({subtree:true}),duration=Number(animation.effect.getTiming().duration);
    animations.forEach(item=>item.pause());
    const at=time=>{animations.forEach(item=>item.currentTime=time);return {...window.__lpInspectPose(flight),paint:window.__lpInspectPaint()};};
    const rect=node=>{const r=node.getBoundingClientRect();return [r.x,r.y,r.width,r.height];};
    const tile=window.__lpInspectTile,photo=tile.querySelector('.photo'),small=flight.lastElementChild;
    const result={phase,duration,start:at(0),mid:at(duration/2),end:at(duration),origin:rect(photo),large:rect(dialog.querySelector('.inspect-image>.photo')),count:dialog.querySelectorAll('.inspect-return-flight').length,target:tile.classList.contains('is-inspect-return-target'),crop:[getComputedStyle(photo).backgroundImage,getComputedStyle(small).backgroundImage],open:dialog.open};
    animations.forEach(item=>{item.currentTime=0;item.play();});resolve(result);
   });
   const timeout=setTimeout(()=>{
    observer.disconnect();resolve({unobservedPhase:phase,state:{open:dialog.open,classes:dialog.className,flights:dialog.querySelectorAll('.inspect-return-flight').length,matches:matchMedia('(prefers-reduced-motion: reduce)').matches,paused:window.BakedKaleDisplay?.motionPaused,rootPaused:document.documentElement.hasAttribute('data-lp-motion-paused'),hidden:document.hidden,loading:document.documentElement.classList.contains('fde-loading'),still:document.documentElement.dataset.pageLoadingMotion,userPaused:sessionStorage.getItem('bk-detail-motion')}});
   },1200);observer.observe(dialog,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});
  });
 },{phase,point});
 const measure=async phase=>{
  const value=await target.evaluate(()=>window.__lpInspectSample);
  if(!value||!value.open||!value.target||value.count!==1||value.crop[0]!==value.crop[1]||![value.start,value.mid,value.end].every(sample=>paintIsClear(sample.paint)))throw Error('Inspect '+phase+' paint/origin setup '+JSON.stringify(value));
  const from=phase==='open'?value.origin:value.large,to=phase==='open'?value.large:value.origin;
  if(!equalRect(value.start.rect,from)||!equalRect(value.end.rect,to)||Math.abs(value.mid.rect[2]-from[2])<1||Math.abs(value.mid.rect[2]-to[2])<1)throw Error('Inspect '+phase+' exact tile/midpoint/final '+JSON.stringify(value));
  samples.push(value);return value;
 };
 const opened=async()=>{
  await target.locator('#inspect.is-opening').waitFor({state:'detached'});await target.locator('.inspect-return-flight').waitFor({state:'detached'});
  if(!await target.locator('#inspect').isVisible()||!await target.locator('.close-inspect').evaluate(node=>node===document.activeElement)||!paintIsClear(await target.evaluate(()=>window.__lpInspectPaint())))throw Error('Inspect opened paint/focus state');
 };
 const cleaned=async()=>{
  await target.locator('#inspect').waitFor({state:'hidden'});
  await target.locator('#inspect.is-photo-inspect').waitFor({state:'detached'});
  if(await target.locator('.inspect-return-flight,.is-inspect-return-target,#inspect.is-opening,#inspect.is-returning,#inspect.is-photo-inspect').count())throw Error('Inspect motion left a flight, hidden target or phase');
  if(!await target.locator('#field').evaluate(node=>node===document.activeElement))throw Error('Inspect did not restore Archive focus');
 };
 await target.locator('[data-do=reset]').click();for(let i=0;i<3;i++)await target.locator('[data-do=minus]').click();
 await target.locator('#field').focus();await target.keyboard.press('ArrowRight');await target.keyboard.press('ArrowDown');
 let point=await pick();if(point.copies<2||point.copy===0)throw Error('Inspect regression must use a repeated tile after zoom/pan');
 await queue('open',point);await activate(point);await measure('open');await opened();
 await queue('close');await target.locator('.close-inspect').click();await measure('close');await cleaned();

 // Escape must reverse the presented opening pose and crop on the same ghost.
 point=await pick();await queue('open',point);await activate(point);await measure('open');
 await target.evaluate(()=>{
  const dialog=document.querySelector('#inspect'),flight=dialog.querySelector('.inspect-return-flight'),animations=flight.getAnimations({subtree:true}),duration=Number(animations[0].effect.getTiming().duration);
  animations.forEach(item=>{item.pause();item.currentTime=duration*.35;});const before={...window.__lpInspectPose(flight),paint:window.__lpInspectPaint()};
  dialog.addEventListener('cancel',()=>{before.paint=window.__lpInspectPaint();},{capture:true,once:true});
  window.__lpInspectEarly=new Promise(resolve=>dialog.addEventListener('cancel',()=>resolve({before,after:window.__lpInspectPose(flight),same:dialog.querySelector('.inspect-return-flight')===flight&&animations.every(item=>flight.getAnimations({subtree:true}).includes(item)),count:dialog.querySelectorAll('.inspect-return-flight').length,paint:window.__lpInspectPaint()}),{once:true}));
 });
 await target.keyboard.press('Escape');const early=await target.evaluate(()=>window.__lpInspectEarly);
 if(!early.same||early.count!==1||!equalRect(early.before.rect,early.after.rect)||early.before.opacity.some((value,i)=>Math.abs(value-early.after.opacity[i])>.02)||!paintIsClear(early.paint))throw Error('Early Escape snapped or replaced the opening flight '+JSON.stringify(early));
 const rgba=value=>{const parts=value.match(/[\d.]+/g).map(Number);return parts.length===3?[...parts,1]:parts;};
 const beforeBackdrop=rgba(early.before.paint[1].color),afterBackdrop=rgba(early.paint[1].color);
 if(beforeBackdrop.some((value,i)=>Math.abs(value-afterBackdrop[i])>(i===3?.03:2)))throw Error('Early Escape reset the backdrop alpha '+JSON.stringify(early));
 samples.push({early});await cleaned();
 // Reopen immediately; an old completion must not close or hide the new target.
 point=await pick();await queue('open',point);await activate(point);await measure('open');await opened();await target.waitForTimeout(100);
 if(!await target.locator('#inspect').isVisible())throw Error('A stale inspect completion closed the reentered preview');
 await queue('close');await target.locator('#inspect').dispatchEvent('click');await measure('close');samples.push({outsideClick:'synthetic dialog-target click; the full-screen sheet has no native backdrop hit area'});await cleaned();
 point=await pick();await queue('open',point);await activate(point);await measure('open');
 await target.evaluate(()=>document.querySelector('.inspect-return-flight').getAnimations({subtree:true}).forEach(animation=>{animation.pause();animation.currentTime=0;}));
 await target.keyboard.press('Escape');await cleaned();samples.push({zeroClockEscape:'closed at the exact tile origin without rewinding to the large photo'});
 point=await pick();await queue('open',point);await activate(point);await measure('open');await opened();
 await target.evaluate(()=>{
  const dialog=document.querySelector('#inspect'),tile=window.__lpInspectTile;
  window.__lpInspectQueuedClose=new Promise(resolve=>dialog.addEventListener('close',()=>resolve({open:dialog.open,opening:dialog.classList.contains('is-opening'),photoInspect:dialog.classList.contains('is-photo-inspect'),flights:dialog.querySelectorAll('.inspect-return-flight').length,target:tile.classList.contains('is-inspect-return-target')}),{once:true}));
  // Native close() queues its event; tile.click() is deliberately synthetic so
  // the next preview starts in the same task before that old event is handled.
  dialog.close();tile.click();
 });
 const reentered=await target.evaluate(()=>window.__lpInspectQueuedClose);
 if(!reentered.open||!reentered.opening||!reentered.photoInspect||reentered.flights!==1||!reentered.target)throw Error('Queued native close cancelled the synthetic same-task tile reentry '+JSON.stringify(reentered));
 samples.push({nativeCloseSyntheticReentry:reentered});await opened();await target.locator('.close-inspect').click();await cleaned();

 if(!touch){
  await setReduced(true);point=await pick();await activate(point);
  const reducedState=await target.evaluate(()=>{
   const dialog=document.querySelector('#inspect'),style=getComputedStyle(dialog),rect=dialog.getBoundingClientRect();
   return {visible:dialog.open&&style.display!=='none'&&style.visibility!=='hidden'&&rect.width>0&&rect.height>0,open:dialog.open,flightCount:dialog.querySelectorAll('.inspect-return-flight').length,paint:window.__lpInspectPaint(),matches:matchMedia('(prefers-reduced-motion: reduce)').matches,classes:dialog.className};
  });
  if(!reducedState.visible||reducedState.flightCount||!reducedState.matches||!paintIsClear(reducedState.paint))throw Error('Reduced-motion opening did not settle immediately '+JSON.stringify(reducedState));
  samples.push({reducedBeforeOpen:reducedState});await target.locator('.close-inspect').click();await cleaned();await setReduced(false);
  for(const trigger of ['reduced','resize']){
   point=await pick();await queue('open',point);await activate(point);await measure('open');
   if(trigger==='reduced')await setReduced(true);else await target.setViewportSize({width:viewport.width+1,height:viewport.height});
   await opened();await target.locator('.close-inspect').click();await target.locator('#inspect').waitFor({state:'hidden'});
   if(trigger==='reduced')await setReduced(false);else await target.setViewportSize(viewport);
   await cleaned();
  }
  // The field's ResizeObserver schedules its tile-pool update on the next RAF.
  // Finish the preceding viewport restoration before choosing a new real tile.
  await target.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  point=await pick();await queue('open',point);await activate(point);await measure('open');await opened();
  const closeSetup=await target.evaluate(()=>({connected:window.__lpInspectTile.isConnected,matches:matchMedia('(prefers-reduced-motion: reduce)').matches,paused:window.BakedKaleDisplay?.motionPaused}));
  if(!closeSetup.connected||closeSetup.matches||closeSetup.paused)throw Error('Mid-close resize setup is not settled '+JSON.stringify(closeSetup));
  const resizeDuringClose=(async()=>{
   await target.locator('#inspect.is-returning').waitFor({state:'attached',timeout:2000});
   await target.setViewportSize({width:viewport.width,height:viewport.height+1});
  })();
  await Promise.all([resizeDuringClose,target.locator('.close-inspect').click()]);await cleaned();await target.setViewportSize(viewport);
  const access=target.locator('.material-access button').first();await access.focus();await access.press('Enter');
  if(await target.locator('.inspect-return-flight').count())throw Error('Accessible-list fallback must not invent a tile origin');
  await target.keyboard.press('Escape');await target.locator('#inspect').waitFor({state:'hidden'});
  if(!await access.evaluate(node=>node===document.activeElement))throw Error('Accessible-list focus was not restored');
 }
 await setReduced(false);await target.setViewportSize(viewport);await target.locator('[data-do=reset]').click();
 return {touch,selectedDuplicate:point.copy,samples};
}
(async()=>{
const engine=process.env.BROWSER||'chromium';const out=process.env.QA_OUTPUT||'/tmp/lp-browser-qa';fs.mkdirSync(out,{recursive:true});
const browser=await (engine==='webkit'?webkit:chromium).launch();const ctx=await browser.newContext();const page=await ctx.newPage();const errors=[],posts=[],broken=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))posts.push(r.url())});page.on('response',r=>{if(r.status()>=400)broken.push({url:r.url(),status:r.status()})});const results=[],inspectMotion=[];const base=process.env.BASE_URL||'http://127.0.0.1:4197/';
await require('./lp_cms_browser_qa.cjs')(browser,base,out,engine);
await require('./lp_gallery_layout_browser_qa.cjs')(browser,base,out,engine);
await page.setViewportSize({width:1331,height:894});await page.goto(base+'ja/lp/');await page.waitForTimeout(2200);
await page.waitForFunction(()=>document.documentElement.dataset.pageLoadingResult==='complete');
const loader=await page.evaluate(()=>({elapsed:window.__fdePageLoading.finished-window.__fdePageLoading.shownAt,skip:!!document.querySelector('[data-page-loading-skip]'),countVisible:document.querySelector('[data-page-loading-count]').getClientRects().length}));
if(loader.elapsed<950||loader.elapsed>=1950||loader.skip||loader.countVisible)throw Error('LP one-second loader '+JSON.stringify(loader));
await page.reload();if(await page.evaluate(()=>!!window.__fdePageLoading||document.documentElement.classList.contains('fde-loading')))throw Error('LP reload replayed the entry loader');
for(const route of ['ja/lp/examples.html','ja/lp/service.html','ja/lp/diagnosis.html','ja/lp/cases/01.html','ja/news.html','ja/goals.html','ja/license.html']){
 await page.goto(base+route);if(await page.locator('#page-loading').count())throw Error('Loader on non-entry: '+route);
}
if(errors.length)throw Error('Rapid route module startup errors: '+JSON.stringify(errors));
console.log(engine,'gallery module graph survived rapid route warmup');
await page.goto(base+'ja/news.html');await page.locator('a[data-lp-destination]:visible').first().click();
await page.waitForFunction(()=>document.documentElement.dataset.pageLoadingResult==='complete');
const navState=await page.evaluate(()=>window.__fdePageLoading.started);
if(typeof navState!=='number')throw Error('LP menu entry did not run the loader');
await page.goBack();if(await page.locator('#page-loading').count())throw Error('Loader after return to News');
await page.goForward();if(await page.evaluate(()=>document.documentElement.classList.contains('fde-loading')))throw Error('LP history replayed the entry loader');
if(new URL(await page.locator('.fde-link').getAttribute('href'),page.url()).pathname!==new URL(base+'ja/index.html').pathname)throw Error('FDE destination missing');
await page.locator('.fde-link').click();
await page.waitForFunction(()=>document.documentElement.dataset.pageLoadingResult==='complete');
const fdeElapsed=await page.evaluate(()=>window.__fdePageLoading.finished-window.__fdePageLoading.shownAt);
if(fdeElapsed<1950||fdeElapsed>=2950)throw Error('FDE two-second entry duration '+fdeElapsed);
await page.reload();if(await page.evaluate(()=>!!window.__fdePageLoading))throw Error('FDE reload replayed the entry loader');
await page.goto(base+'ja/lp/');
await page.waitForFunction(()=>document.documentElement.dataset.pageLoadingResult==='complete');
const wordmark=async target=>target.locator('.archive-wordmark').evaluateAll(xs=>{const f=document.querySelector('#field').getBoundingClientRect();const a=xs.map(x=>({t:x.textContent,hit:getComputedStyle(x).pointerEvents,r:x.getBoundingClientRect()})).filter(({r})=>r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight);const x=a.find(({r})=>Math.abs(r.left+r.width/2-f.width/2)<2&&Math.abs(r.top+r.height/2-f.height/2)<2);return x?{count:a.length,text:x.t,hit:x.hit}:null;});
const wm=await wordmark(page);if(!wm||wm.count!==1||wm.text!=='Baked Kale'||wm.hit!=='none')throw Error('Desktop Archive wordmark '+JSON.stringify(wm));
const plane=page.locator('#plane'),initial=await plane.evaluate(x=>x.style.transform);
const geometry=await page.locator('.material-print').evaluateAll(xs=>{
 const rs=xs.map(x=>x.getBoundingClientRect()).filter(r=>r.right>8&&r.bottom>10&&r.left<innerWidth-8&&r.top<innerHeight-10);
 // Individual print widths can change WebKit's fractional center rounding.
 // Test every rendered center against its nearest true lattice column instead.
 const center=innerWidth/2,pitch=Math.min(280,Math.max(195,innerWidth/5.45));
 const measured=rs.map(r=>{const x=r.left+r.width/2,column=Math.round((x-center)/pitch);return {column,drift:Math.abs(x-center-column*pitch)};});
 const cols=[...new Set(measured.map(x=>x.column))].sort((a,b)=>a-b);
 return {cols,count:rs.length,maxCenterDrift:Math.max(0,...measured.map(x=>x.drift))};
});
if(geometry.cols.length<5||geometry.count<18||geometry.maxCenterDrift>.75||geometry.cols.some((col,i,cols)=>i>0&&col-cols[i-1]!==1))throw Error('Archive lattice geometry '+JSON.stringify(geometry));

await page.mouse.move(420,500);await page.mouse.down();await page.mouse.move(680,600,{steps:8});await page.mouse.up();
await page.waitForFunction(old=>document.getElementById('plane').style.transform!==old,initial);
if(await page.locator('#inspect').isVisible())throw Error('drag not distinct from click');
if(await wordmark(page))throw Error('Wordmark should travel with the archive plane');
const tiles=await page.locator('#plane .tile').elementHandles(),tileCount=tiles.length;
for(let i=0;i<5;i++){const previous=await plane.evaluate(x=>x.style.transform);await page.mouse.move(421,500);await page.mouse.wheel(i%2?1660:-1710,730);await page.waitForFunction(old=>document.getElementById('plane').style.transform!==old,previous);}
if(await page.locator('#plane .tile').count()!==tileCount||!(await Promise.all(tiles.map(el=>el.evaluate(x=>x.isConnected)))).every(Boolean))throw Error('Wheel motion replaced the stable tile pool');
const panningAnchor=(slot=null)=>page.locator('.material-print').evaluateAll((xs,slot)=>{const entries=xs.filter(x=>slot===null||x.dataset.slot===slot).map(x=>({slot:x.dataset.slot,r:x.getBoundingClientRect()})).filter(({r})=>r.right>10&&r.bottom>50&&r.left<innerWidth-10&&r.top<innerHeight-50);const score=({r})=>Math.hypot(r.x+r.width/2-innerWidth/2,r.y+r.height/2-innerHeight/2);const {r,slot:key}=entries.sort((a,b)=>score(a)-score(b))[0];return {slot:key,offset:[r.x+r.width/2-innerWidth/2,r.y+r.height/2-innerHeight/2]};},slot);
await page.locator('[data-do=reset]').click();await page.waitForFunction(old=>document.getElementById('plane').style.transform===old,initial);const beforeZoom=await panningAnchor();if(!(await wordmark(page)))throw Error('Reset did not re-center the wordmark');
if(!await page.locator('[data-do=plus]').isDisabled())throw Error('Zoom exceeds 100%');
await page.locator('[data-do=minus]').click();if(await page.locator('#zoom-value').textContent()!=='85%')throw Error('zoom unavailable');
await page.waitForFunction(()=>document.getElementById('plane').style.transform.includes('scale(0.8547'));
const afterZoom=await panningAnchor(beforeZoom.slot);if(afterZoom.offset.some((v,i)=>Math.abs(v-beforeZoom.offset[i]/1.17)>4))throw Error('Zoom focal point moved '+JSON.stringify({beforeZoom,afterZoom}));
// Focus the field rather than the native zoom button for keyboard controls.
await page.locator('#field').focus();for(let i=0;i<8;i++)await page.keyboard.press('-');
if(await page.locator('#zoom-value').textContent()!=='60%'||!await page.locator('[data-do=minus]').isDisabled())throw Error('Zoom below 60%');
for(let i=0;i<8;i++)await page.keyboard.press('Equal');
if(await page.locator('#zoom-value').textContent()!=='100%'||!await page.locator('[data-do=plus]').isDisabled())throw Error('Zoom above 100%');
await page.locator('[data-do=reset]').click();await page.waitForFunction(old=>document.getElementById('plane').style.transform===old,initial);
const hit=await page.locator('.material-print').evaluateAll(xs=>{for(const x of xs){const r=x.getBoundingClientRect(),a=r.x+r.width*.5,b=r.y+r.height*.5;if(a>100&&b>90&&x.contains(document.elementFromPoint(a,b)))return [a,b]}});
if(!hit)throw Error('no clickable material');await page.mouse.click(...hit);if(!await page.locator('#inspect').isVisible())throw Error('material unavailable');await page.locator('#inspect.is-opening').waitFor({state:'detached'});
if(await page.locator('.inspect-next,.inspect-prev').count())throw Error('Unrequested next material controls');
const queueInspectReturnSample=(target,point)=>target.evaluate(([x,y])=>{
 const tile=[...document.querySelectorAll('.material-print')].find(node=>{
  const r=node.getBoundingClientRect();
  return Math.abs(x-r.left-r.width/2)<1&&Math.abs(y-r.top-r.height/2)<1;
 });
 const dialog=document.querySelector('#inspect');
 window.__lpReturnSample=new Promise(resolve=>{
  if(!tile){resolve(null);return;}
  const observer=new MutationObserver(()=>{
   const ghost=dialog.querySelector('.inspect-return-flight');
   if(!ghost)return;
   observer.disconnect();clearTimeout(timeout);
   const scale=ghost.getAnimations()[0];
   const to=tile.querySelector('.photo').getBoundingClientRect(),at=t=>{
    scale.currentTime=t;const r=ghost.getBoundingClientRect();return [r.left,r.top,r.width,r.height];
   };
   scale.pause();const start=at(0),mid=at(120),end=at(360);scale.currentTime=0;scale.play();
   resolve({start,mid,end,to:[to.left,to.top,to.width,to.height],target:tile.classList.contains('is-inspect-return-target'),open:dialog.open});
  });
  const timeout=setTimeout(()=>{observer.disconnect();resolve(null);},1000);
  observer.observe(dialog,{attributes:true,attributeFilter:['class']});
 });
},point);
const assertInspectReturn=async target=>{
 const m=await target.evaluate(()=>window.__lpReturnSample);
 if(!m||!m.target||!m.open||m.end.some((v,i)=>Math.abs(v-m.to[i])>2)||m.start[2]-m.mid[2]<4||m.mid[2]-m.end[2]<1)throw Error('Photo did not shrink into the exact selected tile '+JSON.stringify(m));
 await target.locator('#inspect').waitFor({state:'hidden'});
 if(await target.locator('.inspect-return-flight,.is-inspect-return-target').count())throw Error('Inspect return did not clean up');
};
const matte=await page.locator('.material-print').first().evaluate(node=>[getComputedStyle(node).backgroundColor,getComputedStyle(node.closest('body')).backgroundColor]);
if(matte.join('|')!=='rgb(227, 230, 219)|rgb(232, 237, 226)')throw Error('Archive light matte changed '+matte);
await queueInspectReturnSample(page,hit);await page.keyboard.press('Escape');await assertInspectReturn(page);
inspectMotion.push(await verifyPhotoInspectMotion(page));
await page.emulateMedia({reducedMotion:'reduce'});await page.mouse.click(...hit);
if(!await page.locator('#inspect').isVisible())throw Error('Reduced-motion material unavailable');
await page.locator('.close-inspect').click();
if(await page.locator('#inspect').isVisible()||await page.locator('.inspect-return-flight').count())throw Error('Reduced-motion close animated');
await page.emulateMedia({reducedMotion:'no-preference'});
await page.locator('.theme').click();if(await page.locator('body').getAttribute('data-theme')!=='dark')throw Error('theme unavailable');
await page.locator('.theme').click();
const beforeHash=await page.evaluate(()=>window.__fdePageLoading.started);
const goStories=page.locator('.view-switch a[href="#works"]'),goArchive=page.locator('.view-switch a[href="#archive"]');
const opaqueFlight=async target=>target.evaluate(async()=>{
 const frames=[];const started=performance.now();
 while(document.querySelector('.gather-layer')&&performance.now()-started<800){
  const prints=[...document.querySelectorAll('.gather-print')];
  frames.push({count:prints.length,opaque:prints.every(p=>getComputedStyle(p).opacity==='1'&&getComputedStyle(p.querySelector('.photo')).opacity==='1')});
  await new Promise(requestAnimationFrame);
 }
 return frames;
});
await goStories.click();await page.locator('.gather-print').first().waitFor();
const flightPromise=opaqueFlight(page);
if(await page.evaluate(()=>window.__fdePageLoading.started)!==beforeHash)throw Error('Archive hash switch restarted the entry loader');
if(await page.locator('.gather-print').count()<3)throw Error('Stories gather needs multiple images');
await page.screenshot({path:path.join(out,engine+'-stories-transition.png'),animations:'allow'});
await page.waitForTimeout(100);await page.screenshot({path:path.join(out,engine+'-stories-transition-middle.png'),animations:'allow'});
await page.waitForTimeout(100);await page.screenshot({path:path.join(out,engine+'-stories-transition-end.png'),animations:'allow'});
const flight=await flightPromise;if(!flight.length)throw Error('No moving photo frames were observed');if(flight.some(f=>f.count<3||!f.opaque))throw Error('Photo opacity dipped during the Stories flight '+JSON.stringify(flight));
await goArchive.click();await page.locator('#archive.is-arriving').waitFor({state:'attached'});await page.locator('.gather-print').first().waitFor();
if(await page.locator('.gather-print').count()<3)throw Error('reverse Archive needs multiple images');
await page.screenshot({path:path.join(out,engine+'-archive-transition.png'),animations:'allow'});
await page.locator('.gather-layer').waitFor({state:'detached'});
if(await plane.evaluate(x=>x.style.transform)!==initial)throw Error('Archive position not retained');
await goStories.click();await page.locator('.gather-layer').waitFor({state:'attached'});await page.locator('.gather-layer').waitFor({state:'detached'});
if(await page.locator('.stories .prints a').count()!==10||await page.locator('.collage-print').count()!==70)throw Error('Stories collage count');
const names=await page.locator('.collage-cover b').allTextContents();
if(new Set(names).size!==10||await page.locator('.collage-palette').count()!==10)throw Error('Stories does not have independent cover and palette treatments');
await page.emulateMedia({reducedMotion:'reduce'});await goArchive.click();await goStories.click();
if(await page.locator('.gather-layer').count())throw Error('reduced motion gather unavailable');await page.emulateMedia({reducedMotion:'no-preference'});
await page.locator('.stories .prints a').first().click();await page.waitForTimeout(2200);
if(await page.locator('.case-meta span,.case-next,.case-copy .muted').count())throw Error('Removed case labels or next links returned');
await page.screenshot({path:path.join(out,engine+'-detail.png')});await page.locator('.case-meta a').click();await page.waitForTimeout(2200);if(!await page.locator('.stories').isVisible())throw Error('return stories');
const touch=await browser.newContext({hasTouch:true,viewport:{width:390,height:844}});const phone=await touch.newPage();
await phone.goto(base+'ja/lp/');await phone.waitForTimeout(2200);const m=await wordmark(phone);if(!m||m.count!==1||m.text!=='Baked Kale')throw Error('Phone Archive wordmark '+JSON.stringify(m));
const phoneHit=await phone.locator('.material-print').evaluateAll(xs=>{for(const x of xs){const r=x.getBoundingClientRect(),a=r.x+r.width*.5,b=r.y+r.height*.5;if(a>10&&a<380&&b>100&&b<740&&x.contains(document.elementFromPoint(a,b)))return [a,b]}});
if(!phoneHit)throw Error('no tappable mobile material');await phone.touchscreen.tap(...phoneHit);if(!await phone.locator('#inspect').isVisible())throw Error('material tap unavailable');await phone.locator('#inspect.is-opening').waitFor({state:'detached'});
await queueInspectReturnSample(phone,phoneHit);await phone.locator('.close-inspect').tap();await assertInspectReturn(phone);
inspectMotion.push(await verifyPhotoInspectMotion(phone,true));
const phonePlane=phone.locator('#plane');
await phone.mouse.move(180,390);await phone.mouse.down();await phone.mouse.move(220,420,{steps:4});
await phone.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const beforeHeight=await phonePlane.evaluate(x=>x.style.transform);
await phone.setViewportSize({width:390,height:760});
await phone.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
if(!await phone.locator('#field').evaluate(x=>x.classList.contains('is-drag')))throw Error('Height-only resize cancelled an active drag');
if(await phonePlane.evaluate(x=>x.style.transform)!==beforeHeight)throw Error('Height-only resize jumped the plane');
await phone.mouse.move(260,460,{steps:4});
await phone.waitForFunction(old=>document.getElementById('plane').style.transform!==old,beforeHeight);await phone.mouse.up();
await phone.locator('[data-do=reset]').tap();
for(const [selector,dest] of [['.view-switch a[href="#works"]','#works'],['.view-switch a[href="#archive"]','#archive']]){await phone.locator(selector).tap();await phone.locator(dest+'.is-arriving').waitFor({state:'attached'});if(await phone.locator('.gather-print').count()<2)throw Error('mobile transition needs multiple images');await phone.locator('.gather-layer').waitFor({state:'detached'});}
await touch.close();
await page.setViewportSize({width:390,height:900});await page.goto(base+'ja/lp/diagnosis.html');await page.waitForTimeout(2200);await page.locator('#next').click();if(!await page.locator('#error').textContent())throw Error('empty validation');for(let i=0;i<12;i++){await page.locator('input[type=radio]').first().check();await page.locator('#next').click()}await page.locator('#request').click();if(!await page.locator('#lp-submit').isDisabled())throw Error('submit enabled');await page.locator('#return').click();await page.locator('#skip').click();if(await page.locator('#statconsent').isChecked())throw Error('consent default');await page.locator('#statconsent').check();await page.locator('#yes').click();if(!(await page.locator('#statstatus').textContent()).includes('送信や保存をしていません'))throw Error('stats false promise');await page.locator('#no').click();await page.locator('#return').click();await page.locator('#edit').click();if(await page.locator('#quiz').getAttribute('data-question-id')!=='01')throw Error('edit fail');
for(const width of [320,390,768,1440,1920]){await page.setViewportSize({width,height:900});for(const p of ['ja/lp/','ja/lp/examples.html','ja/lp/service.html','ja/lp/diagnosis.html',...['','ja/','zh/'].flatMap(l=>['index','goals','news','license','contact'].map(n=>l+n+'.html'))]){await page.goto(base+p);await page.waitForTimeout(2200);const info=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+2,title:document.title,broken:[...document.images].filter(i=>i.getClientRects().length&&getComputedStyle(i).visibility!=='hidden'&&i.complete&&!i.naturalWidth).map(i=>i.src)}));if(info.overflow||info.broken.length){await page.screenshot({path:path.join(out,engine+'-failure.png')});throw Error(JSON.stringify({width,path:p,...info}));}results.push({width,path:p,pass:true});if(p.startsWith('ja/lp/')&&[320,390,1440].includes(width))await page.screenshot({path:path.join(out,engine+'-'+width+'-'+(p.split('/').pop()||'index')+'.png')});}}
for(const width of [320,390,768,1440,1920]){
 await page.setViewportSize({width,height:900});
 for(let i=1;i<=10;i++){
  const number=String(i).padStart(2,'0'),route='ja/lp/cases/'+number+'.html';
  await page.goto(base+route);await page.waitForTimeout(100);
  const info=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+2,removedText:/写真は架空|次の制作例|\d{2}\s*\/\s*10/.test(document.querySelector('.case-main').innerText),nextControls:document.querySelectorAll('.case-next,.case-meta span').length}));
  if(info.overflow||info.removedText||info.nextControls)throw Error(JSON.stringify({width,route,...info}));
  results.push({width,path:route,pass:true});
  if(width===390&&i===2)await page.screenshot({path:path.join(out,engine+'-390-case02.png'),fullPage:true});
 }
}
await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base+'ja/lp/');await page.waitForTimeout(2200);if(posts.length||errors.length||broken.length)throw Error(JSON.stringify({posts,errors,broken}));fs.writeFileSync(path.join(out,engine+'.json'),JSON.stringify({engine,results,diagnosis:true,opaqueFlight:flight,inspectMotion,posts,errors,broken},null,2));await browser.close();console.log(engine,results.length,'views + diagnosis passed');
})().catch(e=>{console.error(e);process.exit(1)});
