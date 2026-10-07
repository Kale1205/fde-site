// A local, noindex design preview. Public homepages and commercial terms stay unchanged.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { releaseCopy } from './release_notice_policy.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const copy = {
  ja: {
    language: 'ja', title: 'Quiet Form — FDE IMS デザインプレビュー',
    product: '製品', demo: 'デモ', news: 'お知らせ', contact: 'お問い合わせ', skip: '本文へ移動', menu: 'メニューを開く',
    release: '2026年11月1日リリース', hero: '自社開発は、<br>ゼロからじゃなくていい。',
    lead: '在庫管理システムとソースコードを、自社の業務に合う仕組みの出発点に。',
    primary: 'ソースコード付きプランを見る', secondary: 'デモを見る',
    license: '最新版へ、更新し続ける。', plus: '自分で変えて、自社だけのアプリへ。',
    comparison: '出発点は2つ', licenseIntro: 'はじめる、整える、使い続ける。', plusIntro: '見える、変えられる、育てていける。',
    terms: '条件を確認', features: '製品の比較',
    rows: [['買い切り', '買い切り'], ['ソースコードなし', 'ソースコード一式'], ['社内向け改変なし', '社内向け改変'], ['当社Updates<br>月額契約必須', '当社Updates対象外<br>購入者が更新・管理']],
    fees: ['最初の3か月は含む', '4〜6か月目 <strong>¥4,900/月</strong>', '7か月目以降 <strong>¥9,800/月</strong>'],
    retained: 'Updates終了後も、既存バージョンは利用できます。',
    demoTitle: '触ってわかる、IMS。', sample: '公開デモ・サンプルデータ',
    fullDemo: 'デモを広く使う', play: '操作例を再生', pause: '一時停止', replay: 'もう一度見る',
    step: ['商品を選ぶ', '入庫を記録', '在庫に反映'],
    newsTitle: 'Baked Kaleの現在地。', newsBody: 'Baked Kaleの開発について、<br>お知らせをご覧いただけます。', newsLink: 'お知らせを見る',
    temporary: 'サンプルデータはページ内だけで動きます。リセットすると変更は消えます。',
    mobileStock: '選択商品の在庫', total: '合計', main: '本社 / A-01', osaka: '大阪 / B-02',
  },
  en: {
    language: 'en', title: 'Quiet Form — FDE IMS design preview',
    product: 'Products', demo: 'Demo', news: 'News', contact: 'Contact', skip: 'Skip to content', menu: 'Open menu',
    release: 'Releases November 1, 2026', hero: 'Your own system.<br>Not from scratch.',
    lead: 'An inventory system and its source code. A starting point for the way your company works.',
    primary: 'Explore the source-code plan', secondary: 'Try the demo',
    license: 'Keep moving with the latest IMS.', plus: 'Make it yours. Make it your company’s app.',
    comparison: 'Two starting points.', licenseIntro: 'Start. Organize. Keep working.', plusIntro: 'See it. Change it. Build on it.',
    terms: 'Review terms', features: 'Compare products',
    rows: [['One-time purchase', 'One-time purchase'], ['No source code', 'Complete source code'], ['No internal modification', 'Internal modification'], ['Our Updates<br>Monthly subscription required', 'Not eligible for our Updates<br>Purchaser updates and manages']],
    fees: ['First 3 months included', 'Months 4–6 <strong>¥4,900/mo</strong>', 'Month 7 onward <strong>¥9,800/mo</strong>'],
    retained: 'When Updates ends, you can keep using your existing version.',
    demoTitle: 'Get a feel for IMS.', sample: 'Public demo · Sample data',
    fullDemo: 'Open the full demo', play: 'Play example', pause: 'Pause', replay: 'Replay example',
    step: ['Choose a product', 'Record receive', 'Stock updated'],
    newsTitle: 'Where Baked Kale is now.', newsBody: 'Follow the development of Baked Kale<br>in our latest news.', newsLink: 'Read the news',
    temporary: 'Sample data runs only in this page. Resetting discards your changes.',
    mobileStock: 'Selected product stock', total: 'Total', main: 'Main / A-01', osaka: 'Osaka / B-02',
  },
  zh: {
    language: 'zh-CN', title: 'Quiet Form — FDE IMS 设计预览',
    product: '产品', demo: '演示', news: '动态', contact: '联系我们', skip: '跳至正文', menu: '打开菜单',
    release: '2026年11月1日发布', hero: '开发自己的系统，<br>不必从零开始。',
    lead: '以库存管理系统和源代码为起点，打造适合自己业务的工作方式。',
    primary: '查看含源代码的方案', secondary: '体验演示',
    license: '持续更新，使用最新版 IMS。', plus: '亲手改造，成为自己公司的应用。',
    comparison: '两种起点。', licenseIntro: '开始使用，理顺流程，持续运作。', plusIntro: '看得见，改得了，用着不断完善。',
    terms: '查看条件', features: '产品对比',
    rows: [['一次性购买', '一次性购买'], ['不含源代码', '完整源代码'], ['不允许内部修改', '允许内部修改'], ['官方 Updates<br>须订阅月度服务', '不适用官方 Updates<br>由购买方更新和管理']],
    fees: ['含最初3个月', '第4–6个月 <strong>¥4,900/月</strong>', '第7个月起 <strong>¥9,800/月</strong>'],
    retained: '停止 Updates 后，仍可继续使用已有版本。',
    demoTitle: '亲手体验 IMS。', sample: '公开演示 · 示例数据',
    fullDemo: '打开完整演示', play: '播放操作示例', pause: '暂停', replay: '重新播放',
    step: ['选择商品', '记录入库', '更新库存'],
    newsTitle: 'Baked Kale 的此刻。', newsBody: '在最新动态中，<br>了解 Baked Kale 的开发进展。', newsLink: '查看动态',
    temporary: '示例数据仅在当前页面中运行。重置后，所有更改都会消失。',
    mobileStock: '所选商品库存', total: '合计', main: '总部 / A-01', osaka: '大阪 / B-02',
  },
};

