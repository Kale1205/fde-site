import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {newsImagePath,wrapBookOffset,prepareBookOffset,modulo,bookFlightTransform,BOOK_MOTION} from '../news-books.js';
import {storyImage,localNews} from './build_book_news.mjs';
import {withoutW05BookCoverEditor} from './w05_cover_editor_test_helpers.mjs';
import {normalizeAssetBuildKeys as normalize} from './asset_build_test_helpers.mjs';
const root=new URL('../',import.meta.url),read=file=>readFileSync(new URL(file,root),'utf8');
const before=file=>execFileSync('git',['show',`edcf24191d73c923868bc6714dbd35339b4ff0e1:${file}`],{cwd:root,encoding:'utf8'});
test('shared image retains public data and backend contracts; FAQ writes are separately guarded',()=>{
 for(const file of ['worker/src/index-v14.js'])assert.equal(normalize(read(file)),normalize(before(file)));
 assert.match(read('faq-admin-v3.js'),/FAQ_READ_ONLY=true/);
});
test('one article image controls the card, transition and reader even when old cover data remains',()=>{
 for(const coverImage of ['', 'assets/old-cover.webp','https://evil.example/a.png']){
  assert.equal(newsImagePath({id:'article',image:'assets/new.webp',coverImage},'../'),'../assets/new.webp');
  assert.equal(newsImagePath({id:'article',coverImage},'../','assets/fallback.webp'),'../assets/fallback.webp');
 }
 assert.equal(newsImagePath({id:'ims-license-updates-policy-20260819',image:'assets/new.webp'}),'assets/new.webp');
 assert.equal(newsImagePath({id:'ims-license-updates-policy-20260819'}),'assets/ims-license-update.webp');
 for(const image of ['https://evil.example/a.png','javascript:alert(1)','assets/../x.png','assets/a.png?payload=x','//evil.example/x.webp'])assert.equal(newsImagePath({image}),'assets/news-fallback-user.svg');
});
test('CMS only offers the original shared article image controls',()=>{
 const html=read('cms-admin.html');
 for(const id of ['createImageFile','editImageFile','editCurrentImage','removeNewsImageBtn'])assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1,id);
 assert.doesNotMatch(html,/CoverFile|CurrentCover|CoverPreview|editCoverReset|saveBookCoverBtn|data-cms-book-cover-editor|本棚の表紙|表紙だけを保存/);
});
test('shared image upload, replacement and reset use local drafts and the protected PR engine',()=>{
 const js=read('cms-admin.js');
 assert.doesNotMatch(js,/coverImage|CoverFile|saveBookCover|populateBookCover|initBookCovers/);
 assert.match(read('cms-news-workflow.js'),/blob.size>8\*1024\*1024/);
 assert.match(js,/inspectImage\(file\)/);
 assert.match(js,/d.removeImage=true/);
 assert.match(js,/publisher.publish\(d,token\)/);
 assert.doesNotMatch(js,/uploadAsset|saveCms|method:'PUT'/);
});
test('opening animation is sequenced after layout, pointer taps have no outline and keyboard focus remains visible',()=>{
 const js=read('news-books.js'),css=read('news-books.css');
 assert.match(js,/requestAnimationFrame\(\(\)=>requestAnimationFrame/);assert.match(js,/is-preparing/);assert.match(js,/reduce.matches\?220:BOOK_MOTION.open/);assert.match(js,/clearTimeout\(openingTimer\)/);
 assert.match(js,/openingCover.animate/);assert.match(js,/rotateY\(-3deg\)/);assert.doesNotMatch(js,/rotateY\(-168deg\)/);assert.match(css,/book-cover-dissolve 180ms/);
 assert.match(css,/data-book-input="pointer"[^\n]*outline:none/);assert.match(css,/data-book-input="keyboard"[^\n]*outline:2px solid var\(--forest\)/);
});
test('book motion connects the source bounds to the reader, settles selection and preserves native vertical scrolling',()=>{
 assert.deepEqual(BOOK_MOTION,{select:1200,open:1800,close:1000,viewOut:240,viewIn:680});
 assert.equal(bookFlightTransform({left:10,top:20,width:100,height:125},{left:50,top:60,width:200,height:250},'translateX(-50%)'),'translate3d(-40px,-102.5px,0) translateX(-50%) scale(0.5,0.5)');
 assert.equal(bookFlightTransform({left:NaN,top:0,width:0,height:0},{left:0,top:0,width:0,height:0},'none'),'none');
 const js=read('news-books.js'),css=read('news-books.css');
 assert.match(js,/bookFlightTransform\(sourceRect/);assert.match(js,/sourceRect=liftedBook\?\.getBoundingClientRect/);
 assert.match(js,/getComputedStyle\(node\)\.transform/);assert.match(js,/velocity/);assert.match(js,/Math.abs\(event.deltaX\)<=Math.abs\(event.deltaY\)/);
 assert.match(js,/if\(offset===1\|\|offset===2\)rotate\(offset\)/);assert.match(css,/touch-action:pan-y/);
 assert.match(js,/offset===0\?ui.read:offset<0\?ui.previous:ui.next/);assert.match(js,/else node.removeAttribute\('aria-haspopup'\)/);
 assert.doesNotMatch(js,/requestAnimationFrame\(.*rotate\(|setInterval/);
});
test('Chronicle Rail uses the exact selected third concept without reintroducing books, duplicate lists or changing SNS',()=>{
 for(const file of ['news.html','ja/news.html','zh/news.html']){const html=read(file);assert.match(html,/class="chronicle-dates"/);assert.match(html,/class="chronicle-current-marker"/);assert.equal((html.match(/data-date-offset=/g)||[]).length,3);assert.match(html,/class="chronicle-selected-date"/);assert.match(html,/class="chronicle-pagination"/);assert.doesNotMatch(html,/book-skin|book-spine|news-book-forest|news-book-open|book-paper|class="news-archive"/);}
 const css=read('news-books.css');assert.match(css,/left:var\(--rail-width\)/);assert.match(css,/overflow:clip/);assert.match(css,/\.chronicle-current-marker\{[^\n]+transition:transform 1200ms/);
});
test('five recycled planes keep correct items and stable hidden buffers through one- and two-step wraps',()=>{
 for(const count of [1,2,3,7,24]){let index=0,offsets=[-1,0,1,2,3];for(let step=0;step<200;step++){const delta=[1,-1,2,-2][step%4];const prepared=offsets.map(offset=>prepareBookOffset(offset,delta));assert.equal(new Set(prepared).size,5);const ids=prepared.map(offset=>modulo(index+offset,count));index=modulo(index+delta,count);const moved=prepared.map(offset=>offset-delta);for(let i=0;i<5;i++)if(moved[i]>=0&&moved[i]<=2)assert.equal(ids[i],modulo(index+moved[i],count));offsets=moved.map(wrapBookOffset);assert.deepEqual([...offsets].sort((a,b)=>a-b),[-1,0,1,2,3]);}}
});
test('static HTML and hydrated CMS content resolve the same shared image and fallback',()=>{
 const content=JSON.parse(read('content/site-content.json'));
 for(const locale of ['en','ja','zh'])for(const prefix of ['','../'])for(const item of localNews(locale))assert.equal(storyImage(item,prefix),newsImagePath(item,prefix,content.newsFallbackImage));
 for(const id of ['__proto__','toString','constructor'])assert.equal(newsImagePath({id}),'assets/news-fallback-user.svg');
 const js=read('news-books.js');assert.equal((js.match(/const cover=resolveImage\(item\)/g)||[]).length,2);assert.match(js,/image.src=resolveImage\(item\)/);assert.match(js,/newsFallbackImage===fallback/);
 const css=execFileSync('git',['show','5dc6c44da0bb2cc2ac124cef087bdca891b041f2:news-books.css'],{cwd:root,encoding:'utf8'});
 // Only the list-reader/view rules and reviewed normal-motion timing may
 // differ; every existing layout, color and keyframe pose remains exact.
 let current=read('news-books.css').split('\n').filter(line=>!/^\.book-news \.book-opening-cover\[hidden\]|^\.book-news main\.is-news-(?:leaving|arriving)|^@keyframes news-view-(?:leave|arrive)/.test(line)).join('\n');
 for(const [now,before] of [
  ['transition:transform 1200ms cubic-bezier(.4,0,.2,1)','transition:transform 680ms cubic-bezier(.2,.75,.22,1)'],
  ['animation:book-arrive 1400ms 160ms cubic-bezier(.4,0,.2,1)','animation:book-arrive 800ms 160ms cubic-bezier(.2,.7,.2,1)'],
  ['animation:book-ink-arrive 700ms 620ms cubic-bezier(.4,0,.2,1)','animation:book-ink-arrive 360ms 560ms ease-out'],
  ['animation:book-depart 700ms cubic-bezier(.4,0,.2,1)','animation:book-depart 460ms ease-in'],
 ])current=current.replace(now,before);
 assert.equal(current,css,'existing layout, colors and keyframe poses unchanged');
});
test('Chronicle changes leave the approved SNS markup and main social styles byte-identical',()=>{
 for(const file of ['news.html','ja/news.html','zh/news.html']){const previous=execFileSync('git',['show',`6c27def33c7c26a6361184ef6333d287d7d84d50:${file}`],{cwd:root,encoding:'utf8'});const social=html=>html.slice(html.indexOf('      <section class="news-social'),html.indexOf('      <dialog class="book-reader'));assert.equal(social(read(file)),social(previous));}
 const previous=execFileSync('git',['show','6c27def33c7c26a6361184ef6333d287d7d84d50:news-books.css'],{cwd:root,encoding:'utf8'}),social=css=>css.slice(css.indexOf('.book-news .news-social'),css.indexOf('body.book-reader-open'));assert.equal(social(read('news-books.css')),social(previous));
});
test('all three languages remove the rejected social description and visible feed failure message',()=>{
 for(const file of ['news.html','ja/news.html','zh/news.html']){const html=read(file);assert.doesNotMatch(html,/投稿を表示できません|上のアイコンからInstagram|写真・映像・小説/);assert.match(html,/class="instagram-empty sr-only" role="status"><\/p>/);}
 assert.match(read('ja/news.html'),/<h2 id="news-social-title">SNS<\/h2>/);
});
test('selected social directory uses genuine local Instagram photos, no LinkedIn avatar and approved D copy in every language',()=>{
 const intros={'news.html':'Want to know more? Explore our official and personal accounts.','ja/news.html':'もう少し詳しく知りたい方へ。公式・個人アカウントはこちら。','zh/news.html':'想了解更多？欢迎访问官方及个人账号。'};
 assert.match(read('news-books.css'),/#cmsInstagram\{[^\n]+grid-column:1;grid-row:1/);assert.match(read('news-books.css'),/\.social-profiles\{grid-column:2;grid-row:1;min-width:0/);
 for(const [file,intro] of Object.entries(intros)){
  const html=read(file),social=html.slice(html.indexOf('<section class="news-social'),html.indexOf('<dialog class="book-reader'));
  assert.ok(social.includes(`<p class="social-intro">${intro}</p>`));assert.match(social,/class="social-directory"/);
  assert.equal((social.match(/class="social-avatar"/g)||[]).length,2);
  for(const account of ['kale1999','bakedkale']){assert.ok(social.includes(`assets/instagram-${account}-profile.jpg`));assert.ok(readFileSync(new URL(`assets/instagram-${account}-profile.jpg`,root)).length<15000);}
  const linkedin=social.slice(social.indexOf('class="social-network social-network-linkedin"'),social.indexOf('class="instagram-feed"'));
  assert.match(linkedin,/Kakeru Okumoto/);assert.doesNotMatch(linkedin,/social-avatar|奥本|画像設定待ち/);
  assert.equal((social.match(/class="social-profile"/g)||[]).length,3);
 }
});
test('reader has a definite viewport-bounded size, an accessible inner scroller and resets scrolling for each article',()=>{
 const css=read('news-books.css'),js=read('news-books.js');
 assert.match(css,/height:min\(697\.85px,[^\n]+82dvh\)/);
 assert.match(css,/height:min\(760px,calc\(100dvh - 64px\)\)/);
 assert.match(css,/\.reader-copy\{[^\n]+min-height:0[^\n]+overflow:auto[^\n]+overscroll-behavior:contain/);
 assert.match(js,/reader\.querySelector\('\.reader-copy'\)\.scrollTop=0/);
 for(const file of ['news.html','ja/news.html','zh/news.html']){const html=read(file);assert.match(html,/class="reader-copy" role="region" aria-labelledby="book-article-title" tabindex="0"/);assert.doesNotMatch(html,/class="reader-body" tabindex/);}
});
test('article and file previews use safe DOM, local asset allowlist and revocable blob URLs',()=>{
 const js=read('cms-admin.js');assert.doesNotMatch(js,/innerHTML|outerHTML|insertAdjacentHTML/);
 assert.match(js,/box.replaceChildren\(\)/);assert.match(js,/make\('img'\)/);
 assert.match(js,/raw\.githubusercontent/);assert.match(js,/Kale1205/);
 assert.match(js,/URL.revokeObjectURL/);assert.match(js,/URL.createObjectURL\(blob\)/);
 assert.match(js,/img.src=encodeURI\(url\)/);assert.match(js,/map\(encodeURIComponent\)/);
 assert.match(js,/A-Za-z0-9_\//);
});
