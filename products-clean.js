(()=>{
const PRICE={license:'$313',updates:'$62'};
function render(){
  const root=document.querySelector('#plans .shell');
  if(!root)return;
  root.innerHTML=`<div class="clean-plans-head"><strong>IN DEVELOPMENT · NOT YET ON SALE</strong><p>FDE IMS is under development. License is the recommended one-time purchase model, followed by the monthly Updates plan.</p></div><div class="section-head"><div><div class="section-kicker">FDE IMS</div><h2 class="section-title">FDE IMS — Product plans</h2></div><p class="section-copy">All public pricing is shown in USD during the current stabilization period.</p></div><div class="clean-plan-stack"><article class="clean-plan-card license"><div class="clean-plan-kicker">License · Recommended</div><h3>FDE IMS License</h3><div class="clean-plan-price">${PRICE.license} <small>one-time · planned</small></div><p>Perpetual internal-use license with source code. Internal customization is allowed within the purchasing legal entity.</p><div class="clean-plan-actions"><a class="button dark" href="order.html?plan=license">Purchase</a><a class="button" href="license.html">Rights & usage terms</a></div></article><article class="clean-plan-card updates"><div class="clean-plan-kicker">Updates</div><h3>FDE IMS Updates</h3><div class="clean-plan-price">${PRICE.updates} <small>/ month · planned</small></div><p>Monthly plan with ongoing FDE-managed functionality, security and compatibility updates. Source code is not planned to be provided.</p><div class="clean-plan-actions"><a class="button dark" href="order.html?plan=monthly">Purchase</a><a class="button" href="license.html#switching">Rights & usage terms</a></div></article></div>`;
  const hero=document.querySelector('.strength-row');
  if(hero)hero.innerHTML=`<span>License — ${PRICE.license} planned</span><span>Updates — ${PRICE.updates} / month planned</span>`;
}
function init(){render();window.addEventListener('pageshow',render)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
