// Real completed-resource counts, not a simulated byte/download percentage.
(()=>{
 const state=window.__fdePageLoading;
 if(!state||state.released)return;
 const cleanups=[];state.cleanup=()=>{for(const cleanup of cleanups.splice(0))cleanup();};
 function waitFor(node,ready){
  if(ready())return Promise.resolve(true);
  const url=node.currentSrc||node.src||node.href;
  if(state.resources.has(url))return Promise.resolve(state.resources.get(url));
  return new Promise(resolve=>{
   let settled=false;
   const finish=value=>{if(settled)return;settled=true;node.removeEventListener('load',load);node.removeEventListener('error',error);resolve(value);};
   const load=()=>finish(true),error=()=>finish(false);
   node.addEventListener('load',load,{once:true});node.addEventListener('error',error,{once:true});cleanups.push(()=>finish(false));
  });
 }
 function aboveFold(img){
  const r=img.getBoundingClientRect();if(r.width<=0||r.height<=0||r.bottom<=0||r.top>=innerHeight||r.right<=0||r.left>=innerWidth)return false;
  for(let n=img;n&&!n.classList.contains('site-shell');n=n.parentElement){const s=getComputedStyle(n);if(s.display==='none'||Number(s.opacity)===0)return false;}
  return true;
 }
 function start(){
  if(state.released)return;
  const panel=document.getElementById('page-loading');if(!panel){state.release('error');return;}
  const progress=panel.querySelector('progress'),count=panel.querySelector('[data-page-loading-count]');
  const tasks=[{name:'document',promise:Promise.resolve(true)}];
  for(const link of document.querySelectorAll('link[rel="stylesheet"]'))if(!link.media||matchMedia(link.media).matches)tasks.push({name:link.href,promise:waitFor(link,()=>Boolean(link.sheet))});
  for(const script of document.querySelectorAll('script[src]'))if(!script.async&&(script.defer||script.type==='module'))tasks.push({name:script.src,promise:waitFor(script,()=>state.resources.get(script.src)===true)});
  for(const img of document.querySelectorAll('.site-shell img'))if(aboveFold(img)){
   if(img.loading==='lazy')img.loading='eager';
   tasks.push({name:img.currentSrc||img.src,promise:img.complete?Promise.resolve(img.naturalWidth>0):waitFor(img,()=>img.complete&&img.naturalWidth>0)});
  }
  state.total=tasks.length;state.tasks=tasks.map(t=>({name:t.name,status:'pending'}));progress.max=tasks.length;progress.value=0;
  const update=()=>{progress.value=state.completed;count.textContent=`${state.completed}/${state.total}`;progress.setAttribute('aria-valuetext',`${state.completed}/${state.total}`);};update();
  Promise.all(tasks.map((task,index)=>task.promise.then(ok=>{
   if(state.released)return false;
   state.tasks[index].status=ok?'loaded':'failed';
   if(!ok){state.release('error');return false;}
   state.completed++;update();return true;
  }))).then(results=>{if(!state.released&&results.every(Boolean))state.release('complete');});
 }
 const ready=()=>{if(document.hidden)start();else requestAnimationFrame(start);};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
