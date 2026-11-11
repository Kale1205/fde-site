import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PARTNER_MOTION, sourceCurve } from '../original-pixel-scenes.js';
import { illustration, motionState, motionTargetsForPath, playbackStep, ONCE_DURATION } from '../sculpture-motion.js';
import { normalizeHistoricalPresentation } from './approved_motion_test_helpers.mjs';
import { PARTS } from '../adopted-sculpture-scenes.js';
import { createHash } from 'node:crypto';

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

test('all five source scenes use isolated IDs and retain their original raster artwork', () => {
  const scenes = ['license', 'plus', 'understand', 'assemble', 'partner'];
  for (const [i, kind] of scenes.entries()) {
    const svg = illustration(kind, `test-${i}`);
    assert.match(svg, /aria-hidden="true" focusable="false"/);
    const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length);
    for (const ref of svg.matchAll(/url\(#([^)]+)\)/g)) assert(ids.includes(ref[1]));
    assert.doesNotMatch(svg, /<script|<foreignObject|\bonload=/);
    const images=[...svg.matchAll(/<image[^>]+href="([^"]+)"/g)];
    const allowed=new Set(['ims-license-update.webp','ims-license-plus-customize.webp','goals-understand-work.png','goals-open-system.png','goals-partner-dialogue.png',...Object.values(PARTS).map(p=>p.file)].map(file=>'assets/'+file));
    assert.ok(images.length);assert(images.every(match=>allowed.has(match[1])));
    if(kind==='license'){assert.match(svg,/data-license-upgrade/);assert.doesNotMatch(svg,/data-part="wrench"|shared-wrench|contact-shadow|<text/);}
    assert.throws(()=>illustration(kind,`test-${i}`,'https://example.invalid/image.png'));
  }
});

test('every baked part has its named content hash and the complete package stays bounded',()=>{
 let total=0;
 for(const part of Object.values(PARTS)){
  const bytes=readFileSync(new URL('../assets/'+part.file,import.meta.url));
  const digest=createHash('sha256').update(bytes).digest('hex');
  assert.ok(part.file.endsWith('-'+digest.slice(0,12)+'.png'));
  assert.equal(bytes.readUInt32BE(0),0x89504e47);
  assert.equal(bytes.readUInt32BE(16),part.box[2]);assert.equal(bytes.readUInt32BE(20),part.box[3]);total+=bytes.length;
 }
 assert.ok(total<2500000,'Raster parts exceeded the reviewed transfer budget');
});

test('motion needs a visible foreground illustration and both motion preferences', () => {
  assert.equal(motionState({ visible: true, hidden: false, reduced: false, paused: false }), 'running');
  for (const stop of [{ visible: false }, { hidden: true }, { reduced: true }, { paused: true }]) {
    assert.equal(motionState({ visible: true, hidden: false, reduced: false, paused: false, ...stop }), 'paused');
  }
});

test('only named page positions can receive decorative motion',()=>{
 for(const prefix of ['/','/ja/','/zh/','/fde-site/ja/']){
  const plans=motionTargetsForPath(prefix+'index.html');assert.deepEqual(plans.map(x=>x.kind),['license','plus']);assert(plans.every(x=>x.selector.includes('#plans.quiet-plans .quiet-comparison .plan-top > img.comparison-sculpture')));
  const goals=motionTargetsForPath(prefix+'goals.html');assert.deepEqual(goals.map(x=>x.kind),['understand','partner']);assert(goals.every(x=>x.selector.includes('body.goals-journey')));
  for(const file of ['license.html','quiet-form.html','contact.html'])assert.deepEqual(motionTargetsForPath(prefix+file),[]);
 }
});

test('one-shot playback completes below five seconds without wrapping or catching up after a long frame',()=>{
 assert.equal(ONCE_DURATION,4800);assert.equal(playbackStep(0,0).phase,0);assert.equal(playbackStep(0,2400).phase,.5);
 assert.deepEqual(playbackStep(4799,1),{elapsed:4800,phase:1,completed:true});assert.deepEqual(playbackStep(100,9000),{elapsed:4800,phase:1,completed:true});assert.equal(playbackStep(4800,200).phase,1);assert.equal(playbackStep(100,-100).elapsed,100);
 assert.equal(motionState({visible:true,hidden:false,reduced:false,completed:true}),'finished');
});

test('the adopted partner motion is the approved stronger right option with a neutral loop seam',()=>{
 assert.equal(PARTNER_MOTION.period,7200);assert.equal(PARTNER_MOTION.scale,.15);assert.equal(PARTNER_MOTION.x,62);assert.equal(PARTNER_MOTION.y,70);assert.equal(PARTNER_MOTION.dim,.38);assert.equal(PARTNER_MOTION.fill,.075);
 assert.equal(sourceCurve(PARTNER_MOTION.keys,0),0);assert.equal(sourceCurve(PARTNER_MOTION.keys,1),0);assert.equal(sourceCurve(PARTNER_MOTION.keys,.10),1.20);assert.equal(sourceCurve(PARTNER_MOTION.keys,.53),-1.20);
 assert.ok(Math.abs(sourceCurve(PARTNER_MOTION.keys,.000001))<.000001);
});
