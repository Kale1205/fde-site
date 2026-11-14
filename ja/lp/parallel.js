'use strict';
(() => {
const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>[...r.querySelectorAll(s)];
const field=q('#field'),plane=q('#plane'),archive=q('#archive'),stories=q('#works'),template=q('#material-data'),dialog=q('#inspect'),theme=q('.theme');
const items=qa('article',template.content), tileNodes=new Map(), points=new Map();
const [wordmarkName,wordmarkEdition]=q('#archive-title').textContent.trim().split(' ');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
// One stable, repeating 5 × 5 contact sheet. The center cell is reserved for the Archive wordmark.
const slots=[2,8,3,0,5,9,4,6,7,1,0,5,-1,3,8,6,1,9,4,2,7,8,0,5,9];
const frame=[[.79,1.57],[.68,.81],[.85,1.34],[.73,1.04],[.81,1.50],[.76,1.17],[.85,1.62],[.74,1.05],[.78,1.30],[.74,1.38]];
let currentView=null,gather=null,framePending=0,viewWidth=0,viewHeight=0,poolColumns=0,poolRows=0;
const zoomValue=q('#zoom-value'),zoomMinus=q('[data-do=minus]'),zoomPlus=q('[data-do=plus]');
let x=0,y=0,originX=0,originY=0,z=1,W=1,H=1,vx=0,vy=0,anim=0,last=0,gesture=null,clickBlock=0,lastInspect=null,openIndex=0;
const wrap=(n,d)=>((n%d)+d)%d,clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
function makeTile(col,row){
 const tile=document.createElement('div');tile.className='tile';tile.setAttribute('aria-hidden','true');
 slots.forEach((i,slot)=>{
  if(i<0){
   const mark=document.createElement('span');
   const name=document.createElement('span'),edition=document.createElement('em');
   name.textContent=wordmarkName;edition.textContent=wordmarkEdition;
   mark.className='archive-wordmark';mark.append(name,' ',edition);tile.append(mark);
   return;
  }
  const item=items[i],[w,ratio]=frame[i],b=document.createElement('button');
  const px=(slot%5+.5)*20,py=(Math.floor(slot/5)+.5)*20;
  b.className='material-print';b.type='button';b.tabIndex=-1;b.dataset.material=i;b.dataset.slot=slot;b.setAttribute('aria-label',item.dataset.title+'の素材');
  b.style.cssText='left:'+px+'%;top:'+py+'%;width:'+w*20+'%;--ratio:'+ratio+';--crop:'+(ratio<1?118:100)+'%';
  b.append(item.firstElementChild.cloneNode(true));tile.append(b);
 });
 tile.style.cssText='width:'+W+'px;height:'+H+'px;left:'+col*W+'px;top:'+row*H+'px';plane.append(tile);return tile;
}
function sizePool(){
 const cols=Math.ceil(viewWidth/(W*z))+1,rows=Math.ceil(viewHeight/(H*z))+1;
 if(poolColumns===cols&&poolRows===rows)return;
 poolColumns=cols;poolRows=rows;
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
  const key=c+':'+r;if(!tileNodes.has(key))tileNodes.set(key,makeTile(c,r));
 }
 for(const [key,tile] of tileNodes){
  const [col,row]=key.split(':').map(Number);
  if(col>=cols||row>=rows){tile.remove();tileNodes.delete(key);}
 }
}
function draw(){
 if(archive.hidden)return;
 // A wrapped coordinate changes only the layer transform; its padded tile
 // pool changes on actual zoom or layout, never on a drag/wheel frame.
 const sx=wrap(x+originX,W*z)-W*z,sy=wrap(y+originY,H*z)-H*z;
 plane.style.transform='translate3d('+sx+'px,'+sy+'px,0) scale('+z+')';
}
function requestDraw(){
 if(!framePending)framePending=requestAnimationFrame(()=>{framePending=0;draw();});
}
function updateZoom(){
 const value=Math.round(z*100)+'%';
 if(zoomValue.value!==value)zoomValue.value=value;
 zoomMinus.disabled=z<=.66;zoomPlus.disabled=z>=1.8;
 sizePool();
}
function size(){
 if(archive.hidden)return;
 viewWidth=field.clientWidth;viewHeight=field.clientHeight;
 const mobile=viewWidth<690,pitch=mobile?clamp(viewWidth*.43,142,220):clamp(viewWidth/5.12,210,300);
 const pitchY=mobile?pitch*1.13:pitch*.977,w=5*pitch,h=5*pitchY;
 originX=(viewWidth-w)/2;originY=viewHeight/2-2.5*pitchY;
 if(W!==w||H!==h){W=w;H=h;plane.replaceChildren();tileNodes.clear();poolColumns=poolRows=0;}
 sizePool();draw();
}
function stop(){if(anim)cancelAnimationFrame(anim);anim=0;vx=vy=0;}
function clearGesture(){
 const held=[...points.keys()];points.clear();gesture=null;clickBlock=0;
 for(const id of held)if(field.hasPointerCapture(id))field.releasePointerCapture(id);
 field.classList.remove('is-drag');stop();
 if(framePending){cancelAnimationFrame(framePending);framePending=0;}
}
function inertia(t){
 if(!last)last=t-16.67;
 const f=Math.min(2,(t-last)/16.67);last=t;x+=vx*f;y+=vy*f;vx*=Math.pow(.91,f);vy*=Math.pow(.91,f);draw();
 if(Math.hypot(vx,vy)>.23)anim=requestAnimationFrame(inertia);else{anim=0;vx=vy=0;}
}
function zoom(next,cx=viewWidth/2,cy=viewHeight/2){
 const n=clamp(next,.66,1.8);if(n===z)return;
 x=cx-(cx-x-originX)*(n/z)-originX;y=cy-(cy-y-originY)*(n/z)-originY;
 z=n;updateZoom();requestDraw();
}
function reset(){clearGesture();x=y=0;z=1;updateZoom();draw();}
const midpoint=(p)=>({x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2,d:Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y)});
field.addEventListener('pointerdown',e=>{
 if(e.button!==0)return;
 // Suppress only the click emitted by the completed drag, not a fresh press.
 if(!points.size)clickBlock=0;
 stop();points.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(points.size===1)gesture={x:e.clientX,y:e.clientY,t:performance.now(),moved:false};
 if(points.size===2){gesture={...midpoint([...points.values()]),moved:true,pinch:true};field.setPointerCapture(e.pointerId);}
});
field.addEventListener('pointermove',e=>{
 if(!points.has(e.pointerId)||!gesture)return;
 if(e.pointerType==='mouse'&&e.buttons===0){release(e);return;}
 points.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(points.size>1){const m=midpoint([...points.values()]);if(gesture.d>0)zoom(z*m.d/gesture.d,m.x,m.y);x+=m.x-gesture.x;y+=m.y-gesture.y;gesture={...m,moved:true,pinch:true};requestDraw();return;}
 const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
 if(!gesture.moved&&Math.hypot(dx,dy)<7)return;
 if(!field.hasPointerCapture(e.pointerId))field.setPointerCapture(e.pointerId);
 const t=performance.now(),dt=Math.max(10,t-gesture.t);vx=clamp(dx/dt*16,-70,70);vy=clamp(dy/dt*16,-70,70);x+=dx;y+=dy;gesture={x:e.clientX,y:e.clientY,t,moved:true};field.classList.add('is-drag');requestDraw();
});
function release(e){
 if(!points.has(e.pointerId))return;
 points.delete(e.pointerId);
 if(!gesture)return;
 if(gesture.moved){clickBlock=performance.now()+350;field.classList.remove('is-drag');}
 if(points.size){const p=[...points.values()][0];gesture={...p,t:performance.now(),moved:true};return;}
 if(gesture.moved&&!gesture.pinch&&performance.now()-gesture.t<100&&!reduced.matches&&e.type==='pointerup'){last=0;anim=requestAnimationFrame(inertia);}
 gesture=null;
}
['pointerup','pointercancel'].forEach(ev=>window.addEventListener(ev,release,{passive:true}));
field.addEventListener('lostpointercapture',release);
field.addEventListener('wheel',e=>{
 e.preventDefault();stop();
 if(e.ctrlKey||e.metaKey)zoom(z*Math.exp(-e.deltaY*.006),e.clientX,e.clientY);
 else{const mult=e.deltaMode===1?16:e.deltaMode===2?viewHeight:1;x-=e.deltaX*mult;y-=e.deltaY*mult;requestDraw();}
},{passive:false});
field.addEventListener('keydown',e=>{
 const delta={ArrowLeft:[80,0],ArrowRight:[-80,0],ArrowUp:[0,80],ArrowDown:[0,-80]}[e.key];
 if(delta){e.preventDefault();stop();x+=delta[0];y+=delta[1];draw();}
 else if(['+','=','-','Home'].includes(e.key)){e.preventDefault();stop();if(e.key==='Home')reset();else zoom(z*(e.key==='-'?1/1.17:1.17));}
});
q('.field-tools').addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;stop();if(b.dataset.do==='reset')reset();else zoom(z*(b.dataset.do==='plus'?1.17:1/1.17));
});
function showItem(i){
 openIndex=(i+items.length)%items.length;const a=items[openIndex];
 q('.inspect-image').replaceChildren(a.firstElementChild.cloneNode(true));
 q('.inspect-id').textContent='素材';q('#inspect-title').textContent=a.dataset.title;q('.inspect-link').href=a.dataset.url;
}
function inspect(i,trigger){
 stop();lastInspect=trigger;showItem(i);dialog.showModal();q('.close-inspect').focus();
}
archive.addEventListener('click',e=>{
 const b=e.target.closest('[data-material]');if(!b)return;
 if(b.classList.contains('material-print')&&performance.now()<clickBlock)return;
 inspect(Number(b.dataset.material),b);
});
q('.close-inspect').addEventListener('click',()=>dialog.close());
q('.inspect-prev').addEventListener('click',()=>showItem(openIndex-1));q('.inspect-next').addEventListener('click',()=>showItem(openIndex+1));
dialog.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();showItem(openIndex+(e.key==='ArrowLeft'?-1:1));}});
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
dialog.addEventListener('close',()=>{if(lastInspect?.isConnected&&!lastInspect.classList.contains('material-print'))lastInspect.focus();else field.focus({preventScroll:true});});
function endGather(){
 if(!gather)return;
 const task=gather;gather=null;
 clearTimeout(task.timer);
 task.animations.forEach(animation=>animation.cancel());
 task.layer.remove();
 task.destination.classList.remove('is-arriving');
}
function photoRecords(entries){
 const records=[],seen=new Set();
 for(const [i,photo,element,key] of entries){
  const r=(element||photo).getBoundingClientRect();
  if(r.width<8||r.height<8||r.right<8||r.left>innerWidth-8||r.bottom<45||r.top>innerHeight-22||seen.has(key))continue;
  seen.add(key);records.push({i,r,photo});
 }
 return records;
}
function currentPhotos(work){
 if(gather){
  const moving=photoRecords(qa('.gather-print',gather.layer).map((el,n)=>[Number(el.dataset.material),q('.photo',el),el,'motion-'+n]));
  if(moving.length)return moving;
 }
 return viewPhotos(work);
}
function viewPhotos(work){
 return work?photoRecords(qa('.story-collage',stories).flatMap((card,i)=>qa('.collage-print',card).map((p,j)=>[i,q('.photo',p),null,i+':'+j]))):
  photoRecords(qa('.material-print',plane).map((el,n)=>[Number(el.dataset.material),q('.photo',el),null,'slot-'+n]));
}
function startGather(from,to,work){
 if(!from.length||!to.length||!Element.prototype.animate)return;
 const destination=work?stories:archive;
 const layer=document.createElement('div');layer.className='gather-layer';layer.setAttribute('aria-hidden','true');
 document.body.append(layer);destination.classList.add('is-arriving');
 const task={layer,animations:[],timer:0,destination};gather=task;
 const plan=[],styleCache=new Map();
 const center=r=>[r.x+r.width/2,r.y+r.height/2];
 const dist=(a,b)=>{const [ax,ay]=center(a),[bx,by]=center(b);return Math.hypot(ax-bx,ay-by);};
 const near=(list,i,rect)=>list.filter(x=>x.i===i).sort((a,b)=>dist(a.r,rect)-dist(b.r,rect))[0];
 const offscreen=(r,i)=>{
  const [x,y]=center(r),left=x<innerWidth/2,top=y<innerHeight/2;
  if(i%3===0)return {x:left?-r.width:innerWidth,y:r.y,width:r.width,height:r.height};
  return {x:r.x,y:top?-r.height:innerHeight,width:r.width,height:r.height};
 };
 // Use one replica for each destination layer. Start from the closest matching
 // print for that project, splitting a print into supporting crops when needed.
 const used=new Set();
 const pairs=to.map(dest=>{
  const src=near(from,dest.i,dest.r);if(src)used.add(src);
  return {i:dest.i,src,dest};
 });
 for(const src of from)if(!used.has(src))pairs.push({i:src.i,src,dest:null});
 for(const [n,{i,src,dest}] of pairs.entries()){
  const photo=(src||dest).photo,base=src?.r??offscreen(dest.r,i),final=dest?.r??offscreen(src.r,i);
  const [ox,oy]=center(base),[fx,fy]=center(final);
  const scaleX=final.width/base.width,scaleY=final.height/base.height;
  const pose=t=>`translate(${(fx-ox)*t}px,${(fy-oy)*t}px) scale(${1+(scaleX-1)*t},${1+(scaleY-1)*t})`;
  const print=document.createElement('div');print.className='gather-print';print.dataset.material=i;
  Object.assign(print.style,{left:base.x+'px',top:base.y+'px',width:base.width+'px',height:base.height+'px'});
  const clone=original=>{
   const copy=original.cloneNode(true);
   let style=styleCache.get(original);
   if(!style){const c=getComputedStyle(original);style=Object.fromEntries(['--detail','--crop-x','--crop-y','--crop','filter'].map(prop=>[prop,c.getPropertyValue(prop)]));styleCache.set(original,style);}
   if(style.filter&&style.filter!=='none')copy.style.filter=style.filter;
   for(const prop of ['--detail','--crop-x','--crop-y','--crop']){
    const value=style[prop];if(value)copy.style.setProperty(prop,value);
   }
   return copy;
  };
  const first=clone(photo);print.append(first);
  if(src&&dest){
   const arrival=clone(dest.photo);arrival.classList.add('gather-crop');print.append(arrival);
   plan.push([arrival,[{opacity:0},{opacity:0,offset:.49},{opacity:1,offset:.84},{opacity:1}],{duration:870,delay:(n%6)*15,fill:'both'}]);
  }
  layer.append(print);
  plan.push([print,[
   {transform:pose(0),opacity:src?1:0},
   {transform:pose(.54),opacity:1,offset:.34},
   {transform:pose(1),opacity:dest?1:0,offset:.88},
   {transform:pose(1),opacity:0},
  ],{duration:870,delay:(n%6)*15,easing:'cubic-bezier(.22,.70,.28,1)',fill:'both'}]);
 }
 for(const [el,frames,options] of plan)task.animations.push(el.animate(frames,options));
 task.timer=setTimeout(()=>{if(gather===task)endGather();},970);
}
function route(){
 const work=location.hash==='#works';
 if(currentView===work)return;
 const motion=currentView!==null&&!reduced.matches&&document.documentElement.dataset.pageLoadingMotion!=='still';
 const from=motion?currentPhotos(currentView):[];
 endGather();clearGesture();
 currentView=work;archive.hidden=work;stories.hidden=!work;
 qa('.view-switch a').forEach(a=>{if(a.hash===(work?'#works':'#archive'))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 window.scrollTo(0,0);
 if(work)stop();else size();
 if(motion)startGather(from,viewPhotos(work),work);
}
qa('.view-switch a').forEach(link=>link.addEventListener('click',e=>{
 if(e.button||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey)return;
 e.preventDefault();
 if(location.hash!==link.hash){history.pushState(null,'',link.hash);route();}
}));
reduced.addEventListener('change',e=>{if(e.matches){stop();endGather();}});
addEventListener('pagehide',()=>{clearGesture();endGather();});
addEventListener('blur',clearGesture);
function setTheme(dark){document.body.dataset.theme=dark?'dark':'light';theme.setAttribute('aria-pressed',String(dark));theme.setAttribute('aria-label',dark?'ライト表示':'ダーク表示');}
try{setTheme(sessionStorage.getItem('bk-archive-theme')==='dark');}catch{setTheme(false);}
theme.addEventListener('click',()=>{const dark=document.body.dataset.theme!=='dark';setTheme(dark);try{sessionStorage.setItem('bk-archive-theme',dark?'dark':'light');}catch{}});
addEventListener('hashchange',route);addEventListener('popstate',route);let windowWidth=innerWidth,windowHeight=innerHeight;
addEventListener('resize',()=>{
 const changed=innerWidth!==windowWidth||innerHeight!==windowHeight;
 windowWidth=innerWidth;windowHeight=innerHeight;
 if(changed){clearGesture();endGather();}
 if(!gather||changed)size();
});route();
})();
