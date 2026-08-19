(()=>{
const nativeFetch=window.fetch.bind(window);
window.fetch=async(input,init)=>{
 const url=typeof input==='string'?input:input?.url||'';
 if(!String(url).includes('content/faq-content.json'))return nativeFetch(input,init);
 const baseRes=await nativeFetch(input,init);
 if(!baseRes.ok)return baseRes;
 try{
  const base=await baseRes.clone().json();
  const extraRes=await nativeFetch(`content/faq-policy-additions.json?v=${Date.now()}`,{cache:'no-store'});
  if(!extraRes.ok)return baseRes;
  const extra=await extraRes.json();
  const ids=new Set((base.faq||[]).map(x=>x.id));
  base.faq=[...(base.faq||[]),...(extra.faq||[]).filter(x=>!ids.has(x.id))];
  return new Response(JSON.stringify(base),{status:baseRes.status,statusText:baseRes.statusText,headers:{'Content-Type':'application/json; charset=utf-8'}});
 }catch(e){console.warn('FAQ policy merge failed',e);return baseRes}
};
})();
