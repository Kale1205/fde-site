(()=>{
'use strict';
const language=document.documentElement.lang;
const LANG=language.startsWith('zh')?'zh-CN':language.startsWith('ja')?'ja':'en';
const FAQ_URL=LANG==='en'?'content/faq-content.json':'../content/faq-content.json';
const UI={
 ja:{placeholder:'質問・回答・関連語から検索',all:'すべて',none:'該当するFAQが見つかりませんでした。'},
 en:{placeholder:'Search questions, answers, and related terms',all:'All',none:'No matching FAQ was found.'},
 'zh-CN':{placeholder:'搜索问题、回答及相关词',all:'全部',none:'未找到匹配的常见问题。'},
}[LANG];
const $=(s,c=document)=>c.querySelector(s);
const listEl=$('#cmsFaqList');
if(!listEl)return;
const pick=v=>typeof v==='string'?v:v?.[LANG]??v?.en??v?.ja??'';
const words=v=>{const x=Array.isArray(v)?v:v?.[LANG]??v?.en??[];return Array.isArray(x)?x:[];};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v??'').normalize('NFKC').toLocaleLowerCase().replace(/[\s\p{P}\p{S}]+/gu,'');
let category='';
let data={faq:[],categories:{},subcategories:{}};
const categoryOrder=['status','license','restrictions','updates','rights','orders','product'];
// Published HTML is immediately usable, including when the network is offline.
function readPublishedContent(){
 listEl.querySelectorAll('.faq-item').forEach(item=>{
  const key=item.dataset.faqCategoryKey,sub=item.dataset.faqSubcategory;
  const path=item.querySelectorAll('.faq-path span');
  if(key)data.categories[key]={order:categoryOrder.indexOf(key)+1,label:path[0]?.textContent||key};
  if(sub)data.subcategories[sub]={label:path[1]?.textContent||sub};
  data.faq.push({id:item.dataset.faqId,category:key,subcategory:sub,
   question:item.querySelector('.faq-q span')?.textContent||'',answer:item.querySelector('.faq-a')?.textContent||'',
   keywords:(item.dataset.faqTerms||'').split(' ')});
 });
}
const categoryLabel=key=>pick(data.categories?.[key]?.label)||key;
const subcategoryLabel=key=>pick(data.subcategories?.[key]?.label)||key;
function searchable(item){return norm([pick(item.question),pick(item.answer),...words(item.keywords),...words(item.synonyms),categoryLabel(item.category),subcategoryLabel(item.subcategory)].join(' '));}
function renderCategories(){
 const focused=document.activeElement?.closest('[data-faq-category]')?.dataset.faqCategory;
 let bar=$('#faqCategoryBar');
 if(!bar){bar=document.createElement('div');bar.id='faqCategoryBar';bar.className='faq-category-bar';listEl.before(bar);}
 if(!$('#faqDualSiteStyle')){
  const style=document.createElement('style');style.id='faqDualSiteStyle';
  style.textContent='.faq-category-bar{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 24px}.faq-category-bar button{border:1px solid var(--line);background:#fff;padding:9px 12px;border-radius:999px;font-size:12px;font-weight:800;cursor:pointer}.faq-category-bar button.active{background:var(--green-deep,#095f3b);border-color:var(--green-deep,#095f3b);color:#fff}.faq-path{display:flex;gap:8px;flex-wrap:wrap;padding:0 12px 10px;color:var(--muted);font-size:11px}.faq-path span+span:before{content:"/";margin-right:8px}';
  document.head.appendChild(style);
 }
 const entries=Object.entries(data.categories).sort((a,b)=>(a[1].order||99)-(b[1].order||99));
 bar.innerHTML='<button type="button" data-faq-category="" aria-pressed="'+(category==='')+'" class="'+(category===''?'active':'')+'">'+UI.all+'</button>'+entries.map(([key])=>'<button type="button" data-faq-category="'+esc(key)+'" aria-pressed="'+(category===key)+'" class="'+(category===key?'active':'')+'">'+esc(categoryLabel(key))+'</button>').join('');
 if(focused!==undefined)bar.querySelector('[data-faq-category="'+CSS.escape(focused)+'"]')?.focus();
}
function filter(){
 const q=norm($('#faqSearch')?.value||'');
 const byId=new Map(data.faq.map(item=>[item.id,item]));
 let count=0;
 listEl.querySelectorAll('.faq-item').forEach(element=>{
  const item=byId.get(element.dataset.faqId);
  const match=!!item&&(!category||item.category===category)&&(!q||searchable(item).includes(q));
  element.hidden=!match;if(match)count++;
 });
 const empty=$('#faqEmpty');if(empty){empty.hidden=count>0;empty.textContent=UI.none;}
}
function card(item){
 const id='faq-answer-'+item.id;
 return '<article class="faq-item" data-faq-id="'+esc(item.id)+'"><button class="faq-q" type="button" aria-expanded="false" aria-controls="'+esc(id)+'"><span>'+esc(pick(item.question))+'</span><span class="faq-plus" aria-hidden="true">＋</span></button><div class="faq-path"><span>'+esc(categoryLabel(item.category))+'</span><span>'+esc(subcategoryLabel(item.subcategory))+'</span></div><div class="faq-a" id="'+esc(id)+'">'+esc(pick(item.answer)).replace(/\n/g,'<br>')+'</div></article>';
}
function signature(items){return JSON.stringify(items.map(item=>[item.id,pick(item.question),pick(item.answer).replace(/\s+/g,' ').trim()]));}
async function load(){
 try{
  const r=await fetch(FAQ_URL+'?v='+Date.now(),{cache:'no-store'});
  if(!r.ok)throw new Error(String(r.status));
  const next=await r.json();
  // Untranslated future CMS entries must not overwrite the reviewed Chinese HTML.
  if(LANG==='zh-CN'&&next.faq.some(item=>!item.question?.[LANG]||!item.answer?.[LANG]))return;
  const items=[...next.faq].sort((a,b)=>Number(!!b.highFrequency)-Number(!!a.highFrequency));
  const changed=signature(data.faq)!==signature(items);
  const open=new Set([...listEl.querySelectorAll('.faq-item.open')].map(item=>item.dataset.faqId));
  data=next;data.faq=items;
  if(changed){
   listEl.innerHTML=items.map(card).join('');
   listEl.querySelectorAll('.faq-item').forEach(item=>{if(open.has(item.dataset.faqId)){item.classList.add('open');item.querySelector('button').setAttribute('aria-expanded','true');}});
  }
  renderCategories();filter();
 }catch(error){console.warn('FAQ refresh failed; published content retained',error);}
}
function init(){
 readPublishedContent();renderCategories();filter();
 const input=$('#faqSearch');if(input){input.placeholder=UI.placeholder;input.addEventListener('input',filter);}
 document.addEventListener('click',e=>{
  const cat=e.target.closest('[data-faq-category]');
  if(cat){category=cat.dataset.faqCategory||'';renderCategories();filter();$('#faqCategoryBar')?.querySelector('[data-faq-category="'+CSS.escape(category)+'"]')?.focus();return;}
  const btn=e.target.closest('.faq-q');if(!btn||!listEl.contains(btn))return;
  const open=btn.closest('.faq-item').classList.toggle('open');btn.setAttribute('aria-expanded',String(open));
 });
 load();
 if('BroadcastChannel'in window)new BroadcastChannel('fde-cms-updates').addEventListener('message',e=>{if(e.data?.type==='faq-updated')load();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.addEventListener('pageshow',load);
})();
