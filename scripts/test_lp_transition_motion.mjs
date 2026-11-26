import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const js=readFileSync(new URL('../ja/lp/parallel.js',import.meta.url),'utf8');
const extract=(start,end)=>js.slice(js.indexOf(start),js.indexOf(end,js.indexOf(start)));

test('photo actions honor a fresh reduced-motion preference before the retained query updates',()=>{
 // WebKit reported a fresh matches=true while the retained query still allowed
 // an opening flight. Exercise the production action guards with that state.
 for(const phase of [null,'opening','closing']){
  let queries=0,closed=0;
  const context={
   dialog:{open:true},inspectReturn:phase?{phase}:null,
   motionBlocked:()=>false,
   matchMedia:query=>{assert.equal(query,'(prefers-reduced-motion: reduce)');queries++;return {matches:true};},
   q(){throw Error('reduced-motion must stop before creating or measuring a flight');},
   finishInspectReturn(){closed++;},
  };
  const actions=runInNewContext(
   extract('const inspectMotionBlocked=','function startInspectFlight(')+
   extract('function startInspectFlight(','const settleInspectReturn=')+
   '\n({startInspectFlight,closeInspect})',context,
  );
  assert.equal(actions.startInspectFlight(true),false);
  actions.closeInspect();
  assert.equal(closed,1,'every open preview phase settles without a new animation');
  assert.equal(queries,2);
 }
});

// Run the production flight planner and completion handlers with controllable
// WAAPI promises. The DOM fixture represents paper pieces, never live CMS data.
function fixture(){
 const animations=[],timers=new Map(),events={},frames=new Map();let serial=0,gestures=0;
 class Node{
  constructor(classes=''){
   this.classes=new Set(classes.split(' ').filter(Boolean));this.children=[];this.dataset={};this.removed=false;this.card=null;
   this.style={setProperty(name,value){this[name]=value;}};
   this.classList={add:(...names)=>names.forEach(name=>this.classes.add(name)),remove:(...names)=>names.forEach(name=>this.classes.delete(name)),contains:name=>this.classes.has(name)};
  }
  append(...nodes){for(const node of nodes)this.children.push(...(node.fragment?node.children:[node]));}
  set className(value){this.classes=new Set(value.split(' ').filter(Boolean));}
  get className(){return [...this.classes].join(' ');}
  get firstElementChild(){return this.children[0];}
  setAttribute(){}
  remove(){this.removed=true;}
  closest(){return this.card;}
  cloneNode(){const node=new Node(this.className);Object.assign(node.style,this.style);node.children=this.children.map(child=>child.cloneNode(true));return node;}
  animate(keyframes,options){
   let resolve,reject;const finished=new Promise((yes,no)=>{resolve=yes;reject=no;});
   const animation={node:this,keyframes,options,finished,cancelled:false,finish:resolve,cancel(){this.cancelled=true;reject(new Error('cancelled'));}};
   animations.push(animation);return animation;
  }
 }
 const all=node=>node.children.flatMap(child=>[child,...all(child)]);
 const qa=(selector,node)=>all(node).filter(child=>selector==='.photo'?child.classes.has('photo'):selector==='.is-in-flight'?child.classes.has('is-in-flight'):selector==='.print-caption'?child.classes.has('print-caption'):selector.includes('.collage-mark')?child.classes.has('collage-mark'):false);
 const archive=new Node(),stories=new Node();archive.hidden=false;
 const context={Element:Node,document:{body:new Node(),hidden:false,createElement:()=>new Node(),createDocumentFragment:()=>Object.assign(new Node(),{fragment:true}),addEventListener:(name,fn)=>events['document:'+name]=fn},window:{scrollX:0,scrollY:0},innerWidth:1200,innerHeight:800,
  q:(selector,node)=>qa(selector,node)[0]||null,qa,clamp:(n,a,b)=>Math.min(b,Math.max(a,n)),archive,stories,gather:null,playback:null,inspectionPlayback:null,visibilityPaused:false,
  setTimeout:(fn,ms)=>{timers.set(++serial,{fn,ms});return serial;},clearTimeout:id=>timers.delete(id),
  requestAnimationFrame:fn=>{frames.set(++serial,fn);return serial;},cancelAnimationFrame:id=>frames.delete(id),
  clearGesture(){gestures++;},reduced:{matches:false,addEventListener:(name,fn)=>events['reduced:'+name]=fn},addEventListener:(name,fn)=>events[name]=fn,
  route(){},size(){},layoutFrame:0
 };
 runInNewContext([
  extract('function endGather(', 'function photoRecords('),
  extract('function startGather(', 'function route('),
  extract('function settleMotion(){', "addEventListener('hashchange',route);"),
  extract('function resize(){', "addEventListener('resize',resize);")
 ].join('\n'),context);
 function record(i,x,y,width=150,height=100,angle=0){
  const visual=new Node('collage-print'),photo=new Node('photo'),label=new Node('collage-mark');visual.append(photo,label);
  const card=new Node();visual.card=card;card.append(visual,new Node('print-caption'));
  return {i,r:{x,y,width,height,angle},visual,element:visual,paint:{backgroundColor:'transparent',boxShadow:'none'},image:{left:'0%',top:'0%',width:'100%',height:'100%',filter:'none',boxShadow:'none'},palette:{},labels:['.4']};
 }
 const from=[record(0,60,80,220,170),record(1,770,350,130,210)],to=[record(0,300,250),record(0,470,220,90,70,3),record(1,850,90,110,75,-4)];
 const prints=()=>animations.filter(animation=>animation.node.className==='gather-print');
 const flush=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve();};
 return {context,animations,timers,events,frames,record,from,to,prints,flush,gestures:()=>gestures};
}

