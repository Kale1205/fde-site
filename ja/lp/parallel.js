'use strict';
(async () => {
const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>[...r.querySelectorAll(s)];
const field=q('#field'),plane=q('#plane'),archive=q('#archive'),stories=q('#works'),template=q('#material-data'),dialog=q('#inspect');
const media=await import('./media-runtime.js').catch(()=>null);
const manifest=await media?.loadMedia();
media?.galleryMedia(manifest,template,stories,archive);
const items=qa('article',template.content), tileNodes=new Map(), points=new Map();
const [wordmarkName,wordmarkEdition]=q('#archive-title').textContent.trim().split(' ');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const MIN_ZOOM=.6,MAX_ZOOM=1;
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
  b.style.cssText='left:'+px+'%;top:'+py+'%;width:'+w*20+'%;--ratio:'+ratio+';--detail:'+(ratio<1?118:100)+'%';
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
 zoomMinus.disabled=z<=MIN_ZOOM;zoomPlus.disabled=z>=MAX_ZOOM;
 sizePool();
}
function size(center=false){
 if(archive.hidden)return;
 const widthChanged=viewWidth!==field.clientWidth;
 viewWidth=field.clientWidth;viewHeight=field.clientHeight;
 const mobile=viewWidth<690,pitch=mobile?clamp(viewWidth*.43,142,220):clamp(viewWidth/5.12,210,300);
 const pitchY=mobile?pitch*1.13:pitch*.977,w=5*pitch,h=5*pitchY;
 // Safari's toolbar changes the height during a gesture. Keep the plane's
 // origin and the active pointer intact until the width changes or reset.
 if(widthChanged||center){originX=(viewWidth-w)/2;originY=viewHeight/2-2.5*pitchY;}
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
 const n=clamp(next,MIN_ZOOM,MAX_ZOOM);if(n===z)return;
 x=cx-(cx-x-originX)*(n/z)-originX;y=cy-(cy-y-originY)*(n/z)-originY;
 z=n;updateZoom();requestDraw();
}
function reset(){clearGesture();x=y=0;z=1;size(true);updateZoom();draw();}
const midpoint=(p)=>({x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2,d:Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y)});
field.addEventListener('pointerdown',e=>{
 if(e.button!==0)return;
 endGather(true);
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
 const t=performance.now(),dt=Math.max(1,t-gesture.t),blend=1-Math.exp(-dt/32);
 vx+=(clamp(dx/dt*16.67,-70,70)-vx)*blend;vy+=(clamp(dy/dt*16.67,-70,70)-vy)*blend;
 x+=dx;y+=dy;gesture={x:e.clientX,y:e.clientY,t,moved:true};field.classList.add('is-drag');requestDraw();
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
 e.preventDefault();endGather(true);stop();
 if(e.ctrlKey||e.metaKey)zoom(z*Math.exp(-e.deltaY*.006),e.clientX,e.clientY);
 else{const mult=e.deltaMode===1?16:e.deltaMode===2?viewHeight:1;x-=e.deltaX*mult;y-=e.deltaY*mult;requestDraw();}
},{passive:false});
field.addEventListener('keydown',e=>{
 const delta={ArrowLeft:[80,0],ArrowRight:[-80,0],ArrowUp:[0,80],ArrowDown:[0,-80]}[e.key];
 if(delta){e.preventDefault();endGather(true);stop();x+=delta[0];y+=delta[1];draw();}
 else if(['+','=','-','Home'].includes(e.key)){e.preventDefault();endGather(true);stop();if(e.key==='Home')reset();else zoom(z*(e.key==='-'?1/1.17:1.17));}
});
q('.field-tools').addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;endGather(true);stop();if(b.dataset.do==='reset')reset();else zoom(z*(b.dataset.do==='plus'?1.17:1/1.17));
});
function showItem(i){
 openIndex=(i+items.length)%items.length;const a=items[openIndex];
 const box=q('.inspect-image');
 const still=a.firstElementChild.cloneNode(true);
 if(a.dataset.alt){still.removeAttribute('aria-hidden');still.setAttribute('role','img');still.setAttribute('aria-label',a.dataset.alt);}
 if(a.dataset.video&&media){box.replaceChildren(media.mediaVideo(a.dataset.video,a.dataset.poster,a.dataset.alt));}else box.replaceChildren(still);
 q('#inspect-title').textContent=a.dataset.title;q('.inspect-link').href=a.dataset.url;
}
function inspect(i,trigger){
 endGather(true);stop();lastInspect=trigger;showItem(i);dialog.showModal();q('.close-inspect').focus();
}
archive.addEventListener('click',e=>{
 const b=e.target.closest('[data-material]');if(!b)return;
 if(b.classList.contains('material-print')&&performance.now()<clickBlock)return;
 inspect(Number(b.dataset.material),b);
});
q('.close-inspect').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
dialog.addEventListener('close',()=>{
 q('.inspect-image video')?.pause();
 if(lastInspect?.isConnected&&!lastInspect.closest('[hidden]')&&!lastInspect.classList.contains('material-print'))lastInspect.focus({preventScroll:true});
 else if(!archive.hidden)field.focus({preventScroll:true});
 else q('.view-switch a[href="#works"]').focus({preventScroll:true});
});
function endGather(settled=false){
 if(!gather)return;
 const task=gather;gather=null;
 clearTimeout(task.timer);
 task.animations.forEach(animation=>animation.cancel());
 task.targets.forEach(element=>element.classList.remove('is-in-flight'));
 task.cards.forEach(card=>card.classList.remove('is-assembling'));
 task.layer.remove();
 task.destination.classList.remove('is-arriving');
 if(settled)task.destination.classList.add('is-settled');
}
function photoRecords(entries,includeOffscreen=false){
 const records=[],seen=new Set();
 for(const [i,element,key] of entries){
  const bounds=element.getBoundingClientRect();
  if(bounds.width<8||bounds.height<8||seen.has(key))continue;
  if(!includeOffscreen&&(bounds.right<8||bounds.left>innerWidth-8||bounds.bottom<45||bounds.top>innerHeight-22))continue;
  const visual=element.classList.contains('gather-print')?element.firstElementChild:element;
  const photo=q('.photo',visual),style=getComputedStyle(visual),imageStyle=getComputedStyle(photo);
  const transform=getComputedStyle(element).transform,matrix=new DOMMatrixReadOnly(transform==='none'?undefined:transform);
  const parentScale=element.closest('#plane')?z:1;
  const width=element.offsetWidth*Math.hypot(matrix.a,matrix.b)*parentScale,height=element.offsetHeight*Math.hypot(matrix.c,matrix.d)*parentScale;
  const r={x:bounds.x+bounds.width/2-width/2,y:bounds.y+bounds.height/2-height/2,width,height,angle:Math.atan2(matrix.b,matrix.a)*180/Math.PI};
  const palette=Object.fromEntries(['--collage-paper','--collage-ink','--collage-accent'].map(prop=>[prop,style.getPropertyValue(prop)]));
  const paint={backgroundColor:style.backgroundColor,boxShadow:style.boxShadow};
  const imageMatrix=new DOMMatrixReadOnly(imageStyle.transform==='none'?undefined:imageStyle.transform);
  const image={left:(photo.offsetLeft+imageMatrix.e)/visual.offsetWidth*100+'%',top:(photo.offsetTop+imageMatrix.f)/visual.offsetHeight*100+'%',width:photo.offsetWidth*Math.abs(imageMatrix.a)/visual.offsetWidth*100+'%',height:photo.offsetHeight*Math.abs(imageMatrix.d)/visual.offsetHeight*100+'%',filter:imageStyle.filter,boxShadow:imageStyle.boxShadow};
  const labels=qa('.collage-mark,.collage-cover,.collage-palette',visual).map(label=>getComputedStyle(label).opacity);
  seen.add(key);records.push({i,r,visual,paint,image,palette,labels,element});
 }
 return records;
}
function currentPhotos(work){
 if(gather){
  // Include prints outside the viewport while they travel. A reversal can
  // bring them back, and landed originals must take over from hidden clones.
  const moving=photoRecords(qa('.gather-print:not([data-landed])',gather.layer).map((el,n)=>[Number(el.dataset.material),el,'motion-'+n]),true);
  return moving.concat(viewPhotos(work).filter(record=>!record.element.classList.contains('is-in-flight')));
 }
 return viewPhotos(work);
}
function viewPhotos(work){
 return work?photoRecords(qa('.story-collage',stories).flatMap(card=>{const i=media?.originalStoryIndex(card)??Number(card.closest('li').className.match(/print-(\d+)/)?.[1]);return qa('.collage-print',card).map((p,j)=>[i,p,i+':'+j]);})):
  photoRecords(qa('.material-print',plane).map((el,n)=>[Number(el.dataset.material),el,'slot-'+n]));
}
function startGather(from,to,work){
 if(!from.length||!to.length||!Element.prototype.animate)return;
 const destination=work?stories:archive;
 const layer=document.createElement('div');layer.className='gather-layer';layer.setAttribute('aria-hidden','true');layer.inert=true;
 document.body.append(layer);destination.classList.remove('is-settled');destination.classList.add('is-arriving');
 const task={layer,animations:[],targets:new Set(),cards:new Set(),timer:0,destination,width:innerWidth,height:innerHeight,scrollX:window.scrollX,scrollY:window.scrollY};gather=task;
 const plans=[],fragment=document.createDocumentFragment();let finishAfter=0;
 const center=r=>[r.x+r.width/2,r.y+r.height/2];
 const dist=(a,b)=>{const [ax,ay]=center(a),[bx,by]=center(b);return Math.hypot(ax-bx,ay-by);};
 const offscreen=(r,i)=>{
  const [cx,cy]=center(r);
  return {...r,...(i%2?{x:cx<innerWidth/2?-r.width*1.6:innerWidth+r.width*.6}:{y:cy<innerHeight/2?-r.height*1.6:innerHeight+r.height*.6})};
 };
 // Per-paper profiles fitted from rendered reference measurements. Desktop
 // forward flight is an estimate within the observed 1.5–1.85 s whole motion;
 // its short correction and the other profiles follow the measured phases.
 const profiles={
  desktopStories:{min:1300,range:180,delay:120,settle:220,flightEase:'cubic-bezier(.76,0,.24,1)',settleEase:'cubic-bezier(.22,1,.36,1)'},
  desktopArchive:{min:730,range:60,delay:120,settle:0,flightEase:'cubic-bezier(.76,0,.24,1)'},
  mobileStories:{min:520,range:50,delay:100,settle:0,flightEase:'cubic-bezier(.22,1,.36,1)'},
  mobileArchive:{min:490,range:30,delay:180,settle:0,flightEase:'cubic-bezier(.65,0,.35,1)'},
 };
 const profile=profiles[(innerWidth>690?'desktop':'mobile')+(work?'Stories':'Archive')];
 // Each piece interpolates its position, scale and angle with one progress.
 // Keep the path straight so interrupted flights can retain their exact pose.
 const noise=(seed,salt)=>{const n=Math.sin(seed*127.1+salt*311.7)*43758.5453;return n-Math.floor(n);};
 const used=new Set();
 const pairs=to.map(dest=>{
  const matches=from.filter(src=>src.i===dest.i).sort((a,b)=>dist(a.r,dest.r)-dist(b.r,dest.r));
  const src=matches.find(src=>!used.has(src))||matches[0];if(src)used.add(src);
  return {i:dest.i,src,dest};
 });
 for(const src of from)if(!used.has(src))pairs.push({i:src.i,src,dest:null});
 for(const [n,{i,src,dest}] of pairs.entries()){
  const base=src?.r??offscreen(dest.r,i),final=dest?.r??offscreen(src.r,i);
  const [ox,oy]=center(base),[fx,fy]=center(final),record=work?(dest||src):(src||dest);
  const seed=(i+1)*73+n*17,duration=profile.min+Math.round(noise(seed,1)*profile.range),delay=Math.round(noise(seed,2)*profile.delay);
  const settle=profile.settle,options={duration:duration+settle,delay,easing:'linear',fill:'both'};
  finishAfter=Math.max(finishAfter,options.duration+delay);
  // Apply the measured correction to this collage's alternating paper order.
  const sign=n%2?1:-1;
  const spatialFrames=(first,last,temporary=last)=>settle?[
   {...first,offset:0,easing:profile.flightEase},
   {...temporary,offset:duration/options.duration,easing:profile.settleEase},
   {...last,offset:1},
  ]:[{...first,easing:profile.flightEase},last];
  if(dest){
   dest.element.classList.add('is-in-flight');task.targets.add(dest.element);
   const card=dest.element.closest('.prints li');
   if(card){card.classList.add('is-assembling');task.cards.add(card);}
  }
  const print=document.createElement('div');print.className='gather-print';print.dataset.material=i;
  Object.assign(print.style,{left:final.x+'px',top:final.y+'px',width:final.width+'px',height:final.height+'px'});
  const copy=record.visual.cloneNode(true);
  copy.classList.remove('is-in-flight');
  Object.assign(copy.style,{position:'relative',left:'0',top:'0',width:'100%',height:'100%',margin:'0',transform:'none',transition:'none'});
  const photo=q('.photo',copy),firstImage=src?.image??record.image,lastImage=dest?.image??record.image;
  Object.assign(photo.style,{...lastImage,position:'absolute',margin:'0',aspectRatio:'auto',gridColumn:'auto',gridRow:'auto',transformOrigin:'0 0'});
  for(const [prop,value] of Object.entries(record.palette))copy.style.setProperty(prop,value);
  print.append(copy);fragment.append(print);
  plans.push([print,spatialFrames(
   {transform:`translate3d(${ox-fx}px,${oy-fy}px,0) rotate(${base.angle}deg) scale(${base.width/final.width},${base.height/final.height})`},
   {transform:`translate3d(0,0,0) rotate(${final.angle}deg) scale(1,1)`},
   {transform:`translate3d(${sign*16}px,-14px,0) rotate(${final.angle+sign*2}deg) scale(1.025,1.025)`},
  ),options,()=>{
   if(gather!==task)return;
   print.dataset.landed='';print.style.visibility='hidden';
   if(dest){
    dest.element.classList.remove('is-in-flight');task.targets.delete(dest.element);
    const card=dest.element.closest('.prints li');
    if(card&&!q('.is-in-flight',card))card.classList.remove('is-assembling');
   }
  }]);
  plans.push([copy,spatialFrames(src?.paint??record.paint,dest?.paint??record.paint),options]);
  // Inner photographs use a transform too: no per-frame width/height layout.
  const imageX=(parseFloat(firstImage.left)-parseFloat(lastImage.left))*final.width/100,imageY=(parseFloat(firstImage.top)-parseFloat(lastImage.top))*final.height/100;
  plans.push([photo,spatialFrames(
   {transform:`translate3d(${imageX}px,${imageY}px,0) scale(${parseFloat(firstImage.width)/parseFloat(lastImage.width)},${parseFloat(firstImage.height)/parseFloat(lastImage.height)})`,filter:firstImage.filter,boxShadow:firstImage.boxShadow},
   {transform:'translate3d(0,0,0) scale(1,1)',filter:lastImage.filter,boxShadow:lastImage.boxShadow},
  ),options]);
  for(const [j,label] of qa('.collage-mark,.collage-cover,.collage-palette',copy).entries()){
   const opacity=src?.labels[j]??(work?'0':'1');
   plans.push([label,work?[{opacity},{opacity,offset:.58},{opacity:1}]:[{opacity},{opacity:0,offset:.45},{opacity:0}],options]);
  }
 }
 layer.append(fragment);
 for(const [element,frames,options,land] of plans){
  const animation=element.animate(frames,options);task.animations.push(animation);
  if(land)animation.finished.then(land,()=>{});
 }
 Promise.all(task.animations.map(animation=>animation.finished.catch(()=>{}))).then(()=>{if(gather===task)endGather(true);});
 task.timer=setTimeout(()=>{if(gather===task)endGather(true);},finishAfter+180);
}
function route(){
 const work=location.hash==='#works';
 if(currentView===work)return;
 const previous=currentView?stories:archive,moveFocus=previous.contains(document.activeElement)||dialog.open;
 const motion=currentView!==null&&!reduced.matches&&!document.hidden&&document.documentElement.dataset.pageLoadingMotion!=='still';
 const from=motion?currentPhotos(currentView):[];
 endGather();clearGesture();
 currentView=work;archive.hidden=work;stories.hidden=!work;
 if(dialog.open)dialog.close();
 qa('.view-switch a').forEach(a=>{if(a.hash===(work?'#works':'#archive'))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 window.scrollTo(0,0);
 if(work)stop();else size();
 if(motion)startGather(from,viewPhotos(work),work);
 if(moveFocus)q('.view-switch a[aria-current]').focus({preventScroll:true});
}
qa('.view-switch a').forEach(link=>link.addEventListener('click',e=>{
 if(e.button||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey)return;
 e.preventDefault();
 if(location.hash!==link.hash){history.pushState(null,'',link.hash);route();}
}));
function settleMotion(){clearGesture();endGather(true);}
reduced.addEventListener('change',e=>{if(e.matches)settleMotion();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)settleMotion();});
addEventListener('pagehide',()=>{settleMotion();if(layoutFrame){cancelAnimationFrame(layoutFrame);layoutFrame=0;}});
addEventListener('pageshow',()=>{endGather(true);route();if(!archive.hidden)size();});
addEventListener('blur',clearGesture);
addEventListener('scroll',()=>{if(gather&&(gather.scrollX!==window.scrollX||gather.scrollY!==window.scrollY))endGather(true);},{passive:true});
addEventListener('hashchange',route);addEventListener('popstate',route);
let layoutFrame=0;
function resize(){
 if(layoutFrame)return;
 layoutFrame=requestAnimationFrame(()=>{
  layoutFrame=0;
  if(gather&&(gather.width!==innerWidth||gather.height!==innerHeight))endGather(true);
  if(archive.hidden)return;
  const widthChanged=field.clientWidth!==viewWidth;
  if(widthChanged){clearGesture();endGather();}
  size();
 });
}
addEventListener('resize',resize);
new ResizeObserver(resize).observe(field);
route();updateZoom();
})();
