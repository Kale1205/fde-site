import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {BOOK_MOTION,prepareBookOffset,wrapBookOffset,modulo,containedImageRect} from '../news-books.js';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const js=read('news-books.js'),css=read('news-books.css');
test('shared-image flight uses contained pixels without stretching or letterbox jumps',()=>{
 assert.deepEqual(containedImageRect({left:10,top:20,width:200,height:300},1000,1000),{left:10,top:70,width:200,height:200});
 assert.deepEqual(containedImageRect({left:0,top:0,width:300,height:200},400,800),{left:100,top:0,width:100,height:200});
 const empty={left:10,top:20,width:0,height:0};assert.equal(containedImageRect(empty,0,0),empty);
});
function progress([x1,y1,x2,y2],x){
 const cubic=(a,b,t)=>3*(1-t)**2*t*a+3*(1-t)*t*t*b+t**3;
 let lo=0,hi=1;
 for(let n=0;n<60;n++){const mid=(lo+hi)/2;if(cubic(x1,x2,mid)<x)lo=mid;else hi=mid;}
 return cubic(y1,y2,(lo+hi)/2);
}
test('responsive card selection retains a gradual start and bounded interaction time',()=>{
 assert(progress([.2,.75,.22,1],.25)>.7,'baseline curve explains the early jump');
 assert(progress([.4,0,.2,1],.25)<.3,'new curve preserves a gradual start');
 assert(BOOK_MOTION.select<=600&&BOOK_MOTION.open<=800);
 assert(BOOK_MOTION.close<=450&&BOOK_MOTION.viewOut+BOOK_MOTION.viewIn<=400);
 assert.match(js,/duration:BOOK_MOTION.select,easing:'cubic-bezier\(\.4,0,\.2,1\)'/);
 assert.match(js,/transform:flightFrom,opacity:1\},\{transform:base,opacity:1\}.*duration:BOOK_MOTION.open,easing:'cubic-bezier\(\.4,0,\.2,1\)'/);
});
test('reader content and marker finish within the matching JS lifecycles, without a final snap',()=>{
 const spread=css.match(/animation:book-arrive (\d+)ms (\d+)ms/).slice(1).map(Number);
 const ink=css.match(/animation:book-ink-arrive (\d+)ms (\d+)ms/).slice(1).map(Number);
 assert(spread[0]+spread[1]<=BOOK_MOTION.open);assert(ink[0]+ink[1]<=BOOK_MOTION.open);
 assert(spread[0]>=300&&ink[0]>=200);
 const marker=Number(css.match(/transition:transform (\d+)ms cubic-bezier\(\.4,0,\.2,1\)/)[1]);assert.equal(marker,BOOK_MOTION.select);
 const depart=Number(css.match(/animation:book-depart (\d+)ms/)[1]);assert(depart>=200&&depart<=BOOK_MOTION.close);
});
test('normal timing has no user-agent override or replacement for the existing OS motion preference',()=>{
 assert.match(js,/const reduce=matchMedia\('\(prefers-reduced-motion: reduce\)'\)/);
 assert.match(js,/if\(reduce.matches\)finish\(delta\)/);
 assert.match(js,/if\(reduce.matches\|\|document.hidden\)\{reader.classList.remove\('is-preparing'\);reader.classList.add\('is-ready'\);return;\}/);
 assert.doesNotMatch(js,/navigator\.userAgent|no-preference|localStorage|sessionStorage|emulateMedia/);
});

