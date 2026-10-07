import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {releaseCopy} from './release_notice_policy.mjs';
import {approvedHeadPrefix} from './approved_head_prefix.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const copy={
  ja:{eyebrow:'販売前の購入プレビュー',intro:'2つの買い切り商品と、販売開始後の購入手続きをご案内します。',unavailable:'現在は購入できません。',notice:'このページから注文・決済はできません。',products:'2つの商品',facts:[['買い切り・永続利用','ソースコードなし','当社Updatesの月額契約が必須'],['買い切り・永続利用','ソースコード一式・社内向け改変','購入者が更新・管理。当社Updates対象外']],updates:['最初の3か月は含む','4〜6か月目','7か月目以降'],month:'/月',cancel:'Updates終了後も、既存バージョンは利用できます。',flow:'販売開始後の流れ',flowText:'購入者情報と対象商品を確認し、License Agreement / EULAに同意いただいた後、注文を確定します。',steps:['購入者情報','対象商品','License Agreement / EULA'],terms:'ライセンス条件を見る',back:'製品ページへ戻る',contact:'お問い合わせ',skip:'本文へ移動'},
  en:{eyebrow:'PRE-RELEASE PURCHASE PREVIEW',intro:'Explore two one-time purchase products and the purchase process once sales open.',unavailable:'Not yet available for purchase.',notice:'Orders cannot be completed yet. This page does not accept orders or payments.',products:'Two products',facts:[['One-time purchase · perpetual internal use','No source code','Monthly subscription to our Updates required'],['One-time purchase · perpetual internal use','Complete source code · internal modification','Purchaser updates and manages. Not eligible for our Updates.']],updates:['First 3 months included','Months 4–6','Month 7 onward'],month:'/mo',cancel:'When Updates ends, you can keep using your existing version.',flow:'The purchase process after launch',flowText:'Confirm the purchasing legal entity and selected product, then accept the License Agreement / EULA before completing the order.',steps:['Purchasing legal entity','Selected product','License Agreement / EULA'],terms:'Review product terms',back:'Back to Products',contact:'Contact us',skip:'Skip to content'},
  zh:{eyebrow:'销售前购买流程预览',intro:'了解两种一次性购买产品，以及销售开始后的购买流程。',unavailable:'目前尚不可购买。',notice:'本页不接受订单或付款。',products:'两种产品',facts:[['一次性购买 · 法人内部永久使用','不含源代码','须订阅官方 Updates 月度服务'],['一次性购买 · 法人内部永久使用','完整源代码 · 允许内部修改','由购买方更新和管理，不适用官方 Updates。']],updates:['含最初3个月','第4–6个月','第7个月起'],month:'/月',cancel:'停止 Updates 后，仍可继续使用已有版本。',flow:'销售开始后的购买流程',flowText:'确认购买法人和所选产品，并同意 License Agreement / EULA 后，即可确认订单。',steps:['购买法人信息','所选产品','License Agreement / EULA'],terms:'查看产品条件',back:'返回产品页',contact:'联系我们',skip:'跳转到正文'}
};

