// Local-only browser QA with generated images/video and a routed manifest.
// Run npm run dev, then node scripts/lp_gallery_layout_browser_qa.cjs.
const assert=require('node:assert/strict');
const {join}=require('node:path');
const poster='assets/archive/11/'+('a'.repeat(64))+'.jpg';
const isolatedPhoto='assets/archive/03/'+('d'.repeat(64))+'.jpg';
const clip='assets/archive/11/'+('b'.repeat(64))+'.mp4';
const legacyPoster='assets/cases/01/'+('c'.repeat(64))+'.jpg',legacyClip=legacyPoster.replace('.jpg','.mp4');
const manifest={version:1,archive:{'11':{caseId:'01',title:'地図の素材',alt:'検証用の素材',poster,video:clip}},cases:{'01':{
 alt:'旧動画',poster:legacyPoster,video:legacyClip,title:'検証ストーリー',description:'下書きの本文',
 story:{cover:'archive:11',detail:{headline:'案件の見出し\n2行目',subtitle:'案件のサブタイトル',eyebrow:'案件のラベル',mood:'案件の雰囲気',composition:'案件のページ構成',note:'案件の注記'},layers:Array.from({length:7},(_,i)=>({source:'archive:11',visible:i!==2,x:12+i*3,y:10+i*3,width:36,rotate:2})),blocks:[{type:'image',source:'archive:11',alt:'詳細画像',caption:'画像説明'},{type:'text',heading:'詳細見出し',text:'追加の本文'}]}
}},order:['02','01','03','04','05','06','07','08','09','10']};
// Synthetic 160×96 color fixtures; no FFmpeg required on CI.
const jpg=Buffer.from('/9j/4AAQSkZJRgABAgAAAQABAAD//gAQTGF2YzYxLjE5LjEwMQD/2wBDAAgEBAQEBAUFBQUFBQYGBgYGBgYGBgYGBgYHBwcICAgHBwcGBgcHCAgICAkJCQgICAgJCQoKCgwMCwsODg4RERT/xABNAAEBAAAAAAAAAAAAAAAAAAAABgEBAQEAAAAAAAAAAAAAAAAAAAQFEAEAAAAAAAAAAAAAAAAAAAAAEQEAAAAAAAAAAAAAAAAAAAAA/8AAEQgAYACgAwEiAAIRAAMRAP/aAAwDAQACEQMRAD8AhwE7PAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf/9k=','base64');
const mp4=Buffer.from('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','base64');
function respondVideo(route){
 const range=/^bytes=(\d+)-(\d*)$/.exec(route.request().headers().range||'');
 if(!range)return route.fulfill({contentType:'video/mp4',headers:{'Accept-Ranges':'bytes'},body:mp4});
 const first=Number(range[1]),last=Math.min(mp4.length-1,range[2]?Number(range[2]):mp4.length-1);
 if(first>last)return route.fulfill({status:416,headers:{'Content-Range':'bytes */'+mp4.length}});
 return route.fulfill({status:206,contentType:'video/mp4',headers:{'Accept-Ranges':'bytes','Content-Range':'bytes '+first+'-'+last+'/'+mp4.length},body:mp4.subarray(first,last+1)});
}
module.exports=async function verifyGallery(browser,base,out,engine='chromium'){
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),page=await context.newPage(),errors=[];
 let legacyClipRequests=0;
 let activeManifest={version:1,cases:{'01':{photo:legacyPoster,alt:'元の案件写真'}},archive:{'03':{caseId:'01',photo:isolatedPhoto,alt:'位置03だけの写真'}}};
 try{
  await page.route('**/media-manifest.json',r=>r.fulfill({json:activeManifest}));
  for(const p of [poster,legacyPoster,isolatedPhoto])await page.route('**/'+p,r=>r.fulfill({contentType:'image/jpeg',body:jpg}));
  await page.route('**/'+clip,respondVideo);
  await page.route('**/'+legacyClip,r=>{legacyClipRequests++;return respondVideo(r);});
  page.on('pageerror',error=>errors.push(error.message));
  // Slots 03 and 10 both link case 01. Only slot 03 is edited, including all
  // its repeated sheets. The other slot and unconfigured Stories stay intact.
  await page.goto(base+'ja/lp/index.html');
  await page.waitForFunction(()=>document.querySelectorAll('.material-print[data-slot="3"]').length>1);
  for(const [slot,expected]of [['3','/archive/03/'],['10','/cases/01/']]){
   const paths=await page.locator('.material-print[data-slot="'+slot+'"] .photo').evaluateAll(nodes=>nodes.map(n=>n.style.getPropertyValue('--case-photo')));
   assert(paths.length>1,'repeated sheet clones must exist');assert(paths.every(path=>path.includes(expected)),slot+' must preserve its own media identity across repeated sheets');
  }
  await page.locator('.material-access button[data-slot="03"]').focus();
  await page.keyboard.press('Enter');await page.locator('#inspect[open]').waitFor();
  assert.equal(await page.locator('#inspect video[controls],#inspect .case-media').count(),0);
  assert.match(await page.locator('#inspect .photo').evaluate(node=>node.style.getPropertyValue('--case-photo')),/archive\/03/);
  await page.locator('.close-inspect').click();
  await page.locator('.view-switch [href="#works"]').click();
  const originalPhotos=await page.locator('.prints .print-0 .photo').evaluateAll(nodes=>nodes.map(n=>n.style.getPropertyValue('--case-photo')));
  assert.equal(originalPhotos.length,7);assert(originalPhotos.every(path=>path.includes('/cases/01/')),'Archive edit must not overwrite Stories imagery by default');
  await page.goto(base+'ja/lp/cases/01.html');
  await page.waitForFunction(()=>document.querySelector('.case-picture .case-custom-photo'));
  assert.equal(await page.locator('video,.case-media').count(),0,'direct case pages have no standalone player');
  assert.match(await page.locator('.case-picture .photo').evaluate(node=>node.style.getPropertyValue('--case-photo')),/cases\/01/);
  console.log(engine+': duplicate-case Archive positions stay independently edited across repeats, Stories and direct detail');
  activeManifest=manifest;
  await page.goto(base+'ja/lp/index.html');
  await page.waitForFunction(()=>document.querySelector('.material-print[data-slot="11"]'));
  const hasH264=await page.evaluate(encoded=>new Promise(resolve=>{
   const v=document.createElement('video'),uri=URL.createObjectURL(new Blob([Uint8Array.from(atob(encoded),c=>c.charCodeAt(0))],{type:'video/mp4'}));
   const done=ok=>{clearTimeout(timer);v.onloadeddata=v.onerror=null;v.removeAttribute('src');v.load();URL.revokeObjectURL(uri);resolve(ok);};
   const timer=setTimeout(()=>done(false),5000);v.preload='auto';v.muted=true;v.onloadeddata=()=>done(v.videoWidth===160);v.onerror=()=>done(false);v.src=uri;
  }),mp4.toString('base64'));
  if(hasH264){
   await page.waitForFunction(()=>document.querySelector('#archive .archive-loop')?.currentTime>.1);
   assert.equal(await page.locator('.archive-loop').count(),1);
   assert.deepEqual(await page.locator('.archive-loop').evaluate(v=>[v.muted,v.playsInline,v.loop,getComputedStyle(v).pointerEvents]),[true,true,true,'none']);
   await page.locator('.archive-loop').locator('..').tap();
   await page.waitForFunction(()=>document.querySelector('#inspect').open&&document.querySelector('#inspect-title').textContent==='地図の素材'&&!document.querySelector('#archive .archive-loop'));
   await page.waitForFunction(()=>document.querySelector('#inspect .archive-loop')?.currentTime>.1);
   assert.equal(await page.locator('#inspect video[controls],#inspect .case-media').count(),0,'inspect clip has no standalone player chrome');
   await page.locator('.close-inspect').tap();
   await page.waitForFunction(()=>document.querySelector('.archive-loop')?.currentTime>.1);
   await page.locator('.archive-motion-control').tap();
   await page.waitForFunction(()=>!document.querySelector('.archive-loop'));
   await page.locator('.archive-motion-control').tap();
   await page.waitForFunction(()=>document.querySelector('.archive-loop')?.currentTime>.1);
   if(engine==='chromium'){
    const cdp=await context.newCDPSession(page);
    const tl=await page.locator('.archive-loop').boundingBox();
    const x=Math.round(tl.x+tl.width/2),y=Math.round(tl.y+tl.height/2),field=page.locator('#plane');
    const before=await field.evaluate(el=>el.style.transform);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for(let i=1;i<=5;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+13*i,y:y+2*i}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForFunction(pose=>document.querySelector('#plane').style.transform!==pose,before);
    assert.equal(await page.locator('#inspect').evaluate(el=>el.open),false,'drag over media cannot open inspect');
   }
  }else{
   // Some Linux browser builds lack H.264. The still, keyboard/touch entry,
   // Stories setup and absence of case videos remain testable.
   await page.locator('.material-access button[data-slot="11"]').focus();
   await page.locator('.material-access button[data-slot="11"]').tap();
   assert.equal(await page.locator('#inspect-title').textContent(),'地図の素材');
   await page.locator('.close-inspect').tap();
   console.log(engine+': no H.264 decode; clip playback and touch-drag over clip skipped');
  }
  if(out)await page.screenshot({path:join(out,engine+'-lp-gallery-archive.png')});
  await page.locator('.view-switch [href="#works"]').click();
  await page.locator('.prints li').nth(1).getByText('検証ストーリー').waitFor();
  assert.equal(await page.locator('.archive-loop').count(),0);
  assert.equal(await page.locator('.gather-layer video').count(),0);
  const story=page.locator('.prints li').nth(1);
  assert.equal(await story.locator('[data-layer="2"]').isVisible(),false);
  assert.equal(await story.locator('[data-layer="1"]').evaluate(node=>node.style.getPropertyValue('--story-x')),'15%');
  assert.match(await story.locator('[data-layer="1"] .photo').evaluate(node=>node.style.getPropertyValue('--case-photo')),/archive\/11/);
  await story.locator('a').click();
  await page.getByRole('heading',{name:'詳細見出し'}).waitFor();
  assert.equal(await page.getByAltText('詳細画像').count(),1);
  assert.equal(await page.getByText('下書きの本文').count(),1);
  assert.equal(await page.locator('.case-hero h1').textContent(),'案件の見出し\n2行目');
  assert.equal(await page.locator('.case-hero h1').evaluate(node=>getComputedStyle(node).whiteSpace),'pre-line');
  for(const copy of ['案件のサブタイトル','案件のラベル','案件の雰囲気','案件のページ構成','案件の注記'])assert.equal(await page.getByText(copy,{exact:true}).count(),1);
  assert.equal(await page.locator('video').count(),0);
  assert.equal(legacyClipRequests,0);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(base+'ja/lp/index.html#archive');
  await page.waitForFunction(()=>document.querySelector('.material-print[data-slot="11"]'));
  assert.equal(await page.locator('.archive-loop').count(),0);
  assert.deepEqual(errors,[]);
  console.log(engine+': mobile Archive inspect, Stories composition/detail, no legacy video and reduced motion passed'+(hasH264?', plus visible playback/pause and '+(engine==='chromium'?'trusted touch drag.':'trusted touch tap.')+'.':'.'));
 }finally{await context.close();}
};
if(require.main===module){
 (async()=>{
  const engine=process.env.LP_QA_BROWSER||'chromium';
  const playwright=require(process.env.PLAYWRIGHT_MODULE||'playwright');
  const browser=await playwright[engine].launch();
  try{await module.exports(browser,process.env.BASE_URL||'http://127.0.0.1:4173/',process.env.QA_OUTPUT,engine);}
  finally{await browser.close();}
 })().catch(e=>{console.error(e);process.exitCode=1;});
}
