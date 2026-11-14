// Synthetic local media and an intercepted GitHub API. No real token or network writes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createHash}=require('node:crypto');
const jpeg=Buffer.from('/9j/4AAQSkZJRgABAgAAAQABAAD//gAQTGF2YzYxLjE5LjEwMQD/2wBDAAgEBAQEBAUFBQUFBQYGBgYGBgYGBgYGBgYHBwcICAgHBwcGBgcHCAgICAkJCQgICAgJCQoKCgwMCwsODg4RERT/xABMAAEBAAAAAAAAAAAAAAAAAAAABgEBAQAAAAAAAAAAAAAAAAAAAAYQAQAAAAAAAAAAAAAAAAAAAAARAQAAAAAAAAAAAAAAAAAAAAD/wAARCAB4AKADASIAAhEAAxEA/9oADAMBAAIRAxEAPwCLASqJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf/2Q==','base64');
const mp4=Buffer.from('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','base64');
const blank=fs.readFileSync('ja/lp/media-manifest.json');
const sha='a'.repeat(40),gitBlob=createHash('sha1').update('blob '+blank.length+'\0').update(blank).digest('hex');
module.exports=async function verifyLpCms(browser,base,out,engine){
 const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true}),page=await ctx.newPage();
 try{
 const api=[],writes=[],pageErrors=[];
 page.on('pageerror',error=>pageErrors.push(error.message));
 const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
 const reply=(r,json,status=200)=>r.fulfill({status,json,headers:cors});
 await page.route('https://api.github.com/**',async r=>{
  const req=r.request(),p=new URL(req.url()).pathname.replace('/repos/Kale1205/fde-site','');
  api.push([req.method(),p]);
  if(req.method()==='OPTIONS')return r.fulfill({status:204,headers:cors});
  if(req.method()==='POST'){
   const data=req.postDataJSON();writes.push([p,data]);
   return reply(r,p==='/pulls'?{number:1234}:{sha});
  }
  if(p==='/user')return reply(r,{login:'fixture',id:123});
  if(p==='/git/ref/heads/main')return reply(r,{object:{sha}});
  if(p==='/contents/ja/lp/media-manifest.json')return reply(r,{sha:gitBlob,type:'file',encoding:'base64',content:blank.toString('base64')});
  if(p==='/contents/content/site-content.json')return reply(r,{sha,type:'file',encoding:'base64',content:fs.readFileSync('content/site-content.json').toString('base64')});
  if(p==='/pulls')return reply(r,[]);
  if(p.startsWith('/git/commits/'))return reply(r,{tree:{sha}});
  return reply(r,{message:'Not Found'},404);
 });
 const open=()=>page.getByRole('button',{name:'LP制作例',exact:true}).click();
 const d=()=>page.locator('#cmsLpEditor');
 const status=text=>d().getByRole('status').filter({hasText:text}).waitFor({timeout:15000});
 const title=d().getByLabel('名前（空欄なら既定の名前）');
 const preview=d().getByRole('button',{name:'変更をプレビュー'});
 await page.goto(base+'cms-admin.html');await open();await status('公開中の情報を読み込みました');
 assert.equal(api.length,0,'opening disconnected editor must not access GitHub');
 await title.fill('合成素材を使った検証用LP');
 await d().getByLabel('紹介文（空欄なら既定の説明）').fill('紹介文のテスト');
 await d().getByLabel('写真・動画の説明（読み上げ用）').fill('単色のテスト素材');
 await d().getByLabel('Storiesの掲載順').selectOption('02');
 const poster=d().getByLabel('動画の表紙画像（動画がある場合は必須）');
 const video=d().getByLabel('動画（MP4、30秒・12MB以下、推奨H.264）');
 const hasH264=await page.evaluate(()=>!!document.createElement('video').canPlayType('video/mp4; codecs="avc1.42E01E"'));
 if(hasH264){
  await poster.setInputFiles({name:'synthetic.jpg',mimeType:'image/jpeg',buffer:jpeg});
  await status('ファイルを選択しました');
  await video.setInputFiles({name:'synthetic.mp4',mimeType:'video/mp4',buffer:mp4});
  await status('ファイルを選択しました');
  await preview.click();await d().locator('video').waitFor({timeout:15000});
 }else{
  const photo=d().getByLabel('写真（JPEG・PNG・WebP、4MB以下）');
  await photo.setInputFiles({name:'synthetic.jpg',mimeType:'image/jpeg',buffer:jpeg});
  await status('ファイルを選択しました');
 }
 await d().getByRole('button',{name:'下書き保存'}).click();await status('端末内に下書き保存しました');
 await d().getByRole('button',{name:'メニューへ戻る'}).click();
 await page.reload();await open();await status('端末内の下書きを開きました');
 assert.equal(await title.inputValue(),'合成素材を使った検証用LP');
 await preview.click();await status('GitHub接続が必要');
 const player=d().locator('video');
 if(hasH264){
  await player.waitFor({timeout:15000});
  assert.equal(await player.evaluate(v=>v.paused&&!v.autoplay&&v.playsInline&&!!v.poster),true);
 }
 assert.equal(await d().getByRole('button',{name:'公開依頼（PR）'}).isDisabled(),true);
 assert.equal(api.length,0);
 assert.equal(await d().evaluate(node=>node.scrollWidth<=node.clientWidth+2),true);
 await d().screenshot({path:out+'/'+engine+'-lp-cms-mobile.png'});
 await d().getByRole('button',{name:'メニューへ戻る'}).click();
 await page.getByText('接続設定',{exact:true}).click();await page.locator('#token').fill('fixture-token-not-real');await page.locator('#connectBtn').click();
 await page.waitForFunction(()=>document.querySelector('#adminTabs').dataset.connectionState==='connected');
 await open();await status('端末内の下書きを開きました');await preview.click();await status('公開依頼を作成できます');
 await d().getByRole('checkbox',{name:'変更内容と公開できる素材であることを確認しました'}).check();
 await d().getByRole('button',{name:'公開依頼（PR）'}).click();
 await d().getByRole('link',{name:'PR #1234 を確認'}).waitFor({timeout:15000});
 assert.equal(writes.filter(([p])=>p==='/git/blobs').length,hasH264?3:2);
 assert.equal(writes.at(-1)[1].draft,true);
 assert.match(writes.find(([p])=>p==='/git/refs')[1].ref,/^refs\/heads\/cms\/lp\//);
 assert.deepEqual(pageErrors,[]);
 if(hasH264){
  const dir='assets/cases/01/', posterPath=dir+'b'.repeat(64)+'.jpg',videoPath=dir+'c'.repeat(64)+'.mp4';
  const manifest={version:1,cases:{'01':{title:'合成動画ケース',description:'テスト紹介',alt:'単色の動画',poster:posterPath,video:videoPath}},order:['02','01','03','04','05','06','07','08','09','10']};
  await page.route('**/ja/lp/media-manifest.json',r=>r.fulfill({json:manifest}));
  await page.route('**/'+posterPath,r=>r.fulfill({contentType:'image/jpeg',body:jpeg}));
  await page.route('**/'+videoPath,r=>r.fulfill({contentType:'video/mp4',body:mp4}));
  await page.goto(base+'ja/lp/#works');
  await page.locator('.prints li').nth(1).getByRole('link',{name:/合成動画ケース/}).waitFor({timeout:10000});
  assert.equal(await page.locator('.prints li').nth(1).locator('a').getAttribute('href'),'./cases/01.html');
  assert.match(await page.locator('.prints li').nth(1).locator('.photo').first().evaluate(n=>n.style.getPropertyValue('--case-photo')),/\.jpg/);
  assert.equal(await page.locator('video').count(),0);
  await page.locator('.prints li').nth(1).locator('a').click();
  const videoNode=page.locator('video.case-video');
  await videoNode.waitFor();
  assert.equal(await page.locator('.case-copy h2').textContent(),'合成動画ケース');
  assert.match(await page.locator('.case-copy').textContent(),/テスト紹介/);
  assert.equal(await videoNode.evaluate(v=>v.paused&&v.controls&&v.preload==='none'),true);
 }
 console.log(engine,'LP CMS draft, review, fake publication and media flow checked',hasH264?'(MP4 + poster)':'(browser cannot decode H.264; photo exercised)');
 }finally{await ctx.close();}
};
