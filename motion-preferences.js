// Explicit icon preference, shared by settings and the decorative-motion runtime.
const STORAGE_KEY='fde:still-icons';
const system=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
const listeners=new Set();
function saved(fallback=false){try{return localStorage.getItem(STORAGE_KEY)==='1';}catch{return fallback;}}
let userReduced=saved();
function notify(){const event={matches:motionPreference.matches,userReduced,systemReduced:motionPreference.systemReduced};for(const listener of listeners)listener(event);}
export const motionPreference=Object.freeze({
 get matches(){return userReduced||Boolean(system?.matches);},
 get systemReduced(){return Boolean(system?.matches);},
 get userReduced(){return userReduced;},
 setReduced(value){userReduced=Boolean(value);try{if(userReduced)localStorage.setItem(STORAGE_KEY,'1');else localStorage.removeItem(STORAGE_KEY);}catch{/* The setting still works for this page when storage is unavailable. */}notify();},
 addEventListener(name,listener){if(name==='change')listeners.add(listener);},
 removeEventListener(name,listener){if(name==='change')listeners.delete(listener);}
});
system?.addEventListener('change',notify);
function refresh(){userReduced=saved(userReduced);notify();}
if(typeof window!=='undefined'){
 window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY||event.key===null)refresh();});
 window.addEventListener('pageshow',refresh);
}
if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
