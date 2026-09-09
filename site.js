(()=>{
const qs=(s,c=document)=>c.querySelector(s);const qsa=(s,c=document)=>[...c.querySelectorAll(s)];
function openDemo(){const href='demo.html';const w=window.open(href,'KalesFDE_IMS_Demo');if(w)w.focus();else location.href=href}
function updateDemo(){
 const values=qsa('[data-stock-value]').map(el=>parseInt(el.textContent,10)||0),isJa=document.documentElement.lang==='ja';
 const total=qs('#kpiItems'),low=qs('#kpiLow');
 if(total)total.textContent=qsa('#inventoryBody tr').length;if(low)low.textContent=values.filter(v=>v<30).length;
 qsa('#inventoryBody tr').forEach(r=>{const cell=qs('[data-stock-value]',r),status=qs('[data-stock-status]',r);if(cell&&status)status.textContent=(parseInt(cell.textContent,10)||0)<30?(isJa?'要補充':'Low'):(isJa?'適正':'Healthy')});
}
function addDemoDemandCallout(){
 if(!document.body.classList.contains('demo-app')||qs('[data-web-demo-demand]'))return;
 const intro=qs('.demo-intro');if(!intro)return;
 const isJa=document.documentElement.lang==='ja';
 const wrap=document.createElement('div');wrap.className='ims-pre';wrap.dataset.webDemoDemand='1';
 const strong=document.createElement('strong');strong.textContent=isJa?'WEB DEMO / 全OSのブラウザから利用可能':'WEB DEMO / AVAILABLE ACROSS MAJOR BROWSER PLATFORMS';
 const p=document.createElement('p');p.textContent=isJa?'このWeb DemoはmacOS・Windows・Linux・iPhone/iPad・Androidのmodern browser向け開発プレビューです。初回のネイティブv1.0はApple M2以降 / macOS 12+を対象とし、他OSのネイティブ対応は需要データを見ながら優先順位を決めます。':'This Web Demo is a browser-based development preview for modern browsers on macOS, Windows, Linux, iPhone/iPad, and Android. The first native v1.0 targets Apple M2 or later on macOS 12+, while later native platforms will be prioritized using demand data.';
 const demand=document.createElement('p');demand.className='demo-note';demand.append(document.createTextNode(isJa?'希望するネイティブ対応を教えてください: ':'Tell us which native platform you need: '));
 const options=[['Windows','Windows'],['Mac M1','M1'],['Mac M2 or later','M2-or-later'],['iPhone / iPad','iOS-iPadOS'],['Android','Android'],['Linux','Linux'],['Other / Not sure','Other-Not-sure']];
 options.forEach(([label,value],index)=>{const a=document.createElement('a');a.href=`contact.html?source=web-demo&platform=${encodeURIComponent(value)}#contactForm`;a.textContent=label;a.rel='nofollow';demand.append(a);if(index<options.length-1)demand.append(document.createTextNode(' · '))});
 const note=document.createElement('small');note.className='demo-note';note.textContent=isJa?'Web Demoの利用可否は、各OS向けネイティブアプリの対応・正式リリース・セキュリティ検証完了を意味しません。':'Web Demo availability does not mean the corresponding native app is supported, released, or security-validated.';
 wrap.append(strong,p,demand,note);intro.appendChild(wrap);
}
function init(){
 const mt=qs('.mobile-toggle'),nav=qs('.main-nav'),header=qs('.site-header');if(mt&&nav&&header){mt.addEventListener('click',e=>{e.stopPropagation();nav.classList.toggle('open');mt.setAttribute('aria-expanded',nav.classList.contains('open')?'true':'false')});document.addEventListener('click',e=>{if(nav.classList.contains('open')&&!header.contains(e.target)){nav.classList.remove('open');mt.setAttribute('aria-expanded','false')}})}
 qsa('[data-demo-open]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();openDemo()}));
 const close=qs('#closeDemo');if(close)close.addEventListener('click',()=>{if(window.opener&&!window.opener.closed){window.opener.focus();window.close()}else location.href='index.html#demo'});
 qsa('.faq-q').forEach(btn=>btn.addEventListener('click',()=>btn.closest('.faq-item')?.classList.toggle('open')));
 const faqSearch=qs('#faqSearch');if(faqSearch)faqSearch.addEventListener('input',()=>{const v=faqSearch.value.trim().toLowerCase();let shown=0;qsa('.faq-item').forEach(item=>{const hit=!v||item.textContent.toLowerCase().includes(v);item.style.display=hit?'':'none';if(hit)shown++});const empty=qs('#faqEmpty');if(empty)empty.style.display=shown?'none':'block'});
 const demoSearch=qs('#demoSearch');if(demoSearch)demoSearch.addEventListener('input',()=>{const v=demoSearch.value.trim().toLowerCase();qsa('#inventoryBody tr').forEach(r=>r.style.display=r.textContent.toLowerCase().includes(v)?'':'none')});
 qsa('[data-stock]').forEach(btn=>btn.addEventListener('click',()=>{const cell=btn.closest('tr')?.querySelector('[data-stock-value]');if(!cell)return;const n=parseInt(cell.textContent,10)||0;cell.textContent=Math.max(0,n+(btn.dataset.stock==='in'?5:-5));updateDemo()}));
 const reset=qs('#demoReset');if(reset)reset.addEventListener('click',()=>{qsa('[data-stock-value]').forEach((c,i)=>c.textContent=[326,84,18,41,210][i]??c.textContent);if(demoSearch){demoSearch.value='';demoSearch.dispatchEvent(new Event('input'))}updateDemo()});
 addDemoDemandCallout();updateDemo();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
