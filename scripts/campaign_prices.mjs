import {readFileSync} from 'node:fs';

export const campaign=Object.freeze({currency:'JPY',taxIncluded:true,durationMonths:6,actualLaunchDate:null,startDate:null,endDate:null,license:{standard:74800,launch:49800},plus:{standard:149800,launch:99800}});
export const campaignCopy={
 ja:{launch:'発売記念',off:'約33% OFF',standard:'通常予定価格',tax:'税込',duration:'発売から6か月間・キャンペーン予定価格',terms:'日本向けの日本円・税込の予定価格です。キャンペーン予定価格は実際の発売から6か月間に適用します。通常予定価格はキャンペーン終了後の予定価格で、過去の販売価格ではありません。実際の発売日・開始日・終了日は未確定です。販売開始前のため、購入受付はまだ行っていません。Updatesの価格・条件は変更ありません。'},
 en:{launch:'Launch offer',off:'About 33% OFF',standard:'Planned standard price',tax:'tax incl.',duration:'Planned launch price · first 6 months after launch',terms:'Japan pricing in JPY, tax included. Planned launch prices apply for the first six months after the actual launch. Planned standard prices are planned post-campaign prices, not past selling prices. Actual launch and campaign dates are not confirmed. Purchasing is not available. Updates prices and terms are unchanged.'},
 zh:{launch:'上市优惠',off:'约33% OFF',standard:'计划常规价格',tax:'含税',duration:'上市后前6个月・计划优惠价格',terms:'日本市场价格，以日元计价并含税。计划优惠价格适用于实际上市后的前6个月。计划常规价格是优惠结束后的计划价格，不代表过去的销售价格。实际上市日、优惠开始日和结束日尚未确定，目前不能购买。Updates 的价格与条件保持不变。'},
};
const arrow='<svg class="hp-arrow" viewBox="0 0 92 80" preserveAspectRatio="none" aria-hidden="true"><path d="M80 4C100 44 76 73 12 68M12 68l10-8M12 68l12 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const marker='<svg class="hp-swash" viewBox="0 0 280 30" preserveAspectRatio="none" aria-hidden="true"><path d="M3 13Q43 8 83 11T164 10T274 7L277 23Q230 24 186 25T102 24T5 28Z" fill="currentColor"/><path d="M7 10Q75 6 130 9T270 4L272 20Q204 21 157 20T10 24Z" fill="currentColor" opacity=".42"/></svg>';
const localeOf=file=>file.startsWith('ja/')?'ja':file.startsWith('zh/')?'zh':'en';
const amount=(number,unit='symbol')=>unit==='word'?number.toLocaleString('en-US')+'円':'¥'+number.toLocaleString('en-US');
export function campaignPrice(key,original,locale,{live=false}={}){
 const c=campaignCopy[locale],price=campaign[key],unit=live?'word':'symbol';
 return `<!-- Campaign price ${key} -->\n<div class="handdrawn-price hp-combined" data-campaign-product="${key}"><div class="hp-annotation" aria-hidden="true"><span>${c.launch}</span><strong>${c.off}</strong>${arrow}</div><div class="hp-was"><span>${c.standard}</span><s${live?' data-campaign-standard-value':''}>${amount(price.standard,unit)}</s></div><div class="hp-current"><span class="hp-number">${marker}${original}</span><small>${c.tax}</small></div><span class="hp-duration">${c.duration}</span></div>\n<!-- End campaign price ${key} -->`;
}
function stripPrices(source){return source.replace(/<!-- Campaign price (license|plus) -->\n([\s\S]*?)\n<!-- End campaign price \1 -->/g,(block,key,body)=>body.match(/<strong (?:class="(?:plan-price|order-product-price)"|data-license-price)[^>]*>[\s\S]*?<\/strong>/)?.[0]||block);}
export function withCampaignPrices(file,source){
 if(!/^<!doctype html>/i.test(source))return source;
 const home=/^(?:(?:ja|zh)\/)?(?:index|quiet-form)\.html$/.test(file),order=/^(?:(?:ja|zh)\/)?order\.html$/.test(file),license=file==='ja/license.html';
 if(!home&&!order&&!license)return source;
 const locale=localeOf(file),c=campaignCopy[locale],version=source.includes('campaign-prices.css?v=BUILD')?'BUILD':readFileSync(new URL('../build-version.txt',import.meta.url),'utf8').trim(),prefix=locale==='en'?'':'../';
 let html=stripPrices(source).replace(/<!-- Campaign assets -->\n[\s\S]*?<!-- End campaign assets -->\n/g,'').replace(/<!-- Planned campaign terms -->\n[\s\S]*?<!-- End planned campaign terms -->\n/g,'');
 if(home||order){
  for(const key of ['license','plus']){
   const formatted=amount(campaign[key].launch),tag=home?`<strong class="plan-price">${formatted}</strong>`:`<strong class="order-product-price">${formatted}<small> JPY</small></strong>`;
   if(!html.includes(tag))throw Error(`Missing approved campaign price: ${file}/${key}`);
   html=html.replace(tag,campaignPrice(key,tag,locale));
  }
 }else{
  const current=html.match(/<strong data-license-price>[^<]+<\/strong>/)?.[0];
  if(!current||!/(?:49,800|99,800)円/.test(current))throw Error('Unexpected Japanese License price');
  html=html.replace(current,campaignPrice('plus',current,'ja',{live:true}));
  html=html.replace(/\sdata-campaign-standard="[^"]*"/g,'').replace(/(data-license-plan="(license|plus)"[^>]*)(>)/g,(_,attrs,key,end)=>attrs+` data-campaign-standard="${amount(campaign[key].standard,'word')}"`+end);
  for(const key of ['license','plus']){
   const now=amount(campaign[key].launch,'word'),standard=amount(campaign[key].standard,'word');
   const original=`<td>${now}</td>`,replacement=`<td><span class="campaign-matrix-price"><span>${c.standard} <s>${standard}</s></span><strong>${now}</strong><small>発売から6か月間</small></span></td>`;
   if(html.includes(original))html=html.replace(original,replacement);
  }
 }
 const terms=`<!-- Planned campaign terms -->\n<p class="campaign-terms" data-campaign-terms>${c.terms}</p>\n<!-- End planned campaign terms -->\n`;
 if(home){const anchor='<div class="updates-strip">';if(!html.includes(anchor))throw Error(`Missing Updates boundary: ${file}`);html=html.replace(anchor,terms+anchor);}
 if(order)html=html.replace('    <section class="order-updates"',terms+'    <section class="order-updates"');
 if(license)html=html.replace('        <div class="license-matrix-region"',terms+'        <div class="license-matrix-region"');
 const assets=`<!-- Campaign assets -->\n<link rel="stylesheet" href="${prefix}campaign-prices.css?v=${version}">\n<script defer src="${prefix}campaign-prices.js?v=${version}"></script>\n<!-- End campaign assets -->\n`;
 return html.replace('</head>',assets+'</head>');
}
export function applyReviewedCampaign(file,source){
 if(source.includes('<!-- Campaign price '))return source;
 if(/(?:index|quiet-form)\.html$/.test(file)&&!source.includes('<strong class="plan-price">¥49,800</strong>'))return source;
 if(/order\.html$/.test(file)&&!source.includes('<strong class="order-product-price">¥49,800<small> JPY</small></strong>'))return source;
 if(file==='ja/license.html'&&!source.includes('<strong data-license-price>99,800円</strong>'))return source;
 return withCampaignPrices(file,source);
}