const locales = { en: '', ja: 'ja/', zh: 'zh/' };
export async function renderQuietPreview(locale) {
  const c = copy[locale];
  const prefix = locale === 'en' ? '' : '../';
  const demo = await readFile(path.join(root, locales[locale], 'demo.html'), 'utf8');
  // W01's approved embedded demo is a separate composition from W03's full page.
  // Keep its current workspace unchanged when the full Demo page is renewed.
  const renewedDemo = demo.includes('demo-renewal');
  const workspaceSource = renewedDemo ? await readFile(path.join(root, locales[locale], 'index.html'), 'utf8') : demo;
  const workspaceStart = workspaceSource.indexOf('<section class="demo-workspace"');
  const workspaceEnd = workspaceSource.indexOf(renewedDemo ? '<div class="mobile-stock"' : '</main>', workspaceStart);
  if (workspaceStart < 0 || workspaceEnd < 0) throw new Error(`Missing approved ${locale} homepage demo workspace`);
  const workspace = workspaceSource.slice(workspaceStart, workspaceEnd).trim();
  const alternates = Object.entries(locales).map(([code, dir]) => `<link rel="alternate" hreflang="${code === 'zh' ? 'zh-CN' : code}" href="${prefix}${dir}quiet-form.html">`).join('\n');
  const languageLinks = Object.entries(locales).filter(([code]) => code !== locale).map(([code, dir]) => `<a class="locale-button" data-locale-link href="${prefix}${dir}quiet-form.html" hreflang="${code === 'zh' ? 'zh-CN' : code}" lang="${code === 'zh' ? 'zh-CN' : code}">${{en:'English',ja:'日本語',zh:'简体中文'}[code]}</a>`).join('');
  const productImage = (plus = false, hero = false) => `<img class="${hero ? 'sculpture' : 'comparison-sculpture'}" src="${prefix}assets/${plus ? 'ims-license-plus-customize' : 'ims-license-update'}.webp" alt="" width="960" height="960" ${hero ? 'fetchpriority="high"' : 'loading="lazy"'}>`;
  const featureRows = c.rows.map((row, i) => `<tr><td><span aria-hidden="true">${[true, false, false, true][i] ? '✓' : '—'}</span>${row[0]}</td><td><span aria-hidden="true">${[true, true, true, false][i] ? '✓' : '—'}</span>${row[1]}</td></tr>`).join('\n');
  const html = `<!doctype html>
<html lang="${c.language}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${c.title}</title><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#073e2c">
${alternates}
<link rel="icon" type="image/svg+xml" href="${prefix}assets/baked-kale-mark.svg">
<link rel="stylesheet" href="${prefix}gallery-ui.css"><link rel="stylesheet" href="${prefix}quiet-form.css">
<script defer src="${prefix}gallery-ui.js"></script><script defer src="${prefix}demo-v1.js"></script><script defer src="${prefix}quiet-form.js"></script>
</head>
<body class="gallery-page quiet-home">
<a class="skip-link" href="#main-content">${c.skip}</a>
<div class="site-shell language-${locale}">
<header class="site-header">
<a class="brand" href="quiet-form.html" aria-label="Baked Kale FDE"><img src="${prefix}assets/baked-kale-logo.svg" alt="Baked Kale FDE" width="980" height="240"></a>
<nav class="desktop-nav" aria-label="${c.menu}"><a href="#plans">${c.product}</a><a href="demo.html">${c.demo}</a><a href="goals.html">Our Goals</a><a href="news.html">${c.news}</a><a href="contact.html">${c.contact}</a></nav>
<div class="header-actions">${languageLinks}<button class="menu-button" type="button" aria-label="${c.menu}" aria-expanded="false" aria-controls="mobile-nav"><svg viewBox="0 0 256 256" aria-hidden="true"><path d="M224 128a8 8 0 0 1-8 8H40a8 8 0 0 1 0-16h176a8 8 0 0 1 8 8ZM40 72h176a8 8 0 0 0 0-16H40a8 8 0 0 0 0 16Zm176 112H40a8 8 0 0 0 0 16h176a8 8 0 0 0 0-16Z"/></svg></button></div>
<nav class="mobile-nav" id="mobile-nav" aria-label="${c.menu}" hidden><a href="#plans">${c.product}</a><a href="goals.html">Our Goals</a><a href="news.html">${c.news}</a><a href="contact.html">${c.contact}</a></nav>
</header>
<main id="main-content">
<section class="quiet-hero" id="product" aria-labelledby="hero-title">
<div class="section-frame">
<p class="release-line" data-release-notice><span aria-hidden="true">—</span><span>${c.release}<span class="release-availability">${releaseCopy[locale].unavailable}</span></span></p>
<h1 id="hero-title">${c.hero.split('<br>').map(line => `<span>${line}</span>`).join('')}</h1><p class="quiet-lead">${c.lead}</p>
<div class="quiet-actions"><a class="button" href="#license-plus">${c.primary} <span aria-hidden="true">→</span></a><a class="quiet-text-link" href="#motion-demo">${c.secondary} <span aria-hidden="true">→</span></a></div>
<div class="sculpture-pair">
<figure>${productImage(false, true)}<figcaption><h2><span>FDE IMS</span> <span>License</span></h2><p>${c.license}</p></figcaption></figure>
<figure>${productImage(true, true)}<figcaption><h2><span>FDE IMS</span> <span>License Plus</span></h2><p>${c.plus}</p></figcaption></figure>
</div></div>
</section>
<section class="quiet-plans section-frame" id="plans" aria-labelledby="plan-title">
<h2 class="quiet-heading" id="plan-title">${c.comparison}</h2>
<table class="quiet-comparison"><caption class="visually-hidden">${c.features}</caption>
<thead><tr><th scope="col"><div class="plan-top">${productImage()}<h3><span>FDE IMS</span> <span>License</span></h3><p>${c.licenseIntro}</p><strong class="plan-price">¥49,800</strong><a href="license.html#comparison">${c.terms} <span aria-hidden="true">→</span></a></div></th>
<th scope="col" id="license-plus"><div class="plan-top">${productImage(true)}<h3><span>FDE IMS</span> <span>License Plus</span></h3><p>${c.plusIntro}</p><strong class="plan-price">¥99,800</strong><a href="license.html#comparison">${c.terms} <span aria-hidden="true">→</span></a></div></th></tr></thead>
<tbody>${featureRows}</tbody></table>
<div class="updates-strip"><strong>License Updates</strong>${c.fees.map(fee => `<span>${fee}</span>`).join('')}</div>
<p class="updates-note">${c.retained}</p>
</section>
<section class="quiet-demo section-frame" id="motion-demo" aria-labelledby="demo-title">
<header class="demo-section-heading"><div><h2 class="quiet-heading" id="demo-title">${c.demoTitle}</h2><p>${c.sample}</p></div><a class="quiet-text-link" href="demo.html">${c.fullDemo} <span aria-hidden="true">→</span></a></header>
<div class="motion-toolbar"><ol class="motion-steps">${c.step.map((s, i) => `<li data-motion-step="${i}"><span aria-hidden="true">0${i + 1}</span>${s}</li>`).join('')}</ol><button class="motion-toggle" type="button" aria-controls="imsDemoRoot" data-play="${c.play}" data-pause="${c.pause}" data-replay="${c.replay}">${c.play}</button></div>
${workspace}
<div class="mobile-stock" aria-label="${c.mobileStock}"><strong data-mobile-product>PC-1204</strong><dl><div><dt>${c.main}</dt><dd data-mobile-main>326</dd></div><div><dt>${c.osaka}</dt><dd data-mobile-osaka>20</dd></div><div><dt>${c.total}</dt><dd data-mobile-total>346</dd></div></dl></div>
<p class="sample-note">${c.temporary}</p><p class="visually-hidden" id="motion-announcement" role="status" aria-live="polite"></p>
</section>
<section class="quiet-news section-frame"><div><h2 class="quiet-heading">${c.newsTitle}</h2><p>${c.newsBody}</p></div><a class="button" href="news.html">${c.newsLink} <span aria-hidden="true">→</span></a></section>
</main>
<footer class="site-footer section-frame"><a href="quiet-form.html"><img src="${prefix}assets/baked-kale-logo.svg" alt="Baked Kale FDE" width="980" height="240"></a><nav class="footer-nav" aria-label="Footer"><a href="#plans">${c.product}</a><a href="demo.html">${c.demo}</a><a href="goals.html">Our Goals</a><a href="news.html">${c.news}</a><a href="contact.html">${c.contact}</a></nav><small>© 2026 Baked Kale FDE</small></footer>
</div>
</body></html>`;
  return html;
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  for (const locale of Object.keys(locales)) {
    await writeFile(path.join(root, locales[locale], 'quiet-form.html'), await renderQuietPreview(locale));
  }
}