const transformParts=transform=>[...transform.matchAll(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi)].map(match=>Number(match[0])).slice(1);

for(const width of [400,690,691,1440])for(const work of [true,false])test(`${width}px ${work?'forward':'reverse'} uses the same direct Archive-return profile`,async()=>{
 const f=fixture();f.context.innerWidth=width;f.context.startGather(work?f.from:f.to,work?f.to:f.from,work);
 const desktop=width>690,min=desktop?730:490,max=desktop?790:520,delay=desktop?120:180,easing=desktop?'cubic-bezier(.76,0,.24,1)':'cubic-bezier(.65,0,.35,1)';
 for(const animation of f.prints()){
  assert.equal(animation.keyframes.length,2,'each paper moves directly to its final position');
  assert(animation.options.duration>=min&&animation.options.duration<=max);assert(animation.options.delay>=0&&animation.options.delay<=delay);
  assert.equal(animation.options.easing,'linear');assert.equal(animation.keyframes[0].easing,easing);
  assert(animation.keyframes.every(frame=>!('opacity' in frame)&&!('offset' in frame)),'there is no wait, temporary pose or correction stage');
  const last=transformParts(animation.keyframes[1].transform);assert(last.every(Number.isFinite));
  assert.equal(last[0],0);assert.equal(last[1],0);assert.equal(last[4],1);assert.equal(last[5],1);
  const inner=f.animations.find(candidate=>candidate.node===animation.node.firstElementChild.firstElementChild);
  assert(inner);assert.equal(inner.options,animation.options);assert.equal(inner.keyframes[0].easing,easing);assert.equal(inner.keyframes.length,2);
 }
 assert(f.context.gather.layer.inert);f.context.endGather();await f.flush();
});

for(const width of [400,1440])test(`${width}px direction alone does not change any paper's duration, delay or easing`,async()=>{
 const forward=fixture(),reverse=fixture();forward.context.innerWidth=reverse.context.innerWidth=width;
 forward.context.startGather(forward.from,forward.to,true);reverse.context.startGather(reverse.from,reverse.to,false);
 const timing=f=>f.prints().map(animation=>[animation.options.duration,animation.options.delay,animation.keyframes[0].easing]);
 assert.deepEqual(timing(forward),timing(reverse));
 assert(new Set(timing(forward).map(value=>value[0])).size>1);assert(new Set(timing(forward).map(value=>value[1])).size>1);
 forward.context.endGather();reverse.context.endGather();await forward.flush();await reverse.flush();
});

