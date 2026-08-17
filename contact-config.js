// Public Contact configuration. Do not place API keys here.
window.FDE_CONTACT_API = 'https://kales-fde-contact.reyouinjune.workers.dev';
if(location.pathname.endsWith('/cms-admin.html')||location.pathname.endsWith('cms-admin.html')){
  const ADMIN_KEY_SESSION='fde-admin-key-session';
  const KEY_SELECTORS=['#ordersAdminKey','#fulfillmentKey','#adminStatusKey','#faqAdminKey'];
  const readSessionKey=()=>{try{return sessionStorage.getItem(ADMIN_KEY_SESSION)||''}catch{return''}};
  const writeSessionKey=value=>{try{if(value)sessionStorage.setItem(ADMIN_KEY_SESSION,value);else sessionStorage.removeItem(ADMIN_KEY_SESSION)}catch{}};
  const syncAdminKeyFields=value=>{const key=String(value??readSessionKey()).trim();if(!key)return;KEY_SELECTORS.forEach(sel=>{const el=document.querySelector(sel);if(el&&el.value!==key)el.value=key})};
  window.FDE_ADMIN_KEY={get:readSessionKey,set(value){const key=String(value||'').trim();writeSessionKey(key);syncAdminKeyFields(key);return key},clear(){writeSessionKey('');KEY_SELECTORS.forEach(sel=>{const el=document.querySelector(sel);if(el)el.value=''})}};

  // Keep the admin key only for this browser tab/session. It is never written to GitHub or localStorage.
  document.addEventListener('input',e=>{const el=e.target;if(!(el instanceof HTMLInputElement))return;if(KEY_SELECTORS.some(sel=>el.matches(sel))){const key=el.value.trim();if(key){writeSessionKey(key);syncAdminKeyFields(key)}}},true);

  // Prevent legacy status messages from moving the viewport.
  if(!window.__FDE_CMS_SCROLL_PATCHED__){
    window.__FDE_CMS_SCROLL_PATCHED__=true;
    const nativeScrollIntoView=Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView=function(...args){if(this?.id==='adminStatus')return;return nativeScrollIntoView.apply(this,args)};
  }

  // Center toast: slide/fade in, remain for five seconds, then disappear.
  let toastTimer=0;
  window.FDE_ADMIN_TOAST=(message,type='')=>{
    const text=String(message||'').trim();if(!text)return;
    let box=document.getElementById('fdeAdminToast');
    if(!box){
      box=document.createElement('div');box.id='fdeAdminToast';box.setAttribute('role','status');box.setAttribute('aria-live','polite');document.body.appendChild(box);
      const st=document.createElement('style');st.id='fdeAdminToastStyle';st.textContent='#fdeAdminToast{position:fixed;z-index:99999;left:50%;top:50%;width:min(560px,calc(100% - 36px));padding:16px 20px;border:1px solid #b8c8bf;background:rgba(247,250,248,.98);color:#17251f;box-shadow:0 18px 60px rgba(15,35,26,.22);font-size:13px;font-weight:750;line-height:1.65;text-align:center;opacity:0;pointer-events:none;transform:translate(-50%,-50%) translateY(-18px) scale(.985);transition:opacity .22s ease,transform .22s ease;border-radius:2px}#fdeAdminToast.show{opacity:1;transform:translate(-50%,-50%) translateY(0) scale(1)}#fdeAdminToast.success{border-left:5px solid #0e7a4b}#fdeAdminToast.error{border-left:5px solid #b94343;background:rgba(fff,247,247,.98)}';document.head.appendChild(st)
    }
    clearTimeout(toastTimer);box.textContent=text;box.className=type==='error'?'error':type==='success'?'success':'';requestAnimationFrame(()=>box.classList.add('show'));toastTimer=setTimeout(()=>box.classList.remove('show'),5000);
  };

  function watchLegacyStatus(){
    const el=document.getElementById('adminStatus');if(!el||el.dataset.toastBound)return;el.dataset.toastBound='1';
    const consume=()=>{if(el.hidden)return;const text=el.textContent.trim();if(!text)return;const type=el.classList.contains('error')?'error':el.classList.contains('success')?'success':'';window.FDE_ADMIN_TOAST(text,type);el.hidden=true};
    new MutationObserver(consume).observe(el,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});consume();
  }
  function hydrateAdminUi(){syncAdminKeyFields();watchLegacyStatus();document.querySelectorAll('.token-note').forEach(note=>{if(note.textContent.includes('この画面では保存しません')||note.textContent.includes('キーは保存しません'))note.textContent='Admin keyはこのタブのセッション中だけ保持します。タブを閉じると消去され、GitHubやlocalStorageには保存しません。'})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hydrateAdminUi,{once:true});else hydrateAdminUi();
  new MutationObserver(()=>hydrateAdminUi()).observe(document.documentElement,{childList:true,subtree:true});

  [
    'order-status-admin.js?v=20260818-0837',
    'customer-orders-admin.js?v=20260818-0837',
    'order-documents-admin.js?v=20260818-0837'
  ].forEach(src=>{const s=document.createElement('script');s.src=src;document.head.appendChild(s)});
}
