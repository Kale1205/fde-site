// Public Contact/CMS environment configuration. Do not place API keys here.
const FDE_IS_STAGING = location.hostname.endsWith('.pages.dev');
window.FDE_RUNTIME_ENV = FDE_IS_STAGING ? 'staging' : 'production';
window.FDE_CMS_BRANCH = FDE_IS_STAGING ? 'develop' : 'main';

// Production and staging use different Workers. The staging Worker is dry-run only
// and stores submissions in a dedicated staging KV namespace without sending mail.
window.FDE_CONTACT_API = FDE_IS_STAGING
  ? 'https://kales-fde-contact-staging.reyouinjune.workers.dev'
  : 'https://kales-fde-contact.reyouinjune.workers.dev';
window.FDE_TURNSTILE_SITE_KEY = FDE_IS_STAGING
  ? '0x4AAAAAAEWuRQJQHyURJntK'
  : '0x4AAAAAAEUE-c6Y6_E5XBLP';

const FDE_SITE_BASE = location.pathname.includes('/fde-site/') ? '/fde-site/' : '/';
const TURNSTILE_RUNTIME = 'turnstile-protection.js?v=20260828-three-plan-ja';

if(window.FDE_CONTACT_API && /(?:^|\/)(?:contact|order)\.html$/.test(location.pathname) && !window.__FDE_TURNSTILE_LOADER_ADDED__){
  window.__FDE_TURNSTILE_LOADER_ADDED__=true;
  const turnstileScript=document.createElement('script');
  turnstileScript.src=`${FDE_SITE_BASE}${TURNSTILE_RUNTIME}`;
  turnstileScript.async=false;
  turnstileScript.dataset.fdeTurnstileLoader='1';
  document.head.appendChild(turnstileScript);
}

if(location.pathname.endsWith('/cms-admin.html') && !window.__FDE_ADMIN_RUNTIME_LOADED__){
  window.__FDE_ADMIN_RUNTIME_LOADED__=true;
  const ADMIN_KEY_SESSION='fde-admin-key-session';
  const KEY_SELECTORS=['#adminKey','#faqAdminKey'];
  const readSessionKey=()=>{try{return sessionStorage.getItem(ADMIN_KEY_SESSION)||''}catch{return''}};
  const writeSessionKey=value=>{try{if(value)sessionStorage.setItem(ADMIN_KEY_SESSION,value);else sessionStorage.removeItem(ADMIN_KEY_SESSION)}catch{}};
  const syncAdminKeyFields=value=>{const key=String(value??readSessionKey()).trim();if(!key)return;KEY_SELECTORS.forEach(sel=>{const el=document.querySelector(sel);if(el&&el.value!==key)el.value=key})};
  window.FDE_ADMIN_KEY={get:readSessionKey,set(value){const key=String(value||'').trim();writeSessionKey(key);syncAdminKeyFields(key);return key},clear(){writeSessionKey('');KEY_SELECTORS.forEach(sel=>{const el=document.querySelector(sel);if(el)el.value=''})}};

  function ensureSharedAdminKeyField(){
    if(document.getElementById('adminKey'))return;
    const tokenField=document.getElementById('token')?.closest('.field');if(!tokenField)return;
    const field=document.createElement('div');field.className='field';
    field.innerHTML='<label for="adminKey">Admin fulfillment key</label><input id="adminKey" type="password" autocomplete="off" placeholder="ADMIN_FULFILLMENT_KEY"><div class="token-note">News・FAQの英語版生成に使用します。このタブのセッション中だけ保持します。</div>';
    tokenField.insertAdjacentElement('afterend',field);
  }

  document.addEventListener('input',e=>{const el=e.target;if(!(el instanceof HTMLInputElement))return;if(KEY_SELECTORS.some(sel=>el.matches(sel))){const key=el.value.trim();writeSessionKey(key);if(key)syncAdminKeyFields(key)}},true);

  if(!window.__FDE_CMS_SCROLL_PATCHED__){window.__FDE_CMS_SCROLL_PATCHED__=true;const nativeScrollIntoView=Element.prototype.scrollIntoView;Element.prototype.scrollIntoView=function(...args){if(this?.id==='adminStatus')return;return nativeScrollIntoView.apply(this,args)}}

  let toastTimer=0,toastShownAt=0;
  const hideToast=()=>{const box=document.getElementById('fdeAdminToast');if(box)box.classList.remove('show')};
  window.FDE_ADMIN_TOAST=(message,type='')=>{const text=String(message||'').trim();if(!text)return;let box=document.getElementById('fdeAdminToast');if(!box){box=document.createElement('div');box.id='fdeAdminToast';box.setAttribute('role','status');box.setAttribute('aria-live','polite');document.body.appendChild(box);const st=document.createElement('style');st.id='fdeAdminToastStyle';st.textContent='#fdeAdminToast{position:fixed;z-index:99999;left:50%;top:50%;width:min(560px,calc(100% - 36px));padding:16px 20px;border:1px solid #b8c8bf;background:rgba(247,250,248,.98);color:#17251f;box-shadow:0 18px 60px rgba(15,35,26,.22);font-size:13px;font-weight:750;line-height:1.65;text-align:center;opacity:0;pointer-events:none;transform:translate(-50%,-50%) translateY(-18px) scale(.985);transition:opacity .22s ease,transform .22s ease;border-radius:2px}#fdeAdminToast.show{opacity:1;transform:translate(-50%,-50%) translateY(0) scale(1)}#fdeAdminToast.success{border-left:5px solid #0e7a4b}#fdeAdminToast.error{border-left:5px solid #b94343;background:rgba(255,247,247,.98)}';document.head.appendChild(st)}clearTimeout(toastTimer);box.textContent=text;box.className=type==='error'?'error':type==='success'?'success':'';toastShownAt=Date.now();requestAnimationFrame(()=>box.classList.add('show'));toastTimer=setTimeout(hideToast,4000)};
  const expireToastIfNeeded=()=>{if(toastShownAt&&Date.now()-toastShownAt>=4000)hideToast()};
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)expireToastIfNeeded()});window.addEventListener('pageshow',expireToastIfNeeded);window.addEventListener('focus',expireToastIfNeeded);

  function watchStatus(){const el=document.getElementById('adminStatus');if(!el||el.dataset.toastBound)return;el.dataset.toastBound='1';const consume=()=>{if(el.hidden)return;const text=el.textContent.trim();if(!text)return;const type=el.classList.contains('error')?'error':el.classList.contains('success')?'success':'';window.FDE_ADMIN_TOAST(text,type);el.hidden=true};new MutationObserver(consume).observe(el,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});consume()}
  function hydrateAdminUi(){ensureSharedAdminKeyField();syncAdminKeyFields();watchStatus()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hydrateAdminUi,{once:true});else hydrateAdminUi();
}
