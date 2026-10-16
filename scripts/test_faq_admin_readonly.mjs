import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const runtime=readFileSync(new URL('faq-admin-v3.js',root),'utf8');
const html=readFileSync(new URL('cms-admin.html',root),'utf8');
const writers=['createFaqBtn','saveFaqBtn','deleteFaqBtn','bulkTranslateFaqBtn'];
const syntheticFaq={version:3,locales:['ja','en'],categories:{
  product:{order:1,label:{ja:'試験製品',en:'Test product'}},
  support:{order:2,label:{ja:'試験サポート',en:'Test support'}}
},subcategories:{
  use:{category:'product',label:{ja:'試験利用',en:'Test use'}},
  help:{category:'support',label:{ja:'試験案内',en:'Test help'}}
},faq:[
  {id:'synthetic-faq-one',category:'product',subcategory:'use',highFrequency:true,
    question:{ja:'試験質問一',en:'Test question one'},answer:{ja:'試験回答一',en:'Test answer one'},
    keywords:{ja:['試験'],en:['test']},synonyms:{ja:[],en:[]}},
  {id:'synthetic-faq-two',category:'support',subcategory:'help',highFrequency:false,
    question:{ja:'試験質問二'},answer:{ja:'試験回答二'},keywords:{ja:['試験二']},synonyms:{ja:[]}}
]};

