(()=>{
function load(){if(document.querySelector('script[data-products-v4]'))return;const s=document.createElement('script');s.src='products-runtime-v4.js';s.defer=true;s.dataset.productsV4='1';document.head.appendChild(s)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
