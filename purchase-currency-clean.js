(()=>{
function price(){return new URLSearchParams(location.search).get('plan')==='monthly'?'$62':'$313'}
function product(){return new URLSearchParams(location.search).get('plan')==='monthly'?'FDE IMS Updates':'FDE IMS License'}
function model(){return new URLSearchParams(location.search).get('plan')==='monthly'?'Updates':'License'}
function render(){
  document.documentElement.lang='en';
  document.documentElement.dataset.paymentCurrency='USD';
  const box=document.getElementById('purchaseCurrencyChoice');if(box)box.remove();
  const p=document.getElementById('quotePrice'),t=document.getElementById('quoteTotal'),q=document.getElementById('quoteProduct'),l=document.getElementById('quoteProductLine'),m=document.getElementById('quotePlan'),r=document.getElementById('rateInfo');
  if(p)p.textContent=price()+' planned';if(t)t.textContent=price()+' planned';if(q)q.textContent=product();if(l)l.textContent=product();if(m)m.textContent=model();if(r)r.textContent='All public pricing is currently shown in USD. This is a pre-release preview, not a formal quotation or order.';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
window.addEventListener('pageshow',render);
})();
