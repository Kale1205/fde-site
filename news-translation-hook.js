(()=>{
const ENDPOINT=String(window.FDE_CONTACT_API||'').trim();
const $=s=>document.querySelector(s);
const replay=new WeakSet();
function toast(msg,type=''){if(window.FDE_ADMIN_TOAST)window.FDE_ADMIN_TOAST(msg,type);else{const el=$('#adminStatus');if(el){el.textContent=msg;el.className=`status ${type}`.trim();el.hidden=false}}}
function adminKey(){return window.FDE_ADMIN_KEY?.get?.()||($('#adminKey')?.value||$('#faqAdminKey')?.value||'').trim()}
async function translate(title,body){
 const key=adminKey();if(!key)throw new Error('ADMIN_KEY_REQUIRED');window.FDE_ADMIN_KEY?.set?.(key);
 if(!ENDPOINT)throw new Error('TRANSLATION_ENDPOINT_NOT_CONFIGURED');
 const r=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({type:'admin_translate_fields',adminKey:key,fields:{title,body}})});
 const data=await r.json().catch(()=>({}));
 if(!r.ok||data.ok===false){const err=new Error(data.error||`HTTP_${r.status}`);err.detail=data.detail||'';throw err}
 const en=data.translations?.en;if(!en?.title||!en?.body)throw new Error('ENGLISH_TRANSLATION_INCOMPLETE');
 return en;
}
function errorText(error){
 const code=error?.message||String(error);
 const map={ADMIN_KEY_REQUIRED:'Admin fulfillment keyを入力してください。',ADMIN_AUTH_FAILED:'Admin fulfillment keyが一致しません。',ADMIN_FULFILLMENT_NOT_CONFIGURED:'Cloudflare WorkerにADMIN_FULFILLMENT_KEYが設定されていません。',AI_NOT_CONFIGURED:'Cloudflare Workers AI bindingが本番Workerへ反映されていません。',CONTENT_TRANSLATION_FAILED:'英語版Newsの生成に失敗しました。保存は開始していません。',ENGLISH_TRANSLATION_INCOMPLETE:'英語タイトルまたは本文が生成されませんでした。保存は開始していません。',TRANSLATION_ENDPOINT_NOT_CONFIGURED:'Cloudflare WorkerのURLが設定されていません。'};
 return map[code]||`${code}${error?.detail?` (${error.detail})`:''}`;
}
async function prepareAndReplay(btn,mode){
 const title=mode==='create'?($('#createTitleJa')?.value||'').trim():($('#editTitleJa')?.value||'').trim();
 const body=mode==='create'?($('#createBodyJa')?.value||'').trim():($('#editBodyJa')?.value||'').trim();
 if(!title||!body){toast('Newsの日本語タイトルと本文を入力してください。','error');return}
 const original=btn.textContent;btn.disabled=true;btn.textContent='英語版を生成中…';toast('日本語原稿から英語版Newsを生成しています…');
 try{
  const en=await translate(title,body);
  if(mode==='create'){
   if($('#createTitleEn'))$('#createTitleEn').value=en.title;
   if($('#createBodyEn'))$('#createBodyEn').value=en.body;
  }else{
   if($('#editTitleEn'))$('#editTitleEn').value=en.title;
   if($('#editBodyEn'))$('#editBodyEn').value=en.body;
  }
  replay.add(btn);btn.disabled=false;btn.textContent=original;btn.click();
 }catch(e){btn.disabled=false;btn.textContent=original;toast(`英語版Newsの生成に失敗しました: ${errorText(e)}`,'error')}
}
function capture(e){
 const btn=e.target.closest('button');
 if(!btn||!['createNewsBtn','saveNewsBtn'].includes(btn.id))return;
 if(replay.has(btn)){replay.delete(btn);return}
 e.preventDefault();e.stopImmediatePropagation();prepareAndReplay(btn,btn.id==='createNewsBtn'?'create':'save');
}
function init(){document.addEventListener('click',capture,true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
