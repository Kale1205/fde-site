import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const translations = JSON.parse(readFileSync(path.join(root, 'content/zh-translations.json'), 'utf8'));
const pages = [
  'index.html',
  'one-time-purchase-inventory-software.html',
  'inventory-software-with-source-code.html',
  'self-hosted-inventory-management-software.html',
  'small-business-inventory-management-software.html',
  'license.html',
  'demo.html',
  'goals.html',
  'contact.html',
  'news.html',
  'order.html',
];

const canonicalFor = (name, locale = '') => {
  const suffix = name === 'index.html' ? '' : name;
  return `https://kale1205.github.io/fde-site/${locale}${suffix}`;
};

const polishChinese = (value) => String(value)
  .replace(/(?:烧焦|烘烤)(?:的)?\s*Kale(?:的)?\s*FDE/gi, 'Baked Kale FDE')
  .replace(/烧焦(?:的)?\s*Kale/gi, 'Baked Kale')
  .replace(/(?:烧烤卡莱|烤凯莱|烤卡莱|烤凯勒)\s*FDE/gi, 'Baked Kale FDE')
  .replace(/(?:烧烤卡莱|烤凯莱|烤卡莱|烤凯勒)/gi, 'Baked Kale')
  .replace(/(?:Livers|Livee|Plus许可|许可证附加|许可证加号|许可证加)/gi, 'License Plus')
  .replace(/标准许可证/g, '标准 License')
  .replace(/许可证/g, 'License')
  .replace(/欧洲劳工局/g, 'EULA')
  .replace(/客户服务员/g, '客户服务器')
  .replace(/苏丹解放军/g, 'SLA')
  .replace(/全源/g, '完整源代码')
  .replace(/资源编码/g, '源代码')
  .replace(/资源代码/g, '源代码')
  .replace(/源编码/g, '源代码')
  .replace(/自办业务/g, '自托管运行')
  .replace(/发展中/g, '开发中')
  .replace(/候选人/g, '候选价格')
  .replace(/采购法律实体/g, '购买法人')
  .replace(/移徙/g, '迁移')
  .replace(/支助/g, '支持')
  .replace(/专用回收服务/g, '专用恢复服务')
  .replace(/个人内部使用/g, '永久内部使用')
  .replace(/粗略代码/g, 'Rust 代码')
  .replace(/^编号\s*/, '否。')
  .replace(/^没有\s+/, '否。');
const translateValue = (value) => polishChinese(translations[value.replace(/\s+/g, ' ').trim()] || value);

