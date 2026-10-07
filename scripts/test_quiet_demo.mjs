import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import test from 'node:test';
import vm from 'node:vm';
import {renderQuietDemo} from './build_quiet_demo.mjs';
import {normalizeAssetBuildKeys} from './asset_build_test_helpers.mjs';

const root = new URL('../', import.meta.url);
const baseline='e13457ad75068fa753b3f6dc6705d1aa1de2a61c';
const runtime=readFileSync(new URL('demo-v1.js',root),'utf8');
for(const [dir,locale] of [['','en'],['ja/','ja'],['zh/','zh']]) {
  const file=`${dir}demo.html`;
  const html=normalizeAssetBuildKeys(readFileSync(new URL(file,root),'utf8'));
  const before=normalizeAssetBuildKeys(execFileSync('git',['show',`${baseline}:${file}`],{encoding:'utf8'}));
  test(`${file}: selected switchboard composition is idempotent`,()=>{
    const rendered=renderQuietDemo(before,locale);
    assert.equal(renderQuietDemo(rendered,locale),rendered);
    assert.equal(renderQuietDemo(html,locale),html);
    assert.equal((html.match(/data-demo-view=/g)||[]).length,3);
    assert.match(html,/class="demo-hero"/);
    assert.match(html,/id="demoGuide"/);
    assert.match(html,/data-demo-notes/);
    assert.match(html,/class="demo-selected-product"/);
  });
  test(`${file}: copy, metadata, fields and destinations are retained`,()=>{
    assert.equal(html.slice(0,html.indexOf('</head>')),before.slice(0,before.indexOf('</head>')) + '  <link rel="stylesheet" href="'+(dir?'../':'')+'quiet-pages.css?v=BUILD">\n');
    const oldText=before.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
    const newText=html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
    for(const text of before.matchAll(/>([^<>]+)</g)) {
      const value=text[1].replace(/\s+/g,' ').trim();
      if(value)assert.ok(newText.includes(value),`missing original text: ${value}`);
    }
    assert.ok(oldText.length>0);
    for(const id of [...before.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]))assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1,id);
    const links=s=>[...s.matchAll(/\bhref="([^"]+)"/g)].map(m=>m[1]).sort();
    assert.deepEqual(links(html),links(before).concat([`${dir?'../':''}quiet-pages.css?v=BUILD`]).sort());
    assert.equal((html.match(/<caption /g)||[]).length,2);
    assert.equal((html.match(/scope="col"/g)||[]).length,12);
    assert.equal((html.match(/role="region"[^>]*tabindex="0"/g)||[]).length,2);
  });
}

// A minimal DOM harness exercises the real simulation, not a duplicated stock engine.
function makeDemo(locale, compact) {
  const nodes=new Map();
  function node(key) {
    if(nodes.has(key))return nodes.get(key);
    const listeners={};
    const n={key,value:'',textContent:'',innerHTML:'',hidden:false,dataset:{},min:'1',listeners,
      addEventListener:(type,fn)=>{(listeners[type]??=[]).push(fn);},
      dispatch(type,event={}){for(const fn of listeners[type]||[])fn({preventDefault(){},...event});},
      setAttribute:(k,v)=>{n[k]=v;},focus(){},scrollIntoView(){},
      querySelector:s=>node(s),querySelectorAll:()=>[]};
    nodes.set(key,n);return n;
  }
  const viewButtons=['inventory','operation','history'].map(view=>{const n=node(`view-${view}`);n.dataset.demoView=view;return n;});
  const match={matches:compact,addEventListener(type,fn){this.listener=fn;}};
  const document={documentElement:{lang:locale},body:{classList:{contains:()=>true}},getElementById:id=>node('#'+id),querySelector:node,querySelectorAll:s=>s==='[data-demo-view]'?viewButtons:[]};
  node('#demoOperation').value='receive';node('#demoProduct').value='cup';node('#demoSource').value='main';node('#demoDestination').value='osaka';node('#demoQuantity').value='5';
  vm.runInNewContext(runtime,{document,window:{matchMedia:query=>query.includes('max-width')?match:{matches:false}},Intl,Date});
  const submit=(op,qty,source='main',dest='osaka')=>{node('#demoOperation').value=op;node('#demoOperation').dispatch('change');node('#demoSource').value=source;node('#demoDestination').value=dest;node('#demoQuantity').value=String(qty);node('#demoOperationForm').dispatch('submit');};
  const stock=()=>[0,1,2].map(i=>Number(node(`[data-demo-selected-stock="${i}"]`).textContent));
  return {node,viewButtons,match,submit,stock};
}

for(const locale of ['en','ja','zh-CN'])for(const compact of [false,true]) {
  test(`${locale}, ${compact?'mobile':'desktop'}: views and complete stock workflow`,()=>{
    const d=makeDemo(locale,compact);
    assert.equal(d.node('#imsDemoRoot').dataset.demoView,compact?'operation':'inventory');
    assert.equal(d.node('#demoInventoryView').hidden,compact);
    assert.equal(d.node('#demoOperationForm').hidden,false);
    assert.deepEqual(d.stock(),[326,20,346]);
    d.submit('receive',5);assert.deepEqual(d.stock(),[326,25,351]);
    d.submit('transfer',10);assert.deepEqual(d.stock(),[316,35,351]);
    d.submit('count',0);assert.deepEqual(d.stock(),[0,35,35]);
    d.submit('ship',5,'osaka');assert.deepEqual(d.stock(),[0,30,30]);
    assert.equal(d.node('#kpiActions').textContent,'4');
    d.submit('ship',1000,'osaka');assert.deepEqual(d.stock(),[0,30,30]);assert.equal(d.node('#demoResult').dataset.state,'error');
    d.submit('transfer',1,'osaka','osaka');assert.equal(d.node('#demoResult').dataset.state,'error');
    d.viewButtons[2].dispatch('click');assert.equal(d.node('#demoHistoryView').hidden,false);assert.equal(d.node('#demoOperationForm').hidden,true);
    d.viewButtons[2].dispatch('keydown',{key:'Home'});assert.equal(d.node('#imsDemoRoot').dataset.demoView,'inventory');
    d.node('#demoSearch').value='NO-MATCH';d.node('#demoSearch').dispatch('input');assert.equal(d.node('#demoEmpty').hidden,false);
    d.node('#demoReset').dispatch('click');assert.deepEqual(d.stock(),[326,20,346]);assert.equal(d.node('#kpiActions').textContent,'0');assert.equal(d.node('#demoSearch').value,'');
    d.node('#demoProduct').value='box';d.node('#demoProduct').dispatch('change');assert.deepEqual(d.stock(),[84,12,96]);
    assert.ok(d.node('#demoHistoryBody').innerHTML.includes('RCV-1042'));
  });
}

test('public demo stays disconnected and enhancement is scoped away from W01',()=>{
  assert.doesNotMatch(runtime,/fetch\(|localStorage|sessionStorage|indexedDB|WebSocket/);
  assert.match(runtime,/classList\.contains\('demo-renewal'\)/);
  const builder=readFileSync(new URL('scripts/build_quiet_form_preview.mjs',root),'utf8');
  assert.match(builder,/renewedDemo \? await readFile\(path\.join\(root, locales\[locale\], 'index\.html'\)/);
});
