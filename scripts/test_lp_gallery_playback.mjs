import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {archivePlayback,applyCaseMedia} from '../ja/lp/media-runtime.js';
import {archiveFrameForSlot,archiveFrames,archiveOnlyFrame} from '../ja/lp/archive-layout.js';
import {LP_ARCHIVE_CASES} from '../ja/lp/media-schema.js';

test('Archive playback serves only one visible duplicate, preserves it across movement, and releases offscreen/pause media',()=>{
 const saved=Object.fromEntries(['document','IntersectionObserver','requestAnimationFrame','cancelAnimationFrame'].map(key=>[key,globalThis[key]]));
 let observer,raf=null,blocked=false,created=0;
 try{
  globalThis.IntersectionObserver=class{
   constructor(cb,opts){observer={cb,opts};}
   observe(){} unobserve(){}
  };
  globalThis.requestAnimationFrame=cb=>{raf=cb;return 17;};
  globalThis.cancelAnimationFrame=()=>{raf=null;};
  globalThis.document={createElement(){
   created++;
   const v={
    addEventListener(){},setAttribute(){},paused:true,
    pause(){this.paused=true;},play(){this.paused=false;},
    remove(){this.parent.video=null;},removeAttribute(){},load(){},
   };
   return v;
  }};
  const root={},player=archivePlayback(root,()=>blocked);
  assert.equal(observer.opts.root,root);
  const cfg={video:'assets/archive/11/fixture.mp4',poster:'assets/archive/11/poster.jpg'};
  const elt=()=>({classList:{contains(){return false;}},isConnected:true,append(video){video.parent=this;this.video=video;}});
  const a=elt(),b=elt();
  player.watch(a,cfg);player.watch(b,cfg);
  const intersect=(...entries)=>{observer.cb(entries.map(([target,ratio])=>({target,isIntersecting:ratio>0,intersectionRatio:ratio})));const render=raf;raf=null;render?.();};
  intersect([a,.8],[b,.5]);
  assert.equal(created,1);assert.equal(a.video.paused,false);assert.equal(b.video,undefined);
  assert.deepEqual([a.video.loop,a.video.muted,a.video.defaultMuted,a.video.playsInline,a.video.controls],[true,true,true,true,undefined]);
  const active=a.video;
  intersect([a,.45],[b,.7]);assert.equal(a.video,active);
  intersect([a,0]);assert.equal(a.video,null);assert.equal(active.paused,true);assert.equal(b.video.paused,false);
  blocked=true;player.refresh();assert.equal(b.video,null);assert.equal(raf,null);
  blocked=false;player.refresh();const render=raf;raf=null;render();assert.equal(b.video.paused,false);
  player.unwatch({contains:node=>node===b});assert.equal(b.video,null);
 }finally{
  for(const [key,value] of Object.entries(saved))if(value===undefined)delete globalThis[key];else globalThis[key]=value;
 }
});

test('authored detail copy replaces only supplied fields and stays literal text',async()=>{
 const saved=Object.fromEntries(['document','location','fetch'].map(key=>[key,globalThis[key]]));
 const headline={textContent:'Default title',classList:{add(name){this.name=name;}}};
 const subtitle={textContent:'Default subtitle'};
 const mood={textContent:'Default mood'};
 let source={headline:'HTML <img src=x>\nSecond line',mood:'Edited mood'};
 try{
  globalThis.location={pathname:'/ja/lp/cases/01.html'};
  globalThis.fetch=async()=>({ok:true,json:async()=>({version:1,cases:{'01':{story:{detail:source}}}})});
  globalThis.document={querySelector:selector=>({
   '.case-hero h1':headline,'.case-hero > div:first-child > p:not(.eyebrow)':subtitle,'.case-copy dd:nth-of-type(1)':mood,
  })[selector]};
  await applyCaseMedia();
  assert.deepEqual([headline.textContent,headline.classList.name,subtitle.textContent,mood.textContent],[source.headline,'case-custom-headline','Default subtitle',source.mood]);
 }finally{
  for(const [key,value] of Object.entries(saved))if(value===undefined)delete globalThis[key];else globalThis[key]=value;
 }
});


test('gallery dependency loading belongs to the document module graph, not an uncaught navigation-time import',()=>{
 const source=readFileSync(new URL('../ja/lp/parallel.js',import.meta.url),'utf8');
 for(const path of ['media-runtime.js','media-schema.js','archive-layout.js?v=slot07-frame-1'])assert.match(source,new RegExp("^import .+ from '\\./"+path.replace(/[.?]/g,'\\$&')+"';",'m'));
 assert.match(readFileSync(new URL('../cms-lp-editor.js',import.meta.url),'utf8'),/from '\.\/ja\/lp\/archive-layout\.js\?v=slot07-frame-1';/);
 assert.equal(source.includes('import('),false,'rapid navigation must not cancel an uncaught delayed dynamic dependency');
 for(const path of ['index.html','examples.html'])assert.match(readFileSync(new URL('../ja/lp/'+path,import.meta.url),'utf8'),/<script type="module" src="[^"<>]*parallel\.js\?v=[^"<>]+"><\/script>/);
});

test('the portrait train print clears the upper Archive paper at mobile and desktop zooms',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../ja/lp/media-manifest.json',import.meta.url),'utf8'));
 assert.equal(manifest.archive['07'].caseId,null);
 const upperIndex=Number(manifest.archive['02']?.caseId||LP_ARCHIVE_CASES['02'])-1;
 const upper=archiveFrameForSlot(2,upperIndex),train=archiveFrameForSlot(7,-8);
 assert.deepEqual(train,[.60,9/16]);
 assert.strictEqual(archiveFrameForSlot('07',-1),train,'CMS and public slots share the same footprint');
 assert.strictEqual(archiveFrameForSlot(7,6),archiveFrames[6],'assigning a case keeps its usual footprint');
 for(const slot of [0,2,8,16,24])assert.strictEqual(archiveFrameForSlot(slot,-1),archiveOnlyFrame);
 const clamp=(x,min,max)=>Math.min(Math.max(x,min),max);
 function gap(width,zoom,portrait){
  // Inner 9:16 area plus the real white border-box paper padding.
  const mobile=width<690,pitch=mobile?clamp(width*.43,142,220):clamp(width/5.12,210,300);
  const padX=width<=690?6:8,padY=width<=690?13:16;
  const height=([w,r])=>(pitch*w-padX)/r+padY;
  return (pitch*(mobile?1.13:.977)-(height(upper)+height(portrait))/2)*zoom;
 }
 assert.ok(gap(393,.6,archiveOnlyFrame)<3,'old portrait nearly touched the previous row');
 for(const width of [320,375,393,430,512,689,690,768,1024,1280,1440,1600]){
  for(const zoom of [.6,.7,.8,.9,1])assert.ok(gap(width,zoom,train)>=5.5,`paper gap must be at least 5.5px at ${width}px, zoom ${zoom}`);
 }
});