function translateMarkup(source) {
  const tokens = source.split(/(<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<template\b[^>]*>[\s\S]*?<\/template>|<[^>]+>)/gi);
  return tokens.map((token) => {
    if (!token) return token;
    if (token.startsWith('<')) {
      if (/^<(?:script|style|template)\b/i.test(token)) return token;
      return token.replace(/\b(aria-label|placeholder|alt|title|content)=(['"])(.*?)\2/gi, (match, name, quote, value) => {
        if (name.toLowerCase() === 'content') {
          if (!/^<meta\b/i.test(token)) return match;
          if (!/(?:name|property)=(['"])(?:description|og:title|og:description|twitter:title|twitter:description)\1/i.test(token)) return match;
        }
        return `${name}=${quote}${translateValue(value)}${quote}`;
      });
    }
    const leading = token.match(/^\s*/)?.[0] || '';
    const trailing = token.match(/\s*$/)?.[0] || '';
    const normalized = token.replace(/\s+/g, ' ').trim();
    return normalized && Object.hasOwn(translations, normalized)
      ? `${leading}${polishChinese(translations[normalized])}${trailing}`
      : token;
  }).join('');
}

function localizeReferences(source) {
  return source.replace(/\b(href|src)=(['"])(.*?)\2/gi, (match, name, quote, value) => {
    if (!value || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\.\.\/)/i.test(value)) return match;
    if (value.startsWith('ja/')) return `${name}=${quote}../${value}${quote}`;
    if (value === './' || /^(?:[\w-]+\.html)?(?:#.*)?$/.test(value)) return match;
    return `${name}=${quote}../${value}${quote}`;
  });
}

function localeFallbackLinks(name) {
  const english = name === 'index.html' ? '../' : `../${name}`;
  const japanese = name === 'index.html' ? '../ja/' : `../ja/${name}`;
  return {
    header: `<a class="locale-button" data-locale-link href="${english}" hreflang="en" lang="en">English</a><a class="locale-button" href="${japanese}" hreflang="ja" lang="ja">日本語</a>`,
    mobile: `<a href="${english}" hreflang="en" lang="en">English</a><a href="${japanese}" hreflang="ja" lang="ja">日本語</a>`,
  };
}

function renderPage(name) {
  const jaUrl = canonicalFor(name, 'ja/');
  const zhUrl = canonicalFor(name, 'zh/');
  const fallbacks = localeFallbackLinks(name);
  let output = readFileSync(path.join(root, name), 'utf8')
    .replace('<html lang="en">', '<html lang="zh-CN">')
    .replaceAll('class="site-shell language-en"', 'class="site-shell language-zh"')
    .replace(/<link rel="canonical" href="[^"]+">/, `<link rel="canonical" href="${zhUrl}">`)
    .replace(/<meta property="og:url" content="[^"]+">/, `<meta property="og:url" content="${zhUrl}">`)
    .replaceAll(`<link rel="alternate" hreflang="zh-CN" href="${zhUrl}">`, '')
    .replace(`<link rel="alternate" hreflang="ja" href="${jaUrl}">`, `<link rel="alternate" hreflang="ja" href="${jaUrl}">\n<link rel="alternate" hreflang="zh-CN" href="${zhUrl}">`)
    .replaceAll('#webpage-en', '#webpage-zh')
    .replaceAll('"inLanguage": "en"', '"inLanguage": "zh-CN"')
    .replaceAll('"creativeWorkStatus": "In development"', '"creativeWorkStatus": "开发中"');

  output = localizeReferences(output)
    .replaceAll('../cms-content.js', '../cms-content-ja.js');
  output = output.replace(/(<div class="header-actions">)([\s\S]*?)(<\/div>)/, (match, open, body, close) => {
    const clean = body.replace(/<a\b[^>]*hreflang="(?:en|ja|zh-CN)"[^>]*>[\s\S]*?<\/a>/g, '');
    return `${open}\n${fallbacks.header}${clean}${close}`;
  });
  output = output.replace(/(<nav class="mobile-nav"[^>]*>)([\s\S]*?)(<\/nav>)/, (match, open, body, close) => {
    const clean = body.replace(/<a\b[^>]*hreflang="(?:en|ja|zh-CN)"[^>]*>[\s\S]*?<\/a>/g, '');
    const contact = clean.lastIndexOf('<a href="contact.html"');
    const localized = contact >= 0
      ? `${clean.slice(0, contact)}${fallbacks.mobile}${clean.slice(contact)}`
      : `${clean}${fallbacks.mobile}`;
    return `${open}${localized}${close}`;
  });
  if (name === 'order.html') {
    output = output.replace(/<nav class="order-locale"[\s\S]*?<\/nav>/, '<nav class="order-locale" aria-label="选择语言"><a href="../order.html" hreflang="en" lang="en">English</a><a href="../ja/order.html" hreflang="ja" lang="ja">日本語</a><a href="order.html" hreflang="zh-CN" lang="zh-CN" aria-current="page">简体中文</a></nav>');
  }

  if (name === 'contact.html') output = output.replace(/\n?<script defer src="\.\.\/faq-cms\.js[^>]*><\/script>/, '');
  return translateMarkup(output).replace(/\n[ \t]+\n/g, '\n\n');
}

mkdirSync(path.join(root, 'zh'), { recursive: true });
let stale = false;
for (const name of pages) {
  const output = renderPage(name);
  const outputPath = path.join(root, 'zh', name);
  if (process.argv.includes('--check')) {
    let current = '';
    try { current = readFileSync(outputPath, 'utf8'); } catch { /* reported below */ }
    if (current !== output) {
      console.error(`zh/${name} is stale; run node scripts/generate_zh_locale.mjs`);
      stale = true;
    }
  } else {
    writeFileSync(outputPath, output);
  }
}

if (process.argv.includes('--check')) {
  if (stale) process.exit(1);
  console.log(`All ${pages.length} Chinese pages are current.`);
} else {
  console.log(`Generated ${pages.length} Chinese pages.`);
}
