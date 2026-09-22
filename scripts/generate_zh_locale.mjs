import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(path.join(root, 'license.html'), 'utf8');

const translations = new Map([
  ['FDE IMS License & License Plus | Plan Policy', 'FDE IMS License 与 License Plus｜价格与使用条件'],
  ['Compare planned FDE IMS License and License Plus rights, source-code scope, maintenance responsibility, restrictions, and price status.', '比较开发中的 FDE IMS License 与 License Plus：源代码范围、维护责任、使用限制与预定价格。'],
  ['Review the two planned FDE IMS products, rights, restrictions, maintenance responsibility, and price status.', '了解 FDE IMS 两种预定产品的权利、限制、维护责任与价格状态。'],
  ['Baked Kale FDE home', 'Baked Kale FDE 首页'],
  ['Primary navigation', '主导航'],
  ['Product', '产品'],
  ['Our Goals', '我们的目标'],
  ['News', '最新消息'],
  ['Contact us', '联系我们'],
  ['Open menu', '打开菜单'],
  ['Mobile navigation', '移动端导航'],
  ['On this page', '本页内容'],
  ['Plans and scope', '方案与使用范围'],
  ['Deliverables', '交付内容'],
  ['Internal use', '内部使用'],
  ['Updates and maintenance', '更新与维护'],
  ['Conditions', '使用条件'],
  ['Decision guides', '选择指南'],
  ['PLAN POLICY / IN DEVELOPMENT', '方案政策 / 开发中'],
  ['Where do you want to start?', '您想从哪一种方案开始？'],
  ['Choose the product that matches how your team wants to use and maintain FDE IMS. Both are one-time purchases for perpetual internal use by one legal entity.', '请根据团队使用和维护 FDE IMS 的方式选择方案。两种方案均为一次性购买，供同一法人内部永久使用。'],
  ['Displayed product', '显示的方案'],
  ['Planned License and License Plus comparison', 'License 与 License Plus 预定条件比较'],
  ['Item', '项目'],
  ['one-time', '一次性购买'],
  ['Price (USD candidate)', '预定价格（美元）'],
  ['Source-code delivery', '提供源代码'],
  ['Not included', '不包含'],
  ['Included', '包含'],
  ['Internal modification', '内部修改'],
  ['Not permitted', '不可修改'],
  ['Permitted', '可修改'],
  ['Updates', '更新'],
  ['3 months included<br>then optional add-on', '包含 3 个月<br>之后可选购更新服务'],
  ['Purchaser managed', '由购买方负责'],
  ['Security management', '安全管理'],
  ['Purchaser', '购买方'],
  ['Draft product policy.', '以下为开发中的预定条件。'],
  [' FDE IMS is still in development. Every USD amount is an unapproved candidate pending final international pricing. Final commercial terms and the License Agreement / EULA will be presented before purchasing is enabled.', ' FDE IMS 仍在开发中。所有美元金额均为尚未批准的候选价格，最终国际定价、商业条件和 License Agreement / EULA 将在开放购买前公布。'],
  ['Selected product', '当前选择'],
  ['SELECTED PRODUCT', '当前选择'],
  ['CANDIDATE TOTAL', '预定总价'],
  ['one-time USD candidate', '一次性美元候选价格'],
  ['PRIMARY RESPONSIBILITY', '主要责任范围'],
  ['Full source code included', '包含完整源代码'],
  ['Internal modification permitted', '允许内部修改'],
  ['Updates and security managed by purchaser', '更新与安全由购买方管理'],
  ['Ask about these terms', '咨询这些条件'],
  ['Internal use ≠ resale or redistribution', '内部使用 ≠ 转售或再分发'],
  ['These products are for internal business use. Customers may use FDE IMS while selling their ordinary products or services, but may not sell, sublicense, host, or redistribute FDE IMS itself.', '本产品仅供企业内部业务使用。您可以在使用 FDE IMS 的同时销售自己的普通产品或服务，但不得销售、转授权、托管或再分发 FDE IMS 本身。'],
  ['Perpetual internal use by one purchasing legal entity. Source code and source-level modification rights are not included. The first three months of Updates-equivalent service are included.', '供一个购买法人永久内部使用。不包含源代码及源代码级修改权。购买后前三个月包含更新服务。'],
  ['Planned for perpetual internal use with full source, internal customization, technical documentation, and customer-server/self-hosted operation. The License Updates add-on is not included or available for Plus.', '计划包含永久内部使用权、完整源代码、内部定制权、技术资料，以及在客户服务器上自行托管运行。License 的 Updates 附加服务不适用于 License Plus。'],
  ['What License Plus allows', 'License Plus 允许的范围'],
  ['Inspect, edit, extend, and integrate the full source for internal use', '为内部使用检查、编辑、扩展并集成完整源代码'],
  ['Use internally modified versions', '在内部使用修改后的版本'],
  ['Engage an external developer under confidentiality and the same restrictions', '在保密义务及相同限制下委托外部开发者'],
  ['Use planned build, deployment, database, API, and backup/restore documentation', '使用计划提供的构建、部署、数据库、API 与备份/恢复资料'],
  ['What no plan grants', '任何方案均不允许'],
  ['No sale or resale of original or modified versions', '不得销售或转售原版或修改版'],
  ['No unauthorized transfer, sublicensing, or redistribution of product files', '不得擅自转让、转授权或再分发产品文件'],
  ['No public repositories, websites, social media, or public file shares', '不得发布到公开代码库、网站、社交媒体或公共文件空间'],
  ['No third-party SaaS, rental, hosting, or service-bureau provision', '不得以第三方 SaaS、租赁、托管或服务机构形式提供'],
  ['License Updates', 'License 更新服务'],
  ['Months 1–3 are included. Optional continuation requires explicit opt-in at the $31/month USD candidate price for months 4–6 and $62/month from month 7. The purchased version remains available if Updates is not continued.', '第 1–3 个月包含更新。若明确选择继续，第 4–6 个月的候选价格为每月 31 美元，第 7 个月起为每月 62 美元。停止更新后，仍可继续使用已购买的版本。'],
  ['License Plus responsibility', 'License Plus 的责任'],
  ['The purchaser manages source changes, functionality, compatibility, and security. Updates is not a third product and cannot be added to License Plus.', '购买方负责源代码变更、功能、兼容性与安全。Updates 不是第三种产品，也不能添加到 License Plus。'],
  ['Legal entity and notices', '法人范围与权利声明'],
  ['Each product covers the purchasing legal entity. Parent companies, subsidiaries, affiliates, and other separate legal entities generally require their own plan. Intellectual-property ownership is not transferred, and copyright, license, and third-party notices must remain.', '每个方案仅覆盖购买法人。母公司、子公司、关联公司及其他独立法人原则上需要分别购买。知识产权所有权不转移，且必须保留版权、许可及第三方声明。'],
  ['AI, OSS, and self-hosting', 'AI、开源软件与自行托管'],
  ['Internal AI tools may be used only when submitted code is excluded from third-party model training. Model training and public datasets are prohibited. Self-hosting, supported environments, deployment, SLA, tax, refunds, migration, and delivery details remain under development or review.', '仅在提交的代码不会用于第三方模型训练时，才可使用内部 AI 工具。禁止将代码用于模型训练或公开数据集。自行托管、支持环境、部署、SLA、税务、退款、迁移和交付细节仍在开发或评估中。'],
  ['06 / DECISION GUIDES', '06 / 选择指南'],
  ['Explore FDE IMS by your decision', '按您的判断重点了解 FDE IMS'],
  ['Each guide separates one purchase or operating question from the full policy above.', '以下指南将购买或运营中的重点问题分别说明。'],
  ['FDE IMS decision guides', 'FDE IMS 选择指南'],
  ['OWNERSHIP', '购买方式'],
  ['One-time purchase', '一次性购买'],
  ['Products, perpetual use, and optional License Updates', '产品、永久使用权与可选的 License 更新服务'],
  ['SOURCE RIGHTS', '源代码权利'],
  ['Source-code delivery', '提供源代码'],
  ['License Plus modification rights and restrictions', 'License Plus 的修改权与限制'],
  ['DEPLOYMENT', '运行方式'],
  ['Self-hosted direction', '自行托管方向'],
  ['Planned customer-server responsibility boundaries', '计划中的客户服务器责任边界'],
  ['PRODUCT FIT', '产品适配'],
  ['Small-business workflow', '小型企业工作流程'],
  ['Current preview scope and unresolved requirements', '当前预览范围与尚未确定的要求'],
  ['Back to the two products', '返回两种产品'],
  ['Footer navigation', '页脚导航'],
  ['FDE IMS inventory software for small operations.', '面向小型运营团队的 FDE IMS 库存管理软件。'],
  ['Draft policy. FDE IMS is in development.', '当前为预定政策。FDE IMS 仍在开发中。'],
  ['Contact', '联系']
]);