// A small DOM built from the actual FAQ markup. It models event capture and select
// options so the test exercises the shipped runtime rather than a second UI model.
class SyntheticEvent {
  constructor(type,options={}){this.type=type;this.bubbles=!!options.bubbles;this.cancelable=!!options.cancelable;Object.assign(this,options);}
  preventDefault(){if(this.cancelable)this.defaultPrevented=true;}
  stopPropagation(){this.stopped=true;}
  stopImmediatePropagation(){this.stopped=true;this.immediate=true;}
}
class Element {
  constructor(tagName='div',attributes={}){
    this.tagName=tagName.toUpperCase();this.localName=tagName.toLowerCase();this.attributes={};
    this.children=[];this.parentElement=null;this.listeners=[];this.dataset={};this.style={};
    this.disabled=false;this.readOnly=false;this.checked=false;this.hidden=false;this._value='';this._text='';
    for(const [key,value] of Object.entries(attributes))this.setAttribute(key,value);
    const classes=new Set((this.attributes.class||'').split(/\s+/).filter(Boolean));
    this.classList={contains:value=>classes.has(value),add:(...values)=>values.forEach(value=>classes.add(value)),
      remove:(...values)=>values.forEach(value=>classes.delete(value)),
      toggle:(value,force)=>{const add=force===undefined?!classes.has(value):force;if(add)classes.add(value);else classes.delete(value);return add;}};
  }
  setAttribute(key,value){
    value=String(value);this.attributes[key]=value;
    if(key==='id'||key==='type')this[key]=value;
    if(key==='value')this._value=value;
    if(key==='hidden'||key==='disabled'||key==='checked')this[key]=true;
    if(key==='readonly')this.readOnly=true;
    if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=value;
  }
  getAttribute(key){return this.attributes[key]??null;}
  removeAttribute(key){delete this.attributes[key];if(['disabled','readonly','hidden'].includes(key))this[key==='readonly'?'readOnly':key]=false;}
  appendChild(child){if(child.parentElement)child.parentElement.children.splice(child.parentElement.children.indexOf(child),1);child.parentElement=this;this.children.push(child);return child;}
  append(...children){for(const child of children)this.appendChild(child);}
  get options(){return this.children.filter(child=>child.tagName==='OPTION');}
  get value(){if(this.tagName==='SELECT')return this.options.find(option=>option.value===this._value)?.value||this.options[0]?.value||'';return this._value;}
  set value(value){this._value=String(value);}
  get textContent(){return this._text+this.children.map(child=>child.textContent).join('');}
  set textContent(value){this._text=String(value);this.children=[];}
  get innerHTML(){return this._html||'';}
  set innerHTML(value){
    this._html=String(value);this._text='';this.children=[];this._value='';
    for(const match of this._html.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)){
      const option=new Element('option',attributes(match[1]));option.textContent=match[2];this.appendChild(option);
    }
  }
  matches(selector){
    const pieces=selector.trim().split(/\s+/);const own=pieces.pop();
    const tag=own.match(/^[a-z][\w-]*/i)?.[0];if(tag&&this.tagName!==tag.toUpperCase())return false;
    const id=own.match(/#([\w-]+)/)?.[1];if(id&&this.id!==id)return false;
    for(const [,name] of own.matchAll(/\.([\w-]+)/g))if(!this.classList.contains(name))return false;
    for(const [,key,,value] of own.matchAll(/\[([^=\]]+)(?:=(['"]?)(.*?)\2)?\]/g)){
      if(this.getAttribute(key)===null)return false;if(value!==undefined&&this.getAttribute(key)!==value)return false;
    }
    if(!pieces.length)return true;
    let ancestor=this.parentElement;
    while(ancestor){if(ancestor.matches(pieces.join(' ')))return true;ancestor=ancestor.parentElement;}return false;
  }
  querySelectorAll(selector){
    const selectors=selector.split(',');const result=[];
    const visit=node=>{for(const child of node.children){if(selectors.some(part=>child.matches(part)))result.push(child);visit(child);}};
    visit(this);return result;
  }
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  closest(selector){let node=this;while(node){if(node.matches(selector))return node;node=node.parentElement;}return null;}
  contains(node){return node===this||this.children.some(child=>child.contains(node));}
  addEventListener(type,callback,options=false){this.listeners.push({type,callback,capture:options===true||!!options.capture,once:!!options.once});}
  dispatchEvent(event){
    event.target=this;const path=[];for(let node=this;node;node=node.parentElement)path.push(node);
    const fire=(node,capture)=>{event.currentTarget=node;for(const listener of [...node.listeners]){
      if(listener.type!==event.type||listener.capture!==capture)continue;
      listener.callback.call(node,event);if(listener.once)node.listeners.splice(node.listeners.indexOf(listener),1);if(event.immediate)break;
    }};
    for(const node of [...path].reverse()){fire(node,true);if(event.stopped)return !event.defaultPrevented;}
    fire(this,false);if(!event.stopped&&event.bubbles)for(const node of path.slice(1)){fire(node,false);if(event.stopped)break;}
    return !event.defaultPrevented;
  }
}
function attributes(source){return Object.fromEntries([...source.matchAll(/([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)].map(([,key,a,b,c])=>[key,a??b??c??'']));}
function parseMarkup(source,parent){
  const stack=[parent],voidTags=new Set(['input','img','br','hr','meta','link']);
  for(const match of source.matchAll(/<\/?([a-z][\w-]*)\b([^>]*)>|([^<]+)/gi)){
    if(match[3]){stack.at(-1)._text+=match[3];continue;}
    if(match[0].startsWith('</')){stack.pop();continue;}
    const node=new Element(match[1],attributes(match[2]));stack.at(-1).appendChild(node);
    if(!voidTags.has(node.localName))stack.push(node);
  }
}
function responseFor(data=syntheticFaq){return {ok:true,status:200,json:async()=>({sha:'synthetic-content-sha',content:Buffer.from(JSON.stringify(data)).toString('base64')})};}
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function fixture({connected=true,fetchResponse=()=>responseFor(),readyState='complete',exposeActions=false}={}){
  const document=new Element('document');document.readyState=readyState;document.createElement=tag=>new Element(tag);document.getElementById=id=>document.querySelector('#'+id);
  const body=new Element('body');document.body=body;document.appendChild(body);
  const token=new Element('input',{id:'token',type:'password'});token.value='synthetic-test-token';body.appendChild(token);
  const adminTabs=new Element('nav',{id:'adminTabs','data-connection-state':connected?'connected':'idle'});body.appendChild(adminTabs);
  const tab=new Element('button',{'data-admin-tab':'faq',type:'button'});adminTabs.appendChild(tab);
  const start=html.indexOf('<div id="faqPanel"'),end=html.indexOf('<div id="adminStatus"',start);
  assert(start>=0&&end>start,'the real CMS must retain the FAQ panel');parseMarkup(html.slice(start,end),body);
  const status=new Element('div',{id:'adminStatus'});body.appendChild(status);
  const calls=[],toasts=[],keyWrites=[],confirms=[],timers=[],legacyWriterCalls=[];
  const node=id=>document.getElementById(id);
  for(const id of writers)node(id).addEventListener('click',()=>legacyWriterCalls.push(id));
  const window=new Element('window');Object.assign(window,{FDE_CONTACT_API:'https://translation.example.invalid',
    FDE_ADMIN_KEY:{get:()=> 'synthetic-test-key',set:value=>keyWrites.push(value)},
    FDE_ADMIN_TOAST:(message,type)=>toasts.push({message,type})});
  const fetch=async(url,options={})=>{
    const method=(options.method||'GET').toUpperCase();calls.push({url:String(url),method});
    // Every request is synthetic and any accidental writer fails closed.
    assert.equal(method,'GET','FAQ confirmation must not make a write or translation request');
    const parsed=new URL(url);assert.equal(parsed.origin,'https://api.github.com');
    assert.equal(parsed.pathname,'/repos/Kale1205/fde-site/contents/content/faq-content.json');
    assert.equal(parsed.searchParams.get('ref'),'main');
    return fetchResponse(url,options);
  };
  const context={window,document,fetch,TextEncoder,TextDecoder,Uint8Array,Uint32Array,Date,
    Event:SyntheticEvent,CustomEvent:SyntheticEvent,
    atob:value=>Buffer.from(value,'base64').toString('binary'),btoa:value=>Buffer.from(value,'binary').toString('base64'),
    confirm:message=>{confirms.push(message);return true;},crypto:{getRandomValues:array=>array.fill(7)},
    setTimeout:callback=>{timers.push(callback);return timers.length;},clearTimeout(){}};
  // Only the direct-guard test exposes references inside this in-memory VM copy.
  // No production source file is rewritten, and every normal DOM test runs it intact.
  const source=exposeActions?runtime.replace(/\}\)\(\);\s*$/,'window.__faqActions={writeFaq,enrich,create,save,remove,bulkTranslate};\n})();'):runtime;
  if(exposeActions)assert.notEqual(source,runtime,'the private-function hook must be installed');
  vm.runInNewContext(source,context,{filename:'faq-admin-v3.js'});
  const event=(target,type)=>target.dispatchEvent(new SyntheticEvent(type,{bubbles:true,cancelable:true}));
  const flush=async()=>{for(let turn=0;turn<12;turn++){while(timers.length)timers.shift()();await Promise.resolve();}};
  const refresh=()=>event(document,'fde:cms-faq-read');
  const startDom=()=>event(document,'DOMContentLoaded');
  return {document,window,node,panel:node('faqPanel'),tab,token,adminTabs,calls,toasts,keyWrites,confirms,legacyWriterCalls,event,flush,refresh,startDom,actions:window.__faqActions};
}
function assertLocked(f,{selectable=false}={}){
  for(const input of f.panel.querySelectorAll('input,textarea')){
    if(input.type==='checkbox'||input.type==='radio')assert.equal(input.disabled,true,input.id);
    else assert.equal(input.readOnly,true,input.id);
  }
  for(const select of f.panel.querySelectorAll('select'))assert.equal(select.disabled,select.id==='editFaqTarget'?!selectable:true,select.id);
  for(const id of writers)assert.equal(f.node(id).disabled,true,id);
}

test('FAQ starts idle with every existing editor field locked, including the password key',()=>{
  const f=fixture();assert.equal(f.panel.dataset.faqState,'idle');assertLocked(f);
  assert.equal(f.calls.length,0);assert.equal(f.keyWrites.length,0);
  assert.equal(f.node('faqAdminKey').readOnly,true);
  assert.equal(f.token.readOnly,false,'the shared GitHub connection field is outside the FAQ lock');
});

test('deferred initialization locks the FAQ once DOMContentLoaded fires',()=>{
  const f=fixture({readyState:'loading'});f.startDom();assert.equal(f.panel.dataset.faqState,'idle');assertLocked(f);
});

test('disconnected FAQ read requests stay idle, explain connection, and make no network call',async()=>{
  for(const missing of ['connection','token']){
    const f=fixture({connected:missing!=='connection'});if(missing==='token')f.token.value='';
    f.refresh();await f.flush();assert.equal(f.panel.dataset.faqState,'idle');assert.equal(f.calls.length,0);assertLocked(f);
    assert.match([f.node('faqStats').textContent,...f.toasts.map(toast=>toast.message)].join('\n'),/GitHub.*接続|接続.*GitHub/);
  }
});

test('shared pending read suppresses duplicate refreshes and keeps the selector locked while loading',async()=>{
  const pending=deferred(),f=fixture({fetchResponse:()=>pending.promise});
  f.refresh();f.refresh();await f.flush();
  assert.equal(f.panel.dataset.faqState,'loading');assert.equal(f.calls.length,1);assertLocked(f);
  pending.resolve(responseFor());await f.flush();
  assert.equal(f.panel.dataset.faqState,'loaded');assert.equal(f.calls.length,1);assertLocked(f,{selectable:true});
});

for(const change of ['disconnect','token'])for(const result of ['resolved','rejected'])test(`a pending FAQ read stays idle after ${change} when the old request ${result}`,async()=>{
  const pending=deferred(),f=fixture({fetchResponse:()=>pending.promise});f.refresh();await f.flush();
  assert.equal(f.panel.dataset.faqState,'loading');assert.equal(f.calls.length,1);
  if(change==='disconnect')f.adminTabs.dataset.connectionState='idle';else f.token.value='synthetic-different-token';
  if(result==='resolved')pending.resolve(responseFor());else pending.reject(new Error('Synthetic old connection failed'));
  await f.flush();
  assert.equal(f.panel.dataset.faqState,'idle');assert.equal(f.node('editFaqTarget').options.length,0);assertLocked(f);
  assert.equal(f.toasts.filter(toast=>toast.type==='error').length,0);
});

test('loaded FAQ retains its selector and original change workflow while renderStats cannot enable bulk translation',async()=>{
  const f=fixture(),selector=f.node('editFaqTarget');f.refresh();await f.flush();
  assert.equal(f.panel.dataset.faqState,'loaded');assert.equal(f.node('editFaqTarget'),selector);
  assert.deepEqual(selector.options.map(option=>option.value),syntheticFaq.faq.map(item=>item.id));
  assert.equal(f.node('faqEditQJa').value,'試験質問一');
  selector.value='synthetic-faq-two';f.event(selector,'change');
  assert.equal(f.node('faqEditQJa').value,'試験質問二');assert.equal(f.node('faqEditAJa').value,'試験回答二');
  assert.equal(f.node('faqEditCategory').value,'support');assert.equal(f.node('faqEditSubcategory').value,'help');
  assert.equal(f.node('faqEditFrequent').checked,false);
  assert.match(f.node('faqStats').textContent,/FAQ 2件/);assert.match(f.node('faqStats').textContent,/未完了 1件/);
  assert.equal(f.node('bulkTranslateFaqBtn').disabled,true,'an incomplete FAQ must not reopen the legacy writer');
  assertLocked(f,{selectable:true});assert.equal(f.keyWrites.length,0);
});

test('successful empty FAQ is loaded with an unavailable selector, not a failed or unconnected read',async()=>{
  const f=fixture({fetchResponse:()=>responseFor({...syntheticFaq,faq:[]})});f.refresh();await f.flush();
  assert.equal(f.panel.dataset.faqState,'loaded');assert.equal(f.calls.length,1);assert.equal(f.node('editFaqTarget').options.length,0);
  assertLocked(f);assert.match(f.node('faqStats').textContent,/0件/);
});

for(const kind of ['HTTP','network','malformed'])test(`FAQ ${kind} failure sets error and leaves all editors locked`,async()=>{
  const fetchResponse=kind==='HTTP'?()=>({ok:false,status:403,json:async()=>({message:'Synthetic forbidden'})}):
    kind==='network'?()=>Promise.reject(new Error('Synthetic offline')):()=>({ok:true,status:200,json:async()=>({content:'invalid-synthetic-json'})});
  const f=fixture({fetchResponse});f.refresh();await f.flush();
  assert.equal(f.panel.dataset.faqState,'error');assert.equal(f.calls.length,1);assertLocked(f);
  assert.match([f.node('faqStats').textContent,...f.toasts.map(toast=>toast.message)].join('\n'),/失敗|読み込|取得|エラー/);
});

test('a failed FAQ read can be retried without retaining the failed pending promise',async()=>{
  let attempts=0;const f=fixture({fetchResponse:()=>++attempts===1?Promise.reject(new Error('Synthetic offline')):responseFor()});
  f.refresh();await f.flush();assert.equal(f.panel.dataset.faqState,'error');
  f.refresh();await f.flush();assert.equal(f.panel.dataset.faqState,'loaded');assert.equal(f.calls.length,2);assertLocked(f,{selectable:true});
});

test('normal FAQ tab click still reads the synthetic GitHub contents',async()=>{
  const f=fixture();f.event(f.tab,'click');await f.flush();assert.equal(f.calls.length,1);
  assert.equal(f.panel.dataset.faqState,'loaded');assertLocked(f,{selectable:true});
});

test('forced writer clicks are intercepted before legacy handlers, confirmation, translation or any request',async()=>{
  const f=fixture();f.refresh();await f.flush();
  f.node('faqCreateQJa').value='合成新規質問';f.node('faqCreateAJa').value='合成新規回答';
  f.node('faqAdminKey').value='synthetic-test-key';const initialCalls=f.calls.length;
  for(const id of writers){
    const button=f.node(id);button.disabled=false;
    // A nested target catches bypasses that only compare event.target.id.
    const span=new Element('span');button.appendChild(span);f.event(span,'click');await f.flush();
  }
  assert.equal(f.calls.length,initialCalls,'blocked clicks must not perform even a preliminary GET');
  assert.deepEqual(f.legacyWriterCalls,[]);assert.deepEqual(f.confirms,[]);assert.deepEqual(f.keyWrites,[]);
  assert.equal(f.calls.filter(call=>call.method!=='GET').length,0);assertLocked(f,{selectable:true});
});

test('direct writer and translation functions stop before request, confirmation or key storage even without click interception',async()=>{
  const f=fixture({exposeActions:true});f.refresh();await f.flush();
  f.node('faqCreateQJa').value='合成新規質問';f.node('faqCreateAJa').value='合成新規回答';
  f.node('faqAdminKey').value='synthetic-test-key';const initialCalls=f.calls.length;
  for(const name of ['create','save','remove','bulkTranslate']){
    for(const id of writers)f.node(id).disabled=false;
    await f.actions[name]();assertLocked(f,{selectable:true});
    assert.equal(f.calls.length,initialCalls,name);assert.equal(f.confirms.length,0,name);assert.equal(f.keyWrites.length,0,name);
  }
  const unreadable=new Proxy({},{get(){assert.fail('a guarded low-level function must not inspect its payload');}});
  await assert.rejects(f.actions.writeFaq(unreadable,'synthetic-sha','Synthetic blocked update'),/FAQ.*準備中/);
  await assert.rejects(f.actions.enrich(unreadable,unreadable),/FAQ.*準備中/);
  assert.equal(f.calls.length,initialCalls);assert.deepEqual(f.confirms,[]);assert.deepEqual(f.keyWrites,[]);
  assertLocked(f,{selectable:true});
});
