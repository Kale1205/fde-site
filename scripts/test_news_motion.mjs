import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {BOOK_MOTION} from '../news-books.js';
const source=readFileSync(new URL('../news-books.js',import.meta.url),'utf8');
const navigation=source.slice(source.indexOf(' // Both views already exist'),source.indexOf(" if(typeof ResizeObserver"));
function fixture({reduced=false,hidden=false}={}){
 const handlers={},classes=new Set(),timers=new Map(),links=[],history=[],shown=[];let now=0,id=0,focusCalls=0,markerCalls=0;
 const main={classList:{add:(...names)=>names.forEach(n=>classes.add(n)),remove:(...names)=>names.forEach(n=>classes.delete(n))}};
 const reduce={matches:reduced,addEventListener:(name,fn)=>handlers['media:'+name]=fn};
 const document={hidden,querySelectorAll:()=>links,addEventListener:(name,fn)=>handlers['document:'+name]=fn};
 const location={href:'https://example.test/ja/news.html',origin:'https://example.test',pathname:'/ja/news.html',search:''};
 const move=url=>{const parsed=new URL(url,location.href);Object.assign(location,{href:parsed.href,origin:parsed.origin,pathname:parsed.pathname,search:parsed.search});};
 const window={location,history:{pushState:(_,__,url)=>{history.push(String(url));move(url);}},scrollTo:()=>{},addEventListener:(name,fn)=>handlers['window:'+name]=fn};
 for(const all of [true,false])links.push({href:all?'https://example.test/ja/news.html?view=all':'https://example.test/ja/news.html',target:'',hasAttribute:()=>false,addEventListener:(name,fn)=>handlers[(all?'all:':'back:')+name]=fn});
 const context={document,window,main,reduce,BOOK_MOTION,URL,URLSearchParams,listView:false,viewTimer:0,pendingView:null,busy:false,queued:0,reader:{open:false},heading:{focus:()=>focusCalls++},
  setTimeout:(fn,ms)=>{timers.set(++id,{fn,at:now+ms});return id;},clearTimeout:key=>timers.delete(key),
  showView(next){context.listView=next;shown.push(next);},syncDateMarker(){markerCalls++;},finish(){context.busy=false;}};
 runInNewContext(navigation,context);
 function tick(ms){const end=now+ms;for(;;){const next=[...timers.entries()].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;now=next[1].at;timers.delete(next[0]);next[1].fn();}now=end;}
 function click(all=true,extra={}){const event={button:0,preventDefault(){this.defaultPrevented=true;},...extra};handlers[(all?'all:':'back:')+'click'](event);return event;}
 tick(BOOK_MOTION.viewIn);
 return {context,classes,history,shown,handlers,reduce,document,location,move,click,tick,focus:()=>focusCalls,markers:()=>markerCalls};
}
test('News views preserve real URLs/history while leaving and arriving at the established slow duration',()=>{
 const f=fixture(),event=f.click();assert.equal(event.defaultPrevented,true);assert.equal(f.history.length,1);assert.match(f.location.href,/view=all$/);
 assert.equal(f.context.listView,false);assert(f.classes.has('is-news-leaving'));f.tick(BOOK_MOTION.viewOut-1);assert.equal(f.context.listView,false);
 f.tick(1);assert.equal(f.context.listView,true);assert.equal(f.focus(),1);assert.equal(f.markers(),1);assert(f.classes.has('is-news-arriving'));
 f.tick(BOOK_MOTION.viewIn);assert.equal(f.classes.size,0);f.click(false);f.tick(BOOK_MOTION.viewOut);assert.equal(f.context.listView,false);assert.doesNotMatch(f.location.href,/view=all/);
});
test('back and forward apply the URL view without adding history entries',()=>{
 const f=fixture();f.click();f.tick(BOOK_MOTION.viewOut+BOOK_MOTION.viewIn);f.move('https://example.test/ja/news.html');f.handlers['window:popstate']();f.tick(BOOK_MOTION.viewOut);assert.equal(f.context.listView,false);assert.equal(f.history.length,1);
 f.move('https://example.test/ja/news.html?view=all');f.handlers['window:popstate']();f.tick(BOOK_MOTION.viewOut);assert.equal(f.context.listView,true);assert.equal(f.history.length,1);
});
test('modified clicks, downloads, new tabs and non-primary clicks retain native navigation',()=>{
 for(const extra of [{metaKey:true},{ctrlKey:true},{shiftKey:true},{altKey:true},{button:1},{defaultPrevented:true}]){const f=fixture(),event=f.click(true,extra);assert.equal(f.history.length,0);assert.equal(!!event.defaultPrevented,!!extra.defaultPrevented);}
});
test('double activation cannot create duplicate history or overlap view timers',()=>{const f=fixture();f.click();f.click();assert.equal(f.history.length,1);f.tick(1000);assert.deepEqual(f.shown,[true]);assert.equal(f.classes.size,0);});
test('reduced motion switches instantly and a runtime preference change ends the current effect',()=>{
 const f=fixture({reduced:true});f.click();assert.equal(f.context.listView,true);assert.equal(f.classes.size,0);
 const g=fixture();g.click();g.reduce.matches=true;g.handlers['media:change']();assert.equal(g.context.listView,true);assert.equal(g.classes.size,0);g.tick(2000);assert.equal(g.classes.size,0);
});
test('hidden tabs finish pending navigation and do not leave content transparent',()=>{const f=fixture();f.click();f.document.hidden=true;f.handlers['document:visibilitychange']();assert.equal(f.context.listView,true);assert.equal(f.classes.size,0);f.tick(2000);assert.equal(f.classes.size,0);});
test('an open article does not swap the underlying view',()=>{const f=fixture();f.context.reader.open=true;f.click();assert.equal(f.context.listView,false);assert.equal(f.history.length,0);});
test('history changes during an open article are applied when the article closes',()=>{const f=fixture();f.click();f.tick(1000);f.context.reader.open=true;f.move('https://example.test/ja/news.html');f.handlers['window:popstate']();assert.equal(f.context.listView,true);f.context.reader.open=false;f.context.finishView();assert.equal(f.context.listView,false);assert.equal(f.history.length,1);});
test('motion/visibility changes keep a history update pending until the reader closes',()=>{const f=fixture();f.click();f.tick(1000);f.context.reader.open=true;f.move('https://example.test/ja/news.html');f.handlers['window:popstate']();f.reduce.matches=true;f.handlers['media:change']();f.document.hidden=true;f.handlers['document:visibilitychange']();assert.equal(f.context.listView,true);assert(f.context.pendingView);f.context.reader.open=false;f.context.finishView();assert.equal(f.context.listView,false);assert.equal(f.classes.size,0);});
test('list reading removes only the cover effect and keeps the existing article arrival and Top News book effect',()=>{
 assert.match(source,/openingCover.hidden=listView/);assert.match(source,/if\(!reduce.matches&&!listView\).*coverAnimation=openingCover.animate/);
 assert.match(source,/if\(!reduce.matches&&!cover.hidden\).*coverAnimation=cover.animate/);
 const css=readFileSync(new URL('../news-books.css',import.meta.url),'utf8');
 assert.match(css,/book-spread\{animation:book-arrive 800ms 160ms/);assert.match(css,/reader-copy\)\{animation:book-ink-arrive 360ms 560ms/);
 assert.match(css,/book-opening-cover\[hidden\]\{display:none\}/);assert.match(css,/prefers-reduced-motion:reduce/);
 assert.deepEqual([BOOK_MOTION.select,BOOK_MOTION.open,BOOK_MOTION.close],[680,1120,680]);
 assert.doesNotMatch(source,/startViewTransition|navigator\.userAgent|localStorage|sessionStorage/);
});

function readerFixture({reduced=false,hidden=false}={}){
 const classes=new Set(),frames=[],timers=[];
 const classList={add:(...xs)=>xs.forEach(x=>classes.add(x)),remove:(...xs)=>xs.forEach(x=>classes.delete(x)),contains:x=>classes.has(x),toggle:(x,on)=>on?classes.add(x):classes.delete(x)};
 const element=()=>({hidden:false,style:{removeProperty(){}},dataset:{},removeAttribute(){},focus(){},getBoundingClientRect:()=>({left:0,top:0,width:100,height:100})});
 const cover=element(),body={replaceChildren(){},append(){}},nodes=Object.fromEntries(['.opening-cover-art','.opening-cover-title','.reader-image','.reader-date','.reader-category','#book-article-title','.reader-copy','.book-close'].map(s=>[s,element()]));
 const reader={open:false,classList,querySelector:s=>s==='.book-opening-cover'?cover:s==='.reader-body'?body:nodes[s],showModal(){this.open=true;}};
 const context={BOOK_MOTION,allItems:[{id:'fixture',title:'Local fixture',body:'Synthetic text',date:'2026-10-17',category:'Update'}],items:[],index:0,reader,listView:true,reduce:{matches:reduced},document:{hidden,body:{classList},createElement:element},resolveImage:()=>'',slots:[],lastTrigger:null,queued:0,closeTimer:0,openingTimer:0,coverAnimation:null,liftedBook:null,flightFrom:'',requestAnimationFrame:fn=>frames.push(fn),setTimeout:(fn,ms)=>timers.push(ms),clearTimeout(){}};
 const start=source.indexOf(' function open(id,trigger)'),end=source.indexOf(' function close()',start);
 runInNewContext(source.slice(start,end)+"\nopen('fixture',{});",context);
 return {classes,frames,timers,reader};
}
test('reduced or hidden readers reveal static content immediately without waiting for suspended animation frames',()=>{
 for(const state of [{reduced:true},{hidden:true},{reduced:true,hidden:true}]){const f=readerFixture(state);assert.equal(f.reader.open,true);assert(f.classes.has('is-ready'));assert(!f.classes.has('is-preparing'));assert(!f.classes.has('is-opening'));assert.equal(f.frames.length,0);assert.equal(f.timers.length,0);}
});
test('normal visible readers retain the two-frame preparation and existing slow article timing',()=>{
 const f=readerFixture();assert(f.classes.has('is-preparing'));assert(!f.classes.has('is-ready'));assert.equal(f.frames.length,1);f.frames.shift()();assert.equal(f.frames.length,1);f.frames.shift()();assert(f.classes.has('is-opening'));assert(!f.classes.has('is-preparing'));assert.deepEqual(f.timers,[BOOK_MOTION.open+24]);
});
