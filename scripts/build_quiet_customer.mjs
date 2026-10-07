import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const customerCopy={
  en:{title:'Customer Portal',description:'Your IMS order information, in one place.',hero:'Your order.\nOne place.',lead:'Keep your Order ID and order email address together with your quotation, payment and delivery information.',form:'Order information',intro:'Enter the details shown on your quotation or order confirmation.',order:'Order ID',email:'Order email address',hint:'Example: BK-20261101-1234ABCD',privacy:'This preview checks your input on this page only. Nothing is sent or saved.',submit:'Review details',invalidOrder:'Enter an Order ID in the format BK-YYYYMMDD-XXXXXXXX.',invalidEmail:'Enter a valid email address.',review:'Review your details',reviewNote:'These are your entered details, not a retrieved order or payment status.',edit:'Edit details',help:'Your order at a glance',items:[['Quotation & order','Keep your quotation and order confirmation together.'],['Payment','Refer to the payment instructions and confirmation email.'],['Delivery','Keep delivery information and any cancellation correspondence together.']],contactNote:'For product or plan questions, get in touch.',contact:'Contact us',skip:'Skip to content'},
  ja:{title:'顧客ポータル',description:'IMSの注文情報を、ひとつの場所に。',hero:'注文情報を、\nひとつの場所に',lead:'注文番号と購入時のメールアドレスを、見積・支払い・納品の情報とあわせて確認。',form:'注文情報',intro:'見積書や注文確認メールに記載された情報を入力してください。',order:'注文番号',email:'購入時のメールアドレス',hint:'例：BK-20261101-1234ABCD',privacy:'このプレビューでは画面内で入力内容のみを確認します。送信・保存は行いません。',submit:'入力内容を確認',invalidOrder:'注文番号を BK-YYYYMMDD-XXXXXXXX の形式で入力してください。',invalidEmail:'有効なメールアドレスを入力してください。',review:'入力内容の確認',reviewNote:'入力した情報の確認です。注文状況や支払い状況の照会結果ではありません。',edit:'入力内容を編集',help:'注文にまつわる情報',items:[['見積・注文','見積書と注文確認メールをまとめて確認。'],['支払い','支払い方法のご案内と確認メールを参照。'],['納品','納品のご案内やキャンセルの連絡を整理。']],contactNote:'製品やプランについてのご質問はこちらから。',contact:'お問い合わせ',skip:'本文へ移動'},
  zh:{title:'客户门户',description:'集中查看 IMS 订单相关信息。',hero:'订单信息，\n集中查看。',lead:'将订单编号、下单邮箱与报价、付款和交付资料放在一起核对。',form:'订单信息',intro:'请输入报价单或订单确认邮件中注明的信息。',order:'订单编号',email:'下单时使用的邮箱',hint:'示例：BK-20261101-1234ABCD',privacy:'此预览仅在当前页面核对输入内容，不会发送或保存。',submit:'核对输入信息',invalidOrder:'请按 BK-YYYYMMDD-XXXXXXXX 格式输入订单编号。',invalidEmail:'请输入有效的邮箱地址。',review:'核对输入信息',reviewNote:'这里显示的是您输入的信息，并非查询到的订单或付款状态。',edit:'修改输入信息',help:'订单相关信息',items:[['报价与订单','集中查看报价单和订单确认邮件。'],['付款','参照付款说明和确认邮件。'],['交付','整理交付通知及取消订单的相关邮件。']],contactNote:'如有产品或方案方面的问题，欢迎联系我们。',contact:'联系我们',skip:'跳转到正文'}
};

