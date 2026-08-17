// Public Contact configuration. Do not place API keys here.
window.FDE_CONTACT_API = 'https://kales-fde-contact.reyouinjune.workers.dev';
if(location.pathname.endsWith('/cms-admin.html')||location.pathname.endsWith('cms-admin.html')){
  // Prevent CMS status messages from moving the viewport to the lower media section.
  if(!window.__FDE_CMS_SCROLL_PATCHED__){
    window.__FDE_CMS_SCROLL_PATCHED__=true;
    const nativeScrollIntoView=Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView=function(...args){
      if(this?.id==='adminStatus')return;
      return nativeScrollIntoView.apply(this,args);
    };
  }
  [
    'order-status-admin.js?v=20260818-0743',
    'customer-orders-admin.js?v=20260818-0743',
    'order-documents-admin.js?v=20260818-0743'
  ].forEach(src=>{
    const s=document.createElement('script');
    s.src=src;
    document.head.appendChild(s);
  });
}
