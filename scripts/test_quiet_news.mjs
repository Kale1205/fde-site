import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execApprovedNamingBaseline as execFileSync} from './approved_product_naming.mjs';
import {normalizeAssetBuildKeys} from './asset_build_test_helpers.mjs';
import {renderQuietNews} from './build_quiet_news.mjs';
import {applyReleaseNoticePolicy} from './release_notice_policy.mjs';

const root=new URL('../',import.meta.url);
const read=name=>normalizeAssetBuildKeys(readFileSync(new URL(name,root),'utf8'));
const base='95fc1e5';
for(const [prefix,heading] of [['','Updates'],['ja/','アップデート情報'],['zh/','更新信息']]){
  test(`${prefix}news: selected composition is deterministic and idempotent`,()=>{
    const original=normalizeAssetBuildKeys(execFileSync('git',['show',`${base}:${prefix}news.html`],{cwd:root,encoding:'utf8'}));
    const html=read(`${prefix}news.html`);
    assert.equal(html,renderQuietNews(original));
    assert.equal(renderQuietNews(html),html);
    assert.match(html,new RegExp(`id="news-updates-title"[^>]*>${heading}<`));
    for(const id of ['cmsNewsLead','cmsLatestList','cmsNewsWire','cmsInstagram'])assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1);
    assert.match(html,/class="news-hero-mark"[^>]*alt="" aria-hidden="true"/);
    assert.equal(html.match(/<head>[\s\S]*?<\/head>/)[0],original.match(/<head>[\s\S]*?<\/head>/)[0]);
    for(const tag of applyReleaseNoticePolicy(original,'news').match(/<p>[\s\S]*?<\/p>|<time[^>]*>[\s\S]*?<\/time>/g)||[])assert.ok(html.includes(tag),'Other prose and dates remain');
    assert.ok(html.indexOf('news-featured')<html.indexOf('news-supporting'));
    assert.ok(html.indexOf('news-updates')<html.indexOf('news-archive'));
  });
}
for(const script of ['cms-content.js','cms-content-ja.js']){
  test(`${script}: existing CMS/modal contract and scoped archive affordance`,()=>{
    const js=read(script);
    assert.match(js,/wire-read-more/);
    assert.match(js,/classList.contains\('news-renewal'\)/);
    assert.match(js,/shell.inert = true/);
    assert.match(js,/restoreNewsShell\?\.\(\)/);
    assert.match(js,/event.key === 'Tab'/);
    assert.match(js,/event.key === 'Escape'/);
    assert.match(js,/trigger.focus\(\)/);
    assert.match(js,/data-news-id/);
    assert.match(js,/CMS_URL.*site-content\.json/);
  });
}
test('News theme stays scoped, readable and uses supplied brand art',()=>{
  const css=read('quiet-pages.css');
  assert.match(css,/\.quiet-page.news-renewal \.page-hero.news-page-hero/);
  assert.match(css,/grid-template-columns: minmax\(0,1.7fr\) minmax\(0,1fr\)/);
  assert.match(css,/\.quiet-page.news-renewal \.news-desk \{ grid-template-columns: 1fr/);
  assert.match(css,/news-hero-mark.*opacity: \.065/);
  assert.match(css,/:focus-visible/);
  assert.match(css,/prefers-reduced-motion/);
  for(const prefix of ['','ja/','zh/'])assert.match(read(`${prefix}news.html`),/assets\/baked-kale-mark.svg/);
  assert.match(read('scripts/generate_zh_locale.mjs'),/news-updates-title.*更新信息/);
});