export function renderQuietCustomer(locale,home){
  const t=customerCopy[locale],prefix=locale==='en'?'':'../',lang=locale==='zh'?'zh-CN':locale;
  if(!t)throw Error('Unknown customer locale');
  const version=home.match(/gallery-ui\.css\?v=([^"\s]+)/)[1];
  const icon=name=>`<img src="${prefix}assets/phosphor-${name}.svg" width="24" height="24" alt="" aria-hidden="true">`;
  const header=home.match(/<header class="site-header">[\s\S]*?<\/header>/)[0].replaceAll('href="#plans"','href="index.html#plans"').replace(/href="([^"]*)" hreflang=/g,(_,directory)=>`href="${directory}customer.html" hreflang=`);
  const footer=home.match(/<footer class="site-footer[\s\S]*?<\/footer>/)[0].replaceAll('href="#plans"','href="index.html#plans"');
  const alternates=[['en',''],['ja','ja/'],['zh-CN','zh/'],['x-default','']].map(([language,directory])=>`  <link rel="alternate" hreflang="${language}" href="https://kale1205.github.io/fde-site/${directory}customer.html">`).join('\n');
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${t.title} | Baked Kale FDE</title>
  <meta name="description" content="${t.description}">
  <meta name="robots" content="noindex,follow">
  <link rel="canonical" href="https://kale1205.github.io/fde-site/${locale==='en'?'':locale+'/'}customer.html">
${alternates}
  <link rel="icon" type="image/svg+xml" href="${prefix}assets/baked-kale-mark.svg">
  <link rel="stylesheet" href="${prefix}gallery-ui.css?v=${version}">
  <link rel="stylesheet" href="${prefix}quiet-pages.css?v=${version}">
  <script defer src="${prefix}gallery-ui.js?v=${version}"></script>
  <script type="module" src="${prefix}quiet-customer.js?v=${version}"></script>
</head>
<body class="quiet-page gallery-page customer-renewal">
<a class="skip-link" href="#main-content">${t.skip}</a>
<div class="site-shell language-${locale}">
${header}
<main id="main-content">
  <section class="portal-hero section-frame" aria-labelledby="portal-title">
    <img class="portal-hero-mark" src="${prefix}assets/baked-kale-mark.svg" width="360" height="360" alt="" aria-hidden="true">
    <p class="eyebrow">CUSTOMER PORTAL</p><h1 id="portal-title">${t.hero.replaceAll('\n','<br>')}</h1><p class="portal-lead">${t.lead}</p>
  </section>
  <div class="portal-document section-frame">
    <section class="portal-input-surface" aria-labelledby="portal-form-title">
      <div class="portal-form-intro"><span class="portal-icon">${icon('file-text')}</span><div><h2 id="portal-form-title">${t.form}</h2><p>${t.intro}</p></div></div>
      <form id="portal-form" novalidate aria-describedby="portal-privacy">
        <div class="portal-fields">
          <div class="portal-field"><label for="portal-order">${t.order}</label><input id="portal-order" type="text" required maxlength="20" autocomplete="off" autocapitalize="characters" spellcheck="false" pattern="[Bb][Kk]-[0-9]{8}-[A-Fa-f0-9]{8}" aria-describedby="portal-order-hint"><p class="portal-hint" id="portal-order-hint">${t.hint}</p><p class="portal-error" id="portal-order-error" hidden>${t.invalidOrder}</p></div>
          <div class="portal-field"><label for="portal-email">${t.email}</label><input id="portal-email" type="email" required maxlength="254" autocomplete="email" autocapitalize="none" spellcheck="false"><p class="portal-error" id="portal-email-error" hidden>${t.invalidEmail}</p></div>
        </div>
        <div class="portal-form-actions"><p id="portal-privacy">${t.privacy}</p><button class="button button-primary" type="submit">${t.submit}${icon('arrow-right')}</button></div>
      </form>
      <section id="portal-review" aria-labelledby="portal-review-title" hidden tabindex="-1">
        <h3 id="portal-review-title">${t.review}</h3><p>${t.reviewNote}</p><dl><div><dt>${t.order}</dt><dd id="portal-review-order"></dd></div><div><dt>${t.email}</dt><dd id="portal-review-email"></dd></div></dl><button class="button button-secondary" id="portal-edit" type="button">${t.edit}</button>
      </section>
      <p class="sr-only" id="portal-announcement" role="status" aria-live="polite"></p>
    </section>
    <section class="portal-information" aria-labelledby="portal-information-title">
      <h2 id="portal-information-title">${t.help}</h2><ul>${t.items.map(([title,description],i)=>`<li><span class="portal-icon">${icon(['file-text','credit-card','truck'][i])}</span><div><h3>${title}</h3><p>${description}</p></div></li>`).join('')}</ul>
      <p class="portal-contact-note">${t.contactNote}</p><a class="button button-primary" href="contact.html">${t.contact}${icon('arrow-right')}</a>
    </section>
  </div>
</main>
${footer}
</div>
</body>
</html>
`;
}

if(process.argv[1]===fileURLToPath(import.meta.url))for(const locale of ['en','ja','zh']){
  const prefix=locale==='en'?'':locale+'/',file=path.join(root,prefix,'customer.html'),home=readFileSync(path.join(root,prefix,'index.html'),'utf8'),output=renderQuietCustomer(locale,home);
  let source='';try{source=readFileSync(file,'utf8');}catch{}
  if(process.argv.includes('--check')){if(source!==output)throw Error(`${prefix}customer.html is stale`);}
  else if(source!==output)process.stdout.write(`*** Begin Patch\n*** ${source?'Update':'Add'} File: ${file}\n${source?'@@\n'+source.trimEnd().split('\n').map(x=>'-'+x).join('\n')+'\n':''}${output.trimEnd().split('\n').map(x=>'+'+x).join('\n')}\n*** End Patch\n`);
}
