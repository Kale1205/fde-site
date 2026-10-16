import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {normalizeAssetBuildKeys as normalize} from './asset_build_test_helpers.mjs';
import {applyReviewedZhSearchMetadata} from './zh_search_metadata_test_helpers.mjs';
import {renderNewsPage} from '../news-renderer.js';
const root=new URL('../',import.meta.url);
const read=file=>readFileSync(new URL(file,root),'utf8');
// Keep the approved shared News images/CMS removal from merged PR #97.
// This PR must only change the three reviewed Chinese metadata values.
const baseline=file=>execFileSync('git',['show',`8e66ae7baece27e7ad75678ee3b8416a27ffae3c:${file}`],{cwd:root,encoding:'utf8'});
const descriptions={
 'zh/index.html':'了解开发中的 IMS 库存管理软件及 License、License Plus 两种产品，比较使用条件，并通过浏览器演示体验基本库存流程。',
 'zh/license.html':'比较开发中的 IMS License 与 License Plus：了解使用权、源代码范围、维护责任、使用限制及价格状态。'
};
for(const [file,copy] of Object.entries(descriptions)){
 test(`${file}: search and sharing accurately describe the inventory product`,()=>{
  const html=read(file);
  for(const attribute of ['name="description"','property="og:description"'])assert(html.includes(`<meta ${attribute} content="${copy}">`));
  assert.doesNotMatch(copy,/工作清单|Plus码|发展之中/);
 });
}
test('Chinese Demo sharing uses Chinese locale and retains both other locales',()=>{
 const html=read('zh/demo.html');
 assert.match(html,/<html lang="zh-CN">/);
 assert.equal((html.match(/property="og:locale" content="zh_CN"/g)||[]).length,1);
 for(const locale of ['en_US','ja_JP'])assert.equal((html.match(new RegExp(`property="og:locale:alternate" content="${locale}"`,'g'))||[]).length,1);
 assert.doesNotMatch(html,/property="og:locale" content="en_US"/);
});
test('all visible page content, price, commerce, metadata links and schema stay exact',()=>{
 const strip=html=>normalize(html).replace(/^.*<meta (?:name="description"|property="og:description"|property="og:locale(?::alternate)?")[^>]+>\s*\n/gm,'');
 for(const file of ['zh/index.html','zh/license.html','zh/demo.html'])assert.equal(strip(read(file)),strip(baseline(file)),file);
 for(const file of ['index.html','license.html','demo.html','ja/index.html','ja/license.html','ja/demo.html','zh/contact.html','zh/order.html','zh/customer.html','robots.txt'])assert.equal(normalize(read(file)),normalize(baseline(file)),file);
 assert.equal(normalize(read('zh/news.html')),normalize(renderNewsPage(baseline('zh/news.html'),JSON.parse(read('content/site-content.json')),read('build-version.txt').trim())),'Chinese News keeps its layout/SEO and renders current reviewed content');
});
test('translation dictionary changes only the three reviewed metadata values',()=>{
 const current=JSON.parse(read('content/zh-translations.json')),old=JSON.parse(baseline('content/zh-translations.json'));
 const changed=Object.keys(current).filter(k=>current[k]!==old[k]);
 assert.equal(changed.length,3);
 for(const key of changed)assert.match(key,/^(?:Build on a working inventory|Compare planned IMS|Review the two planned IMS)/);
 assert.deepEqual(Object.keys(current),Object.keys(old));
});
test('historical fixture accommodation accepts exactly the same reviewed metadata changes',()=>{
 for(const file of ['zh/index.html','zh/license.html','zh/demo.html','content/zh-translations.json']){
  assert.equal(normalize(applyReviewedZhSearchMetadata(file,baseline(file))),normalize(read(file)),file);
  assert.equal(applyReviewedZhSearchMetadata(file,read(file)),read(file),'idempotent');
 }
});
test('fixture accommodation cannot hide unrelated copy, routes, schema or unknown metadata',()=>{
 for(const file of ['zh/index.html','zh/license.html','zh/demo.html','index.html','content/zh-translations.json']){
  const changed=read(file)+'\n<!-- unrelated content must remain detectable -->';
  assert.equal(applyReviewedZhSearchMetadata(file,changed),changed);
 }
 const unknown='<meta name="description" content="Unreviewed change"><link rel="canonical" href="https://example.invalid/"><script type="application/ld+json">{"name":"Different"}</script>';
 for(const file of ['zh/index.html','zh/license.html','zh/demo.html'])assert.equal(applyReviewedZhSearchMetadata(file,unknown),unknown);
});
