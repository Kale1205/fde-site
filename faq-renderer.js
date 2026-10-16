// Shared by the browser PR publisher and Node generators. No I/O or copy migration.
export const FAQ_LOCALES=Object.freeze(['ja','en','zh-CN']);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const text=value=>typeof value==='string'&&value.trim().length>0;
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const invalid=reason=>{throw new Error(`INVALID_FAQ_DATA:${reason}`);};

export function mergeFaqData(baseData,policyData){
 if(!object(baseData)||baseData.version!==3||!Array.isArray(baseData.faq)||!object(policyData)||!Array.isArray(policyData.faq))invalid('documents');
 if(!Array.isArray(baseData.locales)||baseData.locales.length!==FAQ_LOCALES.length||FAQ_LOCALES.some(locale=>!baseData.locales.includes(locale)))invalid('locales');
 if(!object(baseData.categories)||!object(baseData.subcategories))invalid('taxonomy');
 const seen=new Set(),items=[...baseData.faq,...policyData.faq];
 for(const item of items){
  if(!object(item)||!text(item.id)||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,199}$/.test(item.id)||seen.has(item.id))invalid('id');
  seen.add(item.id);
  if(typeof item.highFrequency!=='boolean'||!text(item.category)||!text(item.subcategory))invalid('record');
  if(!Object.hasOwn(baseData.categories,item.category)||!Object.hasOwn(baseData.subcategories,item.subcategory))invalid('taxonomy-reference');
  const category=baseData.categories[item.category],subcategory=baseData.subcategories[item.subcategory];
  if(!object(category)||!object(subcategory)||subcategory.category!==item.category)invalid('taxonomy-parent');
  for(const locale of FAQ_LOCALES){
   if(!text(category.label?.[locale])||!text(subcategory.label?.[locale]))invalid('taxonomy-label');
   for(const field of ['question','answer'])if(!object(item[field])||!text(item[field][locale]))invalid(`${field}:${locale}`);
   for(const field of ['keywords','synonyms'])if(!object(item[field])||!Array.isArray(item[field][locale])||item[field][locale].some(value=>typeof value!=='string'))invalid(`${field}:${locale}`);
  }
 }
 const result=structuredClone(baseData);
 result.faq=structuredClone(items);
 return result;
}

export function renderFaqPage(sourceHTML,baseData,policyData,locale){
 if(typeof sourceHTML!=='string'||!FAQ_LOCALES.includes(locale))invalid('locale');
 const languages=[...sourceHTML.matchAll(/<html\b[^>]*\blang=(["'])([^"']+)\1[^>]*>/gi)];
 if(languages.length!==1||languages[0][2]!==locale)invalid('html-language');
 const starts=[...sourceHTML.matchAll(/<div\b[^>]*\bid=(["'])cmsFaqList\1[^>]*>/gi)];
 const ends=[...sourceHTML.matchAll(/<div\b[^>]*\bid=(["'])faqEmpty\1[^>]*>/gi)];
 if(starts.length!==1||ends.length!==1)invalid('anchors');
 const start=starts[0].index+starts[0][0].length,empty=ends[0].index;
 if(empty<=start)invalid('anchors');
 let depth=1,end=-1;
 for(const tag of sourceHTML.slice(start,empty).matchAll(/<\/?div\b[^>]*>/gi)){
  depth+=/^<\/div/i.test(tag[0])?-1:1;
  if(depth===0){
   if(sourceHTML.slice(start+tag.index+tag[0].length,empty).trim())invalid('closing-anchor');
   end=start+tag.index;break;
  }
 }
 if(end<0)invalid('closing-anchor');
 const data=mergeFaqData(baseData,policyData);
 const items=[...data.faq].sort((a,b)=>Number(b.highFrequency)-Number(a.highFrequency));
 const markup=items.map(item=>{
  const answerId=`faq-answer-${item.id}`;
  const terms=[...item.keywords[locale],...item.synonyms[locale]].join(' ');
  return `          <article class="faq-item" data-faq-id="${escape(item.id)}" data-faq-category-key="${escape(item.category)}" data-faq-subcategory="${escape(item.subcategory)}" data-faq-terms="${escape(terms)}">\n            <button class="faq-q" type="button" aria-expanded="false" aria-controls="${escape(answerId)}"><span>${escape(item.question[locale])}</span><span class="faq-plus" aria-hidden="true">＋</span></button>\n            <div class="faq-path"><span>${escape(data.categories[item.category].label[locale])}</span><span>${escape(data.subcategories[item.subcategory].label[locale])}</span></div>\n            <div class="faq-a" id="${escape(answerId)}">${escape(item.answer[locale]).replace(/\n/g,'<br>')}</div>\n          </article>`;
 }).join('\n');
 return sourceHTML.slice(0,start)+'\n'+markup+'\n        '+sourceHTML.slice(end);
}
