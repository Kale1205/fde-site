// Public Contact configuration. Do not place API keys here.
window.FDE_CONTACT_API = 'https://kales-fde-contact.reyouinjune.workers.dev';
if(location.pathname.endsWith('/cms-admin.html')||location.pathname.endsWith('cms-admin.html')){
  ['order-status-admin.js?v=20260817-0935','customer-orders-admin.js?v=20260817-0935'].forEach(src=>{
    const s=document.createElement('script');
    s.src=src;
    document.head.appendChild(s);
  });
}
