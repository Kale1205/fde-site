// Run against npm run dev with an already installed browser; this script never
// downloads a browser, records a video, or writes CMS data.
//
// Default: LP_QA_BROWSER=webkit. A Chromium run must be labelled as Chromium.
// Playwright's supported WebKit touchscreen API exposes tap(), not a continuous
// finger down/move/up gesture. The drag regression below therefore uses trusted
// mouse input plus an explicitly synthetic descendant lostpointercapture event.
// Passing it, even in WebKit, is not an actual iPhone Safari touch-drag check.
// Chromium additionally runs continuous engine-trusted touch through its public
// CDP session API. Chromium emulation is not physical iPhone/WebKit evidence.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';

const require=createRequire(import.meta.url);
const playwright=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const engine=process.env.LP_QA_BROWSER||'webkit';
assert(['webkit','chromium'].includes(engine),'LP_QA_BROWSER must be webkit or chromium');
const base=process.env.BASE_URL||'http://127.0.0.1:4173/';
const out=process.env.QA_OUTPUT||'/tmp/lp-archive-webkit-qa';
mkdirSync(out,{recursive:true});
const report={engine,status:'pending',trustedContinuousTouchDragVerified:false,tests:[],errors:[],limitations:[
 'The supported WebKit touchscreen API provides an engine-trusted tap, not continuous touch down/move/up.',
 'The capture-loss regression uses engine-trusted mouse input and an untrusted synthetic descendant event.',
 'Neither synthetic events nor Chromium results establish actual iPhone Safari touch-drag behavior.',
]};
let browser;

async function visiblePrint(page){
 return page.evaluate(()=>{
  const candidates=[...document.querySelectorAll('#plane .material-print')].map(element=>{
   const rect=element.getBoundingClientRect(),x=rect.x+rect.width/2,y=rect.y+rect.height/2;
   return {element,x,y,distance:Math.hypot(x-innerWidth/2,y-innerHeight/2)};
  }).filter(({element,x,y})=>x>35&&x<innerWidth-35&&y>100&&y<innerHeight-100&&document.elementFromPoint(x,y)?.closest('.material-print')===element)
   .sort((a,b)=>a.distance-b.distance);
  if(!candidates.length)throw new Error('No visible, hittable Archive print');
  const {element,x,y}=candidates[0];window.__lpQaPrint=element;
  return {x,y,material:element.dataset.material};
 });
}

