import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const js=readFileSync(new URL('../ja/lp/parallel.js',import.meta.url),'utf8');
const extract=(start,end)=>js.slice(js.indexOf(start),js.indexOf(end,js.indexOf(start)));

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
 const qa=(selector,node)=>all(node).filter(child=>selector==='.photo'?child.classes.has('photo'):selector==='.is-in-flight'?child.classes.has('is-in-flight'):selector.includes('.collage-mark')?child.classes.has('collage-mark'):false);
 const archive=new Node(),stories=new Node();archive.hidden=false;
 const context={Element:Node,document:{body:new Node(),hidden:false,createElement:()=>new Node(),createDocumentFragment:()=>Object.assign(new Node(),{fragment:true}),addEventListener:(name,fn)=>events['document:'+name]=fn},window:{scrollX:0,scrollY:0},innerWidth:1200,innerHeight:800,
  q:(selector,node)=>qa(selector,node)[0]||null,qa,clamp:(n,a,b)=>Math.min(b,Math.max(a,n)),archive,stories,gather:null,
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
  const card=new Node();visual.card=card;card.append(visual);
  return {i,r:{x,y,width,height,angle},visual,element:visual,paint:{backgroundColor:'transparent',boxShadow:'none'},image:{left:'0%',top:'0%',width:'100%',height:'100%',filter:'none',boxShadow:'none'},palette:{},labels:['.4']};
 }
 const from=[record(0,60,80,220,170),record(1,770,350,130,210)],to=[record(0,300,250),record(0,470,220,90,70,3),record(1,850,90,110,75,-4)];
 const prints=()=>animations.filter(animation=>animation.node.className==='gather-print');
 const flush=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve();};
 return {context,animations,timers,events,frames,record,from,to,prints,flush,gestures:()=>gestures};
}

const transformParts=transform=>[...transform.matchAll(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi)].map(match=>Number(match[0])).slice(1);

test('desktop forward papers use the estimated flight profile then a short measured correction',async()=>{
 const f=fixture();f.context.startGather(f.from,f.to,true);const prints=f.prints();
 assert.equal(prints.length,3);assert.equal(new Set(prints.map(animation=>animation.options.duration)).size,3);assert.equal(new Set(prints.map(animation=>animation.options.delay)).size,3);
 for(const animation of prints){
  assert.equal(animation.keyframes.length,3);assert(animation.options.duration>=1520&&animation.options.duration<=1700);assert(animation.options.delay>=0&&animation.options.delay<=120);
  assert(animation.keyframes.every(frame=>!('opacity' in frame)),'paper remains opaque');
  assert.equal(animation.options.easing,'linear','each segment owns its curve');
  assert(animation.keyframes.every(frame=>!/(?:skew|perspective|rotate[XYZ])\(/.test(frame.transform)),'the measured path has no extra wobble');
  const parts=animation.keyframes.map(frame=>transformParts(frame.transform));
  assert(parts.flat().every(Number.isFinite));assert.equal(parts.at(-1)[0],0);assert.equal(parts.at(-1)[1],0);assert.equal(parts.at(-1).at(-1),1);assert.equal(parts.at(-1).at(-2),1);
  const temporary=parts[1],last=parts.at(-1);
  assert.equal(Math.abs(temporary[0]),16);assert.equal(temporary[1],-14);assert.equal(temporary.at(-1),1.025);assert.equal(temporary.at(-2),1.025);
  assert.equal(temporary[3]-last[3],Math.sign(temporary[0])*2);
  assert(Math.abs((1-animation.keyframes[1].offset)*animation.options.duration-220)<1e-9);
  assert.equal(animation.keyframes[0].easing,'cubic-bezier(.76,0,.24,1)');assert.equal(animation.keyframes[1].easing,'cubic-bezier(.22,1,.36,1)');
  const inner=f.animations.find(candidate=>candidate.node===animation.node.firstElementChild.firstElementChild);
  assert(inner);assert.equal(inner.options,animation.options,'inner and outer image geometry share timing and easing');
  assert.deepEqual(inner.keyframes.map(frame=>[frame.offset,frame.easing]),animation.keyframes.map(frame=>[frame.offset,frame.easing]));
  assert.equal(inner.keyframes[1].transform,inner.keyframes[2].transform,'photo crop holds its destination through the correction');
 }
 assert(f.context.gather.layer.inert);assert(f.to.every(record=>record.element.classes.has('is-in-flight')));
 assert.equal(f.timers.size,1);f.context.endGather();await f.flush();
});

test('reverse papers use one straight interpolation without added endpoint rotation or correction',async()=>{
 const f=fixture();f.context.startGather(f.to,f.from,false);
 for(const animation of f.prints()){
  assert.equal(animation.keyframes.length,2);assert(animation.options.duration>=730&&animation.options.duration<=790);assert(animation.options.delay>=0&&animation.options.delay<=120);
  assert.equal(animation.keyframes[0].easing,'cubic-bezier(.76,0,.24,1)');assert(animation.keyframes.every(frame=>!('opacity' in frame)));
  const last=transformParts(animation.keyframes[1].transform);assert.equal(last[0],0);assert.equal(last[1],0);assert.equal(last[4],1);assert.equal(last[5],1);
  const top=parseFloat(animation.node.style.top),left=parseFloat(animation.node.style.left);
  if(top>=0&&top<f.context.innerHeight&&left>=0&&left<f.context.innerWidth)assert.equal(last[3],0);
  else assert(f.to.some(record=>record.i===animation.node.dataset.material&&record.r.angle===last[3]),'outgoing paper retains its captured angle');
 }
 f.context.endGather();await f.flush();
});

test('mobile forward papers converge directly without the desktop temporary position',async()=>{
 const f=fixture();f.context.innerWidth=400;f.context.startGather(f.from,f.to,true);
 assert(f.prints().every(animation=>animation.keyframes.length===2));
 for(const animation of f.prints()){
  assert(animation.options.duration>=520&&animation.options.duration<=570);assert(animation.options.delay>=0&&animation.options.delay<=100);
  assert.equal(animation.keyframes[0].easing,'cubic-bezier(.22,1,.36,1)');
  const last=transformParts(animation.keyframes[1].transform);assert.equal(last[0],0);assert.equal(last[1],0);assert.equal(last[4],1);assert.equal(last[5],1);
 }
 f.context.endGather();await f.flush();
});

test('mobile reverse papers use the separately fitted shorter profile and start spread',async()=>{
 const f=fixture();f.context.innerWidth=400;f.context.startGather(f.to,f.from,false);
 for(const animation of f.prints()){
  assert.equal(animation.keyframes.length,2);assert(animation.options.duration>=490&&animation.options.duration<=520);assert(animation.options.delay>=0&&animation.options.delay<=180);
  assert.equal(animation.keyframes[0].easing,'cubic-bezier(.65,0,.35,1)');
 }
 f.context.endGather();await f.flush();
});

test('one landed paper reveals its own target while other papers keep moving',async()=>{
 const f=fixture();f.context.startGather(f.from,f.to,true);const task=f.context.gather;
 f.prints()[0].finish();await f.flush();
 assert(!f.to[0].element.classes.has('is-in-flight'));assert(f.to[1].element.classes.has('is-in-flight'));assert.equal(f.prints()[0].node.dataset.landed,'');
 assert.equal(f.prints()[0].node.style.visibility,'hidden');assert.equal(f.context.gather,task);
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
