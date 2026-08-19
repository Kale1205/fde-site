(()=>{
function load(){if(!document.querySelector('link[data-purchase-currency-clean]')){const l=document.createElement('link');l.rel='stylesheet';l.href='purchase-currency-clean.css';l.dataset.purchaseCurrencyClean='1';document.head.appendChild(l)}if(!document.querySelector('script[data-purchase-currency-clean]')){const s=document.createElement('script');s.src='purchase-currency-clean.js';s.defer=true;s.dataset.purchaseCurrencyClean='1';document.head.appendChild(s)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();