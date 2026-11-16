// Run against npm run dev, with Playwright installed or PLAYWRIGHT_MODULE set.
// Measures rendered paper transforms; it never changes content or CMS data.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.BASE_URL||'http://127.0.0.1:4197/',out=process.env.QA_OUTPUT||'/tmp/lp-transition-motion-qa';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),results=[],errors=[];
// Independent fitted-reference baseline. These are rendered-DOM curve fits;
// desktop forward is an estimate, rather than a recovered source declaration.
const baseline=(width,work)=>width>690?(work?
 {duration:[902,1022],minDelay:518,delay:638,curves:[[.22,1,.36,1],[0,0,1,1],[.22,1,.36,1]],seatAt:1320,settle:220,observed:[1500,1850],estimated:true}:
 {duration:[730,790],delay:120,curves:[[.76,0,.24,1]],observed:[1200,1200]}):(work?
 {duration:[520,570],delay:100,curves:[[.22,1,.36,1]],observed:[950,1100]}:
 {duration:[490,520],delay:180,curves:[[.65,0,.35,1]],observed:[780,780]});
function eased([x1,y1,x2,y2],fraction){
 const cubic=(a,b,t)=>3*(1-t)**2*t*a+3*(1-t)*t*t*b+t**3;let lo=0,hi=1;
 for(let i=0;i<50;i++){const middle=(lo+hi)/2;if(cubic(x1,x2,middle)<fraction)lo=middle;else hi=middle;}
 return cubic(y1,y2,(lo+hi)/2);
}
const rawForward=[
 {id:'reference-paper-0',points:[[546,.1844],[590,.4255],[648,.683],[720,.8401],[825,.933],[879,.956],[1013,.990],[1280,1]]},
 {id:'reference-paper-1',points:[[648,.383],[720,.691],[825,.873],[1280,.999]]},
];
try{
 for(const viewport of [{width:1440,height:900},{width:400,height:655}]){
  const context=await browser.newContext({viewport,reducedMotion:'no-preference'}),page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'ja/lp/');await page.waitForFunction(()=>document.querySelectorAll('#plane .material-print').length>0);
  await page.waitForFunction(()=>!document.documentElement.classList.contains('fde-loading'));
  for(const work of [true,false]){
   const selector='.view-switch a[href="'+(work?'#works':'#archive')+'"]';
   await page.locator(selector).click();await page.locator('.gather-layer').waitFor();
   const geometry=await page.evaluate(({work,rawReference})=>{
    const layer=document.querySelector('.gather-layer'),all=layer.getAnimations({subtree:true});all.forEach(animation=>animation.pause());
    const read=transform=>{const m=new DOMMatrixReadOnly(transform);return {x:m.e,y:m.f,sx:Math.hypot(m.a,m.b),sy:Math.hypot(m.c,m.d),angle:Math.atan2(m.b,m.a)*180/Math.PI};};
    const props=['x','y','sx','sy','angle'],pieces=[];let maxPerpendicular=0,maxProgressMismatch=0,minProgress=1,maxProgress=0;
    for(const node of layer.querySelectorAll('.gather-print')){
     const animation=node.getAnimations().find(value=>value.effect.target===node),timing=animation.effect.getTiming(),frames=animation.effect.getKeyframes();
     const photo=node.querySelector('.photo'),photoAnimation=photo.getAnimations().find(value=>value.effect.target===photo);
     const photoTiming=photoAnimation.effect.getTiming(),photoFrames=photoAnimation.effect.getKeyframes();
     const segments=[];
     for(let i=0;i<frames.length-1;i++){
      const a=read(frames[i].transform),b=read(frames[i+1].transform),innerA=read(photoFrames[i].transform),innerB=read(photoFrames[i+1].transform),samples=[];
      for(const fraction of [.1,.25,.5,.75,.9]){
       animation.currentTime=timing.delay+timing.duration*(frames[i].computedOffset+(frames[i+1].computedOffset-frames[i].computedOffset)*fraction);
       photoAnimation.currentTime=animation.currentTime;
       const actual=read(getComputedStyle(node).transform),progress=props.filter(prop=>Math.abs(b[prop]-a[prop])>1e-4).map(prop=>(actual[prop]-a[prop])/(b[prop]-a[prop]));
       const innerActual=read(getComputedStyle(photo).transform),innerProgress=props.filter(prop=>Math.abs(innerB[prop]-innerA[prop])>1e-4).map(prop=>(innerActual[prop]-innerA[prop])/(innerB[prop]-innerA[prop]));
       const allProgress=progress.concat(innerProgress);
       const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),perpendicular=length?Math.abs(dx*(actual.y-a.y)-dy*(actual.x-a.x))/length:0;
       const mismatch=allProgress.length?Math.max(...allProgress)-Math.min(...allProgress):0;
       maxPerpendicular=Math.max(maxPerpendicular,perpendicular);maxProgressMismatch=Math.max(maxProgressMismatch,mismatch);
       if(allProgress.length){minProgress=Math.min(minProgress,...allProgress);maxProgress=Math.max(maxProgress,...allProgress);}
       samples.push({fraction,actual,progress,innerActual,innerProgress,perpendicular,mismatch,opacity:getComputedStyle(node).opacity});
      }
      segments.push({duration:timing.duration*(frames[i+1].computedOffset-frames[i].computedOffset),easing:frames[i].easing,from:a,to:b,samples});
     }
     const rawChecks=rawReference.map(reference=>{
      const start=read(frames[0].transform),temporary=read(frames[1].transform),prop=props.filter(prop=>Math.abs(temporary[prop]-start[prop])>1e-4).sort((a,b)=>Math.abs(temporary[b]-start[b])-Math.abs(temporary[a]-start[a]))[0];
      const samples=reference.points.map(([ms,expected])=>{animation.currentTime=ms;const actual=read(getComputedStyle(node).transform),progress=(actual[prop]-start[prop])/(temporary[prop]-start[prop]);return {ms,expected,progress,error:progress-expected};});
      return {id:reference.id,samples,rmse:Math.sqrt(samples.reduce((sum,sample)=>sum+sample.error**2,0)/samples.length)};
     });
     pieces.push({material:node.dataset.material,duration:timing.duration,delay:timing.delay,segments,rawChecks,photoSameTimeline:timing.duration===photoTiming.duration&&timing.delay===photoTiming.delay&&frames.every((frame,i)=>frame.computedOffset===photoFrames[i].computedOffset&&frame.easing===photoFrames[i].easing)});
    }
    // Restore every piece to the start and let real completion callbacks run.
    all.forEach(animation=>{animation.currentTime=0;animation.play();});
    return {work,layerInert:layer.inert,pieces,maxPerpendicular,maxProgressMismatch,minProgress,maxProgress};
   },{work,rawReference:work&&viewport.width>690?rawForward:[]});
   assert(geometry.layerInert);assert(geometry.maxPerpendicular<.02,JSON.stringify({viewport,work,perpendicular:geometry.maxPerpendicular}));
   assert(geometry.maxProgressMismatch<.002,JSON.stringify({viewport,work,mismatch:geometry.maxProgressMismatch}));
   assert(geometry.minProgress>=-.002&&geometry.maxProgress<=1.002,'a segment must converge without overshooting its endpoint');
   const expectedSegments=work&&viewport.width>690?3:1;
   const expected=baseline(viewport.width,work);
   assert(geometry.pieces.every(piece=>piece.photoSameTimeline&&piece.segments.length===expectedSegments&&piece.segments.every(segment=>segment.samples.every(sample=>sample.opacity==='1'))));
   if(expectedSegments===3)assert(geometry.pieces.every(piece=>Math.abs(piece.segments[2].duration-expected.settle)<1e-6&&Math.abs(piece.delay+piece.segments[0].duration+piece.segments[1].duration-expected.seatAt)<1e-6));
   assert(geometry.pieces.every(piece=>piece.duration>=expected.duration[0]&&piece.duration<=expected.duration[1]&&piece.delay>=(expected.minDelay||0)&&piece.delay<=expected.delay));
   geometry.maxFittedCurveError=Math.max(...geometry.pieces.flatMap(piece=>piece.segments.flatMap((segment,i)=>segment.samples.flatMap(sample=>sample.progress.concat(sample.innerProgress).map(progress=>Math.abs(progress-eased(expected.curves[i],sample.fraction)))))));
   assert(geometry.maxFittedCurveError<.002,JSON.stringify({viewport,work,curveError:geometry.maxFittedCurveError}));
   if(expectedSegments===3){
    geometry.rawReferenceMatches=rawForward.map((reference,i)=>{const piece=geometry.pieces.reduce((best,piece)=>piece.rawChecks[i].rmse<best.rawChecks[i].rmse?piece:best);return {id:reference.id,delay:piece.delay,flight:piece.segments[0].duration,...piece.rawChecks[i]};});
    assert(geometry.rawReferenceMatches.every(match=>match.rmse<.035),JSON.stringify(geometry.rawReferenceMatches));
   }
   await page.locator('.gather-layer').waitFor({state:'detached'});
   assert.equal(await page.locator('.is-in-flight,.is-assembling').count(),0);
   results.push({viewport,geometry,expected});console.log('PASS',viewport.width,work?'forward':'reverse',JSON.stringify({pieces:geometry.pieces.length,maxPerpendicular:geometry.maxPerpendicular,maxProgressMismatch:geometry.maxProgressMismatch,maxFittedCurveError:geometry.maxFittedCurveError}));
  }
  // Measure uninterrupted layer lifetime separately from the deterministic probe.
  for(const work of [true,false]){
   await page.evaluate(()=>{
    window.lpMotionTimes={};window.lpMotionObserver=new MutationObserver(records=>{for(const record of records){for(const node of record.addedNodes)if(node.classList?.contains('gather-layer'))lpMotionTimes.added=performance.now();for(const node of record.removedNodes)if(node.classList?.contains('gather-layer'))lpMotionTimes.removed=performance.now();}});
    lpMotionObserver.observe(document.body,{childList:true});
    const clicked=event=>{if(event.target.closest('.view-switch a')){lpMotionTimes.clicked=performance.now();document.removeEventListener('click',clicked,true);}};document.addEventListener('click',clicked,true);
   });
   await page.locator('.view-switch a[href="'+(work?'#works':'#archive')+'"]').click();await page.locator('.gather-layer').waitFor();
   const timings=await page.locator('.gather-print').evaluateAll(nodes=>nodes.map(node=>{const timing=node.getAnimations()[0].effect.getTiming();return {duration:timing.duration,delay:timing.delay};}));
   await page.locator('.gather-layer').waitFor({state:'detached'});
   const lifecycle=await page.evaluate(()=>{lpMotionObserver.disconnect();return {...lpMotionTimes,elapsed:lpMotionTimes.removed-lpMotionTimes.added,actionElapsed:lpMotionTimes.removed-lpMotionTimes.clicked,inFlight:document.querySelectorAll('.is-in-flight,.is-assembling').length};});
   const lastFinish=Math.max(...timings.map(value=>value.duration+value.delay));
   assert.equal(lifecycle.inFlight,0);assert(lifecycle.elapsed>=lastFinish-70&&lifecycle.elapsed<=lastFinish+250,JSON.stringify({lifecycle,lastFinish}));
   const observed=baseline(viewport.width,work).observed,referenceComparison={observedActionMs:observed,localActionMs:lifecycle.actionElapsed,differenceFromObservedRangeMs:[lifecycle.actionElapsed-observed[1],lifecycle.actionElapsed-observed[0]]};
   results.push({viewport,work,lifecycle,lastFinish,timings,referenceComparison});console.log('PASS lifecycle',viewport.width,work?'forward':'reverse',JSON.stringify({layerMs:Math.round(lifecycle.elapsed),actionMs:Math.round(lifecycle.actionElapsed),referenceComparison}));
  }
  await context.close();
 }
 assert.deepEqual(errors,[]);writeFileSync(join(out,'transition-motion.json'),JSON.stringify({results,errors},null,2));
}finally{await browser.close();}
