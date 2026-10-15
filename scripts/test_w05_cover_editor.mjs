import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {newsCoverPath,bookFlightTransform,BOOK_MOTION} from '../news-books.js';
import {withoutW05BookCoverEditor} from './w05_cover_editor_test_helpers.mjs';
import {normalizeAssetBuildKeys as normalize} from './asset_build_test_helpers.mjs';
const root=new URL('../',import.meta.url),read=file=>readFileSync(new URL(file,root),'utf8');
const before=file=>execFileSync('git',['show',`edcf24191d73c923868bc6714dbd35339b4ff0e1:${file}`],{cwd:root,encoding:'utf8'});
test('cover additions preserve pre-existing CMS operations byte-for-byte apart from approved asset cache keys',()=>{
 for(const file of ['cms-admin.js','cms-admin.html'])assert.equal(normalize(withoutW05BookCoverEditor(file,read(file))),normalize(before(file)));
 for(const file of ['news-translation-hook.js','cms-admin-loader.js','cms-admin-view.js','faq-admin-v3.js','worker/src/index-v14.js','content/site-content.json'])assert.equal(normalize(read(file)),normalize(before(file)));
});
test('covers never inherit article imagery or CMS fallback imagery',()=>{
 assert.equal(newsCoverPath({id:'article',image:'assets/top-page.png'}),'');
 assert.equal(newsCoverPath({id:'article',image:'assets/old.png',coverImage:'assets/custom.webp'},'../'),'../assets/custom.webp');
 assert.equal(newsCoverPath({id:'article',image:'assets/new.png',coverImage:'assets/custom.webp'},'../'),'../assets/custom.webp');
 assert.equal(newsCoverPath({id:'article',coverImage:'assets/custom.gif'}),'assets/custom.gif');
 assert.equal(newsCoverPath({id:'ims-license-updates-policy-20260819'}),'assets/ims-license-update.webp');
 assert.equal(newsCoverPath({id:'ims-license-updates-policy-20260819',coverImage:''}),'');
 for(const coverImage of ['https://evil.example/a.png','javascript:alert(1)','assets/../x.png','assets/a.png?payload=x','//evil.example/x.webp'])assert.equal(newsCoverPath({coverImage}),'');
});
test('CMS offers separate cover creation, replacement, reset and cover-only save with unique labels',()=>{
 const html=read('cms-admin.html');
 for(const id of ['createCoverFile','createCoverPreview','editCoverFile','editCurrentCover','editCoverPreview','editCoverReset','saveBookCoverBtn'])assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1,id);
 assert.match(html,/表紙だけを保存/);assert.match(html,/記事画像・本文・翻訳は変更せず/);
 assert.equal((html.match(/data-cms-book-cover-editor=/g)||[]).length,2);
});
test('cover-only save validates files, uses the existing authenticated contents API, preserves translations and re-enables on failure',()=>{
 const js=read('cms-admin.js'),save=js.slice(js.indexOf('async function saveBookCover(){'),js.indexOf('/* W05_COVER_EDITOR_END */'));
 assert.match(save,/if\(!token\)/);assert.match(save,/validateCoverImage\(file\)/);assert.match(save,/await uploadAsset\(file\)/);assert.match(save,/await saveCms\(/);
 assert.match(save,/hadCover/);assert.match(save,/delete item.coverImage/);assert.match(save,/finally\{button.disabled=false/);
 assert.doesNotMatch(save,/item\.(?:body|title|image|date|category|featured|translationStatus)\s*=|cms\.news\s*=|fetch\(|localStorage|sessionStorage/);
 assert.match(js,/file.size>8\*1024\*1024/);assert.match(js,/\['image\/png','image\/jpeg','image\/webp','image\/gif'\]/);
});
test('opening animation is sequenced after layout, pointer taps have no outline and keyboard focus remains visible',()=>{
 const js=read('news-books.js'),css=read('news-books.css');
 assert.match(js,/requestAnimationFrame\(\(\)=>requestAnimationFrame/);assert.match(js,/is-preparing/);assert.match(js,/reduce.matches\?220:BOOK_MOTION.open/);assert.match(js,/clearTimeout\(openingTimer\)/);
 assert.match(js,/openingCover.animate/);assert.match(js,/rotateY\(-168deg\)/);assert.match(css,/book-cover-dissolve 180ms/);
 assert.match(css,/data-book-input="pointer"[^\n]*outline:none/);assert.match(css,/data-book-input="keyboard"[^\n]*outline:2px solid var\(--forest\)/);
});
test('book motion connects the source bounds to the reader, settles selection and preserves native vertical scrolling',()=>{
 assert.deepEqual(BOOK_MOTION,{select:680,open:1120,close:680});
 assert.equal(bookFlightTransform({left:10,top:20,width:100,height:125},{left:50,top:60,width:200,height:250},'translateX(-50%)'),'translate3d(-40px,-102.5px,0) translateX(-50%) scale(0.5,0.5)');
 assert.equal(bookFlightTransform({left:NaN,top:0,width:0,height:0},{left:0,top:0,width:0,height:0},'none'),'none');
 const js=read('news-books.js'),css=read('news-books.css');
 assert.match(js,/bookFlightTransform\(sourceRect/);assert.match(js,/sourceRect=liftedBook\?\.getBoundingClientRect/);
 assert.match(js,/getComputedStyle\(node\)\.transform/);assert.match(js,/velocity/);assert.match(js,/Math.abs\(event.deltaX\)<=Math.abs\(event.deltaY\)/);
 assert.match(js,/if\(Math.abs\(offset\)===1\)rotate\(offset\)/);assert.match(css,/touch-action:pan-y/);
 assert.doesNotMatch(js,/requestAnimationFrame\(.*rotate\(|setInterval/);
});
test('all three languages remove the rejected social description and visible feed failure message',()=>{
 for(const file of ['news.html','ja/news.html','zh/news.html']){const html=read(file);assert.doesNotMatch(html,/投稿を表示できません|上のアイコンからInstagram|写真・映像・小説/);assert.match(html,/class="instagram-empty sr-only" role="status"><\/p>/);}
 assert.match(read('ja/news.html'),/<h2 id="news-social-title">SNS<\/h2>/);
});
test('selected social directory uses genuine local Instagram photos, no LinkedIn avatar and approved D copy in every language',()=>{
 const intros={'news.html':'Want to know more? Explore our official and personal accounts.','ja/news.html':'もう少し詳しく知りたい方へ。公式・個人アカウントはこちら。','zh/news.html':'想了解更多？欢迎访问官方及个人账号。'};
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
test('article image preview treats stored CMS values as data, not HTML',()=>{
 const js=read('cms-admin.js'),preview=js.slice(js.indexOf('/* W05_SAFE_ARTICLE_PREVIEW_START */'),js.indexOf('/* W05_SAFE_ARTICLE_PREVIEW_END */'));
 assert.doesNotMatch(preview,/innerHTML|outerHTML|insertAdjacentHTML/);
 assert.match(preview,/replaceChildren\(\)/);assert.match(preview,/document.createElement\('img'\)/);
 assert.match(preview,/map\(encodeURIComponent\)/);assert.match(preview,/Kale1205/);
 assert.match(preview,/保存済みの画像指定は変更していません/);
 const filePreview=js.slice(js.indexOf('/* W05_SAFE_FILE_PREVIEW_START */'),js.indexOf('/* W05_SAFE_FILE_PREVIEW_END */'));
 assert.doesNotMatch(filePreview,/innerHTML|outerHTML|insertAdjacentHTML/);assert.match(filePreview,/textContent=emptyText/);assert.match(filePreview,/revokeObjectURL/);assert.match(filePreview,/document.createElement\('img'\)/);
 assert.match(filePreview,/objectUrl.startsWith\('blob:'\)/);assert.match(filePreview,/image.src=encodeURI\(objectUrl\)/);
});
