(()=>{
const qs=(s,c=document)=>c.querySelector(s);const qsa=(s,c=document)=>[...c.querySelectorAll(s)];
try{localStorage.setItem('fde-lang','en')}catch{}
document.documentElement.lang='en';document.documentElement.dir='ltr';
function openDemo(){const w=window.open('demo.html','KalesFDE_IMS_Demo');if(w)w.focus();else location.href='demo.html'}
function updateDemo(){const values=qsa('[data-stock-value]').map(el=>parseInt(el.textContent,10)||0);const total=qs('#kpiItems'),low=qs('#kpiLow');if(total)total.textContent=qsa('#inventoryBody tr').length;if(low)low.textContent=values.filter(v=>v<30).length;qsa('#inventoryBody tr').forEach(r=>{const cell=qs('[data-stock-value]',r),status=qs('[data-stock-status]',r);if(cell&&status)status.textContent=(parseInt(cell.textContent,10)||0)<30?'Low':'Healthy'})}
function init(){
 const lang=qs('#lang');if(lang){lang.value='en';lang.disabled=true;lang.hidden=true}
 const mt=qs('.mobile-toggle'),nav=qs('.main-nav'),header=qs('.site-header');if(mt&&nav&&header){mt.addEventListener('click',e=>{e.stopPropagation();nav.classList.toggle('open');mt.setAttribute('aria-expanded',nav.classList.contains('open')?'true':'false')});document.addEventListener('click',e=>{if(nav.classList.contains('open')&&!header.contains(e.target)){nav.classList.remove('open');mt.setAttribute('aria-expanded','false')}})}
 qsa('[data-demo-open]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();openDemo()}));
 const close=qs('#closeDemo');if(close)close.addEventListener('click',()=>{if(window.opener&&!window.opener.closed){window.opener.focus();window.close()}else location.href='index.html#demo'});
 qsa('.faq-q').forEach(btn=>btn.addEventListener('click',()=>btn.closest('.faq-item')?.classList.toggle('open')));
 const faqSearch=qs('#faqSearch');if(faqSearch)faqSearch.addEventListener('input',()=>{const v=faqSearch.value.trim().toLowerCase();let shown=0;qsa('.faq-item').forEach(item=>{const hit=!v||item.textContent.toLowerCase().includes(v);item.style.display=hit?'':'none';if(hit)shown++});const empty=qs('#faqEmpty');if(empty)empty.style.display=shown?'none':'block'});
 const demoSearch=qs('#demoSearch');if(demoSearch)demoSearch.addEventListener('input',()=>{const v=demoSearch.value.trim().toLowerCase();qsa('#inventoryBody tr').forEach(r=>r.style.display=r.textContent.toLowerCase().includes(v)?'':'none')});
 qsa('[data-stock]').forEach(btn=>btn.addEventListener('click',()=>{const cell=btn.closest('tr')?.querySelector('[data-stock-value]');if(!cell)return;const n=parseInt(cell.textContent,10)||0;cell.textContent=Math.max(0,n+(btn.dataset.stock==='in'?5:-5));updateDemo()}));
 const reset=qs('#demoReset');if(reset)reset.addEventListener('click',()=>{qsa('[data-stock-value]').forEach((c,i)=>c.textContent=[326,84,18,41,210][i]??c.textContent);if(demoSearch){demoSearch.value='';demoSearch.dispatchEvent(new Event('input'))}updateDemo()});
 updateDemo();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