async function chromiumTouchRegression(context,page){
 const session=await context.newCDPSession(page);
 const touch=(type,touchPoints)=>session.send('Input.dispatchTouchEvent',{type,touchPoints});
 const point=(x,y,id=0)=>({x,y,id,radiusX:3,radiusY:3,force:1});
 const pose=async()=>{
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  return page.locator('#plane').evaluate(plane=>plane.style.transform);
 };
 const runs=[];
 for(let run=0;run<2;run++){
  await page.locator('.field-tools [data-do="reset"]').click();
  const start=await visiblePrint(page),direction=start.x>195?-1:1,poses=[await pose()];
  await page.evaluate(()=>window.__lpQaEvents=[]);
  await touch('touchStart',[point(start.x,start.y)]);
  const moves=[[3,0],[14,-10],[32,-24],[65,-48],[95,-80],[110,-120],[130,-140],[105,-115],[70,-90],[30,-55]];
  for(const [index,[dx,dy]] of moves.entries()){
   await touch('touchMove',[point(start.x+direction*dx,start.y+dy)]);
   poses.push(await pose());
   // A programmatic height-only change exercises the local resize guard. It is
   // not a physical Safari toolbar/VisualViewport gesture.
   if(run===0&&index===3)await page.setViewportSize({width:390,height:790});
  }
  assert(await page.locator('#field').evaluate(field=>field.classList.contains('is-drag')),'trusted Chromium touch drag must remain active until lift');
  assert(poses.slice(3).every((value,index)=>value!==poses[index+2]),'every later trusted touch move must still move the Archive');
  await touch('touchEnd',[]);
  await page.waitForFunction(()=>!document.querySelector('#field').classList.contains('is-drag'));
  const events=await page.evaluate(()=>window.__lpQaEvents);
  const pointerEvents=events.filter(event=>event.type.startsWith('pointer')||event.type.endsWith('pointercapture'));
  assert(pointerEvents.length&&pointerEvents.every(event=>event.trusted&&event.pointerType==='touch'));
  assert(events.some(event=>event.type==='lostpointercapture'&&event.target==='print'&&event.trusted&&event.fieldCaptured),'the engine must reproduce descendant implicit-capture transfer while the field owns capture');
  assert.equal(await page.locator('#inspect').evaluate(dialog=>dialog.open),false);
  runs.push({run,input:'engine-trusted Chromium touch via CDP; not WebKit/iPhone',heightOnlyResize:run===0,poses,events});
  await page.setViewportSize({width:390,height:844});
 }
 report.tests.push({name:'Chromium engine-trusted continuous touch retains the drag through implicit-capture transfer',runs});

 await page.locator('.field-tools [data-do="reset"]').click();
 const start=await visiblePrint(page),direction=start.x>195?-1:1;
 await page.evaluate(()=>window.__lpQaEvents=[]);
 const first=point(start.x,start.y,0),second=point(start.x+direction*45,start.y+45,1);
 await touch('touchStart',[first]);await touch('touchStart',[first,second]);
 await touch('touchMove',[point(first.x+direction*8,first.y+5,0),point(second.x-direction*8,second.y-5,1)]);
 await pose();
 const zoom=await page.locator('#zoom-value').evaluate(output=>output.value);assert.notEqual(zoom,'100%','two trusted Chromium contacts must change zoom');
 await touch('touchEnd',[]);
 await page.waitForFunction(()=>!document.querySelector('#field').classList.contains('is-drag'));
 const pinchEvents=await page.evaluate(()=>window.__lpQaEvents);
 assert.equal(pinchEvents.filter(event=>event.type==='pointerdown'&&event.trusted&&event.pointerType==='touch').length,2);
 assert.equal(pinchEvents.filter(event=>event.type==='pointerup'&&event.trusted&&event.pointerType==='touch').length,2);
 report.tests.push({name:'two Chromium trusted touch contacts pinch and both lift cleanly',input:'engine-trusted Chromium touch via CDP; not WebKit/iPhone',zoom,events:pinchEvents});
 report.trustedContinuousTouchDragVerified=true;
 await session.detach();
}

