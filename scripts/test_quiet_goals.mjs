import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {normalizeAssetBuildKeys} from './asset_build_test_helpers.mjs';
import {renderQuietGoals} from './build_quiet_goals.mjs';

const baseline='a5f31f4';
const head=source=>source.match(/<head>[\s\S]*?<\/head>/)[0];
const prose=source=>[...source.matchAll(/<(?:p|h[1-3]|small|summary|li)\b[^>]*>([\s\S]*?)<\/(?:p|h[1-3]|small|summary|li)>/g)]
  .map(m=>{
    let text=m[1],previous;
    do {
      previous=text;
      text=text.replace(/<[^>]*>/g,'');
    } while(text!==previous);
    return text.replace(/\s+/g,' ').trim();
  }).sort();
test('copy extraction retains nested inline text without markup',()=>{
  assert.deepEqual(prose('<p>before <span><strong>after</strong></span></p>'),['before after']);
});
for(const folder of ['', 'ja/', 'zh/']) {
  const name=folder+'goals.html';
  const current=normalizeAssetBuildKeys(readFileSync(name,'utf8'));
  const previous=normalizeAssetBuildKeys(execFileSync('git',['show',`${baseline}:${name}`],{encoding:'utf8'}));
  test(`${name}: approved structure is composed and idempotent`,()=>{
    assert.equal(renderQuietGoals(previous),current);
    assert.equal(renderQuietGoals(current),current);
    assert.equal((current.match(/class="mission-hero-band"/g)||[]).length,1);
    assert.equal((current.match(/class="mission-chapter-heading"/g)||[]).length,3);
    assert.ok(current.includes('goals-journey'));
    assert.equal((current.match(/class="mission-step" aria-hidden="true"/g)||[]).length,3);
    assert.equal((current.match(/class="mission-text mission-visual"/g)||[]).length,3);
    for(const asset of ['goals-understand-work','goals-open-system','goals-partner-dialogue']) {
      assert.ok(current.includes(`src="${folder?'../':''}assets/${asset}.png" width="1536" height="1024" alt="" loading="lazy" decoding="async"`));
    }
    assert.match(current,/<div class="mission-proof">[\s\S]*?<figure class="mission-code">[\s\S]*?<figure class="mission-recording">/);
  });
  test(`${name}: prose and metadata are unchanged, only requested closing CTAs removed`,()=>{
    assert.equal(head(current),head(previous));
    assert.deepEqual(prose(current),prose(previous));
    const closing=current.match(/<section id="partnership"[\s\S]*?<\/section>/)[0];
    assert.doesNotMatch(closing,/<a\b|mission-actions|mission-plan-link/);
    assert.ok(current.includes('href="contact.html"'));
    assert.ok(current.includes('href="license.html"'));
    assert.equal(current.match(/<video[^>]+>/)[0],previous.match(/<video[^>]+>/)[0]);
    assert.equal(current.match(/<source[^>]+>/)[0],previous.match(/<source[^>]+>/)[0]);
    assert.equal(current.match(/<details class="mission-transcript">[\s\S]*?<\/details>/)[0],previous.match(/<details class="mission-transcript">[\s\S]*?<\/details>/)[0]);
  });
}
test('scoped responsive media retains readable code on keyboard focus',()=>{
  const css=readFileSync('quiet-pages.css','utf8');
  assert.match(css,/\.quiet-page\.goals-renewal \.mission-hero-band \.mission-hero \{[^}]*background: transparent/);
  assert.match(css,/\.quiet-page\.goals-renewal \.mission-hero :is\(h1,\.accent-line,\.eyebrow,\.mission-lead\) \{ color: #fff/);
  assert.match(css,/\.mission-proof:focus-within \.mission-recording \{ margin-left: 0/);
  assert.match(css,/\.mission-recording video \{[^}]*aspect-ratio: 9 \/ 7/);
  assert.match(css,/\.mission-partnership \.accent-line \{ color: inherit/);
  assert.doesNotMatch(css.match(/\/\* W04:[\s\S]*?(?=@media \(max-width: 1100px\) and)/)[0],/animation:/);
});

test('approved artwork has reserved intrinsic dimensions and a real alpha channel',()=>{
  for(const name of ['understand-work','open-system','partner-dialogue']) {
    const png=readFileSync(`assets/goals-${name}.png`);
    assert.equal(png.subarray(1,4).toString(),'PNG');
    assert.equal(png.readUInt32BE(16),1536);
    assert.equal(png.readUInt32BE(20),1024);
    assert.equal(png[25],6,'RGBA artwork, not a solid-background placeholder');
  }
});

test('chapter rail and shallow overlap stay scoped to the selected journey',()=>{
  const css=readFileSync('quiet-pages.css','utf8');
  assert.match(css,/\.goals-journey \.mission-chapter:not\(:last-of-type\)::after/);
  assert.match(css,/\.goals-journey \.mission-recording \{ margin-left: -24px/);
  assert.match(css,/\.goals-journey \.mission-recording \{ margin: -18px 0 0 12px/);
  assert.match(css,/\.goals-journey \.mission-partnership h2 \{[^}]*text-align: left/);
  assert.doesNotMatch(css.match(/\/\* W04 approved visual journey:[\s\S]*?(?=@media \(max-width: 1100px\) and)/)[0],/animation:/);
});
