// Adapt historical config snapshots only for these three explicit CMS deltas.
// Environment selection, endpoints, Turnstile, FAQ and all other text stay exact.
export const applyCmsMemoryKey=source=>source
 .replace("const ADMIN_KEY_SESSION='fde-admin-key-session';","let adminSessionKey='';")
 .replace("const readSessionKey=()=>{try{return sessionStorage.getItem(ADMIN_KEY_SESSION)||''}catch{return''}};","const readSessionKey=()=>adminSessionKey;")
 .replace("const writeSessionKey=value=>{try{if(value)sessionStorage.setItem(ADMIN_KEY_SESSION,value);else sessionStorage.removeItem(ADMIN_KEY_SESSION)}catch{}};","const writeSessionKey=value=>{adminSessionKey=String(value||'')};")
 .replace("const consume=()=>{if(el.hidden)return;","const consume=()=>{if(el.hidden||el.dataset.cmsPersistent==='true')return;");
