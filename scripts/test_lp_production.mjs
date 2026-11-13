import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
import {canAcceptLpRequests,LP_ACCEPTANCE_START,LP_FEATURES} from '../ja/lp/lp-policy.js';
import {withLpDestination,pendingLpDestination,liveLpDestination} from './lp_navigation.mjs';
import {renderLpPage} from './build_lp_pages.mjs';
const root=new URL('../',import.meta.url),read=file=>readFileSync(new URL(file,root),'utf8');
const hash=data=>createHash('sha256').update(data).digest('hex');
const normalize=html=>html.replace(/(\.(?:css|js)\?v=)\d{8}-\d{6}/g,'$1BUILD');
const previous=file=>execFileSync('git',['show',`f92f7506bf67a8bd1cb3e209e67252dc54941117:${file}`],{cwd:root,encoding:'utf8'});
test('opening date and future clocks cannot enable an unconnected LP submission',()=>{
 assert.equal(LP_ACCEPTANCE_START,'2026-12-01T00:00:00+09:00');assert(Object.isFrozen(LP_FEATURES));assert.deepEqual(LP_FEATURES,{quoteSubmission:false,statistics:false,payments:false,formalEstimate:false});
 for(const date of ['2026-11-13T00:00:00+09:00','2026-11-30T23:59:59+09:00','2026-12-01T00:00:00+09:00','2030-01-01T00:00:00+09:00','invalid'])assert.equal(canAcceptLpRequests(date),false,date);
});
test('Japanese menus replace only the known pending LP destination and retain FDE content',()=>{
 for(const name of ['index','quiet-form','license','goals','news','demo','contact','customer','order']){
  const file='ja/'+name+'.html',html=read(file);assert.equal(html.split(liveLpDestination).length-1,3,file);assert(!html.includes(pendingLpDestination));assert.equal(normalize(html.replaceAll(liveLpDestination,pendingLpDestination)),normalize(previous(file)),file);
 }
 const changed=liveLpDestination.replace('href="lp/"','href="unknown/"');assert.equal(withLpDestination('ja/index.html',changed),changed);for(const file of ['index.html','zh/index.html','ja/unrelated.html'])assert.equal(withLpDestination(file,pendingLpDestination),pendingLpDestination);
});
test('approved LP pages have real canonical routes, current loader and unambiguous public status',()=>{
 for(const name of ['index','examples','service','diagnosis']){
  const html=read('ja/lp/'+name+'.html');assert.equal(renderLpPage(name),html);assert(!/<base\b|lp-preview\/|非公開確認版|本番への反映は、別途/.test(html));assert.equal((html.match(/data-lp-reception/g)||[]).length,1);assert(html.includes('受付開始予定：2026年12月1日'));assert(html.includes('正規見積の受付・送信は準備中'));
  assert(html.includes('assets/bakedkale-character.png'));assert(html.includes('../../page-loading.js?v='));assert(html.includes('const remaining=2000-'));assert(html.includes('4000'));const canonical=html.match(/<link rel="canonical" href="([^"]+)"/);assert(canonical);assert.equal(new URL(canonical[1]).href,'https://kale1205.github.io/fde-site/ja/lp/'+(name==='index'?'':name+'.html'));assert(!/<form\b|action=|href="mailto:|contact-direct\.js/.test(html));
 }
});
test('diagnostic controls describe a preview, never a completed quote or collected consent',()=>{
 const js=read('ja/lp/diagnosis.js');assert(js.includes('id="lp-submit" disabled'));assert(js.includes('日付だけで送信機能が有効になることはありません'));assert(!/送信完了|fetch\s*\(|sendBeacon|XMLHttpRequest|localStorage|sessionStorage|indexedDB|mailto:/.test(js));assert(/type="checkbox" id="statconsent">/.test(js));assert(!/id="statconsent"[^>]*checked/.test(js));assert(js.includes('同意せずに終了する'));assert(js.includes('強み・集客経路の回答は、今回の統計対象4項目には追加しません'));
});
test('the 12 approved question IDs stay in order and the ten layouts stay fictional',()=>{
 const js=read('ja/lp/diagnosis.js'),prefix=js.slice(js.indexOf('const q='),js.indexOf('const root='));const result=runInNewContext(read('ja/lp/studies.js')+'\n'+prefix+'\nJSON.stringify({q,selectedQuestionIds,studies});');const d=JSON.parse(result);
 assert.equal(hash(prefix),'fb905cd0e0ed02e8aeb072481c572f6eae0f1195bfd3f08a55178f750d1539d7');assert.equal(hash(read('ja/lp/studies.js')),'a8396b8357c0b782bdee58abed1d38613394ab42da08577deee2e84fde86179f');assert.equal(d.q.length,12);assert.deepEqual(d.selectedQuestionIds,[1,2,3,5,8,6,7,9,10,11,13,14]);assert.equal(d.studies.length,10);assert(d.q[1][1].includes('大阪府'));assert(d.q[1][1].includes('海外'));assert(d.q[4][1].includes('おまかせ'));assert.equal(d.q[10][0],'一番伝えたい強みは何ですか？');assert.equal(d.q[11][0],'LPにはどこから来てもらう予定ですか？');
 assert(read('ja/lp/archive.js').includes('完成したLPや受注実績ではありません'));assert(read('ja/lp/service.html').includes('架空のCSSレイアウト'));assert(!/\b(?:85000|130000)\b/.test(js));assert(js.includes('未確定の費用を0円として計算していません'));
});
test('motion respects OS and existing saved preference, pauses on focus and can be stopped',()=>{
 const js=read('ja/lp/archive.js');for(const token of ['motionPreference.matches','data-lp-pause','focusin','visibilitychange','cancelAnimationFrame','mode===\'archive\''])assert(js.includes(token),token);assert(js.includes("b.tabIndex=-1"));assert(js.includes("setmode('stories');grid.children[lastSelected]?.focus()"));
 const css=read('ja/lp/lp.css');assert(css.includes('prefers-reduced-motion:reduce'));assert(css.includes('position:fixed'));assert(css.includes('scroll-padding-top'));assert(css.includes('[hidden]{display:none!important}'));
});
test('LP source uses an isolated approved cutout without replacing existing images or services',()=>{
 const png=readFileSync(new URL('../ja/lp/assets/bakedkale-character.png',import.meta.url));assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(hash(png),'fb2c331387feb995604b940e7361ee5d72c61704f8bda323aa875afeff7ab497');
 for(const file of ['assets/bakedkale-character.svg','assets/instagram-bakedkale-profile-20261110.jpg','gallery-ui.js','gallery-ui.css','quiet-pages.css','page-loading.js','page-loading.css','site-chrome.js','site-chrome.css','price-policy.js','content/site-content.json','content/instagram-feed.json','contact-direct.js','contact-config.js','motion-preferences.js'])assert.equal(normalize(read(file)),normalize(previous(file)),file);
});
