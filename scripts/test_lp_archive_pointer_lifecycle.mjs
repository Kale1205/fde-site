import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../ja/lp/parallel.js',import.meta.url),'utf8');
const extract=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));

// Synthetic Pointer Events fixture: execute the production handlers and layout
// lifecycle with explicit capture-transfer events. This does not emulate a
// browser's touch hardware or establish a Safari/WebKit reproduction.
function fixture({legacyCaptureListener=false}={}){
 const fieldEvents=new Map(),windowEvents=new Map(),documentEvents=new Map(),frames=new Map(),captures=new Map(),pending=[],inspections=[];
 let serial=0,now=1000;
 const register=(events,name,fn)=>{if(!events.has(name))events.set(name,[]);events.get(name).push(fn);};
 const fire=(events,type,event={})=>{now+=16;for(const handler of events.get(type)||[])handler({type,...event});};
 const classes=new Set();
 const field={clientWidth:400,clientHeight:800,
  classList:{add:name=>classes.add(name),remove:name=>classes.delete(name),contains:name=>classes.has(name)},
  addEventListener:(name,fn)=>register(fieldEvents,name,fn),
  hasPointerCapture:id=>captures.get(id)===field,
  setPointerCapture(id){const previous=captures.get(id);captures.set(id,field);if(previous&&previous!==field)pending.push({pointerId:id,target:previous});},
  releasePointerCapture(id){if(captures.get(id)===field){captures.delete(id);pending.push({pointerId:id,target:field});}},
 };
 const paper={dataset:{material:'0'},classList:{contains:name=>name==='material-print'}};
 paper.closest=selector=>selector==='[data-material]'?paper:null;
 const photo={closest:paper.closest},archiveEvents=new Map();
 const plane={style:{},replaceChildren(){}},archive={hidden:false,style:{setProperty(){}},addEventListener:(name,fn)=>register(archiveEvents,name,fn)};
 const reduced={matches:false,addEventListener:(name,fn)=>register(windowEvents,'reduced:'+name,fn)};
 const c={field,plane,archive,reduced,playback:null,inspectionPlayback:null,visibilityPaused:false,points:new Map(),tileNodes:new Map(),
  x:0,y:0,originX:0,originY:0,z:1,W:1,H:1,vx:0,vy:0,anim:0,last:0,gesture:null,clickBlock:0,framePending:0,layoutFrame:0,
  viewWidth:0,viewHeight:0,poolColumns:0,poolRows:0,MIN_ZOOM:.6,MAX_ZOOM:1,innerWidth:400,innerHeight:800,gather:null,
  wrap:(n,d)=>((n%d)+d)%d,clamp:(n,a,b)=>Math.min(b,Math.max(a,n)),sizePool(){},updateZoom(){},endGather(){},route(){},
  performance:{now:()=>now},requestAnimationFrame:fn=>{frames.set(++serial,fn);return serial;},cancelAnimationFrame:id=>frames.delete(id),
  inspect:(id,trigger)=>inspections.push({id,trigger}),
  window:{scrollX:0,scrollY:0,addEventListener:(name,fn)=>register(windowEvents,name,fn)},
  document:{hidden:false,addEventListener:(name,fn)=>register(documentEvents,name,fn)},
  addEventListener:(name,fn)=>register(windowEvents,name,fn),
 };
 let pointerSource=extract('const midpoint=',"field.addEventListener('wheel',");
 if(legacyCaptureListener)pointerSource=pointerSource.replace(
  /field\.addEventListener\('lostpointercapture',e=>\{[\s\S]*?\n\}\);/,
  "field.addEventListener('lostpointercapture',release);",
 );
 runInNewContext([
  extract('function draw(){','function updateZoom(){'),
  extract('function size(center=false){','const midpoint='),
  pointerSource,
  extract("archive.addEventListener('click',","q('.close-inspect').addEventListener"),
  extract('function settleMotion(){',"addEventListener('hashchange',route);"),
  extract('function resize(){',"addEventListener('resize',resize);"),
 ].join('\n'),c);
 c.size(true);
 const flushCapture=()=>{while(pending.length)fire(fieldEvents,'lostpointercapture',{...pending.shift(),currentTarget:field});};
 const down=(id=1,target=photo,type='touch',x=100,y=300)=>{
  if(type==='touch')captures.set(id,target);
  fire(fieldEvents,'pointerdown',{pointerId:id,target,currentTarget:field,button:0,pointerType:type,clientX:x,clientY:y});
 };
 const move=(id=1,x=120,y=320,type='touch',buttons=1)=>fire(fieldEvents,'pointermove',{pointerId:id,target:captures.get(id)||field,currentTarget:field,pointerType:type,buttons,clientX:x,clientY:y});
 const end=(id=1,type='pointerup')=>{
  const owner=captures.get(id);fire(windowEvents,type,{pointerId:id,target:owner||field});
  captures.delete(id);if(owner)pending.push({pointerId:id,target:owner});flushCapture();
 };
 const loseField=(id=1)=>{captures.delete(id);fire(fieldEvents,'lostpointercapture',{pointerId:id,target:field,currentTarget:field});};
 const click=()=>fire(archiveEvents,'click',{target:photo});
 const flushFrames=()=>{for(let i=0;frames.size;i++){assert(i<30,'unexpected repeating frame');const [id,fn]=frames.entries().next().value;frames.delete(id);fn(now+=16);}};
 return {c,field,paper,photo,frames,captures,inspections,down,move,end,loseField,click,flushCapture,flushFrames,
  event:(type,event)=>fire(windowEvents,type,event),visibility:()=>fire(documentEvents,'visibilitychange')};
}