test('the Stories flight retains the complete paint stack until one atomic handoff',async()=>{
 const f=fixture();f.context.startGather(f.from,f.to,true);const task=f.context.gather;
 f.prints()[0].finish();await f.flush();
 assert(f.to.every(record=>record.element.classes.has('is-in-flight')));assert.equal(f.prints()[0].node.dataset.arrived,'');
 assert.notEqual(f.prints()[0].node.style.visibility,'hidden');assert.equal(f.context.gather,task);
 f.animations.forEach(animation=>animation.finish());await f.flush();
 assert.equal(f.context.gather,null);assert(task.layer.removed);assert(f.to.every(record=>!record.element.classes.has('is-in-flight')));assert(f.to.every(record=>!record.element.card.classes.has('is-assembling')));assert.equal(f.timers.size,0);
});

test('stale flight completions and fallback timers cannot finish a reversed flight',async()=>{
 const f=fixture();f.context.startGather(f.from,f.to,true);const old=f.context.gather,oldAnimations=[...f.animations],oldTimer=[...f.timers.values()][0];
 f.context.endGather();f.context.startGather(f.to,f.from,false);const reversed=f.context.gather;
 oldAnimations.forEach(animation=>animation.finish());oldTimer.fn();await f.flush();
 assert.equal(f.context.gather,reversed);assert(old.layer.removed);assert(oldAnimations.every(animation=>animation.cancelled));assert.equal(f.timers.size,1);
 f.context.endGather(true);await f.flush();assert.equal(f.context.gather,null);assert.equal(f.timers.size,0);assert(!f.context.archive.classes.has('is-arriving'));
});

test('extra source papers leave the viewport without accumulating across rapid reversals',async()=>{
 const f=fixture();let max=0;
 for(let i=0;i<40;i++){
  const from=i%2?f.to:f.from,to=i%2?f.from:f.to;
  f.context.startGather(from,to,!(i%2));max=Math.max(max,f.context.gather.layer.children.length);
  f.context.endGather();
 }
 await f.flush();assert.equal(max,3);assert.equal(f.timers.size,0);assert(f.animations.every(animation=>animation.cancelled));
});

for(const event of ['reduced:change','document:visibilitychange','pagehide'])test(`${event} immediately cleans flights and leaves every target visible`,async()=>{
 const f=fixture();f.context.startGather(f.from,f.to,true);const task=f.context.gather;
 if(event==='reduced:change')f.events[event]({matches:true});else{f.context.document.hidden=true;f.events[event]();}
 await f.flush();assert.equal(f.context.gather,null);assert(task.layer.removed);assert(f.animations.every(animation=>animation.cancelled));assert(f.to.every(record=>!record.element.classes.has('is-in-flight')));assert.equal(f.timers.size,0);assert.equal(f.gestures(),1);
});

test('viewport resize settles the Stories destination before its hidden-Archive return',async()=>{
 const f=fixture();f.context.startGather(f.from,f.to,true);f.context.archive.hidden=true;f.context.innerWidth=390;f.context.resize();
 const frame=[...f.frames.values()][0];frame();await f.flush();assert.equal(f.context.gather,null);assert(f.to.every(record=>!record.element.classes.has('is-in-flight')));
});

test('a hidden-field ResizeObserver callback with unchanged viewport does not cancel a new flight',()=>{
 const f=fixture();f.context.startGather(f.from,f.to,true);const task=f.context.gather;f.context.archive.hidden=true;f.context.resize();[...f.frames.values()][0]();
 assert.equal(f.context.gather,task);f.context.endGather();
});

test('the Archive-bound handoff still reveals each paper separately',async()=>{
 const f=fixture();f.context.startGather(f.to,f.from,false);
 f.prints()[0].finish();await f.flush();
 assert.equal(f.prints()[0].node.style.visibility,'hidden');assert(!f.from[0].element.classes.has('is-in-flight'));assert(f.from[1].element.classes.has('is-in-flight'));
 f.context.endGather();
});
test('each Stories caption finishes with its matte rather than delaying cleanup',()=>{
 const f=fixture();f.context.startGather(f.from,f.to,true);
 f.to.forEach((entry,i)=>{const caption=f.animations.find(a=>a.node===entry.element.card.children[1]),paper=f.prints()[i];assert(caption);assert.equal(caption.options.duration+caption.options.delay,paper.options.duration+paper.options.delay);});
 f.context.endGather();
});
