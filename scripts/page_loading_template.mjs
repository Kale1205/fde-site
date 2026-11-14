import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

export const loadingPages=['','ja/','zh/'].flatMap(prefix=>['index','license','demo','goals','news','contact','order','customer','quiet-form'].map(name=>prefix+name+'.html'));
export const loadingEntryPages=Object.freeze(['index.html','ja/index.html','zh/index.html']);
export const loadingCopy={
 en:{label:'Preparing the page',preparing:'Preparing your page',done:'The page is ready.',partial:'Showing the page without waiting for every resource.',image:'Baked Kale character'},
 ja:{label:'ページの読み込み',preparing:'ページを準備しています',done:'ページを表示しました。',partial:'一部の読み込みを待たず、ページを表示しました。',image:'Baked Kaleのキャラクター'},
 zh:{label:'页面加载',preparing:'正在准备页面',done:'页面已就绪。',partial:'未等待所有资源，已显示页面。',image:'Baked Kale 角色'},
};

// Normal pages show the real loader for at least two visible seconds.
// Progress is resource-driven; errors, user skip and the deadline always fail open.
export function pageLoadingBootstrap(){
 const root=document.documentElement;
 try{if(localStorage.getItem('fde:still-icons')==='1')root.dataset.pageLoadingMotion='still';}catch{}
 const type=performance.getEntriesByType?.('navigation')?.[0]?.type;
 if(type==='reload'||type==='back_forward'||(!type&&[1,2].includes(performance.navigation?.type)))return;
 const state={started:performance.now(),released:false,shown:false,shownAt:null,readyAt:null,completed:0,total:0,resources:new Map(),tasks:[]};
 window.__fdePageLoading=state;
 const resource=event=>{
  const node=event.target,tag=node?.tagName;
  if(tag==='SCRIPT'&&node.src||tag==='LINK'&&node.rel==='stylesheet'){
   state.resources.set(node.src||node.href,event.type==='load');
   if(event.type==='error')release('error');
  }else if(node===window&&event.type==='error')release('error');
 };
 function release(reason){
  if(state.released)return;
  if(reason==='complete'){
   state.readyAt??=performance.now();
   if(state.shownAt===null)return;
   const remaining=2000-(performance.now()-state.shownAt);
   if(remaining>0){clearTimeout(state.minimum);state.minimum=setTimeout(()=>release('complete'),remaining);return;}
  }
  state.released=true;state.result=reason;state.finished=performance.now();
  clearTimeout(state.deadline);clearTimeout(state.minimum);cancelAnimationFrame(state.frame);state.cleanup?.();
  // A stalled stylesheet must not keep the browser's own first paint blocked.
  // Restore its original media if the late response eventually arrives.
  if(reason!=='complete')for(const link of document.querySelectorAll('link[rel="stylesheet"]')){
   if(link.sheet||link.media&&!matchMedia(link.media).matches)continue;
   const media=link.getAttribute('media');link.media='not all';
   link.addEventListener('load',()=>{if(media===null)link.removeAttribute('media');else link.setAttribute('media',media);},{once:true});
  }
  const panel=document.getElementById('page-loading'),focused=panel?.contains(document.activeElement);
  const reveal=reason==='complete'&&state.shown&&!document.hidden&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reveal){
   root.classList.add('fde-loading-reveal');
   const finishReveal=()=>{root.classList.remove('fde-loading-reveal');window.removeEventListener('pagehide',finishReveal);};
   window.addEventListener('pagehide',finishReveal,{once:true});setTimeout(finishReveal,200);
  }
  root.classList.remove('fde-loading','fde-loading-visible');root.dataset.pageLoadingResult=reason;
  panel?.setAttribute?.('aria-hidden','true');
  const status=document.getElementById('page-loading-status');
  if(status)status.textContent=reason==='complete'?status.dataset.done:status.dataset.partial;
  if(focused||reason==='skip'){
   const main=document.getElementById('main-content');
   if(main){const original=main.getAttribute('tabindex');main.setAttribute('tabindex','-1');main.focus({preventScroll:true});main.addEventListener('blur',()=>{if(original===null)main.removeAttribute('tabindex');else main.setAttribute('tabindex',original);},{once:true});}
  }
  document.removeEventListener('load',resource,true);window.removeEventListener('error',resource,true);
  document.removeEventListener('click',skip);document.removeEventListener('keydown',key);
 }
 const skip=event=>{if(event.target.closest?.('[data-page-loading-skip]'))release('skip');};
 const key=event=>{if(event.key==='Escape')release('skip');};
 state.release=release;
 document.addEventListener('load',resource,true);window.addEventListener('error',resource,true);
 document.addEventListener('click',skip);document.addEventListener('keydown',key);
 window.addEventListener('pagehide',()=>release('navigation'),{once:true});
 window.addEventListener('pageshow',event=>{if(event.persisted)release('history');});
 root.classList.add('fde-loading','fde-loading-visible');
 function observeDisplay(){
  if(state.released)return;
  if(!document.getElementById('page-loading')){state.frame=requestAnimationFrame(observeDisplay);return;}
  state.shown=true;state.shownAt=performance.now();
  if(state.readyAt!==null)release('complete');
 }
 state.frame=requestAnimationFrame(observeDisplay);
 state.deadline=setTimeout(()=>release('timeout'),4000);
}

