// The existing product selector owns the selected price and purchase boundary.
// Only its approved Japanese planned-standard-price label needs a companion update.
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-license-plan][data-campaign-standard]');
 if(!button)return;
 const value=document.querySelector('[data-campaign-standard-value]');
 if(value)value.textContent=button.dataset.campaignStandard;
});
