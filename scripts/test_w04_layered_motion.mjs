import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
import {applyW04LayeredMotion, sampleCode} from './w04_layered_motion.mjs';
import {normalizeAssetBuildKeys as normalize} from './asset_build_test_helpers.mjs';
const read = file => readFileSync(file, 'utf8');

for (const folder of ['', 'ja/', 'zh/']) {
  const file = folder + 'goals.html';
  test(file + ': exact approved W04 delta; no new navigation, SEO or product changes', () => {
    const before = execFileSync('git', ['show', 'd565b5cc33615f0c06cdedbbb0b294904c9f56b1:' + file], {encoding: 'utf8'});
    const now = read(file);
    assert.equal(normalize(now), normalize(applyW04LayeredMotion(before)));
    assert.equal(applyW04LayeredMotion(now), now);
    assert.deepEqual(now.match(/<a\b[^>]*>/g), before.match(/<a\b[^>]*>/g));
    assert.deepEqual(now.match(/<(?:meta|link rel="(?:canonical|alternate)")[^>]*>/g), before.match(/<(?:meta|link rel="(?:canonical|alternate)")[^>]*>/g));
    const proof = now.match(/<div class="mission-proof mission-layered"[\s\S]*?<details class="mission-transcript">/)[0];
    assert.doesNotMatch(proof, /<a\b|role="tab|data-design-panel|onclick=/);
    assert.match(proof, /aria-hidden="true"><code data-code-feed><\/code>/);
    assert.match(proof, /<code data-code-source>/);
    assert.match(proof, /SAMPLE CODE/);
    assert.equal((proof.match(/data-motion-toggle/g)||[]).length, 1);
    assert.match(now, new RegExp(`href="${folder?'../':''}goals-motion.css`));
    assert.equal(now.match(/<source[^>]+>/)[0], before.match(/<source[^>]+>/)[0]);
  });
}

function fixture({reduce = false, blocked = false, observer = true} = {}) {
  const events = new Map();
  const bind = name => (event, fn) => events.set(name + ':' + event, fn);
  const source = {addEventListener: bind('source')};
  const video = {paused: true, controls: true, playCalls: 0, addEventListener: bind('video'), querySelector: () => source,
    play() { this.playCalls++; if (blocked) return Promise.reject(Error('autoplay blocked')); this.paused = false; return Promise.resolve(); }, pause() {this.paused = true;}};
  const feed = {textContent: '', parentElement: {scrollHeight: 500, scrollTop: 0}};
  const button = {hidden: true, dataset: {pauseLabel: 'Pause', playLabel: 'Play'}, attributes: {}, addEventListener: bind('button'), setAttribute(k,v) {this.attributes[k]=v;}};
  const status = {hidden: true};
  const selectors = {'[data-motion-video]': video, '[data-code-feed]': feed, '[data-code-source]': {textContent: sampleCode}, '[data-motion-toggle]': button, '[data-motion-status]': status, '.mission-desk': {}};
  const root = {dataset: {}, querySelector: name => selectors[name]};
  const document = {hidden: false, querySelectorAll: () => [root], addEventListener: bind('document')};
  const media = {matches: reduce, addEventListener: bind('media')};
  let timer = null, callback;
  class IntersectionObserver {constructor(fn) {callback = fn;} observe() {}}
  const window = observer ? {IntersectionObserver} : {};
  runInNewContext(read('goals-motion.js'), {document, window, matchMedia: () => media, IntersectionObserver,
    setTimeout(fn) {timer = fn; return 1;}, clearTimeout() {timer = null;}});
  return {video, feed, button, status, root, document, media,
    emit(name) {events.get(name)();}, intersect(value) {callback([{isIntersecting: value}]);},
    tick() {const fn=timer; timer=null; fn?.();}, timer: () => timer};
}
test('visible standard-motion panel starts muted loop recording and continuous bounded typing', () => {
  const f = fixture();
  assert.equal(f.video.playCalls, 0);
  f.intersect(true);
  assert.equal(f.video.paused, false);
  assert.equal(f.video.muted, true);
  assert.equal(f.video.defaultMuted, true);
  const first=f.feed.textContent;
  for (let i=0;i<10000;i++) f.tick();
  assert.notEqual(f.feed.textContent, first);
  assert.ok(f.feed.textContent.split('\n').length <= 19);
  assert.ok(f.feed.textContent.length < 1400);
  assert.equal(f.button.attributes['aria-pressed'], 'true');
});
test('one keyboard-compatible button pauses and resumes both surfaces', () => {
  const f=fixture();f.intersect(true);f.emit('button:click');
  assert.equal(f.video.paused,true);assert.equal(f.timer(),null);assert.equal(f.button.textContent,'Play');
  f.emit('button:click');assert.equal(f.video.paused,false);assert.equal(f.button.textContent,'Pause');
});
test('reduced motion starts static without any video request/play until explicitly requested', () => {
  const f=fixture({reduce:true});f.intersect(true);
  assert.equal(f.video.playCalls,0);assert.equal(f.timer(),null);assert.match(f.feed.textContent,/stock_state/);
  f.emit('button:click');assert.equal(f.video.paused,false);
  f.media.matches=true;f.emit('media:change');assert.equal(f.video.paused,true);assert.equal(f.timer(),null);
});
test('offscreen and background pauses preserve explicit user pause', () => {
  const f=fixture();f.intersect(true);f.intersect(false);assert.equal(f.video.paused,true);
  f.intersect(true);assert.equal(f.video.paused,false);
  f.document.hidden=true;f.emit('document:visibilitychange');assert.equal(f.video.paused,true);
  f.document.hidden=false;f.emit('document:visibilitychange');assert.equal(f.video.paused,false);
  f.emit('button:click');f.intersect(false);f.intersect(true);assert.equal(f.video.paused,true);
});
test('autoplay rejection offers a deliberate replay rather than an unhandled rejection', async () => {
  const f=fixture({blocked:true});f.intersect(true);await Promise.resolve();await Promise.resolve();
  assert.equal(f.button.textContent,'Play');assert.equal(f.timer(),null);assert.equal(f.root.dataset.motion,'paused');
});
test('video and source failures expose the localized fallback text', () => {
  for(const event of ['video:error','source:error']) {const f=fixture();f.intersect(true);f.emit(event);assert.equal(f.status.hidden,false);assert.equal(f.video.paused,true);}
});
test('missing IntersectionObserver uses visible fallback; no navigation/network/storage APIs', () => {
  const f=fixture({observer:false});assert.equal(f.video.paused,false);
  assert.doesNotMatch(read('goals-motion.js'), /\bfetch\(|XMLHttpRequest|location\s*[.=]|localStorage|sessionStorage|window\.open|innerHTML/);
  assert.match(read('goals-motion.css'), /prefers-reduced-motion: reduce/);
});
