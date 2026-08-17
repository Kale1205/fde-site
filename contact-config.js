// Public Contact configuration. Do not place API keys here.
window.FDE_CONTACT_API = 'https://kales-fde-contact.reyouinjune.workers.dev';
if(location.pathname.endsWith('/cms-admin.html')||location.pathname.endsWith('cms-admin.html')){
  const s=document.createElement('script');
  s.src='order-status-admin.js?v=20260817-0925';
  document.head.appendChild(s);
}
