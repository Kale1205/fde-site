(()=>{
const CMS_URL='https://raw.githubusercontent.com/Kale1205/fde-site/main/content/site-content.json';
const BUILTIN='assets/news-fallback-user.svg';
let fallback=BUILTIN;
function apply(){document.querySelectorAll('.cms-image-fallback img').forEach(img=>{if(img.getAttribute('src')!==fallback)img.setAttribute('src',fallback);img.alt='Kale’s FDE default News image';img.removeAttribute('aria-hidden')})}
async function load(){try{const r=await fetch(`${CMS_URL}?fallback=${Date.now()}`,{cache:'no-store'});if(r.ok){const data=await r.json();fallback=(data.newsFallbackImage||'').trim()||BUILTIN}}catch(e){console.warn('News fallback CMS load failed',e)}apply()}
document.addEventListener('DOMContentLoaded',()=>{load();const observer=new MutationObserver(()=>apply());observer.observe(document.body,{childList:true,subtree:true});const lang=document.getElementById('lang');lang?.addEventListener('change',()=>setTimeout(apply,100))});
})();