const critical='#page-loading{display:none;position:fixed;inset:0;z-index:10000;background:#033f1b;color:#faf8f4;place-items:center;padding:20px;font:16px system-ui,sans-serif}html.fde-loading .site-shell,html.fde-loading .skip-link{visibility:hidden}html.fde-loading.fde-loading-visible #page-loading{display:grid}html.fde-loading-reveal #page-loading{display:grid;pointer-events:none;animation:entry-overlay-reveal 180ms ease-out both}@keyframes entry-overlay-reveal{from{opacity:1}to{opacity:0}}@media(prefers-reduced-motion:reduce){html.fde-loading-reveal #page-loading{display:none;animation:none}}.page-loading-panel{display:grid;justify-items:center;gap:16px;max-width:100%;text-align:center}.page-loading-art{position:relative;width:160px;max-width:42vw}.page-loading-art>img{display:block;width:100%;height:auto}.page-loading-art>svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}#page-loading progress{width:240px;max-width:76vw}#page-loading button{min-height:44px;padding:10px 18px;border:1px solid currentColor;background:transparent;color:inherit;font:inherit}#page-loading button:focus-visible{outline:3px solid #faf8f4;outline-offset:4px}.page-loading-status{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}';
export function loadingHead(prefix,version){return `<!-- FDE page loading -->\n<style data-page-loading-critical>${critical}</style>\n<script data-page-loading-bootstrap>(${pageLoadingBootstrap.toString()})();</script>\n<link rel="stylesheet" href="${prefix}page-loading.css?v=${version}">\n<script defer src="${prefix}page-loading.js?v=${version}" data-page-loading-runtime></script>\n<!-- End FDE page loading -->\n`;}

const previousLoaderHash='f024ead4cfd5cb5af61a0b84aecc65ad6303dc027255ae7cf3a821de9fd85a7f';
const normalizedLoaderHash=block=>createHash('sha256').update(block.replace(/(\.(?:js|css)\?v=)\d{8}-\d{6}/g,'$1BUILD')).digest('hex');
export function stripLoadingHead(source,{strict=true}={}){
 return source.replace(/<!-- FDE page loading -->\n[\s\S]*?<!-- End FDE page loading -->\n/g,block=>{
  if(strict){const m=block.match(/href="((?:\.\.\/)?)(?:page-loading\.css)\?v=(\d{8}-\d{6}|BUILD)"/);if(!m||(block!==loadingHead(m[1],m[2])&&normalizedLoaderHash(block)!==previousLoaderHash))throw Error('Unexpected script in loading metadata');}
  return '';
 });
}
export function loadingBody(file){
 const locale=file.startsWith('ja/')?'ja':file.startsWith('zh/')?'zh':'en',c=loadingCopy[locale],prefix=locale==='en'?'':'../';
 return `<!-- FDE loading panel -->\n<section id="page-loading" aria-label="${c.label}"><div class="page-loading-panel"><div class="page-loading-art"><img src="${prefix}assets/instagram-bakedkale-profile-20261110.jpg" width="150" height="150" alt="${c.image}" decoding="async"><svg viewBox="0 0 150 150" aria-hidden="true"><g class="page-loading-mouth"><ellipse cx="90" cy="111" rx="5" ry="3.7" fill="#19452d"/><path d="M86 112q4 2 8 0" fill="none" stroke="#66815c" stroke-width=".7"/></g></svg></div><p>${c.preparing} <span data-page-loading-count></span></p><progress aria-label="${c.label}"></progress></div></section>\n<p id="page-loading-status" class="page-loading-status" role="status" aria-live="polite" data-done="${c.done}" data-partial="${c.partial}"></p>\n<!-- End FDE loading panel -->\n`;
}
export function withPageLoading(file,source){
 if(!loadingPages.includes(file)||!/^<!doctype html>/i.test(source))return source;
 const version=source.includes('page-loading.css?v=BUILD')?'BUILD':readFileSync(new URL('../build-version.txt',import.meta.url),'utf8').trim(),prefix=file.includes('/')?'../':'';
 let html=stripLoadingHead(source,{strict:false}).replace(/<!-- FDE loading panel -->\n[\s\S]*?<!-- End FDE loading panel -->\n/g,'');
 if(!loadingEntryPages.includes(file))return html;
 const firstStyle=html.indexOf('<link rel="stylesheet"'),chrome=html.indexOf('<!-- Shared site chrome -->');
 const boundary=chrome>=0?Math.min(firstStyle,chrome):firstStyle;if(boundary<0)throw Error(`Missing stylesheet boundary: ${file}`);
 html=html.slice(0,boundary)+loadingHead(prefix,version)+html.slice(boundary);
 return html.replace(/(<body\b[^>]*>\n?)/,(_,tag)=>tag+loadingBody(file));
}
const priorLoadingHeads=new Set(["73928a6b6c108f7f334bd476f70642656bb3b17812e6dec10173187b54358606", "0292c1c5369cd292600a7b1636a10919ffeedffc1a67f996bad823ff337d7f92"]);
export function applyReviewedPageLoading(file,source){
 if(!loadingEntryPages.includes(file))return withPageLoading(file,source);
 const block=source.match(/<!-- FDE page loading -->\n[\s\S]*?<!-- End FDE page loading -->\n/)?.[0];
 if(!block)return withPageLoading(file,source);
 const normalized=block.replace(/(\.(?:js|css)\?v=)\d{8}-\d{6}/g,'$1BUILD');
 if(priorLoadingHeads.has(normalizedLoaderHash(normalized))||normalizedLoaderHash(normalized)===previousLoaderHash)return withPageLoading(file,source);
 return source;
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 for(const file of loadingPages){const url=new URL('../'+file,import.meta.url),before=readFileSync(url,'utf8'),after=withPageLoading(file,before);if(process.argv.includes('--check')){if(before!==after)throw Error(`Loading screen is stale: ${file}`);}else if(before!==after)writeFileSync(url,after);}
 console.log('Page loading markup is current.');
}
