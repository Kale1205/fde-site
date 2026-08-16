(()=>{
const CMS_URL='https://raw.githubusercontent.com/Kale1205/fde-site/main/content/site-content.json';
const $=(s,c=document)=>c.querySelector(s);
const lang=()=>document.documentElement.lang||localStorage.getItem('fde-lang')||'ja';
const pick=obj=>{if(!obj)return'';if(typeof obj==='string')return obj;const l=lang();return obj[l]||obj.en||obj.ja||Object.values(obj)[0]||''};
let faq=[];
function render(){const box=$('#cmsFaqList');if(!box)return;box.innerHTML=faq.map(item=>`<div class="faq-item"><button class="faq-q" type="button"><span>${escapeHtml(pick(item.question))}</span><span>＋</span></button><div class="faq-a">${escapeHtml(pick(item.answer)).replace(/\n/g,'<br>')}</div></div>`).join('');filterFaq()}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function filterFaq(){const q=($('#faqSearch')?.value||'').trim().toLocaleLowerCase();let shown=0;document.querySelectorAll('#cmsFaqList .faq-item').forEach(item=>{const text=(item.querySelector('.faq-q')?.textContent||'').toLocaleLowerCase();const hit=!q||text.includes(q);item.style.display=hit?'':'none';if(hit)shown++});const empty=$('#faqEmpty');if(empty)empty.style.display=shown?'none':'block'}
async function load(){try{const r=await fetch(`${CMS_URL}?v=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(r.status);const data=await r.json();faq=Array.isArray(data.faq)?data.faq:[];render()}catch(e){console.warn('FAQ CMS load failed',e)}}
document.addEventListener('click',e=>{const btn=e.target.closest('#cmsFaqList .faq-q');if(!btn)return;btn.closest('.faq-item')?.classList.toggle('open')});
document.addEventListener('DOMContentLoaded',()=>{load();$('#faqSearch')?.addEventListener('input',filterFaq);$('#lang')?.addEventListener('change',()=>setTimeout(render,0));new MutationObserver(()=>render()).observe(document.documentElement,{attributes:true,attributeFilter:['lang']})});
})();
