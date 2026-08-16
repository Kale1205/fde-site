(()=>{
let CMS=null;
const CMS_URL='https://raw.githubusercontent.com/Kale1205/fde-site/main/content/site-content.json';
const lang=()=>document.documentElement.lang||localStorage.getItem('fde-lang')||'ja';
const pick=obj=>{if(obj==null)return'';if(typeof obj==='string')return obj;const l=lang();return obj[l]||obj.en||obj.ja||Object.values(obj)[0]||''};
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const attr=s=>esc(s).replace(/`/g,'&#96;');
const dateLabel=s=>String(s||'').replaceAll('-','.');
const demoAttr=link=>(link||'').includes('demo.html')?' data-demo-open':'';
function renderStrip(){
 const bar=document.querySelector('.news-strip');if(!bar||!CMS)return;
 const d=CMS.latestStrip||{};bar.hidden=d.enabled===false;
 if(d.enabled===false)return;
 const a=bar.querySelector('a');const b=bar.querySelector('b');const spans=bar.querySelectorAll('span');
 if(a)a.href=d.link||'news.html';if(b)b.textContent=pick(d.label);if(spans[0])spans[0].textContent=pick(d.text);
}
function newsSorted(){return [...(CMS?.news||[])].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))}
function renderNews(){
 if(!CMS||!document.body.classList.contains('cms-news-page'))return;
 const all=newsSorted();if(!all.length)return;
 const featured=all.find(x=>x.featured)||all[0];
 const lead=document.getElementById('cmsNewsLead');
 if(lead){lead.href=featured.link||'#';if((featured.link||'').includes('demo.html'))lead.setAttribute('data-demo-open','');else lead.removeAttribute('data-demo-open');lead.innerHTML=`${featured.image?`<div class="cms-lead-image"><img src="${attr(featured.image)}" alt=""></div>`:''}<div class="news-label">${esc(featured.category||'Update')}</div><h2>${esc(pick(featured.title))}</h2><p>${esc(pick(featured.body))}</p><div class="news-meta">${esc(dateLabel(featured.date))} / ${esc(featured.category||'Update')}</div>`;}
 const latest=document.getElementById('cmsLatestList');if(latest){latest.innerHTML='<h2>Latest</h2>'+all.slice(0,5).map(n=>`<a class="latest-row" href="${attr(n.link||'#')}"${demoAttr(n.link)}><small>${esc(dateLabel(n.date))} / ${esc(n.category||'Update')}</small><strong>${esc(pick(n.title))}</strong></a>`).join('');}
 const wire=document.getElementById('cmsNewsWire');if(wire){wire.innerHTML=all.map(n=>`<a class="wire-row" href="${attr(n.link||'#')}"${demoAttr(n.link)}><div class="wire-type">${esc(n.category||'Update')}</div><div><h3>${esc(pick(n.title))}</h3><p>${esc(pick(n.body))}</p></div><time>${esc(dateLabel(n.date))}</time></a>`).join('');}
 renderInstagram();
}
function renderInstagram(){
 if(!CMS)return;const d=CMS.instagram||{};const box=document.getElementById('cmsInstagram');if(!box)return;
 box.href=d.profileUrl||'#';box.target='_blank';box.rel='noopener';
 const media=d.image?`<div class="instagram-photo"><img src="${attr(d.image)}" alt="${attr(d.handle||'Instagram')}"></div>`:`<div class="instagram-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4.2"></circle><circle cx="17.4" cy="6.7" r="1"></circle></svg></div>`;
 box.innerHTML=`${media}<div class="instagram-copy"><small>Instagram / Creative</small><h2>${esc(d.handle||'Instagram')}</h2><p>${esc(pick(d.description))}</p></div><div class="instagram-cta">Instagram ↗</div>`;
}
async function load(){try{const r=await fetch(`${CMS_URL}?v=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(r.status);CMS=await r.json();renderStrip();renderNews();renderInstagram();}catch(e){console.warn('CMS content load failed',e)}}
document.addEventListener('DOMContentLoaded',()=>{load();const sel=document.getElementById('lang');if(sel)sel.addEventListener('change',()=>setTimeout(()=>{renderStrip();renderNews();renderInstagram()},0));new MutationObserver(()=>{renderStrip();renderNews();renderInstagram()}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});});
document.addEventListener('click',e=>{const a=e.target.closest('[data-demo-open]');if(!a||!document.body.classList.contains('cms-news-page'))return;e.preventDefault();const w=window.open('demo.html','KalesFDE_IMS_Demo');if(w)w.focus();else window.location.href='demo.html';});
})();
