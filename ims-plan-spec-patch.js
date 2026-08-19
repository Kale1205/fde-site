(()=>{
function inject(src,attr){if(document.querySelector(`script[${attr}]`))return;const s=document.createElement('script');s.src=src;s.defer=true;s.setAttribute(attr,'1');document.head.appendChild(s)}
function load(){inject('products-runtime-v3.js?v=20260819-2105','data-products-v3');inject('payment-currency-v1.js?v=20260819-2115','data-payment-currency')}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();