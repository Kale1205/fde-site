(()=>{
const manifest=()=>{
  const el=document.getElementById('cmsRuntimeManifest');
  if(!el)return[];
  try{return JSON.parse(el.textContent||'[]')}catch{return[]}
};
const buildKey=()=>{
  const src=document.currentScript?.src||'';
  try{return new URL(src,location.href).searchParams.get('v')||''}catch{return''}
};
const loadScript=(path,version)=>new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src=version?`${path}?v=${encodeURIComponent(version)}`:path;
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
  const version=buildKey();
  for(const path of manifest())await loadScript(path,version);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>init().catch(error=>console.error(error)),{once:true});else init().catch(error=>console.error(error));
})();
