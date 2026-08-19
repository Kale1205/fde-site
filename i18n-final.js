(()=>{
const EN='en';
function forceEnglish(){
  try{localStorage.setItem('fde-lang',EN)}catch{}
  document.documentElement.lang=EN;
  document.documentElement.dir='ltr';
  const d=window.FDE_I18N?.en||{};
  document.querySelectorAll('[data-i18n]').forEach(el=>{const v=d[el.dataset.i18n];if(v!=null)el.textContent=v});
  document.querySelectorAll('[data-i18n-html]').forEach(el=>{const v=d[el.dataset.i18nHtml];if(v!=null)el.innerHTML=v});
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{const v=d[el.dataset.i18nPlaceholder];if(v!=null)el.setAttribute('placeholder',v)});
  const selector=document.querySelector('#lang');
  if(selector){selector.value=EN;selector.disabled=true;selector.hidden=true;}
}
window.FDE_setLanguage=forceEnglish;
try{localStorage.setItem('fde-lang',EN)}catch{}
document.documentElement.lang=EN;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',forceEnglish,{once:true});else forceEnglish();
window.addEventListener('pageshow',forceEnglish);
})();
