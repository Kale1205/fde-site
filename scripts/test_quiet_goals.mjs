import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {renderQuietGoals} from './build_quiet_goals.mjs';

const baseline='a5f31f4';
const head=source=>source.match(/<head>[\s\S]*?<\/head>/)[0];
const prose=source=>[...source.matchAll(/<(?:p|h[1-3]|small|summary|li)\b[^>]*>([\s\S]*?)<\/(?:p|h[1-3]|small|summary|li)>/g)]
  .map(m=>m[1].replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim()).sort();
for(const folder of ['', 'ja/', 'zh/']) {
  const name=folder+'goals.html';
  const current=readFileSync(name,'utf8');
  const previous=execFileSync('git',['show',`${baseline}:${name}`],{encoding:'utf8'});
  test(`${name}: approved structure is composed and idempotent`,()=>{
    assert.equal(renderQuietGoals(previous),current);
    assert.equal(renderQuietGoals(current),current);
    assert.equal((current.match(/class="mission-hero-band"/g)||[]).length,1);
    assert.equal((current.match(/class="mission-chapter-heading"/g)||[]).length,2);
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
