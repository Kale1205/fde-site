(()=>{
const isJa=location.pathname.includes('/ja/');
const LANG=isJa?'ja':'en';
const FAQ_URL=isJa?'../content/faq-content.json':'content/faq-content.json';
const UI={ja:{placeholder:'質問・回答・関連語から検索',all:'すべて',none:'該当するFAQが見つかりませんでした。',loadFail:'FAQを読み込めませんでした。'},en:{placeholder:'Search questions, answers, and related terms',all:'All',none:'No matching FAQ was found.',loadFail:'FAQ could not be loaded.'}}[LANG];
const $=(s,c=document)=>c.querySelector(s);
let data={faq:[],categories:{},subcategories:{}};
let category='';
const pick=v=>{if(v==null)return'';if(typeof v==='string')return v;if(Array.isArray(v))return v.join(' ');return v[LANG]??v.en??v.ja??''};
const list=v=>{const x=v?.[LANG]??v?.en??v?.ja??[];return Array.isArray(x)?x:[x].filter(Boolean)};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v??'').normalize('NFKC').toLocaleLowerCase().replace(/[\s\p{P}\p{S}]+/gu,'');
function categoryLabel(key){return pick(data.categories?.[key]?.label)||key}
function subcategoryLabel(key){return pick(data.subcategories?.[key]?.label)||key}
function searchable(item){return norm([pick(item.question),pick(item.answer),...list(item.keywords),...list(item.synonyms),categoryLabel(item.category),subcategoryLabel(item.subcategory)].join(' '))}
function card(item){return `<article class="faq-item" data-faq-id="${esc(item.id)}"><button class="faq-q" type="button" aria-expanded="false"><span>${esc(pick(item.question))}</span><span class="faq-plus">＋</span></button><div class="faq-path"><span>${esc(categoryLabel(item.category))}</span><span>${esc(subcategoryLabel(item.subcategory))}</span></div><div class="faq-a">${esc(pick(item.answer)).replace(/\n/g,'<br>')}</div></article>`}
function ensureCategoryBar(){const listEl=$('#cmsFaqList');if(!listEl||$('#faqCategoryBar'))return;const bar=document.createElement('div');bar.id='faqCategoryBar';bar.className='faq-category-bar';listEl.before(bar);if(!$('#faqDualSiteStyle')){const st=document.createElement('style');st.id='faqDualSiteStyle';st.textContent='.faq-category-bar{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 24px}.faq-category-bar button{border:1px solid var(--line);background:#fff;padding:9px 12px;border-radius:999px;font-size:12px;font-weight:800;cursor:pointer}.faq-category-bar button.active{background:var(--green-deep,#095f3b);border-color:var(--green-deep,#095f3b);color:#fff}.faq-path{display:flex;gap:8px;flex-wrap:wrap;padding:0 12px 10px;color:var(--muted);font-size:11px}.faq-path span+span:before{content:"/";margin-right:8px}';document.head.appendChild(st)}}
function renderCategories(){ensureCategoryBar();const bar=$('#faqCategoryBar');if(!bar)return;const entries=Object.entries(data.categories||{}).sort((a,b)=>(a[1].order||99)-(b[1].order||99));bar.innerHTML=`<button type="button" data-faq-category="" class="${category===''?'active':''}">${UI.all}</button>`+entries.map(([key])=>`<button type="button" data-faq-category="${esc(key)}" class="${category===key?'active':''}">${esc(categoryLabel(key))}</button>`).join('')}
function render(){const input=$('#faqSearch'),listEl=$('#cmsFaqList'),empty=$('#faqEmpty');if(!listEl)return;const q=norm(input?.value||'');const items=[...(data.faq||[])].sort((a,b)=>Number(!!b.highFrequency)-Number(!!a.highFrequency)).filter(item=>(!category||item.category===category)&&(!q||searchable(item).includes(q)));listEl.innerHTML=items.map(card).join('');if(empty){empty.hidden=!!items.length;empty.textContent=UI.none}renderCategories()}
function wire(){const input=$('#faqSearch');if(input){input.placeholder=UI.placeholder;input.addEventListener('input',render)}document.addEventListener('click',e=>{const cat=e.target.closest('[data-faq-category]');if(cat){category=cat.dataset.faqCategory||'';render();return}const btn=e.target.closest('.faq-q');if(!btn)return;const item=btn.closest('.faq-item');const open=item.classList.toggle('open');btn.setAttribute('aria-expanded',open?'true':'false')})}
async function load(){try{const r=await fetch(`${FAQ_URL}?v=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(String(r.status));data=await r.json();render()}catch(e){console.warn('FAQ load failed',e);const empty=$('#faqEmpty');if(empty){empty.hidden=false;empty.textContent=UI.loadFail}}}
function init(){wire();load();if('BroadcastChannel'in window){const ch=new BroadcastChannel('fde-cms-updates');ch.addEventListener('message',e=>{if(e.data?.type==='faq-updated')load()})}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.addEventListener('pageshow',load);
})();
