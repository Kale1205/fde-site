import {motionPreference} from './motion-preferences.js';

const header=document.querySelector('.site-header');
if(header){
 const root=document.documentElement;
 const measure=()=>root.style.setProperty('--site-header-height',`${Math.ceil(header.getBoundingClientRect().height)}px`);
 const motion=()=>{root.dataset.siteMotion=motionPreference.matches?'still':'motion';};
 measure();motion();
 if(typeof ResizeObserver==='function')new ResizeObserver(measure).observe(header);
 else window.addEventListener('resize',measure,{passive:true});
 motionPreference.addEventListener('change',motion);
 window.addEventListener('pageshow',()=>{measure();motion();});
}
