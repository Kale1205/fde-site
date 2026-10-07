// The approved copy-only correction. URLs, commerce identifiers and FDE role
// descriptions deliberately stay unchanged. Also used for historical fixtures.
import {execFileSync} from 'node:child_process';

export function applyApprovedProductNaming(source) {
  return source.replaceAll('FDE IMS', 'IMS')
    .replaceAll('IMS コンテンツ・運用管理', 'Webサイトのコンテンツ・運用管理')
    .replaceAll('class="business-profile-title">Baked Kale FDE / IMS', 'class="business-profile-title">Baked Kale')
    .replace(/^ *<div class="business-profile-item"><small>(?:Inventory product|在庫管理製品|库存管理产品)<\/small><strong>IMS<\/strong><\/div>\n/gm, '')
    .replace(/^ *<div class="business-profile-item"><small>(?:Planned products|提供予定商品|计划产品)<\/small><strong>License<br>License Plus<\/strong><\/div>\n/gm, '')
    .replaceAll('"name": "Baked Kale FDE"', '"name": "Baked Kale"')
    .replaceAll('"name": "Baked Kale FDE | IMS"', '"name": "Baked Kale | IMS"')
    .replaceAll('在庫管理システムとソースコードを、自社の業務に合う仕組みの出発点に。', '在庫管理システムIMS（Inventory Management System）とソースコードを、自社の業務に合う仕組みの出発点に。')
    .replaceAll('An inventory system and its source code. A starting point for the way your company works.', 'IMS (Inventory Management System) and its source code. A starting point for the way your company works.')
    .replaceAll('以库存管理系统和源代码为起点，打造适合自己业务的工作方式。', '以库存管理系统 IMS（Inventory Management System）及其源代码为起点，打造适合自己业务的工作方式。');
}

// Adapt only website-copy fixtures, never historical worker/security contracts.
export function execApprovedNamingBaseline(command, args, options) {
  const result = execFileSync(command, args, options);
  const file = command === 'git' && args[0] === 'show' ? args[1].split(':').slice(1).join(':') : '';
  const copyFixture = /^(?:(?:ja|zh)\/)?[\w-]+\.html$/.test(file)
    || /^content\/(?:site-content|faq-content|zh-translations)\.json$/.test(file);
  return copyFixture ? applyApprovedProductNaming(result) : result;
}
