(()=>{
const qs=(s,c=document)=>c.querySelector(s);const qsa=(s,c=document)=>[...c.querySelectorAll(s)];
function openDemo(){const href='demo.html';const w=window.open(href,'KalesFDE_IMS_Demo');if(w)w.focus();else location.href=href}
function init(){
 const mt=qs('.mobile-toggle'),nav=qs('.main-nav'),header=qs('.site-header');if(mt&&nav&&header){mt.addEventListener('click',e=>{e.stopPropagation();nav.classList.toggle('open');mt.setAttribute('aria-expanded',nav.classList.contains('open')?'true':'false')});document.addEventListener('click',e=>{if(nav.classList.contains('open')&&!header.contains(e.target)){nav.classList.remove('open');mt.setAttribute('aria-expanded','false')}})}
 qsa('[data-demo-open]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();openDemo()}));
 const close=qs('#closeDemo');if(close)close.addEventListener('click',()=>{if(window.opener&&!window.opener.closed){window.opener.focus();window.close()}else location.href='index.html#demo'});
 qsa('.faq-q').forEach(btn=>btn.addEventListener('click',()=>btn.closest('.faq-item')?.classList.toggle('open')));
 const faqSearch=qs('#faqSearch');if(faqSearch)faqSearch.addEventListener('input',()=>{const v=faqSearch.value.trim().toLowerCase();let shown=0;qsa('.faq-item').forEach(item=>{const hit=!v||item.textContent.toLowerCase().includes(v);item.style.display=hit?'':'none';if(hit)shown++});const empty=qs('#faqEmpty');if(empty)empty.style.display=shown?'none':'block'});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
