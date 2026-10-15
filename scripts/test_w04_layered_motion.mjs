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

function fixture({reduce = false, blocked = false, observer = true, deferred = false, frameCallback = false} = {}) {
  const events = new Map(), videos = [], seeks = [];
  const bind = name => (event, fn) => events.set(name + ':' + event, fn);
  let rejectFirst, pendingFrame, now = 0, callback;
  function makeVideo() {
    const index=videos.length;
    const source={addEventListener: bind('source'+index)};
    let time=0;
    const media={paused:true,controls:true,playCalls:0,readyState:4,duration:12,style:{},attributes:{},preload:'none',loadCalls:0,
      addEventListener:bind('video'+index),querySelector:()=>source,before(){},
      removeAttribute(k){delete this.attributes[k];},setAttribute(k,v){this.attributes[k]=v;},
      cloneNode:makeVideo,load(){this.loadCalls++;},
      play(){this.playCalls++;if(blocked)return Promise.reject(Error('autoplay blocked'));this.paused=false;
        if(deferred&&index===0&&this.playCalls===1)return new Promise((_,reject)=>{rejectFirst=reject;});
        return Promise.resolve();},
      pause(){this.paused=true;}
    };
    Object.defineProperty(media,'currentTime',{get:()=>time,set:v=>{seeks.push({index,opacity:media.style.opacity,time:v});time=v;}});
    if(frameCallback)media.requestVideoFrameCallback=fn=>events.set('frame'+index,fn);
    videos.push(media);return media;
  }
  const video=makeVideo();
  const feed={textContent:'',style:{},parentElement:{clientHeight:480}};
  const button={hidden:true,dataset:{pauseLabel:'Pause',playLabel:'Play'},attributes:{},addEventListener:bind('button'),setAttribute(k,v){this.attributes[k]=v;}};
  const status={hidden:true};
  const selectors={'[data-motion-video]':video,'[data-code-feed]':feed,'[data-code-source]':{textContent:sampleCode},'[data-motion-toggle]':button,'[data-motion-status]':status,'.mission-desk':{}};
  const root={dataset:{},querySelector:name=>selectors[name]};
  const document={hidden:false,querySelectorAll:()=>[root],addEventListener:bind('document'),createElement:()=>({append(){}})};
  const media={matches:reduce,addEventListener:bind('media')};
  class IntersectionObserver {constructor(fn){callback=fn;}observe(){}}
  const window={addEventListener:bind('window'),...(observer?{IntersectionObserver}:{})};
  runInNewContext(read('goals-motion.js'),{document,window,matchMedia:()=>media,IntersectionObserver,
    getComputedStyle:()=>({lineHeight:'24px',paddingTop:'20px',paddingBottom:'20px'}),
    requestAnimationFrame(fn){pendingFrame=fn;return 1;},cancelAnimationFrame(){pendingFrame=null;}});
  return {video,videos,feed,button,status,root,document,media,seeks,
    emit(name){events.get(name)();},intersect(value){callback([{isIntersecting:value}]);},
    tick(ms=16){now+=ms;const fn=pendingFrame;pendingFrame=null;fn?.(now);},
    timer:()=>pendingFrame,rejectFirst:()=>rejectFirst(Error('stale play rejected')),
  };
}
test('visible panel starts muted recording and continuous bounded ring typing', () => {
  const f=fixture();assert.equal(f.video.playCalls,0);f.intersect(true);assert.equal(f.video.paused,false);
  assert.ok(f.videos.every(v=>v.muted&&v.defaultMuted));
  const first=f.feed.textContent;
  for(let i=0;i<10000;i++)f.tick();
  assert.notEqual(f.feed.textContent,first);
  assert.ok(f.feed.textContent.split('\n').length<=21);
  assert.ok(f.feed.textContent.length<2000);
  assert.equal(f.button.attributes['aria-pressed'],'true');
});
test('code keeps moving at the same speed through a row boundary and full source wrap', () => {
  const f=fixture();f.intersect(true);f.tick();
  const height=24,sourceRows=sampleCode.trimEnd().split('\n').length;
  let previous=0,wraps=0;
  for(let i=0;i<sourceRows*100+20;i++){
    f.tick(16);
    const y=-Number(f.feed.style.transform.match(/,\s*(-?[\d.e-]+)px/)[1]);
    const distance=(y-previous+height)%height;
    assert.ok(Math.abs(distance-height*16/1500)<0.00001);
    if(y<previous)wraps++;
    previous=y;
  }
  assert.ok(wraps>sourceRows,'continues through the complete source cycle');
});
test('one keyboard-compatible button pauses and resumes both surfaces', () => {
  const f=fixture();f.intersect(true);f.emit('button:click');
  assert.ok(f.videos.every(v=>v.paused));assert.equal(f.timer(),null);assert.equal(f.button.textContent,'Play');
  f.emit('button:click');assert.equal(f.video.paused,false);assert.equal(f.button.textContent,'Pause');
});
test('reduced motion starts static without loading either video until explicitly requested', () => {
  const f=fixture({reduce:true});f.intersect(true);
  assert.ok(f.videos.every(v=>v.playCalls===0&&v.loadCalls===0));assert.equal(f.timer(),null);
  assert.match(f.feed.textContent,/stock_state/);
  f.emit('button:click');assert.equal(f.video.paused,false);
  f.media.matches=true;f.emit('media:change');assert.ok(f.videos.every(v=>v.paused));assert.equal(f.timer(),null);
});
test('offscreen and background pauses preserve explicit user pause', () => {
  const f=fixture();f.intersect(true);f.intersect(false);assert.ok(f.videos.every(v=>v.paused));
  f.intersect(true);assert.equal(f.video.paused,false);
  f.document.hidden=true;f.emit('document:visibilitychange');assert.equal(f.video.paused,true);
  f.document.hidden=false;f.emit('document:visibilitychange');assert.equal(f.video.paused,false);
  f.emit('button:click');f.intersect(false);f.intersect(true);assert.equal(f.video.paused,true);
});
test('autoplay rejection offers deliberate replay without an unhandled rejection', async () => {
  const f=fixture({blocked:true});f.intersect(true);await Promise.resolve();
  assert.equal(f.button.textContent,'Play');assert.equal(f.timer(),null);assert.equal(f.root.dataset.motion,'paused');
});
test('stale autoplay rejection after pause/resume cannot stop the new playback', async () => {
  const f=fixture({deferred:true});f.intersect(true);f.emit('button:click');f.emit('button:click');f.rejectFirst();await Promise.resolve();
  assert.equal(f.button.textContent,'Pause');assert.equal(f.video.paused,false);
});
test('predecoded incoming layer overlaps playback; only hidden outgoing decoder seeks', async () => {
  const f=fixture();f.intersect(true);f.video.currentTime=10.5;f.tick();await Promise.resolve();
  assert.equal(f.videos[1].paused,false);
  for(let i=0;i<60;i++)f.tick();
  assert.equal(f.videos[1].style.opacity,'1');assert.equal(f.video.style.opacity,'0');assert.equal(f.video.paused,true);
  assert.equal(f.video.currentTime,0);
  assert.ok(f.seeks.filter(s=>s.time===0).every(s=>s.opacity==='0'));
  f.videos[1].currentTime=10.5;f.tick();await Promise.resolve();
  for(let i=0;i<60;i++)f.tick();
  assert.equal(f.video.style.opacity,'1');assert.equal(f.videos[1].style.opacity,'0');
});
test('fade waits for an actual incoming decoded frame; cannot reveal an empty layer', async () => {
  const f=fixture({frameCallback:true});f.intersect(true);f.video.currentTime=10.5;f.tick();await Promise.resolve();
  for(let i=0;i<20;i++)f.tick();
  assert.equal(f.videos[1].style.opacity,'0');assert.equal(f.video.style.opacity,'1');
  f.emit('frame1');f.tick();assert.ok(Number(f.videos[1].style.opacity)>0);
});
test('pause freezes an in-flight dissolve and resumes without resetting either visible stream', async () => {
  const f=fixture();f.intersect(true);f.video.currentTime=10.5;f.tick();await Promise.resolve();
  for(let i=0;i<20;i++)f.tick();
  const alpha=f.videos[1].style.opacity;f.emit('button:click');f.tick();
  assert.equal(f.videos[1].style.opacity,alpha);assert.ok(f.videos.every(v=>v.paused));
  f.emit('button:click');f.tick();f.tick();assert.ok(Number(f.videos[1].style.opacity)>Number(alpha));
});
test('active media/source failure exposes localized fallback; spare failure retains active playback', () => {
  for(const event of ['video0:error','source0:error']){const f=fixture();f.intersect(true);f.emit(event);assert.equal(f.status.hidden,false);}
  const f=fixture();f.intersect(true);f.emit('video1:error');assert.equal(f.video.paused,false);assert.equal(f.status.hidden,true);
});
test('duplicate is hidden from assistive tech and has no keyboard or panel action', () => {
  const f=fixture();assert.equal(f.videos[1].attributes['aria-hidden'],'true');assert.equal(f.videos[1].attributes.tabindex,'-1');
  assert.doesNotMatch(read('goals-motion.js'),/\bfetch\(|XMLHttpRequest|location\s*[.=]|localStorage|sessionStorage|window\.open|innerHTML/);
  assert.match(read('goals-motion.js'),/matchMedia\('\(prefers-reduced-motion: reduce\)'\)/);
});
test('missing IntersectionObserver uses visible fallback', () => {const f=fixture({observer:false});assert.equal(f.video.paused,false);});

test('Layered Desk static angles survive reduced motion on every viewport, without double-rotating decoded video', () => {
  const css=read('goals-motion.css');
  assert.match(css,/\.mission-code \{[^}]*align-self: start/);
  assert.match(css,/\.mission-code \{[^}]*transform: perspective\(200cqw\) rotateY\(10deg\)/);
  assert.match(css,/\.mission-video-loop \{[^}]*transform: perspective\(240cqw\) rotateY\(-7deg\)/);
  assert.match(css,/\.mission-video-loop video \{[^}]*transform: none/);
  assert.doesNotMatch(css,/@media\s*\(prefers-reduced-motion:[\s\S]*transform:\s*none/);
  const f=fixture({reduce:true});f.intersect(true);
  assert.equal(f.timer(),null);assert.ok(f.videos.every(v=>v.paused&&v.playCalls===0&&v.loadCalls===0));
});

test('option 1 keeps the same proportional overlap on phones and preserves every text node', () => {
  const css=read('goals-motion.css');
  assert.match(css,/\.mission-code \{[^}]*width: 88%/);
  assert.match(css,/\.mission-video-loop \{[^}]*width: 90%/);
  assert.match(css,/\.mission-layered:focus-within \.mission-recording \{[^}]*width: 100%; margin: 0; padding: 34% 0 0/);
  const mobile=css.slice(css.indexOf('@media (max-width: 760px)'));
  assert.doesNotMatch(mobile, /\.mission-code \{[^}]*width:|\.mission-recording \{[^}]*margin:|transform:/);
  const nodes=html=>[...html.matchAll(/>([^<>]*)</g)].map(m=>m[1].replace(/\s+/g,' ').trim()).filter(Boolean).sort();
  for(const file of ['goals.html','ja/goals.html','zh/goals.html']) {
    const before=execFileSync('git',['show','5275ec6978745fe3723e53bd5d9cbe9266773aa5:'+file],{encoding:'utf8'}),now=read(file);
    assert.deepEqual(nodes(now),nodes(before),file+' must preserve all existing text');
    assert.match(now,/data-desk-layout="01"/);
    assert.match(now,/<div class="mission-proof-intro" id="layered-desk"><h3>[^<]+<\/h3><\/div>/);
    assert.ok(now.indexOf('class="mission-code-explainer"')>now.indexOf('class="mission-recording"'));
  }
});
