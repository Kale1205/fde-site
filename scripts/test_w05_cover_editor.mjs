import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {newsCoverPath} from '../news-books.js';
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
 assert.match(js,/requestAnimationFrame\(\(\)=>requestAnimationFrame/);assert.match(js,/is-preparing/);assert.match(js,/reduce.matches\?220:1080/);assert.match(js,/clearTimeout\(openingTimer\)/);
 assert.match(css,/book-cover-open 1050ms/);assert.match(css,/book-cover-mobile-open/);assert.match(css,/book-cover-dissolve 180ms/);
 assert.match(css,/data-book-input="pointer"[^\n]*outline:none/);assert.match(css,/data-book-input="keyboard"[^\n]*outline:2px solid var\(--forest\)/);
});
test('all three languages remove the rejected social description and visible feed failure message',()=>{
 for(const file of ['news.html','ja/news.html','zh/news.html']){const html=read(file);assert.doesNotMatch(html,/class="social-intro"|投稿を表示できません|上のアイコンからInstagram|写真・映像・小説/);assert.match(html,/class="instagram-empty sr-only" role="status"><\/p>/);}
 assert.match(read('ja/news.html'),/<h2 id="news-social-title">SNS<\/h2>/);
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
