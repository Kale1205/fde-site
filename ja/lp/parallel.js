'use strict';
(() => {
const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>[...r.querySelectorAll(s)];
const field=q('#field'),plane=q('#plane'),archive=q('#archive'),stories=q('#works'),template=q('#material-data'),dialog=q('#inspect'),theme=q('.theme');
const items=qa('article',template.content), tileNodes=new Map(), points=new Map();
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const coords=[[.04,.11,.21,1.57],[.32,.21,.14,.94],[.57,.09,.22,1.6],[.88,.19,.15,1.1],[.13,.51,.18,1.5],[.42,.44,.17,1.25],[.69,.49,.20,1.63],[.92,.63,.14,1.1],[.31,.73,.17,1.43],[.56,.78,.21,1.6]];
let x=0,y=0,z=1,W=1,H=1,vx=0,vy=0,anim=0,last=0,gesture=null,clickBlock=0,lastInspect=null,openIndex=0;
const wrap=(n,d)=>((n%d)+d)%d,clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
function makeTile(col,row){
 const tile=document.createElement('div');tile.className='tile';tile.setAttribute('aria-hidden','true');
 items.forEach((item,i)=>{
  const [px,py,w,ratio]=coords[i],b=document.createElement('button');
  b.className='material-print';b.type='button';b.tabIndex=-1;b.dataset.material=i;b.setAttribute('aria-label',item.dataset.title+'の素材');
  b.style.cssText='left:'+px*100+'%;top:'+py*100+'%;width:'+w*100+'%;--ratio:'+ratio+';--crop:'+(ratio<1?118:100)+'%';
  b.append(item.firstElementChild.cloneNode(true));tile.append(b);
 });
 tile.style.cssText='width:'+W+'px;height:'+H+'px;left:'+col*W+'px;top:'+row*H+'px';plane.append(tile);return tile;
}
function draw(){
 if(archive.hidden)return;
 // Keep offsets normalized; equivalence of repeated tiles means wrapping is visually continuous.
 const sx=wrap(x,W*z)-W*z,sy=wrap(y,H*z)-H*z;
 plane.style.transform='translate3d('+sx+'px,'+sy+'px,0) scale('+z+')';
 const cols=Math.ceil((field.clientWidth-sx)/(W*z)),rows=Math.ceil((field.clientHeight-sy)/(H*z));
 const live=new Set();
 for(let r=-1;r<rows;r++)for(let c=-1;c<cols;c++){const k=c+':'+r;live.add(k);if(!tileNodes.has(k))tileNodes.set(k,makeTile(c,r));}
 for(const [k,t] of tileNodes)if(!live.has(k)){t.remove();tileNodes.delete(k);}
 q('#zoom-value').value=Math.round(z*100)+'%';
 q('[data-do=minus]').disabled=z<=.66;
 q('[data-do=plus]').disabled=z>=1.8;
}
function size(){
 if(archive.hidden)return;
 const mobile=field.clientWidth<650, w=Math.max(mobile?690:1040,field.clientWidth),h=Math.max(mobile?750:660,field.clientHeight);
 if(W!==w||H!==h){W=w;H=h;plane.replaceChildren();tileNodes.clear();}
 draw();
}
function stop(){if(anim)cancelAnimationFrame(anim);anim=0;vx=vy=0;}
function inertia(t){
 if(!last)last=t-16.67;
 const f=Math.min(2,(t-last)/16.67);last=t;x+=vx*f;y+=vy*f;vx*=Math.pow(.91,f);vy*=Math.pow(.91,f);draw();
 if(Math.hypot(vx,vy)>.23)anim=requestAnimationFrame(inertia);else{anim=0;vx=vy=0;}
}
function zoom(next,cx=field.clientWidth/2,cy=field.clientHeight/2){
 const n=clamp(next,.66,1.8);x=cx-(cx-x)*(n/z);y=cy-(cy-y)*(n/z);z=n;draw();
}
function reset(){stop();x=y=0;z=1;draw();}
const midpoint=(p)=>({x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2,d:Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y)});
field.addEventListener('pointerdown',e=>{
 if(e.button!==0)return;
 stop();points.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(points.size===1)gesture={x:e.clientX,y:e.clientY,t:performance.now(),moved:false};
 if(points.size===2){gesture={...midpoint([...points.values()]),moved:true,pinch:true};field.setPointerCapture(e.pointerId);}
});
field.addEventListener('pointermove',e=>{
 if(!points.has(e.pointerId)||!gesture)return;
 points.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(points.size>1){const m=midpoint([...points.values()]);if(gesture.d>0)zoom(z*m.d/gesture.d,m.x,m.y);x+=m.x-gesture.x;y+=m.y-gesture.y;gesture={...m,moved:true,pinch:true};draw();return;}
 const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
 if(!gesture.moved&&Math.hypot(dx,dy)<7)return;
 if(!field.hasPointerCapture(e.pointerId))field.setPointerCapture(e.pointerId);
 const t=performance.now(),dt=Math.max(10,t-gesture.t);vx=clamp(dx/dt*16,-70,70);vy=clamp(dy/dt*16,-70,70);x+=dx;y+=dy;gesture={x:e.clientX,y:e.clientY,t,moved:true};field.classList.add('is-drag');draw();
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
['pointerup','pointercancel','lostpointercapture'].forEach(ev=>field.addEventListener(ev,release));
field.addEventListener('wheel',e=>{
 e.preventDefault();stop();
 if(e.ctrlKey||e.metaKey)zoom(z*Math.exp(-e.deltaY*.006),e.clientX,e.clientY);
 else{const mult=e.deltaMode===1?16:e.deltaMode===2?field.clientHeight:1;x-=e.deltaX*mult;y-=e.deltaY*mult;draw();}
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
function route(){
 const work=location.hash==='#works';archive.hidden=work;stories.hidden=!work;
 qa('.view-switch a').forEach(a=>{if(a.hash===(work?'#works':'#archive'))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 if(work){stop();stories.classList.remove('is-entering');requestAnimationFrame(()=>stories.classList.add('is-entering'));}else{size();}
 window.scrollTo(0,0);
}
function setTheme(dark){document.body.dataset.theme=dark?'dark':'light';theme.setAttribute('aria-pressed',String(dark));theme.setAttribute('aria-label',dark?'ライト表示':'ダーク表示');}
try{setTheme(sessionStorage.getItem('bk-archive-theme')==='dark');}catch{setTheme(false);}
theme.addEventListener('click',()=>{const dark=document.body.dataset.theme!=='dark';setTheme(dark);try{sessionStorage.setItem('bk-archive-theme',dark?'dark':'light');}catch{}});
addEventListener('hashchange',route);addEventListener('resize',size);route();
})();
