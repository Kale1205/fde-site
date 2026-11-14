// Synthetic local media and an intercepted GitHub API. No real token or network writes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createHash}=require('node:crypto');
const jpeg=Buffer.from('/9j/4AAQSkZJRgABAgAAAQABAAD//gAQTGF2YzYxLjE5LjEwMQD/2wBDAAgEBAQEBAUFBQUFBQYGBgYGBgYGBgYGBgYHBwcICAgHBwcGBgcHCAgICAkJCQgICAgJCQoKCgwMCwsODg4RERT/xABMAAEBAAAAAAAAAAAAAAAAAAAABgEBAQAAAAAAAAAAAAAAAAAAAAYQAQAAAAAAAAAAAAAAAAAAAAARAQAAAAAAAAAAAAAAAAAAAAD/wAARCAB4AKADASIAAhEAAxEA/9oADAMBAAIRAxEAPwCLASqJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf/2Q==','base64');
const mp4=Buffer.from('AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAOHbW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAA+gAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAArJ0cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAA+gAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAKAAAAB4AAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAAPoAAAAAAABAAAAAAIqbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAAAyAAAAMgBVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAAB1W1pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAZVzdGJsAAAAuXN0c2QAAAAAAAAAAQAAAKlhdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAKAAeABIAAAASAAAAAAAAAABFUxhdmM2MS4xOS4xMDEgbGlieDI2NAAAAAAAAAAAAAAAGP//AAAAL2F2Y0MBQsAe/+EAF2dCwB7ZAoR+XARAAAADAEAAAAyDxYuSAQAFaMuDyyAAAAAQcGFzcAAAAAEAAAABAAAAFGJ0cnQAAAAAAAAd4AAAAAAAAAAYc3R0cwAAAAAAAAABAAAAGQAAAgAAAAAUc3RzcwAAAAAAAAABAAAAAQAAABxzdHNjAAAAAAAAAAEAAAABAAAAGQAAAAEAAAB4c3RzegAAAAAAAAAAAAAAGQAAAsoAAAALAAAACwAAAAoAAAAKAAAACgAAAAoAAAAKAAAACgAAAAoAAAAKAAAACgAAAAoAAAAKAAAACgAAAAoAAAAKAAAACgAAAAoAAAAKAAAACgAAAAoAAAAKAAAACgAAAAoAAAAUc3RjbwAAAAAAAAABAAADtwAAAGF1ZHRhAAAAWW1ldGEAAAAAAAAAIWhkbHIAAAAAAAAAAG1kaXJhcHBsAAAAAAAAAAAAAAAALGlsc3QAAAAkqXRvbwAAABxkYXRhAAAAAQAAAABMYXZmNjEuNy4xMDMAAAAIZnJlZQAAA8RtZGF0AAACcQYF//9t3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE2NCByMzEwOCAzMWUxOWY5IC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAyMyAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTAgcmVmPTMgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MToweDExMSBtZT1oZXggc3VibWU9NyBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MSA4eDhkY3Q9MCBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0tMiB0aHJlYWRzPTQgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0wIHdlaWdodHA9MCBrZXlpbnQ9MjUwIGtleWludF9taW49MjUgc2NlbmVjdXQ9NDAgaW50cmFfcmVmcmVzaD0wIHJjX2xvb2thaGVhZD00MCByYz1jcmYgbWJ0cmVlPTEgY3JmPTIzLjAgcWNvbXA9MC42MCBxcG1pbj0wIHFwbWF4PTY5IHFwc3RlcD00IGlwX3JhdGlvPTEuNDAgYXE9MToxLjAwAIAAAABRZYiEDPEYoAAk9xwABE3jgACe1JycnJycnJycnXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXgAAAAB0GaOBngUYAAAAAHQZpUBngUYAAAAAZBmmAzwKMAAAAGQZqAM8CjAAAABkGaoDPAowAAAAZBmsAzwKMAAAAGQZrgM8CjAAAABkGbADPAowAAAAZBmyAzwKMAAAAGQZtAM8CjAAAABkGbYDPAowAAAAZBm4AzwKMAAAAGQZugM8CjAAAABkGbwDPAowAAAAZBm+AzwKMAAAAGQZoAM8CjAAAABkGaIDPAowAAAAZBmkAzwKMAAAAGQZpgM8CjAAAABkGagDPAowAAAAZBmqAzwKMAAAAGQZrAL8CjAAAABkGa4C/AowAAAAZBmwArwKM=','base64');
const blank=fs.readFileSync('ja/lp/media-manifest.json');
const sha='a'.repeat(40),gitBlob=createHash('sha1').update('blob '+blank.length+'\0').update(blank).digest('hex');
module.exports=async function verifyLpCms(browser,base,out,engine){
 const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true}),page=await ctx.newPage();
 try{
 const api=[],writes=[],pageErrors=[];
 page.on('pageerror',error=>pageErrors.push(error.message));
 const cors={'access-control-allow-origin':'*','access-control-allow-headers':'accept,authorization,content-type,x-github-api-version','access-control-allow-methods':'GET,POST,OPTIONS'};
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
 // Browser canPlayType can claim H.264 on CI hosts without a functioning decoder.
 const hasH264=await page.evaluate(encoded=>new Promise(resolve=>{
  const v=document.createElement('video');
  const uri=URL.createObjectURL(new Blob([Uint8Array.from(atob(encoded),c=>c.charCodeAt(0))],{type:'video/mp4'}));
  const finish=ok=>{clearTimeout(timer);v.onloadeddata=v.onerror=null;v.removeAttribute('src');v.load();URL.revokeObjectURL(uri);resolve(ok);};
  const timer=setTimeout(()=>finish(false),6000);
  v.preload='auto';v.muted=true;v.onloadeddata=()=>finish(v.videoWidth===160);v.onerror=()=>finish(false);v.src=uri;
 }),mp4.toString('base64'));
 if(hasH264){
  await poster.setInputFiles({name:'synthetic.jpg',mimeType:'image/jpeg',buffer:jpeg});
  await status('ファイルを選択しました');
  await video.setInputFiles({name:'synthetic.mp4',mimeType:'video/mp4',buffer:mp4});
  await status('ファイルを選択しました');
  await preview.click();
  try{await d().locator('video').waitFor({timeout:15000});}
  catch(error){await d().screenshot({path:out+'/'+engine+'-lp-cms-error.png'});throw Error('LP CMS first video preview: '+await d().getByRole('status').textContent()+'; player='+await d().locator('video').count(),{cause:error});}
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
