import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {modulo,MAX_BOOKS,INSTAGRAM_ACCOUNTS,newsImagePath,validInstagramFeed,shuffled} from '../news-books.js';
import {renderQuietNews} from './build_quiet_news.mjs';
import {withoutW05CmsBridge} from './w05_book_news_test_helpers.mjs';
import {normalizeAssetBuildKeys as normalize} from './asset_build_test_helpers.mjs';
import {applyReviewedZhSearchMetadata} from './zh_search_metadata_test_helpers.mjs';
const root=new URL('../',import.meta.url),read=file=>readFileSync(new URL(file,root),'utf8');
const cms=JSON.parse(read('content/site-content.json'));
const baseline=file=>applyReviewedZhSearchMetadata(file,execFileSync('git',['show',`79c017fe45c6316c402f28db5560c152597963d7:${file}`],{cwd:root,encoding:'utf8'}));
const entities={'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"};
const decode=s=>s.replace(/&(?:amp|lt|gt|quot|#39);/g,x=>entities[x]);
for(const [prefix,locale] of [['','en'],['ja/','ja'],['zh/','zh-CN']]){
 test(`${locale}: approved bookshelf is deterministic and full articles survive without JS`,()=>{
  const html=read(prefix+'news.html');assert.equal(renderQuietNews(html),html);assert.equal(normalize(renderQuietNews(baseline(prefix+'news.html'))),normalize(html));
  const data=JSON.parse(html.match(/id="book-news-data">([\s\S]*?)<\/script>/)[1]);
  assert.equal(data.items.length,cms.news.length);
  for(const item of cms.news){const seed=data.items.find(x=>x.id===item.id);assert.equal(seed.body,item.body[locale]);assert.equal(seed.title,item.title[locale]);assert.equal(seed.date,item.date);
   const fallback=html.match(new RegExp(`<article data-static-news-id="${item.id}">([\\s\\S]*?)</article>`))[1];assert(fallback.includes(item.title[locale]));for(const p of item.body[locale].split(/\n\n+/))assert(decode(fallback).includes(p.replaceAll('\n','<br>')));
  }
  assert.equal((html.match(/class="news-book"/g)||[]).length,3);assert.equal((html.match(/class="book-read"/g)||[]).length,1);
  assert.doesNotMatch(html,/id="cmsNewsLead"|id="cmsLatestList"|id="cmsNewsWire"|class="news-archive"/);
 });
 test(`${locale}: SEO, navigation, footer and commerce boundaries unchanged`,()=>{
  const html=read(prefix+'news.html'),old=baseline(prefix+'news.html');
  const head=s=>normalize(s.match(/<head>[\s\S]*?<\/head>/)[0].replace(/^  <(?:link rel="stylesheet" href="(?:\.\.\/)?news-books\.css[^\n]*|script type="module" src="(?:\.\.\/)?news-books\.js[^\n]*)\n/gm,''));assert.equal(head(html),head(old));
  for(const tag of ['header','footer'])assert.equal(html.match(new RegExp(`<${tag}[^>]*>[\\s\\S]*?</${tag}>`))[0],old.match(new RegExp(`<${tag}[^>]*>[\\s\\S]*?</${tag}>`))[0]);
  assert.doesNotMatch(html,/<form\b|stripe|data-buy|instagram\.com\/.*utm_/i);
  assert.match(html,/href="https:\/\/www\.instagram\.com\/kale1999_\/"/);
  assert.match(html,/href="https:\/\/www\.instagram\.com\/bakedkale\/"/);
  assert.match(html,/href="https:\/\/www\.linkedin\.com\/in\/okumoto-kakeru-326a49429\/"/);
 });
}
test('circular indices never hit an endpoint or grow the bounded render pool',()=>{assert.equal(MAX_BOOKS,5);for(let i=-10000;i<10000;i++){assert(modulo(i,3)>=0&&modulo(i,3)<3);assert.equal(modulo(i+3,3),modulo(i,3));}});
test('CMS image references allow only this project public asset paths',()=>{const fallback='../assets/news-fallback-user.svg';for(const image of ['javascript:alert(1)',' javascript:alert(1)','data:image/svg+xml,x','https://attacker.test/a.png','assets/../x.png','assets/a.png?payload=<x>','assets/a%22.png','//attacker.test/a.svg'])assert.equal(newsImagePath({image},'../'),fallback,image);assert.equal(newsImagePath({image:'assets/uploads/real-image.png'},'../'),'../assets/uploads/real-image.png');assert.equal(newsImagePath({image:'https://raw.githubusercontent.com/Kale1205/fde-site/main/assets/uploads/real-image.webp'}),'assets/uploads/real-image.webp');assert.equal(decode('&amp;lt;'),'&lt;');});
test('Instagram not connected means no invented or placeholder posts',()=>{const feed=JSON.parse(read('content/instagram-feed.json'));assert.equal(feed.connectionStatus,'not-connected');assert.deepEqual(feed.posts,[]);assert.deepEqual(validInstagramFeed(feed),[]);});
const sample={id:'test-only',author:'kale1999_',source:'instagram',caption:'TEST FIXTURE — never published',publishedAt:'2026-10-15T00:00:00Z',permalink:'https://www.instagram.com/p/test/'};
const feed=posts=>({schemaVersion:1,accounts:INSTAGRAM_ACCOUNTS.map(username=>({username,profileUrl:`https://www.instagram.com/${username}/`,connectionStatus:'connected'})),connectionStatus:'connected',posts});
test('feed accepts only the two approved connected accounts and authentic-source Instagram permalinks',()=>{assert.equal(validInstagramFeed(feed([sample,{...sample,id:'b',author:'bakedkale'}])).length,2);for(const change of [{author:'other'},{source:'linkedin'},{caption:''},{caption:'x'.repeat(2201)},{permalink:'javascript:alert(1)'},{permalink:'https://attacker.test/p/test/'},{publishedAt:''}])assert.deepEqual(validInstagramFeed(feed([{...sample,...change}])),[]);assert.deepEqual(validInstagramFeed({...feed([sample]),accounts:[]}),[]);assert.deepEqual(validInstagramFeed({...feed([sample]),accounts:[{username:'kale1999_',profileUrl:'https://www.instagram.com/other/',connectionStatus:'connected'}]}),[]);assert.equal(validInstagramFeed(feed(Array(100).fill(sample))).length,24);});
test('a disconnected account cannot inject posts alongside the other connected account',()=>{const data=feed([sample,{...sample,id:'b',author:'bakedkale'}]);data.accounts[1].connectionStatus='not-connected';assert.deepEqual(validInstagramFeed(data).map(x=>x.author),['kale1999_']);const shipped=JSON.parse(read('content/instagram-feed.json'));assert.deepEqual(shipped.accounts.map(a=>[a.username,a.accountType,a.connectionStatus]),[['kale1999_','CREATOR','not-connected'],['bakedkale','BUSINESS','not-connected']]);});
test('randomization preserves actual posts and never mutates their captions',()=>{const data=[sample,{...sample,id:'b'},{...sample,id:'c'}],copy=JSON.stringify(data);assert.deepEqual(shuffled(data,()=>0).map(x=>x.id),['b','c','test-only']);assert.equal(JSON.stringify(data),copy);});
test('native dialog, bounded recycling and accessible motion policies are explicit',()=>{const html=read('ja/news.html'),js=read('news-books.js'),css=read('news-books.css');assert.match(html,/<dialog class="book-reader" aria-labelledby="book-article-title"/);assert.match(js,/reader.showModal\(\)/);assert.match(js,/addEventListener\('cancel'/);assert.match(js,/lastTrigger.focus/);assert.match(js,/MAX_BOOKS/);assert.match(js,/queued=Math.max\(-2,Math.min\(2,delta\)\)/);assert.match(js,/IntersectionObserver/);assert.match(js,/document.hidden/);assert.match(js,/reduce.matches/);assert.match(css,/prefers-reduced-motion:reduce/);assert.match(css,/focus-visible/);assert.doesNotMatch(js,/innerHTML|insertAdjacentHTML|localStorage|sendBeacon|setInterval|graph\.instagram|api\.linkedin|access_token/i);});
test('article facts, privacy and current release conditions are byte-identical',()=>{for(const file of ['content/site-content.json','content/zh-translations.json','robots.txt','worker/src/index-v14.js'])assert.equal(read(file),baseline(file));});
test('focused panel moves to the new active panel before outgoing panels become aria-hidden',()=>{const js=read('news-books.js');const start=js.indexOf('const focusedPanel=slots.includes(document.activeElement)');assert(start>0);assert(js.indexOf('if(focusedPanel)document.activeElement.blur()',start)<js.indexOf('for(const node of slots)position(node,Number(node.dataset.offset)-delta)',start));assert.match(js,/if\(focusedPanel\)stage.querySelector\('\[data-offset="0"\]'\).focus\(\{preventScroll:true\}\)/);});
test('shared CMS change is only a News-scoped handoff; all existing fetch/auth behavior stays exact',()=>{for(const file of ['cms-content.js','cms-content-ja.js'])assert.equal(withoutW05CmsBridge(read(file)),baseline(file));});
test('generated book surfaces and real app icons have a bounded transfer budget',()=>{let sum=0;for(const file of ['news-book-forest.webp','news-book-ivory.webp','news-book-open.webp','news-book-spine-left.webp','news-book-spine-right.webp','instagram-app.webp','linkedin-app.webp','news-demo-cover.webp','news-site-cover.webp']){const n=statSync(new URL('../assets/'+file,import.meta.url)).size;assert(n<150000,file);sum+=n;}assert(sum<350000,`asset bytes: ${sum}`);});
