import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
import {applyW04LayeredMotion, sampleCode} from './w04_layered_motion.mjs';
import {renderQuietGoals} from './build_quiet_goals.mjs';
import {normalizeAssetBuildKeys as normalize} from './asset_build_test_helpers.mjs';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const baseline = '9db3de1248562c0b4e22362a476fd741c3985ad4';
const oldErrors = [
  ['The recording could not be played. You can read the operation steps below.', 'The recording could not be played.'],
  ['操作動画を再生できませんでした。下の文章で操作の流れをご確認いただけます。', '操作動画を再生できませんでした。'],
  ['操作视频暂时无法播放。您可以阅读下方的操作步骤。', '操作视频暂时无法播放。'],
];

for (const file of ['goals.html', 'ja/goals.html', 'zh/goals.html']) {
  test(file + ': only the two reading controls disappear; documents and all other copy stay intact', () => {
    const before = execFileSync('git', ['show', baseline + ':' + file], {encoding: 'utf8'});
    const current = read(file);
    let expected = before.replace(/<details class="mission-(?:sample|transcript)"/g, '$& hidden');
    for (const [oldText, newText] of oldErrors) expected = expected.replaceAll(oldText, newText);
    expected = expected.replace(/<div class="mission-motion-tools"><button\b[^>]*data-motion-toggle[^>]*>[\s\S]*?<\/button><\/div>/g, '');
    assert.equal(normalize(current), normalize(expected));
    assert.equal((current.match(/<details class="mission-(?:sample|transcript)" hidden>/g) || []).length, 2);
    assert.equal((current.match(/<details[^>]* hidden/g) || []).length, 2);
    const documentBody = /<details class="mission-(?:sample|transcript)"(?: hidden)?>([\s\S]*?)<\/details>/g;
    assert.deepEqual([...current.matchAll(documentBody)].map(m => m[1]), [...before.matchAll(documentBody)].map(m => m[1]));
    assert.equal(applyW04LayeredMotion(current), current);
    assert.equal(renderQuietGoals(current), current);
    assert.equal(normalize(applyW04LayeredMotion(before)), normalize(current));
  });
}

function fixture({reduce = false, saveData = false, observer = true, blocked = false} = {}) {
  const events = new Map(), videos = [];
  const bind = target => (name, handler) => events.set(target + ':' + name, handler);
  let callback, frame = null, now = 0, refuse = blocked;
  function makeVideo() {
    const id = videos.length;
    const media = {paused: true, controls: true, readyState: 4, currentTime: 0, duration: 12, style: {}, attributes: {}, playCalls: 0, loadCalls: 0,
      before() {}, cloneNode: makeVideo, addEventListener: bind('video' + id),
      querySelector: () => ({addEventListener: bind('source' + id)}),
      removeAttribute(name) { delete this.attributes[name]; }, setAttribute(name, value) { this.attributes[name] = value; },
      load() { this.loadCalls++; }, pause() { this.paused = true; },
      play() { this.playCalls++; if (refuse) return Promise.reject(new Error('policy denied autoplay')); this.paused = false; return Promise.resolve(); },
    };
    videos.push(media);
    return media;
  }
  const video = makeVideo();
  const feed = {textContent: '', style: {}, parentElement: {clientHeight: 480}};
  const button = {hidden: true, dataset: {pauseLabel: 'Pause', playLabel: 'Play'}, attributes: {}, addEventListener: bind('button'), setAttribute(name, value) { this.attributes[name] = value; }};
  const status = {hidden: true};
  const selectors = {'[data-motion-video]': video, '[data-code-feed]': feed, '[data-code-source]': {textContent: sampleCode}, '[data-motion-toggle]': button, '[data-motion-status]': status, '.mission-desk': {}};
  const root = {dataset: {}, querySelector: selector => selectors[selector]};
  const document = {hidden: false, querySelectorAll: () => [root], addEventListener: bind('document'), createElement: () => ({append() {}})};
  const reduced = {matches: reduce, addEventListener: bind('reduced')};
  const connection = {saveData, addEventListener: bind('connection')};
  class IntersectionObserver { constructor(handler) { callback = handler; } observe() {} }
  runInNewContext(read('goals-motion.js'), {document, navigator: {connection}, window: {addEventListener: bind('window'), ...(observer ? {IntersectionObserver} : {})}, IntersectionObserver,
    matchMedia: () => reduced, getComputedStyle: () => ({lineHeight: '24px', paddingTop: '20px', paddingBottom: '20px'}),
    requestAnimationFrame(fn) { assert.equal(frame, null, 'one animation frame only'); frame = fn; return 1; }, cancelAnimationFrame() { frame = null; },
  });
  return {video, videos, feed, button, root, document, reduced, connection, status,
    emit: name => events.get(name)?.(), intersect: value => callback([{isIntersecting: value}]),
    tick(ms = 16) { now += ms; const next = frame; frame = null; next?.(now); },
    scheduled: () => frame !== null, refuse: value => { refuse = value; },
  };
}

