import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
import {applyW04LayeredMotion,sampleCode} from './w04_layered_motion.mjs';
import {normalizeAssetBuildKeys as normalize} from './asset_build_test_helpers.mjs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const removedButton=/<div class="mission-motion-tools"><button\b[^>]*data-motion-toggle[^>]*>[\s\S]*?<\/button><\/div>/g;
for(const file of ['goals.html','ja/goals.html','zh/goals.html'])test(file+': follow-up removes only requested button and keeps all media, prose, links and metadata',()=>{
 const base=execFileSync('git',['show','bf9da84b714e2a31d1e585513d107a41e27fba31:'+file],{encoding:'utf8'}),current=read(file);
 assert.equal(normalize(current),normalize(base.replace(removedButton,'')));
 assert.doesNotMatch(current,/data-motion-toggle|mission-motion-tools/);
 assert.equal(normalize(applyW04LayeredMotion(base)),normalize(current));
 assert.equal(applyW04LayeredMotion(current),current);
});

// Isolated synthetic DOM: deliberately has no motion-toggle element.
function fixture({reduced=false,mode='normal',saveData=false}={}){
 const events=new Map(),videos=[];let observe,frame=null,time=0,policy=mode;
 const bind=id=>(name,fn)=>events.set(id+':'+name,fn);
 function video(){const i=videos.length,m={style:{},paused:true,controls:true,readyState:4,duration:12,currentTime:0,playCalls:0,loadCalls:0,
  addEventListener:bind('video'+i),querySelector:()=>({addEventListener:bind('source'+i)}),before(){},cloneNode:video,removeAttribute(){},setAttribute(){},load(){this.loadCalls++;},pause(){this.paused=true;events.get('video'+i+':pause')?.();},
  play(){this.playCalls++;if(policy==='throw')throw Error('Synthetic synchronous media failure');if(policy==='reject')return Promise.reject(Error('Synthetic policy refusal'));this.paused=false;return Promise.resolve();}};videos.push(m);return m;}
 const active=video(),feed={textContent:'',style:{},parentElement:{clientHeight:480}},status={hidden:true},root={dataset:{},querySelector:selector=>({'[data-motion-video]':active,'[data-code-feed]':feed,'[data-code-source]':{textContent:sampleCode},'[data-motion-status]':status,'.mission-desk':{}}[selector]||null)};
 const document={hidden:false,querySelectorAll:()=>[root],createElement:()=>({append(){}}),addEventListener:bind('document')},media={matches:reduced,addEventListener:bind('media')},connection={saveData,addEventListener:bind('connection')};
 class IntersectionObserver{constructor(fn){observe=fn;}observe(){}}
 assert.doesNotThrow(()=>runInNewContext(read('goals-motion.js'),{document,navigator:{connection},window:{IntersectionObserver,addEventListener:bind('window')},IntersectionObserver,matchMedia:()=>media,getComputedStyle:()=>({lineHeight:'24px',paddingTop:'20px',paddingBottom:'20px'}),requestAnimationFrame(fn){assert.equal(frame,null,'one RAF only, including synchronous media refusal');frame=fn;return 1;},cancelAnimationFrame(){frame=null;}}));
 return {active,videos,feed,status,root,document,media,connection,intersect:value=>observe([{isIntersecting:value}]),emit:name=>events.get(name)?.(),setPolicy:value=>policy=value,
  tick(){const next=frame;frame=null;time+=16;next?.(time);},scheduled:()=>!!frame};
}
for(const mode of ['reject','throw'])test(mode+': video refusal leaves the code feed moving, no per-frame retry or duplicate RAF',async()=>{
 const f=fixture({mode});f.intersect(true);await Promise.resolve();assert.equal(f.root.dataset.videoMotion,'blocked');assert.equal(f.root.dataset.motion,'playing');assert.equal(f.status.hidden,false);const first=f.feed.style.transform,attempts=f.active.playCalls;
 for(let i=0;i<200;i++)f.tick();assert.notEqual(f.feed.style.transform,first);assert.equal(f.active.playCalls,attempts);assert.equal(f.scheduled(),true);
 f.document.hidden=true;f.emit('document:visibilitychange');assert.equal(f.scheduled(),false);f.setPolicy('normal');f.document.hidden=false;f.emit('document:visibilitychange');await Promise.resolve();assert.equal(f.active.playCalls,attempts+1);assert.equal(f.active.paused,false);assert.equal(f.status.hidden,true);
});
test('native pause and active decode failure keep independent code movement',()=>{
 for(const event of ['video0:pause','source0:error']){const f=fixture();f.intersect(true);f.active.paused=true;f.emit(event);const before=f.feed.style.transform;for(let i=0;i<100;i++)f.tick();assert.notEqual(f.feed.style.transform,before);assert.equal(f.scheduled(),true);assert.equal(f.status.hidden,false);assert.ok(['blocked','unavailable'].includes(f.root.dataset.videoMotion));}
});
test('reduced and data-saving preferences retain static, unloaded media without any page override control',()=>{
 for(const prefs of [{reduced:true},{saveData:true}]){const f=fixture(prefs);f.intersect(true);for(let i=0;i<50;i++)f.tick();assert.equal(f.scheduled(),false);assert.equal(f.root.dataset.motion,'paused');assert.ok(f.videos.every(v=>v.playCalls===0&&v.loadCalls===0));assert.match(f.feed.textContent,/stock_state/);}
});
test('a policy-blocked normal page becomes fully static as soon as reduced motion is enabled',async()=>{
 const f=fixture({mode:'reject'});f.intersect(true);await Promise.resolve();assert.equal(f.scheduled(),true);f.media.matches=true;f.emit('media:change');const before=f.feed.style.transform;for(let i=0;i<20;i++)f.tick();assert.equal(f.feed.style.transform,before);assert.equal(f.scheduled(),false);assert.equal(f.root.dataset.videoMotion,'paused');
});
