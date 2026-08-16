(()=>{
let CMS=null;
const CMS_URL='https://raw.githubusercontent.com/Kale1205/fde-site/main/content/site-content.json';
const lang=()=>document.documentElement.lang||localStorage.getItem('fde-lang')||'ja';
const pick=obj=>{if(obj==null)return'';if(typeof obj==='string')return obj;const l=lang();return obj[l]||obj.en||obj.ja||Object.values(obj)[0]||''};
const esc=s=>String(s??'').replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
const attr=s=>esc(s).replace(/`/g,'&#96;');
const dateLabel=s=>String(s||'').replaceAll('-','.');
function newsSorted(){return [...(CMS?.news||[])].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))}
function newsImage(n,cls,always=false){if(n?.image)return `<div class="${cls}"><img src="${attr(n.image)}" alt="${attr(pick(n.title))}" loading="lazy"></div>`;if(!always)return'';return `<div class="${cls} cms-image-fallback"><img src="assets/baked-kale-mark.svg" alt="" aria-hidden="true"><span>Baked Kale / Kale’s FDE</span></div>`}
function renderStrip(){
 const bar=document.querySelector('.news-strip');if(!bar||!CMS)return;
 const product=newsSorted().find(n=>String(n.category||'').toLowerCase()==='product');
 const a=bar.querySelector('a'),b=bar.querySelector('b'),spans=bar.querySelectorAll('span');
 if(!product){bar.hidden=true;return}bar.hidden=false;
 if(a)a.href='news.html';if(b)b.textContent='Product Update';if(spans[0])spans[0].textContent=pick(product.title);
}
function ensureArticleModal(){
 let modal=document.getElementById('newsArticleModal');if(modal)return modal;
 modal=document.createElement('div');modal.id='newsArticleModal';modal.className='news-article-modal';modal.hidden=true;modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','newsArticleTitle');
 modal.innerHTML='<div class="news-article-backdrop" data-news-close></div><article class="news-article-panel"><button class="news-article-close" type="button" aria-label="Close" data-news-close>×</button><div id="newsArticleContent"></div></article>';
 document.body.appendChild(modal);return modal;
}
function openArticle(id){
 const n=(CMS?.news||[]).find(x=>x.id===id);if(!n)return;
 const modal=ensureArticleModal(),content=modal.querySelector('#newsArticleContent');
 content.innerHTML=`<div class="news-article-meta">${esc(dateLabel(n.date))} / ${esc(n.category||'Update')}</div><h2 id="newsArticleTitle">${esc(pick(n.title))}</h2>${newsImage(n,'news-article-image')}<div class="news-article-body">${esc(pick(n.body)).replace(/\n/g,'<br>')}</div>`;
 modal.hidden=false;document.body.classList.add('news-modal-open');modal.querySelector('.news-article-close')?.focus();
}
function closeArticle(){const modal=document.getElementById('newsArticleModal');if(!modal)return;modal.hidden=true;document.body.classList.remove('news-modal-open')}
function renderNews(){
 if(!CMS||!document.body.classList.contains('cms-news-page'))return;
 const all=newsSorted();if(!all.length)return;
 const featured=all.find(x=>x.featured)||all[0];
 const lead=document.getElementById('cmsNewsLead');
 if(lead){lead.href='#';lead.dataset.newsId=featured.id;lead.innerHTML=`${newsImage(featured,'cms-lead-image',true)}<div class="news-lead-copy"><div class="news-label">Top News / ${esc(featured.category||'Update')}</div><h2>${esc(pick(featured.title))}</h2><p>${esc(pick(featured.body))}</p><div class="news-meta">${esc(dateLabel(featured.date))}</div></div>`;}
 const latest=document.getElementById('cmsLatestList');
 if(latest){const cats=['Product','Development','Social'];const items=cats.map(c=>all.find(n=>String(n.category||'').toLowerCase()===c.toLowerCase())).filter(Boolean);latest.innerHTML=items.map(n=>`<button class="latest-card news-open" type="button" data-news-id="${attr(n.id)}">${newsImage(n,'cms-latest-image',true)}<div class="latest-card-copy"><small>${esc(n.category||'Update')} / ${esc(dateLabel(n.date))}</small><strong>${esc(pick(n.title))}</strong></div></button>`).join('');}
 const wire=document.getElementById('cmsNewsWire');
 if(wire){wire.innerHTML=all.map(n=>`<button class="wire-row news-open" type="button" data-news-id="${attr(n.id)}"><div class="wire-type">${esc(n.category||'Update')}</div><div class="wire-title">${esc(pick(n.title))}</div><time>${esc(dateLabel(n.date))}</time></button>`).join('');}
 renderInstagram();
}
function renderInstagram(){
 if(!CMS)return;const d=CMS.instagram||{};const box=document.getElementById('cmsInstagram');if(!box)return;
 box.href=d.profileUrl||'#';box.target='_blank';box.rel='noopener';
 const media=d.image?`<div class="instagram-photo"><img src="${attr(d.image)}" alt="${attr(d.handle||'Instagram')}"></div>`:`<div class="instagram-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4.2"></circle><circle cx="17.4" cy="6.7" r="1"></circle></svg></div>`;
 box.innerHTML=`${media}<div class="instagram-copy"><small>Instagram / Creative</small><h2>${esc(d.handle||'Instagram')}</h2><p>${esc(pick(d.description))}</p></div><div class="instagram-cta">View Instagram ↗</div>`;
}
async function load(){try{const r=await fetch(`${CMS_URL}?v=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(r.status);CMS=await r.json();renderStrip();renderNews();renderInstagram();}catch(e){console.warn('CMS content load failed',e)}}
document.addEventListener('DOMContentLoaded',()=>{load();const sel=document.getElementById('lang');if(sel)sel.addEventListener('change',()=>setTimeout(()=>{renderStrip();renderNews();renderInstagram()},0));new MutationObserver(()=>{renderStrip();renderNews();renderInstagram()}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});});
document.addEventListener('click',e=>{const open=e.target.closest('[data-news-id]');if(open&&document.body.classList.contains('cms-news-page')){e.preventDefault();openArticle(open.dataset.newsId);return}if(e.target.closest('[data-news-close]'))closeArticle()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeArticle()});
})();