test('visible desk starts code and muted video without hover, click or focus; loop stays bounded', () => {
  const f = fixture();
  assert.equal(f.video.playCalls, 0);
  f.intersect(true);
  assert.equal(f.video.paused, false);
  assert.ok(f.videos.every(video => video.muted && video.defaultMuted));
  const initial = f.feed.textContent;
  for (let n = 0; n < 12000; n++) f.tick();
  assert.notEqual(f.feed.textContent, initial);
  assert.ok(f.feed.textContent.length < 2000);
  assert.ok(f.feed.textContent.split('\n').length <= 21);
  assert.equal(f.root.dataset.motion, 'playing');
});

test('scroll and hidden-tab stops resume automatically while reduced preference stays authoritative', () => {
  const f = fixture(); f.intersect(true); f.tick();
  f.intersect(false); assert.ok(f.videos.every(video => video.paused)); assert.equal(f.scheduled(), false);
  f.intersect(true); assert.equal(f.video.paused, false);
  f.document.hidden = true; f.emit('document:visibilitychange'); assert.equal(f.scheduled(), false);
  f.document.hidden = false; f.emit('document:visibilitychange'); assert.equal(f.video.paused, false);
  f.reduced.matches = true; f.emit('reduced:change');
  f.intersect(false); f.intersect(true);
  assert.ok(f.videos.every(video => video.paused)); assert.equal(f.scheduled(), false);
  f.reduced.matches = false; f.emit('reduced:change'); assert.equal(f.video.paused, false);
});

test('reduced motion stays static and unloaded until the preference changes', () => {
  const f = fixture({reduce: true}); f.intersect(true);
  assert.ok(f.videos.every(video => video.playCalls === 0 && video.loadCalls === 0));
  assert.equal(f.scheduled(), false); assert.match(f.feed.textContent, /stock_state/);
  f.reduced.matches = false; f.emit('reduced:change'); assert.equal(f.video.paused, false);
  f.reduced.matches = true; f.emit('reduced:change');
  assert.ok(f.videos.every(video => video.paused)); assert.equal(f.scheduled(), false);
});

test('data-saving mode stops the entire desk without loading and resumes when released', () => {
  const f = fixture({saveData: true}); f.intersect(true);
  assert.equal(f.scheduled(), false);
  assert.ok(f.videos.every(video => video.playCalls === 0 && video.loadCalls === 0));
  f.connection.saveData = false; f.emit('connection:change'); assert.equal(f.video.paused, false);
  f.connection.saveData = true; f.emit('connection:change');
  assert.ok(f.videos.every(video => video.paused)); assert.equal(f.scheduled(), false);
});

test('autoplay refusal suspends only video without per-frame retry and recovers once on page return', async () => {
  const f = fixture({blocked: true}); f.intersect(true); await Promise.resolve();
  assert.equal(f.root.dataset.motion, 'playing'); assert.equal(f.root.dataset.videoMotion, 'blocked'); assert.equal(f.scheduled(), true);
  const attempts = f.video.playCalls;
  for (let n = 0; n < 100; n++) f.tick();
  assert.equal(f.video.playCalls, attempts);
  f.refuse(false); f.document.hidden = true; f.emit('document:visibilitychange');
  f.document.hidden = false; f.emit('document:visibilitychange');
  assert.equal(f.video.paused, false); assert.equal(f.video.playCalls, attempts + 1);
});

test('native policy pause leaves code moving and recovers video on lifecycle resumption', () => {
  const f = fixture(); f.intersect(true); f.tick();
  f.video.paused = true; f.emit('video0:pause');
  assert.equal(f.scheduled(), true); assert.equal(f.root.dataset.videoMotion, 'blocked');
  const before=f.feed.style.transform;f.tick();f.tick();assert.notEqual(f.feed.style.transform,before);
  f.intersect(false); f.intersect(true);
  assert.equal(f.video.paused, false); assert.equal(f.scheduled(), true);
});

test('a spare decoder pause does not stop the active loop; fallback still identifies media failure', () => {
  const f = fixture(); f.intersect(true);
  f.emit('video1:pause'); assert.equal(f.scheduled(), true); assert.equal(f.video.paused, false);
  f.emit('source0:error'); assert.equal(f.status.hidden, false);
  assert.equal(f.videos[1].attributes['aria-hidden'], 'true');
  assert.equal(f.videos[1].attributes.tabindex, '-1');
});

test('without IntersectionObserver autoplay remains available and code has no external state or hover gate', () => {
  const f = fixture({observer: false}); assert.equal(f.video.paused, false);
  assert.doesNotMatch(read('goals-motion.js'), /mouseenter|mouseover|pointerenter|\bfetch\(|localStorage|sessionStorage|indexedDB/);
});

test('the legacy video observer excludes the dedicated layered controller', () => {
  assert.match(read('gallery-ui.js'), /querySelector\("\.mission-recording video:not\(\[data-motion-video\]\)"\)/);
});
