import {test} from 'node:test';
import assert from 'node:assert/strict';
import {archivePlayback,applyCaseMedia} from '../ja/lp/media-runtime.js';

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
