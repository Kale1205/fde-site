// The approved LP cutout stays still; existing FDE character assets are separate.
document.documentElement.dataset.lpMotion='still';
const header=document.querySelector('.editorial-header'),notice=document.querySelector('.lp-reception-banner');
const measure=()=>{
 if(header)document.documentElement.style.setProperty('--lp-header-height',`${Math.ceil(header.getBoundingClientRect().height)}px`);
 if(notice)document.documentElement.style.setProperty('--lp-status-height',`${Math.ceil(notice.getBoundingClientRect().height)}px`);
};
measure();
if(typeof ResizeObserver==='function'){const observer=new ResizeObserver(measure);if(header)observer.observe(header);if(notice)observer.observe(notice);}
else window.addEventListener('resize',measure,{passive:true});
window.addEventListener('pageshow',measure);
