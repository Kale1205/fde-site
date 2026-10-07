import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {renderQuietOrder} from './build_quiet_order.mjs';
import {approvedHeadPrefix} from './approved_head_prefix.mjs';
const root=new URL('../',import.meta.url),read=n=>readFileSync(new URL(n,root),'utf8');
test('head recomposition removes uppercase and re-formed executable tags',()=>{
  const page=read('order.html'),home=read('index.html');
  const fixture=page.replace('</head>','<ScRiPt>UNEXPECTED_UPPERCASE</sCrIpT><scr<script>UNEXPECTED_INNER</script>ipt>UNEXPECTED_REFORMED</script></head>');
  const output=renderQuietOrder(fixture,home);
  assert.doesNotMatch(output,/UNEXPECTED_/);
  assert.equal((output.match(/<script\b/gi)||[]).length,1);
  assert.equal(output,page);
});
test('static metadata rejects executable scripts and missing asset boundaries',()=>{
  const page=read('order.html');
  for(const script of ['<SCRIPT>alert(1)</SCRIPT>', '<script>alert(1)</script >', '<script>alert(1)</script foo="bar">']) {
    assert.throws(()=>approvedHeadPrefix(page.replace('<title>',script+'<title>')),/Unexpected script/);
  }
  assert.throws(()=>approvedHeadPrefix('<head><title>No assets</title></head>'),/suffix missing/);
  const home=read('index.html');
  assert.ok(approvedHeadPrefix(home,{jsonLd:true}).includes('application/ld+json'));
  assert.throws(()=>approvedHeadPrefix(home.replace('<title>','<script>unexpected</script><title>'),{jsonLd:true}),/Only the approved JSON-LD/);
  for(const closing of ['</script >','</script\\t\\n bar>','</SCRIPT>']) {
    assert.throws(()=>approvedHeadPrefix(home.replace('</script>',closing),{jsonLd:true}),/Only the approved JSON-LD/);
  }
});
for(const prefix of ['', 'ja/', 'zh/']){
  test(`${prefix}order matches selected W07 composition and approved homepage products`,()=>{
    const page=read(prefix+'order.html'),home=read(prefix+'index.html');
    assert.equal(renderQuietOrder(page,home),page);
    assert.match(page,/order-renewal/);assert.match(page,/order-hero-mark/);
    assert.equal((page.match(/class="order-product"/g)||[]).length,2);
    for(const file of ['ims-license-update.webp','ims-license-plus-customize.webp'])assert.ok(page.includes(file));
    for(const price of ['¥49,800','¥99,800','¥4,900','¥9,800'])assert.ok(page.includes(price));
    for(const plan of home.match(/<div class="plan-top">[\s\S]*?<\/div>/g))assert.ok(page.includes(plan.match(/<p>([^<]+)<\/p>/)[1]));
    assert.match(page,/2026|2026年/);assert.match(page,/11月1日|November 1/);
    assert.match(page,/<ol class="order-process-rail">/);assert.equal((page.match(/class="order-step-icon"/g)||[]).length,3);
    assert.match(page,/License Agreement \/ EULA/);
    assert.doesNotMatch(page,/<form|stripe\.com|order\.js|customer\.js|\$349|\$699|希望する場合|opt-in|追加オプション|候选价格|予定価格/);
    for(const href of ['license.html','index.html#plans','contact.html'])assert.ok(page.includes(`href="${href}"`));
    assert.doesNotMatch(page,/href="#plans"/);
    assert.match(page,/<meta name="robots" content="noindex,follow">/);
    const original=execFileSync('git',['show',`caa0182:${prefix}order.html`],{cwd:root,encoding:'utf8'});
    for(const tag of original.match(/<(?:link rel="(?:canonical|alternate)"|meta name="(?:description|robots)")[^>]+>/g))assert.ok(page.includes(tag),'Original SEO metadata preserved');
    for(const match of page.matchAll(/(?:src|href)="([^"#]+)"/g)){
      if(match[1].startsWith('https:'))continue;
      assert.ok(existsSync(new URL(prefix+match[1].split(/[?#]/)[0],root)),match[1]);
    }
  });
}
test('W07 responsive styles and icon provenance remain scoped, no additional runtime',()=>{
  const css=read('quiet-pages.css');
  assert.match(css,/order-products \{ grid-template-columns: minmax\(0,1fr\)/);
  assert.match(css,/order-process-rail \{ grid-template-columns: minmax\(0,1fr\)/);
  assert.match(css,/order-step-arrow[^}]*transform: rotate\(90deg\)/);
  assert.match(read('assets/phosphor-icons-LICENSE.txt'),/Copyright \(c\) 2023 Phosphor Icons/);
  for(const prefix of ['', 'ja/', 'zh/'])assert.equal((read(prefix+'order.html').match(/<script/g)||[]).length,1);
});
