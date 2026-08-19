(()=>{
function inject(src,attr,onload){if(document.querySelector(`script[${attr}]`)){onload?.();return}const s=document.createElement('script');s.src=src;s.defer=true;s.setAttribute(attr,'1');if(onload)s.addEventListener('load',onload,{once:true});document.head.appendChild(s)}
function load(){inject('products-runtime-v5.js?v=20260819-214423','data-products-v5',()=>inject('products-runtime-v6.js?v=20260819-2230','data-products-v6'))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
