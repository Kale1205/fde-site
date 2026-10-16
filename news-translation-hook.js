// Explicit translation only. Saving a local draft never calls the translator.
(()=>{
 window.FDE_NEWS_TRANSLATE=async(title,body)=>{
  const key=(document.getElementById('adminKey')?.value||window.FDE_ADMIN_KEY?.get?.()||'').trim();
  if(!key)throw Object.assign(new Error('TRANSLATION_KEY'),{code:'TRANSLATION_KEY'});
  const endpoint=String(window.FDE_CONTACT_API||'');
  if(!endpoint)throw Object.assign(new Error('TRANSLATION'),{code:'TRANSLATION'});
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
  try{
   const r=await fetch(endpoint,{method:'POST',signal:controller.signal,credentials:'omit',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({type:'admin_translate_fields',adminKey:key,fields:{title,body}})});
   const data=await r.json(),en=data.translations?.en;
   if(!r.ok||data.ok===false||typeof en?.title!=='string'||!en.title.trim()||typeof en?.body!=='string'||!en.body.trim())throw new Error('TRANSLATION');
   return en;
  }catch{throw Object.assign(new Error('TRANSLATION'),{code:'TRANSLATION'});}finally{clearTimeout(timer);}
 };
})();