let output = source
  .replace('<html lang="en">', '<html lang="zh-CN">')
  .replaceAll('href="assets/', 'href="../assets/')
  .replaceAll('src="assets/', 'src="../assets/')
  .replaceAll('href="gallery-', 'href="../gallery-')
  .replaceAll('href="license.css', 'href="../license.css')
  .replaceAll('src="gallery-ui.js', 'src="../gallery-ui.js')
  .replaceAll('https://kale1205.github.io/fde-site/license.html', 'https://kale1205.github.io/fde-site/zh/license.html')
  .replace('hreflang="en" href="https://kale1205.github.io/fde-site/zh/license.html"', 'hreflang="en" href="https://kale1205.github.io/fde-site/license.html"')
  .replace('hreflang="x-default" href="https://kale1205.github.io/fde-site/zh/license.html"', 'hreflang="x-default" href="https://kale1205.github.io/fde-site/license.html"')
  .replace('<link rel="alternate" hreflang="ja" href="https://kale1205.github.io/fde-site/ja/license.html">', '<link rel="alternate" hreflang="ja" href="https://kale1205.github.io/fde-site/ja/license.html">\n  <link rel="alternate" hreflang="zh-CN" href="https://kale1205.github.io/fde-site/zh/license.html">')
  .replace('class="site-shell language-en"', 'class="site-shell language-zh"')
  .replaceAll('href="index.html"', 'href="../index.html"')
  .replaceAll('href="goals.html"', 'href="../goals.html"')
  .replaceAll('href="news.html"', 'href="../news.html"')
  .replaceAll('href="contact.html"', 'href="../contact.html"')
  .replaceAll('href="demo.html"', 'href="../demo.html"')
  .replaceAll('href="one-time-purchase-inventory-software.html"', 'href="../one-time-purchase-inventory-software.html"')
  .replaceAll('href="inventory-software-with-source-code.html"', 'href="../inventory-software-with-source-code.html"')
  .replaceAll('href="self-hosted-inventory-management-software.html"', 'href="../self-hosted-inventory-management-software.html"')
  .replaceAll('href="small-business-inventory-management-software.html"', 'href="../small-business-inventory-management-software.html"')
  .replaceAll('href="index.html#plans"', 'href="../index.html#plans"')
  .replace('<a class="locale-button" data-locale-link href="ja/license.html" hreflang="ja" lang="ja">日本語</a>', '<a class="locale-button" data-locale-link href="../license.html" hreflang="en" lang="en">English</a><a class="locale-button" href="../ja/license.html" hreflang="ja" lang="ja">日本語</a>')
  .replace('<a href="ja/license.html" hreflang="ja" lang="ja">日本語</a>', '<a href="../license.html" hreflang="en" lang="en">English</a><a href="../ja/license.html" hreflang="ja" lang="ja">日本語</a>');

