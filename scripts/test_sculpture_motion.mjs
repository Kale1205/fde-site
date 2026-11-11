import {runInNewContext} from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PARTNER_MOTION, sourceCurve } from '../original-pixel-scenes.js';
import { illustration, motionState, motionTargetsForPath, playbackStep, MOTION_DURATION, REST_DURATION, CYCLE_DURATION } from '../sculpture-motion.js';
import {goals02Assets} from '../goals02-scene.js';
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
    const allowed=new Set([...['ims-license-update.webp','ims-license-plus-customize.webp','goals-understand-work.png','goals-open-system.png','goals-partner-dialogue.png',...Object.values(PARTS).map(p=>p.file)].map(file=>'assets/'+file),...goals02Assets()]);
    assert.ok(images.length);assert(images.every(match=>allowed.has(match[1])));
    if(kind==='license'){assert.match(svg,/data-license-upgrade/);assert.doesNotMatch(svg,/data-part="wrench"|shared-wrench|contact-shadow|<text/);}
    if(kind==='assemble'){for(const name of ['frame','rear','middle','front','wrench'])assert.ok(svg.includes(`data-part="${name}"`));assert.match(svg,/data-goals02-rest/);assert.doesNotMatch(svg,/<text/);}
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
 const atlasPath=goals02Assets()[1],atlas=readFileSync(new URL('../'+atlasPath,import.meta.url)),hash=createHash('sha256').update(atlas).digest('hex');
 assert.ok(atlasPath.endsWith('-'+hash.slice(0,12)+'.png'));assert.equal(atlas.readUInt32BE(16),1536);assert.equal(atlas.readUInt32BE(20),1024);
 assert.ok(total+atlas.length<4000000,'Raster parts and inferred atlas exceeded the transfer budget');
});

test('motion needs a visible foreground illustration and both motion preferences', () => {
  assert.equal(motionState({ visible: true, hidden: false, reduced: false, paused: false }), 'running');
  for (const stop of [{ visible: false }, { hidden: true }, { paused: true }]) {
    assert.equal(motionState({ visible: true, hidden: false, reduced: false, paused: false, ...stop }), 'paused');
  }
  assert.equal(motionState({visible:true,hidden:false,reduced:true}),'static');
  assert.equal(motionState({visible:true,hidden:false,reduced:false,resting:true}),'resting');
});

test('only named page positions can receive decorative motion',()=>{
 for(const prefix of ['/','/ja/','/zh/','/fde-site/ja/']){
  const plans=motionTargetsForPath(prefix+'index.html');assert.deepEqual(plans.map(x=>x.kind),['license','plus']);assert(plans.every(x=>x.selector.includes('#plans.quiet-plans .quiet-comparison .plan-top > img.comparison-sculpture')));
  const goals=motionTargetsForPath(prefix+'goals.html');assert.deepEqual(goals.map(x=>x.kind),['understand','assemble','partner']);assert(goals.every(x=>x.selector.includes('body.goals-journey')));assert.ok(goals[1].selector.includes('#approach.mission-chapter'));
  for(const file of ['license.html','quiet-form.html','contact.html'])assert.deepEqual(motionTargetsForPath(prefix+file),[]);
 }
});

test('a complete presentation rests for one second before repeating, even after delayed frames',()=>{
 assert.equal(MOTION_DURATION,4800);assert.equal(REST_DURATION,1000);assert.equal(CYCLE_DURATION,5800);assert.equal(playbackStep(0,0).phase,0);assert.equal(playbackStep(0,2400).phase,.5);
 assert.deepEqual(playbackStep(4799,1),{elapsed:4800,phase:1,resting:true,restarted:false});assert.deepEqual(playbackStep(100,9000),{elapsed:4800,phase:1,resting:true,restarted:false});assert.equal(playbackStep(4800,999).phase,1);
 assert.deepEqual(playbackStep(5799,1),{elapsed:0,phase:0,resting:false,restarted:true});assert.deepEqual(playbackStep(4800,9000),{elapsed:0,phase:0,resting:false,restarted:true});assert.equal(playbackStep(100,-100).elapsed,100);
});

test('the adopted partner motion is the approved stronger right option with a neutral loop seam',()=>{
 assert.equal(PARTNER_MOTION.period,7200);assert.equal(PARTNER_MOTION.scale,.15);assert.equal(PARTNER_MOTION.x,62);assert.equal(PARTNER_MOTION.y,70);assert.equal(PARTNER_MOTION.dim,.38);assert.equal(PARTNER_MOTION.fill,.075);
 assert.equal(sourceCurve(PARTNER_MOTION.keys,0),0);assert.equal(sourceCurve(PARTNER_MOTION.keys,1),0);assert.equal(sourceCurve(PARTNER_MOTION.keys,.10),1.20);assert.equal(sourceCurve(PARTNER_MOTION.keys,.53),-1.20);
 assert.ok(Math.abs(sourceCurve(PARTNER_MOTION.keys,.000001))<.000001);
});


const preferenceSource=readFileSync(new URL('../motion-preferences.js',import.meta.url),'utf8').replace('export const motionPreference','const motionPreference')+'\nglobalThis.preference=motionPreference;';
function preferenceFixture({values=new Map(),reduced=false,blocked=false}={}){
 const events={},media={matches:reduced,addEventListener(name,fn){events.system=fn;}};
 const storage={getItem(key){if(blocked)throw Error('unavailable');return values.get(key)||null;},setItem(key,value){if(blocked)throw Error('unavailable');values.set(key,value);},removeItem(key){if(blocked)throw Error('unavailable');values.delete(key);}};
 const context={matchMedia:()=>media,localStorage:storage,window:{addEventListener(name,fn){events[name]=fn;}}};runInNewContext(preferenceSource,context);return{preference:context.preference,values,media,events};
}
test('explicit still-icon preference persists across pages and responds to other tabs',()=>{
 const first=preferenceFixture();assert.equal(first.preference.matches,false);first.preference.setReduced(true);assert.equal(first.preference.matches,true);
 const second=preferenceFixture({values:first.values});assert.equal(second.preference.matches,true);first.preference.setReduced(false);second.events.storage({key:'fde:still-icons'});assert.equal(second.preference.matches,false);
 first.preference.setReduced(true);second.preference.setReduced(false);assert.equal(first.preference.matches,true);first.events.pageshow();assert.equal(first.preference.matches,false);
});
test('the device preference cannot be overridden and live changes retain a user pause',()=>{
 const f=preferenceFixture({reduced:true});assert.equal(f.preference.systemReduced,true);f.preference.setReduced(false);assert.equal(f.preference.matches,true);
 f.media.matches=false;f.events.system();assert.equal(f.preference.matches,false);f.preference.setReduced(true);f.media.matches=true;f.events.system();f.media.matches=false;f.events.system();assert.equal(f.preference.matches,true);
});
test('a user can still stop and restart icons when browser storage is unavailable',()=>{
 const f=preferenceFixture({blocked:true}),states=[];f.preference.addEventListener('change',e=>states.push(e.matches));f.preference.setReduced(true);assert.equal(f.preference.matches,true);f.events.pageshow();assert.equal(f.preference.matches,true);f.preference.setReduced(false);assert.equal(f.preference.matches,false);assert.deepEqual(states,[true,true,false]);
});
