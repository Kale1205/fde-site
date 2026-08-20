(()=>{
const LOADER_SRC=document.currentScript?.src||'';
const BUILD_KEY=(()=>{try{return new URL(LOADER_SRC,location.href).searchParams.get('v')||''}catch{return''}})();
const manifest=()=>{
  const el=document.getElementById('cmsRuntimeManifest');
  if(!el)return[];
  try{return JSON.parse(el.textContent||'[]')}catch{return[]}
};
const loadScript=(path)=>new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src=BUILD_KEY?`${path}?v=${encodeURIComponent(BUILD_KEY)}`:path;
  script.async=false;
  script.onload=resolve;
  script.onerror=()=>reject(new Error(`CMS_RUNTIME_LOAD_FAILED:${path}`));
  document.head.appendChild(script);
});
function showStagingLock(){
  const main=document.querySelector('.admin-main');
  if(!main)return;
  main.innerHTML='<div class="admin-shell"><section class="admin-card"><div class="admin-kicker">STAGING SAFETY LOCK</div><h1>CMSはstagingでは無効です</h1><p>本番CMSデータを誤って変更しないため、P1-5で専用staging CMS・Workerを構成するまでCloudflare Pages上ではCMS書き込み機能を起動しません。</p><p>Production CMSはGitHub Pages上で従来どおり利用できます。</p></section></div>';
}
async function init(){
  if(window.FDE_RUNTIME_ENV==='staging'){
    showStagingLock();
    return;
  }
  for(const path of manifest())await loadScript(path);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>init().catch(error=>console.error(error)),{once:true});else init().catch(error=>console.error(error));
})();
