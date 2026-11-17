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
async function legacyMediaIsStill(){
 // A historical video may still be in the CMS manifest for an existing
 // case. Its poster stays useful, but the clip must not be fetched or
 // surfaced in the case detail, Archive grid, or Archive inspection.
 const poster=readFileSync(new URL('../ja/lp/assets/concept-materials.png',import.meta.url));
 const videoPath='assets/cases/01/'+'a'.repeat(64)+'.mp4';
 const posterPath='assets/cases/01/'+createHash('sha256').update(poster).digest('hex')+'.png';
 const manifest={version:1,cases:{'01':{title:'旧動画を持つ制作例',description:'保存済みの表紙を検証',alt:'変換前の表紙',video:videoPath,poster:posterPath}}};
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
 page.on('pageerror',error=>errors.push(error.message));
 let clipRequests=0;
 try{
  await page.route('**/ja/lp/media-manifest.json',route=>route.fulfill({json:manifest}));
  await page.route('**/ja/lp/'+videoPath,route=>{clipRequests++;return route.abort();});
  await page.route('**/ja/lp/'+posterPath,route=>route.fulfill({contentType:'image/png',body:poster}));
  await page.goto(base+'ja/lp/cases/01.html');
  await page.getByRole('heading',{name:'旧動画を持つ制作例'}).waitFor();
  assert.match(await page.locator('.case-picture .photo').evaluate(node=>node.style.getPropertyValue('--case-photo')),/\.png/);
  assert.equal(await page.locator('.case-main video').count(),0);
  assert.equal(await page.locator('.case-main .case-media').count(),0);
  await page.goto(base+'ja/lp/#archive');
  await page.waitForFunction(()=>document.querySelector('#plane .material-print')&&!document.documentElement.classList.contains('fde-loading'));
  const trigger=page.locator('.material-access [data-material="0"]');
  await trigger.focus();await trigger.click();
  assert.match(await page.locator('.inspect-image .photo').evaluate(node=>node.style.getPropertyValue('--case-photo')),/\.png/);
  assert.equal(await page.locator('#archive video,#inspect video').count(),0);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#inspect').isVisible(),false);
  assert.equal(await trigger.evaluate(node=>node===document.activeElement),true);
  assert.equal(clipRequests,0);
  pass('legacy CMS clip is never requested; the original poster and caption still appear',{clipRequests});
 }finally{await context.close();}
}
async function liveArchiveOnlyClip(){
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),page=await context.newPage();
 page.on('pageerror',error=>errors.push(error.message));
 try{
  const {archive}=JSON.parse(readFileSync(new URL('../ja/lp/media-manifest.json',import.meta.url)));
  const clip=archive?.['07'];
  // Generic no-video and legacy regressions still run if CMS later replaces
  // or removes this particular approved asset.
  const approved='c1094b00f55bab0bdd237a9247e64d91274a96d8f26143ab84a5d7ffc8e4e781';
  if(clip?.video!=='assets/archive/07/'+approved+'.mp4'||clip.caseId!==null){
   console.log('SKIP: the exact approved slot-07 Archive-only clip is no longer assigned');
   return;
  }
  await page.goto(base+'ja/lp/#archive');
  await page.waitForFunction(()=>document.querySelector('#plane .material-print')&&!document.documentElement.classList.contains('fde-loading'));
  assert.equal(await page.locator('.field-tools [data-lp-motion]').isVisible(),true);
  const button=page.locator('.material-access [data-slot="07"]');
  assert.equal(await button.count(),1);
  await button.focus();assert.equal(await button.evaluate(el=>document.activeElement===el),true);
  await page.keyboard.press('Enter');
  await page.locator('#inspect').waitFor({state:'visible'});
  assert.equal(await page.locator('#inspect-title').textContent(),clip.title);
  assert.equal(await page.locator('#inspect .inspect-link').isVisible(),false);
  assert.equal(await page.locator('#inspect .inspect-link').getAttribute('href'),null);
  assert.equal(await page.locator('#inspect [data-lp-motion]').isVisible(),true);
  await page.waitForFunction(()=>document.querySelector('#inspect video')?.currentTime>.1);
  const video=page.locator('#inspect video');
  assert.deepEqual(await video.evaluate(v=>[v.videoWidth,v.videoHeight,v.muted,v.playsInline,v.loop,v.controls]),[720,1280,true,true,true,false]);
  assert.ok((await video.getAttribute('src')).endsWith('/'+clip.video));
  await page.locator('#inspect [data-lp-motion]').click();
  await video.waitFor({state:'detached'});
  assert.ok((await page.locator('#inspect .archive-only-photo img').getAttribute('src')).endsWith('/'+clip.poster));
  await page.locator('.close-inspect').click();
  await page.waitForFunction(()=>document.activeElement===document.querySelector('.material-access [data-slot="07"]'));
  const legacy=page.locator('.material-access [data-material="6"]:not([data-slot])');
  assert.equal(await legacy.count(),1);
  await legacy.focus();assert.equal(await legacy.evaluate(el=>document.activeElement===el),true);
  await page.keyboard.press('Enter');
  await page.locator('#inspect .inspect-link').waitFor({state:'visible'});
  assert.ok((await page.locator('#inspect .inspect-link').getAttribute('href')).endsWith('/07.html'));
  assert.equal(await page.locator('#inspect [data-lp-motion]').isVisible(),false);
  pass('published Archive-only clip plays inline without a Stories link; assigned details still link');
 }finally{await context.close();}
}
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
 page.on('pageerror',error=>errors.push(error.message));
 // This context verifies the behavior with no Archive videos; another
 // context below exercises the real production manifest and approved clip.
 await page.route('**/ja/lp/media-manifest.json',route=>route.fulfill({json:{version:1,cases:{}}}));
 await page.goto(base+'ja/lp/cases/01.html');
 await page.locator('button[data-lp-theme]').focus();await page.keyboard.press('Enter');
 assert.equal(await page.locator('html').getAttribute('data-lp-theme'),'dark');
 for(let index=1;index<=10;index++){
  await page.goto(base+'ja/lp/cases/'+String(index).padStart(2,'0')+'.html');
  assert.equal(await page.locator('.sitehead [data-lp-theme]').count(),1);
  assert.equal(await page.locator('.sitehead [data-lp-motion]').count(),0);
  assert.equal(await page.locator('html').getAttribute('data-lp-theme'),'dark');
 }
 pass('all ten static case pages have keyboard theme controls without a motion control');

 await page.goto(base+'ja/lp/#archive');
 await page.waitForFunction(()=>document.querySelector('#plane .material-print')&&!document.documentElement.classList.contains('fde-loading'));
 assert.equal(await page.locator('html').getAttribute('data-lp-theme'),'dark');
 assert.equal(await page.locator('.field-tools [data-lp-motion]').isVisible(),false);
 const trigger=page.locator('.material-access [data-material="0"]');await trigger.focus();await trigger.click();
 assert.ok(await page.locator('#inspect').isVisible());
 assert.equal(await page.locator('#inspect [data-lp-motion]').isVisible(),false);
 await page.locator('#inspect [data-lp-theme]').click();
 assert.equal(await page.locator('html').getAttribute('data-lp-theme'),'light');
 await page.locator('.close-inspect').click();
 assert.equal(await trigger.evaluate(element=>document.activeElement===element),true);
 await trigger.click();
 await page.keyboard.press('Escape');
 assert.ok(!await page.locator('#inspect').isVisible());
 assert.ok(await trigger.evaluate(element=>document.activeElement===element));
 pass('static native preview has no pause button; Close and Escape restore focus');

 await page.locator('.view-switch a[href="#works"]').click();
 await page.waitForFunction(()=>!document.querySelector('.gather-layer'));
 await page.locator('.stories .prints a').first().click();
 await page.locator('button[data-lp-theme]').click();
 assert.equal(await page.locator('html').getAttribute('data-lp-theme'),'dark');
 await page.goBack();await page.waitForSelector('.view-switch');
 assert.equal(await page.locator('html').getAttribute('data-lp-theme'),'dark');
 await page.goForward();await page.waitForSelector('.case-main');
 assert.equal(await page.locator('html').getAttribute('data-lp-theme'),'dark');
 assert.equal(await page.locator('.sitehead [data-lp-motion]').count(),0);
 pass('Back/Forward retain shared theme and do not introduce case motion controls');

 for(const width of [320,390,850,1440]){
  await page.setViewportSize({width,height:900});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  const controls=await page.locator('.lp-display-button').evaluateAll(buttons=>buttons.map(button=>{const r=button.getBoundingClientRect();return {width:r.width,height:r.height,x:r.x,right:r.right};}));
  assert.ok(controls.every(r=>r.width>=44&&r.height>=44&&r.x>=0&&r.right<=width),JSON.stringify({width,controls}));
  if([390,1440].includes(width))await page.screenshot({path:join(out,'detail-'+width+'.png'),fullPage:true});
 }
 pass('320–1440px controls have 44px targets without horizontal overflow');
 await legacyMediaIsStill();
 await liveArchiveOnlyClip();
 assert.deepEqual(errors,[]);
 writeFileSync(join(out,'results.json'),JSON.stringify({results,errors},null,2));
 console.log(results.length+' LP detail checks passed');
}finally{await browser.close();}
