import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {pageLoadingBootstrap,loadingPages,stripLoadingHead} from './page_loading_template.mjs';
import {approvedHeadPrefix} from './approved_head_prefix.mjs';
const runtime=readFileSync(new URL('../page-loading.js',import.meta.url),'utf8');
const flush=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
function harness({cached=true,below=false,storage='0',storageFails=false,mainTabindex=null}={}){
 let now=0,id=0;const timers=new Map();
 class Target{
  constructor(){this.listeners=new Map();this.attributes=new Map();}
  addEventListener(type,fn,options={}){const a=this.listeners.get(type)||[];a.push({fn,once:options?.once});this.listeners.set(type,a);}
  removeEventListener(type,fn){this.listeners.set(type,(this.listeners.get(type)||[]).filter(x=>x.fn!==fn));}
  emit(type,event={}){for(const x of [...(this.listeners.get(type)||[])]){x.fn({type,target:this,...event});if(x.once)this.removeEventListener(type,x.fn);}}
  setAttribute(k,v){this.attributes.set(k,String(v));}getAttribute(k){return this.attributes.get(k)??null;}removeAttribute(k){this.attributes.delete(k);}
 }
 const classes=new Set(),root={classList:{add(...a){a.forEach(x=>classes.add(x));},remove(...a){a.forEach(x=>classes.delete(x));},contains(x){return classes.has(x);}},dataset:{}};
 const document=new Target(),window=new Target(),main=new Target();if(mainTabindex!==null)main.setAttribute('tabindex',mainTabindex);
 main.focus=()=>{document.activeElement=main;};
 const status={dataset:{done:'ready',partial:'partial'},textContent:''},skip={id:'skip',closest:()=>true},progress={max:1,value:undefined,setAttribute(){}},counter={textContent:''};
 const panel={contains:n=>n===skip,querySelector:s=>s==='progress'?progress:counter};
 const sheet=new Target();Object.assign(sheet,{tagName:'LINK',rel:'stylesheet',href:'https://example.test/main.css',media:'',sheet:{}});
 const script=new Target();Object.assign(script,{tagName:'SCRIPT',src:'https://example.test/gallery-ui.js',async:false,defer:true,type:''});
 const image=new Target();Object.assign(image,{tagName:'IMG',src:'https://example.test/hero.webp',currentSrc:'https://example.test/hero.webp',complete:cached,naturalWidth:cached?150:0,loading:'lazy',classList:{contains:()=>false},parentElement:{classList:{contains:n=>n==='site-shell'}},getBoundingClientRect:()=>({width:150,height:150,left:0,right:150,top:below?5000:100,bottom:below?5150:250})});
 Object.assign(document,{documentElement:root,readyState:'loading',hidden:false,activeElement:null,getElementById:id=>({'page-loading':panel,'page-loading-status':status,'main-content':main}[id]),querySelectorAll:s=>s==='link[rel="stylesheet"]'?[sheet]:s==='script[src]'?[script]:s==='.site-shell img'?[image]:[]});
 const set=(fn,delay)=>{const key=++id;timers.set(key,{fn,at:now+delay});return key;};
 const context=vm.createContext({window,document,performance:{now:()=>now},setTimeout:set,clearTimeout:key=>timers.delete(key),requestAnimationFrame:fn=>set(fn,16),cancelAnimationFrame:key=>timers.delete(key),innerHeight:900,innerWidth:1200,getComputedStyle:()=>({display:'block',opacity:'1'}),matchMedia:()=>({matches:true}),localStorage:{getItem(){if(storageFails)throw Error('storage denied');return storage;}}});
 vm.runInContext(`(${pageLoadingBootstrap.toString()})();`,context);
 const state=window.__fdePageLoading;
 const tick=ms=>{const end=now+ms;while(true){const next=[...timers].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;now=next[1].at;timers.delete(next[0]);next[1].fn();}now=end;};
 const start=async()=>{document.emit('load',{target:sheet});document.emit('load',{target:script});vm.runInContext(runtime,context);document.readyState='interactive';document.emit('DOMContentLoaded');tick(16);await flush();};
 return{state,root,document,window,main,status,skip,progress,counter,sheet,script,image,tick,start};
}