// W07 uses the exact approved homepage products/assets/JPY prices in all locales.
// It is still a static, noindex pre-release notice, never a checkout surface.
export function renderQuietOrder(source,home){
  const locale=source.match(/<html lang="([^"]+)"/)[1];
  const key=locale==='ja'?'ja':locale==='zh-CN'?'zh':'en',t=copy[key],prefix=key==='en'?'':'../';
  const version=home.match(/gallery-ui\.css\?v=([^"\s]+)/)[1];
  const icon=(name,cls='')=>`<img class="${cls}" src="${prefix}assets/phosphor-${name}.svg" width="24" height="24" alt="" aria-hidden="true">`;
  let head=approvedHeadPrefix(source);
  // Legacy inputs placed the approved favicon after their stylesheet suffix.
  // Retain that single known metadata element without filtering arbitrary tags.
  const favicon=source.slice(0,source.indexOf('</head>')).match(/^[ \t]*<link rel="icon" type="image\/svg\+xml" href="(?:\.\.\/)?assets\/baked-kale-mark\.svg">/m)?.[0];
  if(favicon&&!head.includes(favicon.trim()))head=head.trimEnd()+'\n'+favicon+'\n';
  head=head.trimEnd()+`\n  <link rel="stylesheet" href="${prefix}gallery-ui.css?v=${version}">\n  <link rel="stylesheet" href="${prefix}quiet-pages.css?v=${version}">\n  <script defer src="${prefix}gallery-ui.js?v=${version}"></script>\n`;
  const header=home.match(/<header class="site-header">[\s\S]*?<\/header>/)[0]
    .replaceAll('href="#plans"','href="index.html#plans"')
    .replace(/href="([^"]*)" hreflang=/g,(_,directory)=>`href="${directory}order.html" hreflang=`);
  const footer=home.match(/<footer class="site-footer[\s\S]*?<\/footer>/)[0].replaceAll('href="#plans"','href="index.html#plans"');
  const release=`<p class="release-line">${releaseCopy[key].date}</p>`;
  const plans=[...home.matchAll(/<div class="plan-top">([\s\S]*?)<\/div>/g)].slice(0,2);
  if(plans.length!==2)throw Error('Approved homepage product anchors missing');
  const products=plans.map((m,i)=>{
    const p=m[1],name=p.match(/<h3>([\s\S]*?)<\/h3>/)[1].replaceAll(/<\/?span>/g,''),tag=p.match(/<p>([\s\S]*?)<\/p>/)[1],price=p.match(/<strong class="plan-price">([^<]+)<\/strong>/)[1];
    const artwork=p.match(/src="([^"]+)"/)[1];
    return `<article class="order-product" aria-labelledby="order-product-${i}">\n        <img class="order-product-art" src="${artwork}" alt="" width="960" height="960" decoding="async">\n        <h2 id="order-product-${i}">${name}</h2><strong class="order-product-price">${price}<small> JPY</small></strong><p class="order-product-tagline">${tag}</p>\n        <ul class="order-product-facts">${t.facts[i].map((fact,j)=>`<li>${icon(i===0&&j===1?'minus':'check','order-fact-icon')}<span>${fact}</span></li>`).join('')}</ul>\n      </article>`;
  }).join('\n');
  return `${head}</head>\n<body class="quiet-page gallery-page order-renewal">\n<a class="skip-link" href="#main-content">${t.skip}</a>\n<div class="site-shell language-${key}">\n${header}\n<main id="main-content">\n  <section class="order-hero section-frame" aria-labelledby="order-title">\n    <img class="order-hero-mark" src="${prefix}assets/baked-kale-mark.svg" width="280" height="280" alt="" aria-hidden="true">\n    <p class="eyebrow">${t.eyebrow}</p><h1 id="order-title">FDE IMS</h1>${release}<p class="order-intro">${t.intro}</p>\n  </section>\n  <div class="order-document section-frame">\n    <aside class="order-notice" aria-labelledby="order-notice-title">${icon('warning-circle','order-notice-icon')}<div><strong id="order-notice-title">${t.unavailable}</strong><p>${t.notice}</p></div></aside>\n    <section class="order-products" aria-label="${t.products}">\n      ${products}\n    </section>\n    <section class="order-updates" aria-labelledby="order-updates-title">\n      <h2 id="order-updates-title">License Updates</h2><dl><div><dt>${t.updates[0]}</dt><dd class="sr-only">License Updates</dd></div><div><dt>${t.updates[1]}</dt><dd>¥4,900${t.month}</dd></div><div><dt>${t.updates[2]}</dt><dd>¥9,800${t.month}</dd></div></dl><p>${t.cancel}</p>\n    </section>\n    <section class="order-process" aria-labelledby="order-process-title">\n      <h2 id="order-process-title">${t.flow}</h2><p>${t.flowText}</p>\n      <ol class="order-process-rail">${t.steps.map((step,i)=>`<li><span class="order-step-icon">${icon(['user','package','file-text'][i])}</span><span>${step}</span>${i<2?icon('arrow-right','order-step-arrow'):''}</li>`).join('')}</ol>\n      <div class="order-process-actions"><a class="button button-primary" href="license.html">${t.terms}${icon('arrow-right')}</a><a class="order-text-link" href="index.html#plans">${t.back}${icon('arrow-right')}</a><a class="order-text-link" href="contact.html">${t.contact}${icon('arrow-right')}</a></div>\n    </section>\n  </div>\n</main>\n${footer}\n</div>\n</body>\n</html>\n`;
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  for(const prefix of ['', 'ja/', 'zh/']){
    const file=path.join(root,prefix,'order.html'),source=readFileSync(file,'utf8'),home=readFileSync(path.join(root,prefix,'index.html'),'utf8');
    const output=renderQuietOrder(source,home);
    if(process.argv.includes('--check')){if(source!==output)throw Error(`${prefix}order.html is not composed`);}
    else if(source!==output)process.stdout.write(`*** Begin Patch\n*** Update File: ${file}\n@@\n${source.trimEnd().split('\n').map(x=>'-'+x).join('\n')}\n${output.trimEnd().split('\n').map(x=>'+'+x).join('\n')}\n*** End Patch\n`);
  }
  if(process.argv.includes('--check'))console.log('Quiet Form Order composition is current.');
}
