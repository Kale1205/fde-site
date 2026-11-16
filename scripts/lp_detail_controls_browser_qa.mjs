// Run against `npm run dev`, with Playwright installed locally or PLAYWRIGHT_MODULE set.
// CHROMIUM_EXECUTABLE can select a system Chromium; otherwise use Playwright's browser.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.BASE_URL||'http://127.0.0.1:4197/';
const out=process.env.QA_OUTPUT||'/tmp/lp-detail-controls-qa';mkdirSync(out,{recursive:true});
const browser=await chromium.launch(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{});
const results=[],errors=[];
const pass=(name,details)=>{results.push({name,details});console.log('PASS',name);};
async function decodedCmsVideo(){
 // Exercise the actual public CMS loader with real, locally bundled H.264 bytes.
 // Routes are intercepted in this context only; the public manifest stays untouched.
 const movie=readFileSync(new URL('../assets/ims-v1-operation-ja.mp4',import.meta.url));
 const poster=readFileSync(new URL('../ja/lp/assets/concept-materials.png',import.meta.url));
 const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
 const videoPath='assets/cases/01/'+hash(movie)+'.mp4',posterPath='assets/cases/01/'+hash(poster)+'.png';
 const manifest={version:1,cases:{'01':{title:'CMS動画の検証用ケース',description:'ローカルの実動画で停止と再開を検証',alt:'FDE IMSの操作動画',video:videoPath,poster:posterPath}}};
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
 page.on('pageerror',error=>errors.push(error.message));
 let releaseManifest;const manifestGate=new Promise(resolve=>{releaseManifest=resolve;});
 let manifestRequests=0;
 try{
  await context.addInitScript(()=>{if(sessionStorage.getItem('bk-detail-motion')===null)sessionStorage.setItem('bk-detail-motion','paused');});
  await page.route('**/ja/lp/media-manifest.json',async route=>{
   manifestRequests++;await new Promise(resolve=>setTimeout(resolve,300));await manifestGate;
   await route.fulfill({json:manifest});
  });
  await page.route('**/ja/lp/'+videoPath,route=>route.fulfill({contentType:'video/mp4',body:movie}));
  await page.route('**/ja/lp/'+posterPath,route=>route.fulfill({contentType:'image/png',body:poster}));
  // Hold the detail module to expose the interval before DOMContentLoaded.
  await page.route('**/ja/lp/case-media.js?*',async route=>{await new Promise(resolve=>setTimeout(resolve,600));await route.continue();});
  await page.goto(base+'ja/lp/cases/01.html',{waitUntil:'commit'});
  await page.waitForFunction(()=>document.readyState==='interactive'&&!!document.querySelector('.case-main'));
  const early=await page.evaluate(()=>{
   const scope=document.querySelector('.case-main'),style=document.createElement('style');style.textContent='@keyframes early-cms-motion{to{opacity:.2}} .early-cms-motion{animation:early-cms-motion 5s infinite}';document.head.append(style);
   const node=document.createElement('div');node.className='early-cms-motion';node.textContent='Early motion probe';scope.append(node);
   const animation=node.animate([{transform:'translateX(0)'},{transform:'translateX(10px)'}],{duration:5000,iterations:Infinity});
   const state={readyState:document.readyState,effectivePaused:BakedKaleDisplay.motionPaused,css:getComputedStyle(node).animationPlayState,waapi:animation.playState,rootPaused:document.documentElement.hasAttribute('data-lp-motion-paused')};node.remove();animation.cancel();return state;
  });
  assert.equal(early.readyState,'interactive');assert.equal(early.effectivePaused,true);assert.equal(early.rootPaused,true);assert.equal(early.css,'paused');assert.equal(early.waapi,'paused');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(()=>window.BakedKaleDisplay?.motionPaused);
  assert.equal(await page.locator('.case-media video').count(),0,'manifest must still be pending while the global pause is active');
  releaseManifest();
  const video=page.locator('.case-media video.case-video').first();await video.waitFor();
  assert.equal(await page.locator('.case-copy h2').textContent(),manifest.cases['01'].title);
  assert.ok(await video.evaluate(value=>value.paused&&value.currentTime===0&&value.controls&&value.playsInline&&value.preload==='none'));
  assert.ok(await page.locator('.case-main').evaluate(scope=>scope.hasAttribute('data-lp-motion-paused')));
  await video.evaluate(value=>{value.muted=true;value.preload='auto';value.loop=true;value.load();});
  // Fail explicitly if this environment cannot decode; never report a codec skip as playback coverage.
  await page.waitForFunction(()=>{const value=document.querySelector('.case-media video');return value.readyState>=2&&value.videoWidth>0&&!value.error;},null,{timeout:15000});
  const decoded=await video.evaluate(value=>({readyState:value.readyState,width:value.videoWidth,height:value.videoHeight,duration:value.duration,source:value.currentSrc,codecCapability:value.canPlayType('video/mp4; codecs="avc1.42E01E"')}));
  await video.evaluate(value=>{
   const never=value.cloneNode(true);never.id='cms-never-started';never.muted=true;never.preload='none';value.after(never);
  });
  await page.locator('[data-lp-motion]').click();
  assert.ok(await video.evaluate(value=>value.paused&&value.currentTime===0),'resuming must not start the never-played CMS video');
  assert.ok(await page.locator('#cms-never-started').evaluate(value=>value.paused&&value.currentTime===0));
  await video.evaluate(value=>value.play());
  await page.waitForFunction(()=>document.querySelector('.case-media video').currentTime>.15);
  const playing=await video.evaluate(value=>({currentTime:value.currentTime,paused:value.paused,decodedFrames:value.getVideoPlaybackQuality?.().totalVideoFrames??null}));
  assert.equal(playing.paused,false);assert.ok(playing.decodedFrames===null||playing.decodedFrames>0);
  pass('delayed CMS insertion while paused decodes real H.264 and requires explicit first playback',{decoded:true,skipped:false,manifestDelayMs:300,early,...decoded,playing});

  await page.locator('[data-lp-motion]').click();await page.waitForFunction(()=>document.querySelector('.case-media video').paused);
  const stoppedAt=await video.evaluate(value=>value.currentTime);await page.waitForTimeout(180);
  const stoppedAfter=await video.evaluate(value=>value.currentTime);assert.ok(Math.abs(stoppedAfter-stoppedAt)<.035,{stoppedAt,stoppedAfter});
  // Native .play() is also caught while the global stop remains active.
  await video.evaluate(async value=>{await value.play().catch(()=>{});});
  await page.waitForFunction(()=>document.querySelector('.case-media video').paused);
  const blockedAt=await video.evaluate(value=>value.currentTime);await page.waitForTimeout(120);
  assert.ok(await video.evaluate(value=>value.paused));
  assert.ok(Math.abs(await video.evaluate(value=>value.currentTime)-blockedAt)<.035);
  await page.screenshot({path:join(out,'cms-video-detail-paused.png'),fullPage:true});
  await page.locator('[data-lp-motion]').click();
  await page.waitForFunction(time=>{const value=document.querySelector('.case-media video');return !value.paused&&value.currentTime>time+.12;},blockedAt);
  assert.ok(await page.locator('#cms-never-started').evaluate(value=>value.paused&&value.currentTime===0));
  pass('decoded CMS playback freezes, blocks native play while stopped, and resumes only previously playing media',{stoppedAt,stoppedAfter,blockedAt,resumedAt:await video.evaluate(value=>value.currentTime)});

  await page.goto(base+'ja/lp/#archive');
  await page.waitForFunction(()=>document.querySelector('#plane .material-print')&&!document.documentElement.classList.contains('fde-loading'));
  const trigger=page.locator('.material-access [data-material="0"]');await trigger.focus();await trigger.click();
  const preview=page.locator('#inspect .case-video');await preview.waitFor();
  await preview.evaluate(async value=>{value.muted=true;value.loop=true;window.cmsDialogVideo=value;await value.play();});
  await page.waitForFunction(()=>cmsDialogVideo.videoWidth>0&&cmsDialogVideo.currentTime>.1);
  await page.locator('#inspect [data-lp-motion]').click();assert.ok(await preview.evaluate(value=>value.paused));
  await page.locator('.close-inspect').click();
  await page.evaluate(()=>{sessionStorage.setItem('bk-detail-motion','playing');dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
  assert.deepEqual(await page.evaluate(()=>({open:document.querySelector('#inspect').open,paused:cmsDialogVideo.paused})),{open:false,paused:true});
  await trigger.focus();await trigger.click();
  assert.ok(await preview.evaluate(value=>value.paused&&value.currentTime===0));
  await preview.evaluate(async value=>{value.muted=true;value.loop=true;window.cmsDialogVideo=value;await value.play();});
  await page.waitForFunction(()=>cmsDialogVideo.currentTime>.1);
  await page.locator('#inspect [data-lp-motion]').click();await page.keyboard.press('Escape');
  await page.evaluate(()=>{sessionStorage.setItem('bk-detail-motion','playing');dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
  assert.deepEqual(await page.evaluate(()=>({open:document.querySelector('#inspect').open,paused:cmsDialogVideo.paused})),{open:false,paused:true});
  assert.ok(manifestRequests>=2);
  pass('real decoded CMS preview stays stopped after Close/Cancel and persisted pageshow',{decoded:true,skipped:false,manifestRequests});
 }finally{releaseManifest();await context.close();}
}
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base+'ja/lp/cases/01.html');
 await page.locator('button[data-lp-theme]').focus();await page.keyboard.press('Enter');
 assert.equal(await page.locator('html').getAttribute('data-lp-theme'),'dark');
 for(let index=1;index<=10;index++){
  await page.goto(base+'ja/lp/cases/'+String(index).padStart(2,'0')+'.html');
  assert.equal(await page.locator('.sitehead [data-lp-theme]').count(),1);
  assert.equal(await page.locator('.sitehead [data-lp-motion]').count(),1);
  assert.equal(await page.locator('html').getAttribute('data-lp-theme'),'dark');
 }
 pass('all ten existing cases have keyboard controls and share the Archive theme');

 await page.goto(base+'ja/lp/cases/01.html');
 await page.evaluate(async()=>{
  const scope=document.querySelector('[data-lp-motion-scope]');
  const style=document.createElement('style');style.textContent='@keyframes detail-qa{to{transform:translateX(60px)}} .detail-qa-css{animation:detail-qa 5s linear infinite}';document.head.append(style);
  const node=className=>{const value=document.createElement('div');value.textContent=className;value.className=className;scope.append(value);return value;};
  const css=node('detail-qa-css'),moving=node('detail-qa-waapi'),still=node('detail-qa-waapi-paused');
  const waapi=moving.animate([{opacity:1},{opacity:.3}],{duration:5000,iterations:Infinity});
  const manuallyPaused=still.animate([{opacity:1},{opacity:.3}],{duration:5000,iterations:Infinity});manuallyPaused.pause();
  const canvas=document.createElement('canvas');canvas.width=80;canvas.height=80;canvas.getContext('2d').fillRect(0,0,80,80);
  const video=()=>{const value=document.createElement('video');value.muted=true;value.controls=true;value.srcObject=canvas.captureStream(8);scope.append(value);return value;};
  const playing=video(),paused=video(),pausedAutoplay=video();pausedAutoplay.autoplay=true;await pausedAutoplay.play();pausedAutoplay.pause();await playing.play();
  const form=document.createElement('form');form.innerHTML='<label>Test input<input id="detail-qa-input"></label><button type="button" id="detail-qa-button">Test button</button><a id="detail-qa-link" href="#detail-qa-input">Test link</a>';scope.append(form);
  window.detailQA={scope,node,video,playing,paused,pausedAutoplay,css,waapi,manuallyPaused,clicks:0};
  document.querySelector('#detail-qa-button').onclick=()=>window.detailQA.clicks++;
 });
 await page.locator('[data-lp-motion]').focus();await page.keyboard.press('Space');
 await page.waitForFunction(()=>detailQA.playing.paused&&detailQA.waapi.playState==='paused');
 // A pause can still be pending on the animation timeline for one frame.
 await page.evaluate(()=>Promise.all(document.getAnimations().map(animation=>animation.ready.catch(()=>{}))));
 const start=await page.evaluate(()=>({waapi:detailQA.waapi.currentTime,css:detailQA.css.getAnimations()[0].currentTime}));
 await page.waitForTimeout(100);
 const end=await page.evaluate(()=>({waapi:detailQA.waapi.currentTime,css:detailQA.css.getAnimations()[0].currentTime}));
 assert.ok(Math.abs(end.waapi-start.waapi)<2&&Math.abs(end.css-start.css)<2,{start,end});
 await page.locator('#detail-qa-input').fill('Still editable');await page.locator('#detail-qa-button').click();await page.locator('#detail-qa-link').click();
 assert.equal(await page.evaluate(()=>detailQA.clicks),1);
 assert.equal(await page.locator('#detail-qa-input').inputValue(),'Still editable');
 pass('playing video and running CSS/WAAPI freeze; links, inputs and buttons remain operable');

 await page.evaluate(async()=>{
  detailQA.late=detailQA.video();await detailQA.late.play().catch(()=>{});
  // An existing node can start WAAPI without a DOM mutation.
  detailQA.lateAnimation=detailQA.css.animate([{opacity:1},{opacity:.7}],{duration:5000,iterations:Infinity});
  detailQA.manuallyPaused.play();
  detailQA.lateCSS=detailQA.node('detail-qa-css');
 });
 await page.waitForFunction(()=>detailQA.late.paused&&detailQA.lateAnimation.playState==='paused'&&detailQA.manuallyPaused.playState==='paused');
 assert.equal(await page.evaluate(()=>getComputedStyle(detailQA.lateCSS).animationPlayState),'paused');
 await page.locator('[data-lp-motion]').click();
 await page.waitForFunction(()=>!detailQA.playing.paused&&!detailQA.late.paused&&detailQA.waapi.playState==='running'&&detailQA.lateAnimation.playState==='running');
 assert.deepEqual(await page.evaluate(()=>[detailQA.paused.paused,detailQA.pausedAutoplay.paused]),[true,true]);
 // An explicit .play() during the pause becomes a requested running animation.
 assert.equal(await page.evaluate(()=>detailQA.manuallyPaused.playState),'running');
 pass('late media/CSS/WAAPI stay stopped; resume preserves paused media and catches explicit animation play');

 await page.emulateMedia({reducedMotion:'reduce'});
 await page.waitForFunction(()=>document.querySelector('[data-lp-motion]').getAttribute('aria-pressed')==='true');
 assert.equal(await page.locator('[data-lp-motion]').getAttribute('aria-pressed'),'true');
 assert.ok(await page.locator('[data-lp-motion]').isDisabled());
 await page.waitForFunction(()=>detailQA.playing.paused&&detailQA.waapi.playState==='paused');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.waitForFunction(()=>!detailQA.playing.paused&&detailQA.waapi.playState==='running');
 pass('live reduced-motion preference stops and restores previously running material');

 await page.goto(base+'ja/lp/#archive');
 await page.waitForFunction(()=>document.querySelector('#plane .material-print')&&!document.documentElement.classList.contains('fde-loading'));
 assert.equal(await page.locator('html').getAttribute('data-lp-theme'),'dark');
 const trigger=page.locator('.material-access [data-material="0"]');await trigger.focus();await trigger.click();
 await page.evaluate(async()=>{
  const scope=document.querySelector('.inspect-image'),canvas=document.createElement('canvas');canvas.width=80;canvas.height=80;canvas.getContext('2d').fillRect(0,0,80,80);
  const video=document.createElement('video');video.controls=true;video.muted=true;video.srcObject=canvas.captureStream(8);scope.replaceChildren(video);window.dialogVideo=video;await video.play();
 });
 await page.locator('#inspect [data-lp-motion]').click();assert.ok(await page.evaluate(()=>dialogVideo.paused));
 await page.locator('.close-inspect').click();
 await page.evaluate(()=>{sessionStorage.setItem('bk-detail-motion','playing');dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
 assert.deepEqual(await page.evaluate(()=>({open:document.querySelector('#inspect').open,paused:dialogVideo.paused})),{open:false,paused:true});
 await trigger.focus();await trigger.click();
 assert.ok(await page.locator('#inspect').isVisible());
 await page.locator('#inspect [data-lp-theme]').click();assert.equal(await page.locator('html').getAttribute('data-lp-theme'),'light');
 await page.keyboard.press('Escape');assert.ok(!await page.locator('#inspect').isVisible());
 assert.ok(await trigger.evaluate(element=>document.activeElement===element));
 pass('native preview Close/Cancel, theme, focus return and reentry preserve media lifecycle');

 await page.locator('.view-switch a[href="#works"]').click();
 await page.waitForFunction(()=>!document.querySelector('.gather-layer'));
 await page.locator('.stories .prints a').first().click();await page.locator('[data-lp-motion]').click();
 await page.goBack();await page.waitForSelector('.view-switch');
 assert.equal(await page.locator('#inspect [data-lp-motion]').getAttribute('aria-pressed'),'true');
 await page.goForward();await page.waitForSelector('.case-main');
 assert.equal(await page.locator('[data-lp-motion]').getAttribute('aria-pressed'),'true');
 pass('Back/Forward and detail reentry retain the shared motion preference');

 for(const width of [320,390,850,1440]){
  await page.setViewportSize({width,height:900});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  const controls=await page.locator('.lp-display-button').evaluateAll(buttons=>buttons.map(button=>{const r=button.getBoundingClientRect();return {width:r.width,height:r.height,x:r.x,right:r.right};}));
  assert.ok(controls.every(r=>r.width>=44&&r.height>=44&&r.x>=0&&r.right<=width),JSON.stringify({width,controls}));
  if([390,1440].includes(width))await page.screenshot({path:join(out,'detail-'+width+'.png'),fullPage:true});
 }
 pass('320–1440px controls have 44px targets without horizontal overflow');
 await decodedCmsVideo();
 assert.deepEqual(errors,[]);
 writeFileSync(join(out,'results.json'),JSON.stringify({results,errors},null,2));
 console.log(results.length+' LP detail checks passed');
}finally{await browser.close();}