test('cached required resources keep a visible loader for two seconds after real progress completes',async()=>{
 const h=harness();await h.start();assert.equal(h.state.released,false);assert.equal(h.state.shown,true);assert.equal(h.progress.value,h.progress.max);h.tick(1999);assert.equal(h.state.released,false);h.tick(1);assert.equal(h.state.result,'complete');assert.equal(h.state.finished-h.state.shownAt,2000);assert(!h.root.classList.contains('fde-loading'));
});
test('elapsed time cannot fill the gauge while a real required image is pending',async()=>{
 const h=harness({cached:false});await h.start();const count=h.progress.value;h.tick(2000);await flush();assert.equal(h.progress.value,count);assert(count<h.progress.max);assert.equal(h.state.released,false);assert.equal(h.state.shown,true);
 h.image.complete=true;h.image.naturalWidth=150;h.image.emit('load');await flush();assert.equal(h.state.result,'complete');assert.equal(h.progress.value,h.progress.max);
});
test('below-fold lazy media never blocks first-view readiness',async()=>{
 const h=harness({cached:false,below:true});await h.start();h.tick(2000);assert.equal(h.state.result,'complete');assert(!h.state.tasks.some(t=>t.name.includes('hero.webp')));assert.equal(h.image.loading,'lazy');
});
test('a stalled request releases at the deadline without claiming complete progress',async()=>{
 const h=harness({cached:false});await h.start();h.tick(4000);await flush();assert.equal(h.state.result,'timeout');assert(h.progress.value<h.progress.max);assert.equal(h.status.textContent,'partial');assert(!h.root.classList.contains('fde-loading'));
});
test('an image failure releases content and never completes the unfinished gauge',async()=>{
 const h=harness({cached:false});await h.start();h.image.emit('error');await flush();assert.equal(h.state.result,'error');assert(h.progress.value<h.progress.max);
});
test('a failed controller or style fails open even before DOMContentLoaded',()=>{
 for(const kind of ['script','sheet']){const h=harness();h.sheet.sheet=null;h.window.emit('error',{target:h[kind]});assert.equal(h.state.result,'error');assert(!h.root.classList.contains('fde-loading'));assert.notEqual(h.progress.value,h.progress.max);assert.equal(h.sheet.media,'not all');h.sheet.emit('load');assert.equal(h.sheet.getAttribute('media'),null);}
});
test('Escape releases the page and restores the original keyboard focus contract',async()=>{
 for(const original of [null,'0']){const h=harness({cached:false,mainTabindex:original});await h.start();h.document.activeElement=h.skip;h.document.emit('keydown',{key:'Escape'});assert.equal(h.state.result,'skip');assert.equal(h.document.activeElement,h.main);h.main.emit('blur');assert.equal(h.main.getAttribute('tabindex'),original);assert(h.progress.value<h.progress.max);}
});
test('Escape works without the external readiness controller or a rendered button',()=>{
 const h=harness();h.tick(120);h.document.emit('keydown',{key:'Escape'});assert.equal(h.state.result,'skip');assert.equal(h.document.activeElement,h.main);
});
test('history restoration does not replay a previously pending loader',async()=>{
 const h=harness({cached:false});await h.start();h.window.emit('pagehide');h.window.emit('pageshow',{persisted:true});h.tick(5000);assert.equal(h.state.result,'navigation');assert(!h.root.classList.contains('fde-loading'));assert.equal(h.state.shown,true);
});
test('saved still-icon preferences and denied storage are safe',async()=>{
 const still=harness({storage:'1'});assert.equal(still.root.dataset.pageLoadingMotion,'still');await still.start();still.tick(2000);assert.equal(still.state.result,'complete');const denied=harness({storageFails:true});await denied.start();denied.tick(2000);assert.equal(denied.state.result,'complete');
});
test('only the exact owned bootstrap passes static metadata script protection',()=>{
 const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');assert(approvedHeadPrefix(home,{jsonLd:true}).includes('application/ld+json'));
 const changed=home.replace('release(\'timeout\'),4000','release(\'timeout\'),999999');assert.notEqual(home,changed);assert.throws(()=>stripLoadingHead(changed),/Unexpected script/);
 assert.throws(()=>approvedHeadPrefix(home.replace('<title>','<script>unexpected()</script><title>'),{jsonLd:true}),/Only the approved JSON-LD/);
});
test('all current page shells own exactly one loader and original source character',()=>{
 assert.equal(loadingPages.length,27);for(const file of loadingPages){const html=readFileSync(new URL('../'+file,import.meta.url),'utf8');assert.equal((html.match(/id="page-loading"/g)||[]).length,1,file);assert(html.includes('assets/instagram-bakedkale-profile-20261110.jpg'));assert.equal((html.match(/data-page-loading-bootstrap/g)||[]).length,1,file);assert(!html.includes('<button type="button" data-page-loading-skip'),file);assert(html.includes('<span data-page-loading-count></span>'),file);assert(html.includes('const remaining=2000-'),file);}
});
