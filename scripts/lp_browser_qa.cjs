const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs');const path=require('node:path');
(async()=>{
const engine=process.env.BROWSER||'chromium';const out=process.env.QA_OUTPUT||'/tmp/lp-browser-qa';fs.mkdirSync(out,{recursive:true});
const browser=await (engine==='webkit'?webkit:chromium).launch();const ctx=await browser.newContext();const page=await ctx.newPage();const errors=[],posts=[],broken=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))posts.push(r.url())});page.on('response',r=>{if(r.status()>=400)broken.push({url:r.url(),status:r.status()})});const results=[];const base=process.env.BASE_URL||'http://127.0.0.1:4197/';
await require('./lp_cms_browser_qa.cjs')(browser,base,out,engine);
await page.setViewportSize({width:1331,height:894});await page.goto(base+'ja/lp/');await page.waitForTimeout(2200);
await page.waitForFunction(()=>document.documentElement.dataset.pageLoadingResult==='complete');
const loader=await page.evaluate(()=>({elapsed:window.__fdePageLoading.finished-window.__fdePageLoading.shownAt,skip:!!document.querySelector('[data-page-loading-skip]'),countVisible:document.querySelector('[data-page-loading-count]').getClientRects().length}));
if(loader.elapsed<950||loader.elapsed>=1950||loader.skip||loader.countVisible)throw Error('LP one-second loader '+JSON.stringify(loader));
await page.reload();if(await page.evaluate(()=>!!window.__fdePageLoading||document.documentElement.classList.contains('fde-loading')))throw Error('LP reload replayed the entry loader');
for(const route of ['ja/lp/examples.html','ja/lp/service.html','ja/lp/diagnosis.html','ja/lp/cases/01.html','ja/news.html','ja/goals.html','ja/license.html']){
 await page.goto(base+route);if(await page.locator('#page-loading').count())throw Error('Loader on non-entry: '+route);
}
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
const wm=await wordmark(page);if(!wm||wm.count!==1||wm.text!=='bakedkale library'||wm.hit!=='none')throw Error('Desktop Archive wordmark '+JSON.stringify(wm));
const plane=page.locator('#plane'),initial=await plane.evaluate(x=>x.style.transform);
const geometry=await page.locator('.material-print').evaluateAll(xs=>{const rs=xs.map(x=>x.getBoundingClientRect()).filter(r=>r.right>8&&r.bottom>10&&r.left<innerWidth-8&&r.top<innerHeight-10);const cols=[...new Set(rs.map(r=>Math.round(r.x+r.width/2)))].sort((a,b)=>a-b);return {cols,count:rs.length};});
if(geometry.cols.length<5||geometry.count<18||Math.abs(geometry.cols[2]-geometry.cols[1]-1331/5.12)>3)throw Error('Archive lattice geometry '+JSON.stringify(geometry));

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
if(!hit)throw Error('no clickable material');await page.mouse.click(...hit);if(!await page.locator('#inspect').isVisible())throw Error('material unavailable');
if(await page.locator('.inspect-next,.inspect-prev').count())throw Error('Unrequested next material controls');
await page.keyboard.press('Escape');if(await page.locator('#inspect').isVisible())throw Error('escape failed');
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
await phone.goto(base+'ja/lp/');await phone.waitForTimeout(2200);const m=await wordmark(phone);if(!m||m.count!==1||m.text!=='bakedkale library')throw Error('Phone Archive wordmark '+JSON.stringify(m));
const phoneHit=await phone.locator('.material-print').evaluateAll(xs=>{for(const x of xs){const r=x.getBoundingClientRect(),a=r.x+r.width*.5,b=r.y+r.height*.5;if(a>10&&a<380&&b>100&&b<740&&x.contains(document.elementFromPoint(a,b)))return [a,b]}});
if(!phoneHit)throw Error('no tappable mobile material');await phone.touchscreen.tap(...phoneHit);if(!await phone.locator('#inspect').isVisible())throw Error('material tap unavailable');
await phone.locator('.close-inspect').tap();
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
await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base+'ja/lp/');await page.waitForTimeout(2200);if(posts.length||errors.length||broken.length)throw Error(JSON.stringify({posts,errors,broken}));fs.writeFileSync(path.join(out,engine+'.json'),JSON.stringify({engine,results,diagnosis:true,opaqueFlight:flight,posts,errors,broken},null,2));await browser.close();console.log(engine,results.length,'views + diagnosis passed');
})().catch(e=>{console.error(e);process.exit(1)});