try{
 const launch={headless:true};
 if(process.env.LP_QA_EXECUTABLE)launch.executablePath=process.env.LP_QA_EXECUTABLE;
 if(engine==='chromium')launch.args=['--no-sandbox'];
 browser=await playwright[engine].launch(launch);
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
 const page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));
 await page.goto(new URL('ja/lp/#archive',base).href);
 await page.waitForFunction(()=>document.querySelector('#plane .material-print')&&!document.documentElement.classList.contains('fde-loading')&&!document.documentElement.classList.contains('fde-loading-reveal'));
 await page.evaluate(()=>{
  window.__lpQaEvents=[];
  for(const type of ['pointerdown','pointermove','pointerup','pointercancel','gotpointercapture','lostpointercapture','touchstart','touchend','click']){
   document.addEventListener(type,event=>{
    const target=event.target,field=document.querySelector('#field');
    window.__lpQaEvents.push({type:event.type,trusted:event.isTrusted,pointerType:event.pointerType||null,pointerId:event.pointerId??null,
     target:target===field?'field':target.closest?.('.material-print')?'print':target.tagName,
     targetTag:target.tagName,targetClass:typeof target.className==='string'?target.className:null,
     x:event.clientX??null,y:event.clientY??null,buttons:event.buttons??null,
     fieldCaptured:event.pointerId!==undefined?field.hasPointerCapture(event.pointerId):null});
   },true);
  }
 });

 const tapPoint=await visiblePrint(page);
 await page.touchscreen.tap(tapPoint.x,tapPoint.y);
 await page.locator('#inspect').waitFor({state:'visible'});
 const tapEvents=await page.evaluate(()=>window.__lpQaEvents);
 assert(tapEvents.some(event=>event.trusted&&(event.type==='touchstart'||event.type==='pointerdown'&&event.pointerType==='touch')),'tap must generate trusted touch input');
 assert(tapEvents.some(event=>event.trusted&&event.type==='click'&&event.target==='print'),'tap must produce a trusted print click');
 report.tests.push({name:'engine-trusted touchscreen.tap opens the native preview',input:'trusted touch tap only',events:tapEvents});
 await page.keyboard.press('Escape');await page.locator('#inspect').waitFor({state:'hidden'});

 await page.locator('.field-tools [data-do="reset"]').click();
 const dragPoint=await visiblePrint(page),direction=dragPoint.x>195?-1:1;
 await page.evaluate(()=>window.__lpQaEvents=[]);
 await page.mouse.move(dragPoint.x,dragPoint.y);await page.mouse.down();
 await page.mouse.move(dragPoint.x+direction*12,dragPoint.y+4,{steps:2});
 await page.mouse.move(dragPoint.x+direction*18,dragPoint.y+4,{steps:2});
 await page.waitForFunction(()=>document.querySelector('#field').classList.contains('is-drag'));
 const before=await page.evaluate(()=>{
  const down=window.__lpQaEvents.find(event=>event.type==='pointerdown'&&event.trusted&&event.pointerType==='mouse');
  if(!down)throw new Error('No trusted mouse pointerdown');
  return {pointerId:down.pointerId,captured:document.querySelector('#field').hasPointerCapture(down.pointerId),transform:document.querySelector('#plane').style.transform};
 });
 assert(before.captured,'the field must own native pointer capture during this mouse drag');
 const afterSynthetic=await page.evaluate(pointerId=>{
  // Deliberately untrusted: exercises only the bubbled descendant-event guard.
  window.__lpQaPrint.dispatchEvent(new PointerEvent('lostpointercapture',{bubbles:true,pointerId,pointerType:'mouse',buttons:1}));
  return {dragging:document.querySelector('#field').classList.contains('is-drag'),captured:document.querySelector('#field').hasPointerCapture(pointerId)};
 },before.pointerId);
 assert(afterSynthetic.dragging,'synthetic descendant capture loss must not terminate the mouse drag');
 assert(afterSynthetic.captured,'a synthetic event must not remove real field capture');
 await page.mouse.move(dragPoint.x+direction*60,dragPoint.y+8,{steps:8});
 await page.waitForFunction(transform=>document.querySelector('#plane').style.transform!==transform,before.transform);
 assert(await page.locator('#field').evaluate(field=>field.classList.contains('is-drag')),'the held mouse drag must continue after the synthetic event');
 await page.mouse.up();
 await page.waitForFunction(()=>!document.querySelector('#field').classList.contains('is-drag'));
 assert.equal(await page.locator('#inspect').evaluate(dialog=>dialog.open),false,'finishing the drag must not activate a print');
 const dragEvents=await page.evaluate(()=>window.__lpQaEvents);
 assert(dragEvents.some(event=>event.type==='lostpointercapture'&&event.target==='print'&&!event.trusted));
 assert(dragEvents.some(event=>event.type==='pointerup'&&event.trusted&&event.pointerType==='mouse'));
 report.tests.push({name:'synthetic descendant lostpointercapture preserves an engine-trusted mouse drag',input:'trusted mouse + synthetic lostpointercapture; not a touch drag',before,afterSynthetic,events:dragEvents});

 // A fresh touch remains usable after the previous mouse gesture completes.
 const freshPoint=await visiblePrint(page);await page.touchscreen.tap(freshPoint.x,freshPoint.y);
 await page.locator('#inspect').waitFor({state:'visible'});await page.keyboard.press('Escape');
 await page.locator('#inspect').waitFor({state:'hidden'});
 report.tests.push({name:'a fresh engine-trusted tap opens and Escape closes the preview after the mouse regression',input:'trusted touch tap only'});
 if(engine==='chromium')await chromiumTouchRegression(context,page);
 assert.deepEqual(report.errors,[]);report.status='passed';
 console.log('PASS',engine,'trusted tap; synthetic descendant capture-loss during mouse drag; fresh tap',engine==='chromium'?'; Chromium-only trusted continuous touch, height resize and pinch':'');
}catch(error){
 report.status=browser?'failed':'blocked';report.failure=error.message;process.exitCode=1;
 console.error(report.status.toUpperCase(),engine,error.message);
}finally{
 if(browser)await browser.close();
 writeFileSync(join(out,'archive-input.json'),JSON.stringify(report,null,2));
}
