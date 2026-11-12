import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadingPages,stripLoadingHead} from './page_loading_template.mjs';
import {withSiteChrome,stripSiteChromeAssets} from './site_chrome.mjs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('the single-character view embeds unchanged native JPEG pixels and no generated artwork',()=>{
 const svg=read('assets/bakedkale-character.svg'),bytes=Buffer.from(svg.match(/data:image\/jpeg;base64,([^"]+)/)[1],'base64');assert.deepEqual(bytes,readFileSync(new URL('../assets/instagram-bakedkale-profile-20261110.jpg',import.meta.url)));assert.equal(createHash('sha256').update(bytes).digest('hex'),'3b2ad8bff9a086767706118651a0c27758c624d0f454291bffffb640193d7ecf');assert(svg.includes('<clipPath'));assert(!svg.includes('<text'));
});
test('all 27 navigable page shells own one character header and a complete fixed-row stylesheet',()=>{
 for(const f of loadingPages){const html=read(f);assert.equal((html.match(/data-brand-character/g)||[]).length,1,f);assert.equal((html.match(/site-chrome\.css\?v=/g)||[]).length,1,f);assert.equal(withSiteChrome(f,html),html,f);assert.doesNotThrow(()=>stripSiteChromeAssets(stripLoadingHead(html)));}
 const css=read('site-chrome.css');assert(css.includes('position:fixed'));assert(css.includes('padding-top:var(--site-header-height)'));assert(css.includes('scroll-padding-top'));assert(css.includes('prefers-reduced-motion:reduce'));assert(css.includes('data-site-motion="still"'));
});
test('the header shares the existing footer preference and measures the true row height',()=>{
 const js=read('site-chrome.js');for(const token of ['motion-preferences.js','motionPreference.matches',"addEventListener('change'",'ResizeObserver','getBoundingClientRect().height'])assert(js.includes(token));assert(!js.includes('localStorage'));
});
test('owned metadata cannot hide unknown scripts or a changed character source',()=>{
 const html=read('ja/index.html');assert.throws(()=>stripSiteChromeAssets(html.replace('site-chrome.js?v=','unexpected.js?v=')),/Unexpected script/);assert.throws(()=>withSiteChrome('ja/index.html',html.replace('assets/bakedkale-character.svg','assets/unknown.svg')),/Unexpected brand/);
});
test('News cues and view navigation keep article controls without redundant read buttons',()=>{
 for(const p of ['', 'ja/','zh/']){const html=read(p+'news.html');assert(/id="news-updates-title">(?:Click ↓|点击 ↓)</.test(html));assert(!/class="(?:book-read|wire-read-more)"/.test(html));assert(/class="news-view-link" data-news-view-all/.test(html));assert(/class="news-view-link" data-news-back/.test(html));assert(html.includes('aria-haspopup="dialog"'));assert(html.includes('data-current-price-notice'));}
});