for (const [from, to] of [...translations].sort(([a], [b]) => b.length - a.length)) {
  output = output.replaceAll(from, to);
}
output = output
  .replaceAll('<a class="locale-button" href="zh/license.html" hreflang="zh-CN" lang="zh-CN">中文</a>', '')
  .replaceAll('<a href="zh/license.html" hreflang="zh-CN" lang="zh-CN">中文</a>', '')
  .replaceAll('../一次性购买-purchase-inventory-software.html', '../one-time-purchase-inventory-software.html')
  .replaceAll('Candidate total', '预定总价')
  .replaceAll('Primary responsibility', '主要责任范围')
  .replaceAll('License 的 更新 附加服务', 'License 的更新附加服务')
  .replaceAll('更新 不是第三种产品', '更新不是第三种产品')
  .replaceAll('产品s, perpetual use, and optional License 更新', '两种产品、永久使用权与可选的 License 更新服务');

const outputPath = path.join(root, 'zh/license.html');
if (process.argv.includes('--check')) {
  if (readFileSync(outputPath, 'utf8') !== output) {
    console.error('zh/license.html is stale; run node scripts/generate_zh_locale.mjs');
    process.exit(1);
  }
  console.log('Chinese license page is current.');
} else {
  writeFileSync(outputPath, output);
}
