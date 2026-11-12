// Owner-approved planned books. Actual launch and campaign dates remain unknown.
const shared={durationMonths:6,actualLaunchDate:null,startDate:null,endDate:null};
export const JPY_CAMPAIGN=Object.freeze({...shared,currency:'JPY',taxIncluded:true,license:{standard:74800,launch:49800},plus:{standard:149800,launch:99800},updates:[4900,9800]});
export const USD_CAMPAIGN=Object.freeze({...shared,currency:'USD',taxIncluded:null,license:{standard:521,launch:349},plus:{standard:1043,launch:699},updates:[31,62]});
export const priceBook=locale=>locale==='ja'?JPY_CAMPAIGN:USD_CAMPAIGN;
export const money=(number,locale,{word=false}={})=>locale==='ja'&&word?number.toLocaleString('en-US')+'円':(locale==='ja'?'¥':'$')+number.toLocaleString('en-US');
export const campaignCopy={
 ja:{launch:'発売記念',off:'約33% OFF',standard:'通常予定価格',tax:'税込',duration:'発売から6か月間・キャンペーン予定価格',terms:'日本向けの日本円・税込の予定価格です。キャンペーン予定価格は実際の発売から6か月間に適用します。通常予定価格はキャンペーン終了後の予定価格で、過去の販売価格ではありません。実際の発売日・開始日・終了日は未確定です。販売開始前のため、購入受付はまだ行っていません。Updatesの価格・条件は変更ありません。'},
 en:{launch:'Launch offer',off:'About 33% OFF',standard:'Planned standard price',tax:'tax status pending',duration:'Planned launch price · first 6 months after launch',terms:'Planned USD prices: License $521 → $349; License Plus $1,043 → $699. Launch prices apply for the first six months after the actual launch. Standard prices are planned post-campaign prices, not past selling prices. Actual launch and campaign dates and tax treatment are not confirmed. Purchasing is not available. Optional License Updates remains $31/month for months 4–6 after purchase and $62/month from month 7; the first three months are included.'},
 zh:{launch:'上市优惠',off:'约33% OFF',standard:'计划常规价格',tax:'税务处理未定',duration:'上市后前6个月・计划优惠价格',terms:'美元计划价格：License $521 → $349；License Plus $1,043 → $699。优惠价格适用于实际上市后的前6个月。常规价格是优惠结束后的计划价格，不代表过去的销售价格。实际上市日、优惠开始日、结束日和税务处理尚未确定，目前不能购买。License 的可选 Updates 仍为购买后第4–6个月每月 $31、第7个月起每月 $62，最初3个月包含在内。'},
};
const enReplacements=[
 ['Every USD amount is an unapproved candidate pending final international pricing.','USD prices are planned. Tax treatment is not yet confirmed.'],
 ['All USD figures are unapproved candidates pending final international pricing.','USD prices are planned. Tax treatment is not yet confirmed.'],
 ['All USD figures are unapproved candidates.','USD prices are planned. Tax treatment is not yet confirmed.'],
 ['The USD prices shown are unapproved candidates pending final international pricing','The USD prices shown are planned; tax treatment is not yet confirmed'],
 ['The planned one-time price is a $349 USD candidate.','The planned one-time launch price is $349 USD.'],
 ['a $349 one-time USD candidate price','a $349 planned one-time launch price in USD'],
 ['a $699 one-time USD candidate price','a $699 planned one-time launch price in USD'],
 ['$62/month USD candidate price','$62/month planned USD price'],
 ['$62/month USD candidate','$62/month planned USD price'],
 ['$31/month USD candidate price','$31/month planned USD price'],
 ['$31/month USD candidate','$31/month planned USD price'],
 ['$349 USD candidate price','$349 planned USD launch price'],
 ['$699 USD candidate price','$699 planned USD launch price'],
 ['$349 USD candidate','$349 planned USD launch price'],
 ['$699 USD candidate','$699 planned USD launch price'],
 ['Candidate total','Planned launch price'],['Price (USD candidate)','Planned price (USD)'],
 ['one-time USD candidate','one-time USD · tax status pending'],
 ['$349 candidate','$349 planned launch'],['$699 candidate','$699 planned launch'],
];
const zhReplacements=[
 ['预定总价','计划优惠价格'],['预定价格（美元）','计划价格（美元）'],
 ['所有美元金额均为等待最终国际定价的未批准候选价格。','美元金额均为计划价格，税务处理尚未确定。'],
 ['所有美元金额均为尚未批准的候选价格，需等待最终国际定价。','美元金额均为计划价格，税务处理尚未确定。'],
 ['所有美元金额均为未批准候选价格。','美元金额均为计划价格，税务处理尚未确定。'],
 ['美元候选价格','美元计划价格'],['候选价格','计划价格'],
 ['一次性美元计划价格','一次性美元计划价格・税务处理未定'],
];
export function approveUsdCopy(locale,source){
 if(locale==='ja')return source;
 let value=source;
 for(const [old,next] of locale==='en'?enReplacements:zhReplacements)value=value.replaceAll(old,next);
 if(locale==='en')value=value.replace(/all USD figures are unapproved candidates(?: pending final international pricing)?\./gi,'USD prices are planned. Tax treatment is not yet confirmed.');
 // The extra short label is only owned once, even after repeated composition.
 return value.replaceAll('・税务处理未定・税务处理未定','・税务处理未定');
}
export const pricingConditions=locale=>campaignCopy[locale].terms.replace('Purchasing is not available. ','').replace('販売開始前のため、購入受付はまだ行っていません。','').replace('尚未确定，目前不能购买。','尚未确定。');
export function approveFaqDocument(file,source){
 if(!/^content\/faq-(?:content|policy-additions)\.json$/.test(file))return source;
 const data=JSON.parse(source);
 for(const item of data.faq)for(const [field,value]of Object.entries(item)){
  if(!value||Array.isArray(value)||typeof value!=='object')continue;
  for(const [key,locale]of [['en','en'],['zh-CN','zh']]){
   if(typeof value[key]==='string')value[key]=approveUsdCopy(locale,value[key]);
   else if(Array.isArray(value[key]))value[key]=value[key].map(text=>typeof text==='string'?approveUsdCopy(locale,text):text);
   if(field==='answer'&&typeof value[key]==='string'&&/(?:349|699)/.test(value[key])){value[key]=value[key].replace(' '+campaignCopy[locale].terms,'');if(!value[key].includes(pricingConditions(locale)))value[key]+=' '+pricingConditions(locale);}
  }
 }
 return JSON.stringify(data,null,2)+'\n';
}
export const isPriceHistory=item=>item?.id==='ims-license-updates-policy-20260819';
export const currentPriceNotice=locale=>({ja:'現在の予定価格：',en:'Current planned pricing: ',zh:'当前计划价格：'}[locale])+pricingConditions(locale);