// Execute the production functions and their actual registrations with synthetic DOM,
// clocks and content. No browser preference, storage, network or live article is used.
const extract=(start,end)=>js.slice(js.indexOf(start),js.indexOf(end,js.indexOf(start)));
function lifecycleFixture(){
 const timers=new Map(),frames=new Map(),animations=[],events={},updates=[],views=[];let serial=0,focuses=0,closes=0;
 const make=()=>{
  const classes=new Set(),children=[],own=[];
  const node={classes,children,dataset:{},hidden:false,isConnected:true,textContent:'',
   classList:{add:(...xs)=>xs.forEach(x=>classes.add(x)),remove:(...xs)=>xs.forEach(x=>classes.delete(x)),contains:x=>classes.has(x),toggle:(x,on)=>on?classes.add(x):classes.delete(x)},
   style:{removeProperty(name){delete this[name];},setProperty(name,value){this[name]=value;}},
   setAttribute(){},removeAttribute(){},focus(){focuses++;},blur(){},append(n){children.push(n);},replaceChildren(){children.length=0;},
   getBoundingClientRect:()=>({left:0,top:0,width:100,height:100}),
   animate(keyframes,options){const a={node,keyframes,options,cancelled:false,cancel(){this.cancelled=true;}};own.push(a);animations.push(a);return a;},
   getAnimations({subtree=false}={}){return [...own,...(subtree?children.flatMap(n=>n.getAnimations({subtree:true})):[])].filter(a=>!a.cancelled);}
  };return node;
 };
 const title=make(),stage=make(),main=make(),heading=make(),read=make(),live=make(),selectedDate=make(),dots=make();dots.children.push(make(),make());
 const slots=[-1,0,1,2,3].map(offset=>{const n=make();n.dataset.offset=String(offset);const image=make();image.naturalWidth=image.naturalHeight=100;n.querySelector=()=>image;stage.children.push(n);return n;});
 stage.contains=()=>false;stage.hasPointerCapture=()=>true;stage.releasePointerCapture=()=>stage.released=true;
 stage.querySelector=s=>s==='.chronicle-pagination'?dots:slots.find(n=>n.dataset.offset==='0');
 const reader=make(),nodes=new Map();
 for(const s of ['.book-opening-cover','.opening-cover-art','.opening-cover-title','.reader-image','.reader-date','.reader-category','#book-article-title','.reader-copy','.book-close','.reader-body']){nodes.set(s,make());reader.children.push(nodes.get(s));}
 reader.open=false;reader.querySelector=s=>nodes.get(s);reader.showModal=()=>reader.open=true;reader.close=()=>{reader.open=false;closes++;};
 const items=[{id:'synthetic',title:'Synthetic title',body:'Synthetic body',date:'2026-10-17',category:'Update'},{id:'second',title:'Second',date:'2026-10-16'}];
 const context={BOOK_MOTION,prepareBookOffset,wrapBookOffset,modulo,containedImageRect,items,allItems:items,index:0,slots,stage,title,main,heading,read,live,reader,
  busy:false,queued:0,followBookFocus:false,bookAnimations:[],coverAnimation:null,liftedBook:null,flightFrom:'',lastTrigger:null,
  finishTimer:0,openingTimer:0,preparationTimer:0,closeTimer:0,viewTimer:0,openingRun:0,closeCompletion:null,drag:null,dragFrame:0,pendingView:null,pendingContent:null,listView:false,
  reduce:{matches:false,addEventListener:(name,fn)=>events['reduce:'+name]=fn},
  document:{hidden:false,body:make(),activeElement:null,createElement:make,querySelector:()=>selectedDate,querySelectorAll:()=>[],addEventListener:(name,fn)=>events['document:'+name]=fn},
  window:{scrollTo(){}},getComputedStyle:()=>({transform:'matrix(1,0,0,1,0,0)',opacity:'1'}),resolveImage:()=>'',bookFlightTransform:()=>'',
  setTimeout:(fn,ms)=>{timers.set(++serial,{fn,ms});return serial;},clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>{frames.set(++serial,fn);return serial;},cancelAnimationFrame:id=>frames.delete(id),
  fill(){},position(node,offset){node.dataset.offset=String(offset);},syncDateMarker(){},
  showView(next){context.listView=next;views.push(next);},updateContent(data){updates.push(data);}
 };
 const registrations=js.match(/ reduce.addEventListener\('change',settleMotionPreference\);\n document.addEventListener\('visibilitychange',settleMotionPreference\);/)[0];
 runInNewContext([
  extract(' function selection(announce=false){',' function renderList(){'),
  extract(' function finish(delta){',' function syncDateMarker(){'),
  extract(' function finishView(){',' function changeView('),
  extract(' function open(id,trigger){'," reader.querySelector('.book-close').addEventListener"),
  extract(' function settleMotionPreference(){',' function updateContent(data){'),registrations
 ].join('\n'),context);
 function drainFrames(){for(let n=0;frames.size;n++){assert(n<20);const [id,fn]=frames.entries().next().value;frames.delete(id);fn();}}
 function tickTimers(){for(let n=0;timers.size;n++){assert(n<20);const [id,{fn}]=timers.entries().next().value;timers.delete(id);fn();}}
 function change(kind,on=true){if(kind==='reduce'){context.reduce.matches=on;events['reduce:change']();}else{context.document.hidden=on;events['document:visibilitychange']();}}
 return {context,timers,frames,animations,updates,views,title,stage,reader,nodes,drainFrames,tickTimers,change,focuses:()=>focuses,closes:()=>closes};
}
for(const state of ['reduce','hidden']){
 test(`runtime ${state} cancels actual selection, title and drag animations without replaying its queue`,()=>{
  const f=lifecycleFixture(),c=f.context;c.rotate(1);assert(c.busy);assert.equal(f.animations.length,6);assert.equal(f.title.getAnimations().length,1);
  c.queued=1;c.drag={id:7};c.dragFrame=c.requestAnimationFrame(()=>{});f.stage.style['--drag']='20px';f.change(state);
  assert.equal(c.busy,false);assert.equal(c.queued,0);assert(f.animations.every(a=>a.cancelled));assert.equal(f.timers.size,0);
  assert.equal(c.drag,null);assert.equal(c.dragFrame,0);assert.equal(f.stage.released,true);assert.equal(f.stage.style['--drag'],undefined);
  const count=f.animations.length;f.drainFrames();f.tickTimers();f.change(state,false);assert.equal(f.animations.length,count);assert.equal(c.index,1);
 });
 test(`runtime ${state} settles an active Top cover and reader into immediately readable static state`,()=>{
  const f=lifecycleFixture(),c=f.context;c.open('synthetic',{});f.drainFrames();assert(f.reader.classes.has('is-opening'));assert.equal(f.animations.length,1);
  f.change(state);assert(f.reader.open);assert(f.reader.classes.has('is-ready'));assert(!f.reader.classes.has('is-opening'));assert(!f.reader.classes.has('is-preparing'));
  assert(f.animations.every(a=>a.cancelled));assert.equal(f.timers.size,0);assert.equal(f.nodes.get('.book-opening-cover').style.transform,undefined);assert.equal(c.coverAnimation,null);
 });
 for(const framesBefore of [0,1])test(`runtime ${state} after ${framesBefore} preparation frame(s) invalidates the old two-RAF callback`,()=>{
  const f=lifecycleFixture(),c=f.context;c.open('synthetic',{});if(framesBefore){const [id,fn]=f.frames.entries().next().value;f.frames.delete(id);fn();}
  assert(f.reader.classes.has('is-preparing'));f.change(state);f.change(state,false);f.drainFrames();
  assert(f.reader.classes.has('is-ready'));assert(!f.reader.classes.has('is-opening'));assert(!f.reader.classes.has('is-preparing'));assert.equal(f.animations.length,0);assert.equal(f.timers.size,0);
 });
 test(`runtime ${state} during close finishes once, preserving focus, pending history and content`,()=>{
  const f=lifecycleFixture(),c=f.context,trigger={isConnected:true,focus(){trigger.calls=(trigger.calls||0)+1;}};
  c.open('synthetic',trigger);f.drainFrames();c.close();const captured=c.closeCompletion;assert(f.reader.classes.has('is-closing'));
  c.pendingView={next:true,focus:false};const data={news:[]};c.pendingContent=data;f.change(state);captured();f.tickTimers();f.drainFrames();
  assert.equal(f.reader.open,false);assert.equal(f.closes(),1);assert.equal(trigger.calls,1);assert.equal(c.lastTrigger,null);assert.equal(c.closeCompletion,null);
  assert.equal(c.pendingView,null);assert.deepEqual(f.views,[true]);assert.equal(c.pendingContent,null);assert.deepEqual(f.updates,[data]);assert.equal(f.timers.size,0);assert(f.animations.every(a=>a.cancelled));
 });
}
test('normal visible selection, open and close keep their full lifecycles and do not settle early',()=>{
 const f=lifecycleFixture(),c=f.context;c.rotate(1);const count=f.animations.length;f.change('reduce',false);assert(c.busy);assert(f.animations.every(a=>!a.cancelled));assert.equal(f.timers.size,1);f.tickTimers();f.drainFrames();assert(!c.busy);
 c.open('synthetic',{});f.drainFrames();assert(f.reader.classes.has('is-opening'));f.change('hidden',false);assert(f.reader.classes.has('is-opening'));f.tickTimers();assert(f.reader.classes.has('is-ready'));
 c.close();assert(f.reader.open);assert(f.reader.classes.has('is-closing'));assert.equal([...f.timers.values()][0].ms,BOOK_MOTION.close);f.change('reduce',false);assert(f.reader.open);f.tickTimers();assert(!f.reader.open);assert.equal(f.closes(),1);assert(f.animations.length>count);
});
test('normal close during preparation invalidates the old open RAF even if it runs after a new open',()=>{
 const f=lifecycleFixture(),c=f.context;c.open('synthetic',{});c.close();f.tickTimers();c.open('synthetic',{});f.drainFrames();
 assert.equal(f.animations.length,2,'one close and only the new open cover animation');assert(f.reader.classes.has('is-opening'));assert(!f.reader.classes.has('is-preparing'));
});
test('a visible reader starts when WebKit does not deliver RAF and late frames cannot replay it',()=>{
 const f=lifecycleFixture(),c=f.context;c.open('synthetic',{});
 assert(f.reader.classes.has('is-preparing'));assert.equal(f.animations.length,0);
 f.tickTimers();assert(f.reader.classes.has('is-ready'));assert.equal(f.animations.length,1);
 f.drainFrames();assert(f.reader.classes.has('is-ready'));assert.equal(f.animations.length,1);assert.equal(f.timers.size,0);
});
test('closing before the preparation deadline cancels its fallback and restores focus once',()=>{
 const f=lifecycleFixture(),c=f.context,trigger={isConnected:true,focus(){trigger.calls=(trigger.calls||0)+1;}};
 c.open('synthetic',trigger);c.close();f.tickTimers();f.drainFrames();
 assert(!f.reader.open);assert.equal(f.closes(),1);assert.equal(trigger.calls,1);assert.equal(f.animations.length,1);assert.equal(f.timers.size,0);
});