for(const target of ['paper','photo'])test('synthetic child '+target+' capture loss during transfer preserves the active drag',()=>{
 const f=fixture();f.down(1,f[target]);f.move(1,120,320);const first={x:f.c.x,y:f.c.y};
 assert(f.field.hasPointerCapture(1));f.flushCapture();
 assert(f.c.points.has(1));assert(f.c.gesture);assert(f.field.classList.contains('is-drag'));
 f.move(1,160,350);f.flushFrames();
 assert(f.c.x>first.x&&f.c.y>first.y,'a later move must continue panning');
 f.end();f.click();assert.equal(f.inspections.length,0,'the drag must suppress its generated click');
 f.down();f.end();f.click();assert.equal(f.inspections.length,1,'a fresh tap remains operable');
});

test('synthetic baseline reproduces the old unconditional listener failure',()=>{
 const f=fixture({legacyCaptureListener:true});f.down();f.move();f.flushCapture();const stopped=f.c.x;
 assert.equal(f.c.points.size,0);assert.equal(f.c.gesture,null);
 f.move(1,170,350);assert.equal(f.c.x,stopped,'the old listener drops subsequent moves');
});

test('synthetic stationary and sub-threshold touch taps keep their click behavior',()=>{
 const f=fixture();f.down();f.move(1,103,302);assert.equal(f.field.hasPointerCapture(1),false);
 f.end();f.click();assert.equal(f.inspections.length,1);assert.equal(f.c.clickBlock,0);assert.equal(f.c.points.size,0);
});

for(const finish of ['field-loss','pointercancel','pointerup'])test('synthetic '+finish+' clears a captured drag and permits the next gesture',()=>{
 const f=fixture();f.down();f.move();f.flushCapture();
 if(finish==='field-loss')f.loseField();else f.end(1,finish);
 assert.equal(f.c.points.size,0);assert.equal(f.c.gesture,null);assert(!f.field.classList.contains('is-drag'));
 if(finish!=='pointerup')assert.equal(f.c.anim,0,'capture loss and cancellation must not launch inertia');
 f.down(2);f.move(2,145,345);f.flushCapture();assert(f.c.points.has(2));assert(f.field.classList.contains('is-drag'));
});

for(const finish of ['pointerup','pointercancel','field-loss'])test('synthetic pinch recovers one-finger panning after '+finish,()=>{
 const f=fixture();f.down(1,f.photo,'touch',80,300);f.down(2,f.paper,'touch',220,300);f.flushCapture();
 assert.equal(f.c.points.size,2);f.move(1,65,310);f.move(2,235,310);
 if(finish==='field-loss')f.loseField(2);else f.end(2,finish);
 assert.equal(f.c.points.size,1);assert(f.c.points.has(1));const before=f.c.x;
 f.move(1,95,335);f.flushCapture();f.move(1,125,360);
 assert(f.c.x>before);assert(f.c.points.has(1));f.end(1,'pointercancel');assert.equal(f.c.points.size,0);
});

test('synthetic height-only viewport resize preserves the captured drag and plane origin',()=>{
 const f=fixture();f.down();f.move();f.flushCapture();f.flushFrames();
 const before={transform:f.c.plane.style.transform,originX:f.c.originX,originY:f.c.originY,x:f.c.x};
 f.field.clientHeight=720;f.c.innerHeight=720;f.c.resize();f.flushFrames();
 assert.equal(f.c.plane.style.transform,before.transform);assert.equal(f.c.originX,before.originX);assert.equal(f.c.originY,before.originY);
 assert(f.c.points.has(1));assert(f.field.hasPointerCapture(1));f.move(1,160,360);assert(f.c.x>before.x);
});

test('synthetic width resize clears the active drag and owned capture',()=>{
 const f=fixture();f.down();f.move();f.flushCapture();f.field.clientWidth=600;f.c.innerWidth=600;f.c.resize();f.flushFrames();f.flushCapture();
 assert.equal(f.c.points.size,0);assert.equal(f.c.gesture,null);assert.equal(f.field.hasPointerCapture(1),false);
});

for(const event of ['blur','pagehide','visibilitychange','reduced-motion'])test('synthetic '+event+' clears gesture, owned capture and pending draw',()=>{
 const f=fixture();f.down();f.move();f.flushCapture();assert(f.frames.size);
 if(event==='visibilitychange'){f.c.document.hidden=true;f.visibility();}
 else if(event==='reduced-motion'){f.c.reduced.matches=true;f.event('reduced:change',{matches:true});}
 else f.event(event);
 f.flushCapture();assert.equal(f.c.points.size,0);assert.equal(f.c.gesture,null);assert.equal(f.c.framePending,0);assert.equal(f.c.anim,0);
 assert.equal(f.field.hasPointerCapture(1),false);assert(!f.field.classList.contains('is-drag'));assert.equal(f.frames.size,0);
 f.c.document.hidden=false;f.c.reduced.matches=false;f.down(2);f.end(2);f.click();assert.equal(f.inspections.length,1);
});

test('synthetic mouse release with no held button recovers without changing touch capture handling',()=>{
 const f=fixture();f.down(1,f.paper,'mouse');f.move(1,120,320,'mouse');f.flushCapture();
 f.move(1,130,330,'mouse',0);assert.equal(f.c.points.size,0);assert.equal(f.c.gesture,null);
 f.down(2,f.paper,'mouse');f.end(2);f.click();assert.equal(f.inspections.length,1);
});
