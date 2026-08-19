(()=>{
function load(){if(document.querySelector('script[data-products-v3]'))return;const s=document.createElement('script');s.src='products-runtime-v3.js?v=20260819-2105';s.defer=true;s.dataset.productsV3='1';document.head.appendChild(s)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();