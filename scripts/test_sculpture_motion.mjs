import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { illustration, motionState } from '../sculpture-motion.js';
import { normalizeHistoricalPresentation } from './approved_motion_test_helpers.mjs';

test('all public home and Goals locales load the shared illustrations once', () => {
  for (const prefix of ['', 'ja/', 'zh/']) for (const file of ['index.html', 'goals.html']) {
    const html = readFileSync(new URL('../' + prefix + file, import.meta.url), 'utf8');
    assert.equal((html.match(/<script type="module" src="[^"<>]*sculpture-motion\.js\?v=/g) || []).length, 1);
    assert.equal((html.match(/<link rel="stylesheet" href="[^"<>]*sculpture-motion\.css\?v=/g) || []).length, 1);
  }
});

test('the historical snapshot exception cannot hide content, routes or an unrelated runtime', () => {
  const untouched = '<p>Unreviewed copy</p><a href="different.html">Different</a><script src="different.js"></script><link rel="canonical" href="https://example.invalid/">';
  assert.equal(normalizeHistoricalPresentation(untouched), untouched);
  const tags = '<link rel="stylesheet" href="../sculpture-motion.css?v=20261110-140000">\n<script type="module" src="../sculpture-motion.js?v=20261110-140000"></script>\n';
  assert.equal(normalizeHistoricalPresentation(tags + untouched), untouched);
});

test('all five scenes use isolated gradient IDs and decorative, unfocusable SVGs', () => {
  const scenes = ['license', 'plus', 'understand', 'assemble', 'partner'];
  for (const [i, kind] of scenes.entries()) {
    const svg = illustration(kind, `test-${i}`);
    assert.match(svg, /aria-hidden="true" focusable="false"/);
    const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length);
    for (const ref of svg.matchAll(/url\(#([^)]+)\)/g)) assert(ids.includes(ref[1]));
    assert.doesNotMatch(svg, /<script|<foreignObject|\b(?:href|onload)=/);
  }
});

test('motion needs a visible foreground illustration and both motion preferences', () => {
  assert.equal(motionState({ visible: true, hidden: false, reduced: false, paused: false }), 'running');
  for (const stop of [{ visible: false }, { hidden: true }, { reduced: true }, { paused: true }]) {
    assert.equal(motionState({ visible: true, hidden: false, reduced: false, paused: false, ...stop }), 'paused');
  }
});

function fixture() {
  const events = {}, wrappers = [], buttons = [];
  let intersect;
  const media = { matches: false, addEventListener: (_, fn) => { events.preference = fn; } };
  const element = () => ({ dataset: {}, attributes: {}, setAttribute(key, value) { this.attributes[key] = value; }, addEventListener(name, fn) { this[name] = fn; } });
  const images = ['ims-license-update.webp', 'goals-open-system.png'].map(name => ({ className: 'sculpture', getAttribute: () => `assets/${name}`, replaceWith: node => wrappers.push(node) }));
  const document = { hidden: false, documentElement: { lang: 'ja' }, querySelectorAll: () => images, querySelector: () => ({ after: node => buttons.push(node) }), createElement: element, addEventListener: (name, fn) => { events[name] = fn; } };
  class IntersectionObserver { constructor(fn) { intersect = fn; } observe() {} }
  const source = readFileSync(new URL('../sculpture-motion.js', import.meta.url), 'utf8').replaceAll('export function', 'function');
  runInNewContext(source, { document, window: { IntersectionObserver }, IntersectionObserver, matchMedia: () => media });
  const visibility = (index, visible) => intersect([{ target: wrappers[index], isIntersecting: visible }]);
  return { document, events, media, wrappers, button: buttons[0], visibility };
}

test('scrolling, user pause, backgrounding and a live OS change cannot restart unwanted motion', () => {
  const f = fixture(), states = () => f.wrappers.map(node => node.dataset.motionState);
  assert.deepEqual(states(), ['paused', 'paused']);
  f.visibility(0, true); assert.deepEqual(states(), ['running', 'paused']);
  f.button.click(); assert.deepEqual(states(), ['paused', 'paused']);
  assert.equal(f.button.attributes['aria-pressed'], 'true');
  f.visibility(1, true); assert.deepEqual(states(), ['paused', 'paused']);
  f.button.click(); assert.deepEqual(states(), ['running', 'running']);
  f.document.hidden = true; f.events.visibilitychange(); assert.deepEqual(states(), ['paused', 'paused']);
  f.media.matches = true; f.events.preference(); assert.equal(f.button.hidden, true);
  f.document.hidden = false; f.events.visibilitychange(); assert.deepEqual(states(), ['paused', 'paused']);
  f.visibility(0, false); f.media.matches = false; f.events.preference();
  assert.equal(f.button.hidden, false); assert.deepEqual(states(), ['paused', 'running']);
});
