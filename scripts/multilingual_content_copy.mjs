// Step ③: reviewed translations of existing questions, not new product terms.
import {readFileSync} from 'node:fs';

export const zhFaqCopy = {
  'license-updates-difference': ['License 与 License Plus 有什么区别？', 'License 为一次性购买，不含源代码，可永久用于购买法人内部，并包含前三个月的 Updates；之后可选择继续购买 License 专用的 Updates 附加服务。License Plus 同样为一次性购买，包含源代码与内部修改权，更新和安全由购买方负责。Updates 不是第三种产品方案，也不适用于 License Plus。', ['产品区别','一次性购买','源代码','内部修改','Updates']],
  'ims-purpose': ['IMS 是用于什么的产品？', 'IMS 正在作为面向小型企业的库存管理业务软件开发，以桌面应用和本地运行为主要方向。最终功能仍在开发中，本 FAQ 不保证尚未正式确定的功能。', ['库存管理','小型企业','桌面应用','本地运行']],
  'demo-not-product-version': ['目前的 IMS 演示是正式发布的产品吗？', '不是。目前的演示是用于了解开发中 IMS 预期操作体验的示例，不代表正式产品版本、已完成功能、更新历史、安全维护记录或交付记录。网站提供英语、日语和简体中文；原生应用首个版本的界面语言仅以英语和日语为目标，网站提供中文不代表原生应用支持中文。', ['演示','正式产品','示例数据','开发预览','界面语言','中文']],
  'license-price': ['IMS License 的价格是多少？', 'License 的一次性美元候选价格为 349 美元，不含源代码，允许购买法人永久内部使用，并包含购买后前三个月的 Updates 等效服务，无需另付费用。不会自动转为付费 Updates。所有美元金额均为等待最终国际定价的未批准候选价格。', ['License','价格','349 美元','一次性购买','前三个月']],
  'license-plus-price': ['License Plus 的预定价格与包含权利是什么？', '一次性美元候选价格为 699 美元。计划包含购买法人的永久内部使用权、完整源代码、内部修改权、技术文档以及客户服务器自托管运行。该方案不含 Updates 权利，更新与安全由购买方负责。所有美元金额均为等待最终国际定价的未批准候选价格。', ['License Plus','价格','699 美元','源代码','自托管']],
  'license-plus-upgrade': ['可以从 License 升级到 License Plus 吗？', '当前的两种产品方案未设置从 License 补差价升级到 License Plus 的条件。License Plus 计划作为独立产品另行购买，最终条件会在正式销售前公布。', ['升级','差价','独立购买']],
  'license-perpetual': ['License 购买一次后可以永久使用吗？', '可以。License 允许购买法人永久内部使用，使用基本功能无需强制订阅月度服务。最终条件会在正式销售前通过 License Agreement / EULA 公布。', ['永久使用','内部使用','无需月费','EULA']],
  'license-source-code': ['License 包含源代码吗？', '不包含。License 的美元候选价格为 349 美元，不含源代码。需要完整源代码、技术文档、自托管运行与内部修改权的客户可选择美元候选价格为 699 美元的 License Plus。两种产品均允许购买法人永久内部使用。所有美元金额均为未批准候选价格。', ['源代码','License','License Plus','349 美元','699 美元']],
  'license-customization': ['哪种产品允许修改源代码以适应内部业务？', 'License Plus 计划允许购买法人为内部业务查看、编辑和修改源代码，增加功能、与内部系统集成，并在内部使用修改后的版本。License 不包含源代码。修改权不包含销售、再分发或再许可的权利。', ['内部修改','定制','系统集成','源代码']],
  'license-external-developer': ['可以委托外部开发公司或工程师修改 License Plus 吗？', 'License Plus 允许在购买法人的内部开发、修改或维护所必需的范围内，向外部开发者披露源代码。委托方须确保对方遵守保密、不得用于其他项目、不得销售或再分发等条件。License 不包含源代码，不适用这项许可。', ['外部开发者','委托','保密','维护']],
  'license-devices': ['License 或 License Plus 可以安装在多少台设备上？', 'License 和 License Plus 用于购买法人的内部业务。首个原生版本面向配备 Apple M2 或更新芯片的单台 Mac，Host 与 Client 在同一台 Mac 上运行。支持的机型与 macOS 版本将在实机测试后确认，并须满足各机型的最低系统要求。多台 Mac 的局域网连接不在首个版本范围内，后续更新的日期尚未确定。许可允许的设备数量将在最终 EULA 中规定，与连接及同步的技术支持范围分开说明。', ['设备数量','Apple M2','Mac','局域网','系统要求']],
  'license-backup': ['可以为 License 或 License Plus 创建备份吗？', '可以。购买法人可创建维持内部使用所必需的备份，不得以向第三方分发为目的制作副本。这项许可不代表应用已经提供还原功能。当前开发版本尚不提供还原与恢复功能。只有在面向客户的还原方法完成并通过验证后，才会开始付费销售。', ['备份','还原','恢复','内部使用']],
  'license-group-company': ['一个 License 或 License Plus 可以在集团内共享吗？', '原则上不可以。每次购买仅适用于一个法人。母公司、子公司、关联公司等具有不同法人资格的组织，原则上需要分别购买。', ['集团','母公司','子公司','法人']],
  'license-branches': ['同一法人的总部、分公司和办事处可以使用一个 License 吗？', '计划允许购买法人内部使用。首个版本的 Host 与 Client 在同一台 Mac 上运行，不包含多台 Mac 的局域网连接、同步或跨地点连接；后续更新的日期尚未确定。在一台 Mac 上管理多个仓库或 Location 信息，与连接和同步多台设备是不同的范围。最终支持环境和使用条件会在销售前公布。不同法人原则上需要分别购买。', ['总部','分公司','仓库','Location','多台 Mac']],
  'license-security-responsibility': ['License 的更新与安全由谁负责？', 'License 包含购买后前三个月的 Updates，在此期间由 FDE 提供功能、安全、兼容性更新及缺陷修复。之后可自愿继续订阅：第 4–6 个月的美元候选价格为每月 31 美元，第 7 个月起为每月 62 美元。未订阅 Updates 的期间，由购买方负责更新与安全。不会自动转为付费服务，License Plus 不适用这项附加服务。所有美元金额均为等待最终国际定价的未批准候选价格。', ['安全','更新责任','31 美元','62 美元','自愿订阅']],
  'no-resale': ['可以把购买的 IMS 转售给第三方吗？', '不可以。License 和 License Plus 均不包含向第三方销售或转售 IMS 原版或修改版的权利，使用权仅限购买法人的内部业务。', ['转售','销售','第三方','内部使用']],
  'no-modified-resale': ['可以把修改后的 IMS 作为其他产品出售吗？', '不可以。即使更改名称、界面或功能，也不得把基于 IMS 的修改版作为面向第三方的产品销售或转售。', ['修改版','转售','改名','界面']],
  'no-redistribution': ['可以向第三方再分发源代码或安装程序吗？', '不可以。License Plus 提供的源代码、安装程序及 IMS 产品文件不得向第三方再分发。但可在内部修改所必需的范围内，向遵守适用许可条件的外部委托方披露源代码。', ['再分发','源代码','安装程序','外部委托']],
  'no-public-repo': ['可以把 License Plus 源代码放到公开的 GitHub 仓库吗？', '不可以。不得把 License Plus 源代码发布到公开 GitHub 仓库、网站、社交媒体、公开文件共享、社区、公开服务器等不特定公众或第三方可访问的位置。', ['GitHub','公开仓库','发布','源代码']],
  'no-transfer': ['可以把 License 或 License Plus 转让给其他法人吗？', '禁止未经许可的转让。License 和 License Plus 的使用权授予购买法人，转移给其他法人或第三方须遵守最终 EULA 的条件。', ['转让','法人','EULA']],
  'no-sublicense': ['可以向第三方再许可 IMS 的使用权吗？', '不可以。License 和 License Plus 均不允许购买企业自行向第三方授予 IMS 使用权。', ['再许可','第三方','使用权']],
  'no-saas': ['可以把 IMS 作为 SaaS 或托管服务提供给客户吗？', '不可以。License 和 License Plus 均不包含把 IMS 本身提供给第三方使用的 SaaS、ASP、托管、软件租赁、服务机构等业务的权利。', ['SaaS','ASP','托管','租赁','第三方服务']],
  'internal-use-own-business': ['可以在内部使用 IMS，同时向客户销售自己的产品或服务吗？', '可以。可以把 IMS 用于内部库存管理等业务，同时向客户销售自身的一般产品或服务。限制针对的是让第三方使用 IMS 本身的业务。', ['内部业务','自身产品','客户服务']],
  'updates-price': ['License 专用的 Updates 附加服务价格是多少？', 'License 购买后第 1–3 个月包含 Updates，无需另付费用。之后可自愿继续订阅：第 4–6 个月的美元候选价格为每月 31 美元，第 7 个月起为每月 62 美元。Updates 仅适用于 License，不能单独购买，也不能添加到 License Plus。不会自动转为付费服务，所有美元金额均为等待最终国际定价的未批准候选价格。', ['Updates','31 美元','62 美元','自愿订阅','前三个月']],
  'updates-no-source': ['Updates 包含源代码吗？', '不包含。Updates 不提供源代码。需要源代码和内部修改权时，应选择 License Plus。', ['Updates','源代码','内部修改']],
  'updates-term': ['Updates 订阅结束后还可以使用吗？', 'Updates 结束后，FDE 将停止提供新的更新。购买的 License 仍允许内部使用购买时的版本。通过 Updates 获取的版本在订阅结束后的使用条件，将在最终许可条款中说明。', ['订阅结束','停止更新','购买时版本','最终许可条款']],
  'updates-managed': ['Updates 期间 FDE 负责什么？', 'Updates 的设计方向是在订阅期间由 FDE 提供功能、安全和兼容性更新。更新频率、版本管理、SLA 等具体内容尚未确定。', ['功能更新','安全','兼容性','SLA']],
  'ui-brand-change': ['License Plus 可以更改 FDE 标志或应用界面吗？', 'License Plus 不计划一律禁止为内部使用而修改应用界面中的 FDE 标志、名称等内容。不过，源代码中的版权、许可、权利声明和第三方许可声明等须妥善保留。License 不包含源代码。', ['标志','界面','品牌','版权声明']],
  'no-false-authorship': ['修改后可以声称 IMS 原版是本公司独立开发的吗？', '不可以。即使在 License Plus 下修改界面等内容，也不得虚假声称 IMS 原版由购买企业独立开发。', ['独立开发','作者','原版','版权']],
  'ai-coding-tools': ['可以使用 AI 编程工具修改 License Plus 吗？', '内部修改 License Plus 时，可使用设置或合同明确禁止将提交代码用于第三方模型训练的 AI 编程工具。不得把 IMS 代码用于模型训练、微调、第三方训练、公开数据集，或用于重现类似产品的训练。', ['AI 编程','生成式 AI','模型训练','微调']],
  'third-party-components': ['开源软件及第三方组件的许可如何处理？', 'FDE 独立开发的部分适用 FDE 的 License 条件，开源软件及第三方软件各自适用其许可条件。具体组件将在产品完成时确定。', ['开源软件','OSS','第三方组件','依赖','许可']],
  'formal-order-flow': ['正式销售时的订单会显示哪些信息？', '正式订单计划显示选择的产品、价格、购买法人、购买时的产品版本、使用期限、是否包含源代码、License 的 Updates 附加服务及适用的 License Agreement / EULA。License 不含源代码并允许永久使用；License Plus 包含源代码与内部修改权并允许永久使用。', ['订单','购买法人','产品版本','EULA']],
  'eula-agreement': ['在线购买需要同意 EULA 吗？', '需要。正式在线销售计划要求客户在确认购买前阅读并主动同意 License Agreement / EULA。目前的 License 页面仅为产品方针概要，不是最终法律协议。', ['EULA','同意','许可协议','购买确认']],
  'inventory-adoption-migration-fit': ['IMS 可以替代纸张、电子表格或现有库存系统吗？', 'IMS 面向希望从纸张或电子表格迁移，或正在重新评估现有库存系统的小型企业。现在可以讨论产品适配性，但数据导入格式、迁移服务与最终部署支持范围尚未确定。', ['库存管理','纸张','Excel','电子表格','迁移','数据导入']],
  'license-updates-entitlement': ['购买 License 后，Updates 如何收费？', 'License 包含购买后前三个月的 Updates。之后可自愿继续订阅：第 4–6 个月的美元候选价格为每月 31 美元，第 7 个月起为每月 62 美元。不继续订阅 Updates，也可以使用购买时的版本。通过 Updates 获取的版本在订阅结束后的使用条件，将在最终许可条款中说明。Updates 不会自动开始收费，所有美元金额均为等待最终国际定价的未批准候选价格。', ['Updates','31 美元','62 美元','自愿订阅','无自动扣费']],
  'cancel-updates-after-license': ['购买 License 后结束 Updates 会怎样？', '订阅结束时，Updates 使用权和 FDE 的持续更新服务停止。不含源代码的已购永久 License 仍允许在内部使用购买时的版本。通过 Updates 获取的版本在订阅结束后的使用条件，将在最终许可条款中说明。之后由购买方负责更新与安全。', ['结束 Updates','继续 License','永久使用','安全']],
  'cancel-updates-only': ['可以不购买 License，只购买 Updates 吗？', '不可以。Updates 是 License 专用附加服务，不能单独购买，也不适用于 License Plus。结束 Updates 不会取消已购 License 的内部使用权，仍可使用购买时的版本。通过 Updates 获取的版本在订阅结束后的使用条件，将在最终许可条款中说明。', ['单独购买','附加服务','License 专用','License Plus 不适用']],
};

export const categoryLabels = {
  status:'产品与销售状况', license:'License 与内部使用', restrictions:'限制与再分发',
  updates:'Updates 与维护', rights:'权利、AI 与第三方', orders:'订单与 EULA', product:'产品与导入评估',
};
export const subcategoryLabels = {
  development:'开发状况', models:'产品方案', 'license-basics':'License 基本条件', entity:'法人及设备',
  contractor:'外部开发者', redistribution:'销售与再分发', service:'第三方服务', 'updates-model':'Updates 基本条件',
  responsibility:'更新与安全责任', ip:'知识产权与声明', ai:'AI 使用', thirdparty:'开源软件与第三方',
  purchase:'正式销售与订单', eula:'License Agreement / EULA', adoption:'导入评估',
};
export const redistributionAnswer = 'No. Redistribution of installers, product files, or the source code supplied with License Plus is planned to be prohibited. License Plus source code may be disclosed to external contractors only as needed for internal modification and subject to the applicable license conditions.';
export const demoLanguageNotes = {
  en:' The website is available in English, Japanese and Simplified Chinese. The initial native app targets English and Japanese UI only; Chinese on the website does not imply Chinese support in the native app.',
  ja:' Webサイトは英語・日本語・簡体字中国語に対応しています。ネイティブ初回版の画面言語は英語・日本語を対象とし、Webサイトの中国語対応がネイティブ版の中国語対応を意味するものではありません。',
};

export const zhInventoryCopy = {
  'Adds stock to the selected destination.':'向所选目标位置添加库存。',
  'Temporary ship-stock action':'临时出库操作',
  'Health and history':'库存状态与操作记录',
  'Prevent negative stock':'防止库存数量为负',
  'Build, deployment, database, API, and backup/restore documentation planned':'计划提供构建、部署、数据库、API 与备份/还原文档',
  'Build, deployment, database, API, and backup/restore documentation are planned. Their final content remains in development.':'计划提供构建、部署、数据库、API 与备份/还原文档，最终内容仍在开发中。',
  'SKU/barcode search, Receive, Transfer, Count, Ship, non-negative stock, three-state inventory health, and movement history.':'SKU/条码搜索、入库、调拨、盘点、出库、非负库存数量、三种库存状态及操作记录。',
  'Use sample products to receive, transfer, count, and ship stock, then review the resulting inventory health and movement history.':'使用示例商品体验入库、调拨、盘点和出库，再查看库存状态与操作记录。',
  'Try a simplified IMS v1.0 stock workflow with temporary sample data.':'使用临时示例数据体验简化的 IMS v1.0 库存管理流程。',
  'Try a simplified IMS v1.0 workflow with temporary sample data: search stock, receive, transfer, count, ship, and review movement history.':'使用临时示例数据体验简化的 IMS v1.0 流程：搜索库存、入库、调拨、盘点、出库及查看操作记录。',
  'Yes. The simplified v1.0 demo uses sample data and lets you search inventory and try temporary Receive, Transfer, Count, and Ship actions.':'可以。简化的 v1.0 演示使用示例数据，支持搜索库存以及临时的入库、调拨、盘点和出库操作。',
  'The current preview demonstrates temporary receiving and shipping actions against sample inventory.':'当前预览使用示例库存展示临时入库和出库操作。',
  'The useful question is whether a focused receive, stock, and ship record fits the way your team actually works.':'重要的是，清晰的入库、库存和出库记录是否适合团队实际的工作方式。',
  'Yes. IMS is being designed for small businesses that want to move from paper or spreadsheets to a clearer receive, stock, and ship record.':'是的。IMS 面向希望从纸张或电子表格转向更清晰的入库、库存和出库记录的小型企业。',
  'The development preview uses sample data to show inventory search, receiving, shipping, and low-stock status. Preview changes are temporary and do not prove final product scope.':'开发预览使用示例数据展示库存搜索、入库、出库及库存偏低状态。预览中的更改是临时的，不代表最终产品范围。',
  'This browser-only demo is a simplified representation of the v1.0 workflow. It does not connect to the IMS server, save your changes, provide authentication or roles, or create a production backup.':'本演示仅在浏览器中展示简化的 v1.0 操作流程，不连接 IMS 服务器，不持久保存更改，不提供身份验证或角色权限，也不创建生产环境备份。',
  'IMS is being developed for small businesses that want to replace repeated paper notes, scattered spreadsheets, or an unnecessarily complex inventory workflow with a clearer record of stock movement.':'IMS 面向希望用清晰的库存变动记录替代重复的纸质记录、分散的电子表格或过于复杂的库存流程的小型企业开发。',
  'Small operations often need a dependable answer to a few basic questions: what is in stock, what came in, what went out, and what may be running low. IMS is being shaped around that narrower workflow.':'小型团队通常只需要清楚掌握几个基本问题：有哪些库存、入库了什么、出库了什么、哪些商品需要补货。IMS 正围绕这些核心流程开发。',
  'The purchaser is planned to manage backups and recovery. Technical documentation is planned, but validated procedures and final support boundaries remain under development.':'备份与恢复计划由购买方负责。计划提供技术文档，但经过验证的操作步骤与最终支持范围仍在开发中。',
  'No public repositories, websites, social media, or public file shares':'不得将 IMS 源代码或产品文件发布到公开代码库、网站、社交媒体或公开文件共享位置',
  'No publication of IMS source code or product files in public repositories, websites, social media, or public file shares':'不得将 IMS 源代码或产品文件发布到公开代码库、网站、社交媒体或公开文件共享位置',
};

const root = new URL('../',import.meta.url);
const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function localizeFaqData(data) {
  const copy=structuredClone(data);
  if(copy.locales && !copy.locales.includes('zh-CN'))copy.locales.push('zh-CN');
  if(copy.categories) {
    copy.categories.product={order:7,label:{ja:'製品・導入相談',en:'Product & Adoption',...copy.categories.product?.label}};
    for(const [key,value] of Object.entries(copy.categories))value.label['zh-CN']=categoryLabels[key];
  }
  if(copy.subcategories) {
    copy.subcategories.adoption={category:'product',label:{ja:'導入相談',en:'Adoption',...copy.subcategories.adoption?.label}};
    for(const [key,value] of Object.entries(copy.subcategories))value.label['zh-CN']=subcategoryLabels[key];
  }
  for(const item of copy.faq || []) {
    if(item.id==='no-redistribution')item.answer.en=redistributionAnswer;
    if(item.id==='demo-not-product-version')for(const [locale,note] of Object.entries(demoLanguageNotes))if(!item.answer[locale].includes(note))item.answer[locale]+=note;
    const translated=zhFaqCopy[item.id];
    if(!translated)continue; // Future CMS entries require a reviewed translation.
    item.question['zh-CN']=translated[0];item.answer['zh-CN']=translated[1];
    item.keywords['zh-CN']=translated[2];item.synonyms['zh-CN']=translated[2];
  }
  return copy;
}
export function mergedFaqData() {
  const base=localizeFaqData(JSON.parse(readFileSync(new URL('content/faq-content.json',root),'utf8')));
  const extra=localizeFaqData(JSON.parse(readFileSync(new URL('content/faq-policy-additions.json',root),'utf8')));
  const ids=new Set(base.faq.map(x=>x.id));
  base.faq.push(...extra.faq.filter(x=>!ids.has(x.id)));
  return base;
}
export function renderStaticFaq(source) {
  if(!source.includes('id="cmsFaqList"'))return source;
  const locale=source.match(/<html lang="([^"]+)"/)[1];
  const data=mergedFaqData();
  const items=[...data.faq].sort((a,b)=>Number(!!b.highFrequency)-Number(!!a.highFrequency));
  const markup=items.map(item=>{
    const answerId=`faq-answer-${item.id}`;
    const terms=[...item.keywords[locale],...item.synonyms[locale]].join(' ');
    return `          <article class="faq-item" data-faq-id="${esc(item.id)}" data-faq-category-key="${esc(item.category)}" data-faq-subcategory="${esc(item.subcategory)}" data-faq-terms="${esc(terms)}">\n            <button class="faq-q" type="button" aria-expanded="false" aria-controls="${answerId}"><span>${esc(item.question[locale])}</span><span class="faq-plus" aria-hidden="true">＋</span></button>\n            <div class="faq-path"><span>${esc(data.categories[item.category].label[locale])}</span><span>${esc(data.subcategories[item.subcategory].label[locale])}</span></div>\n            <div class="faq-a" id="${answerId}">${esc(item.answer[locale]).replace(/\n/g,'<br>')}</div>\n          </article>`;
  }).join('\n');
  return source.replace(/(<div id="cmsFaqList">)[\s\S]*?(<\/div><div id="faqEmpty")/,`$1\n${markup}\n        $2`);
}
export function applyApprovedMultilingualContent(file,source) {
  if(/^content\/faq-(?:content|policy-additions)\.json$/.test(file))return JSON.stringify(localizeFaqData(JSON.parse(source)),null,2)+'\n';
  if(file==='content/zh-translations.json')return JSON.stringify({...JSON.parse(source),...zhInventoryCopy},null,2)+'\n';
  if(!file.endsWith('.html'))return source;
  if(file.startsWith('zh/')){
    const old=JSON.parse(readFileSync(new URL('content/zh-translations.json',root),'utf8'));
    for(const [en,zh] of Object.entries(zhInventoryCopy)) {
      // Old snapshot values are retained in a pinned map, not a broad wording rewrite.
      const previous=originalZhInventory[en]||old[en];
      if(previous && previous!==zh)source=source.replaceAll(previous,zh);
    }
    if(file==='zh/contact.html'&&!/src="\.\.\/faq-cms\.js/.test(source))source=source.replace(/(<script defer src="\.\.\/faq-policy-merge\.js\?v=([^\"]+)"><\/script>)\n\n?/,'$1\n  <script defer src="../faq-cms.js?v=$2"></script>\n');
  }
  if(file==='license.html')source=source.replace('No public repositories, websites, social media, or public file shares','No publication of IMS source code or product files in public repositories, websites, social media, or public file shares');
  return /^(?:ja\/|zh\/)?contact\.html$/.test(file)?renderStaticFaq(source):source;
}

export const originalZhInventory = {
  'Adds stock to the selected destination.':'将股票添加到选定的目的地。',
  'Temporary ship-stock action':'临时船舶库存行动', 'Health and history':'卫生和历史', 'Prevent negative stock':'防止负存量',
  'Build, deployment, database, API, and backup/restore documentation planned':'计划建立、部署、数据库、API和备份/备份文件',
  'Build, deployment, database, API, and backup/restore documentation are planned. Their final content remains in development.':'计划建立、部署、数据库、API和备份/备份文件。 其最后内容仍在发展之中。',
  'SKU/barcode search, Receive, Transfer, Count, Ship, non-negative stock, three-state inventory health, and movement history.':'SKU/条码搜索,接收,转移,计数,船舶,非负存量,三态库存健康,移动历史.',
  'Use sample products to receive, transfer, count, and ship stock, then review the resulting inventory health and movement history.':'使用样品产品接收、转移、清点和船舶库存,然后审查产生的库存健康和移动历史。',
  'Try a simplified IMS v1.0 stock workflow with temporary sample data.':'尝试使用临时样本数据简化IMS v1.0股票工作流程.',
  'Try a simplified IMS v1.0 workflow with temporary sample data: search stock, receive, transfer, count, ship, and review movement history.':'尝试一个简化的IMS v1.0工作流程,并附带临时样本数据:搜索库存,接收,传输,计数,飞船,以及审查移动历史.',
  'Yes. The simplified v1.0 demo uses sample data and lets you search inventory and try temporary Receive, Transfer, Count, and Ship actions.':'对 简化的 v1.0 演示使用样本数据, 并允许您搜索目录并尝试临时接收、 传输、 计算和 Ship 动作 。',
  'The current preview demonstrates temporary receiving and shipping actions against sample inventory.':'目前的预览显示,临时接收和装运行动与库存样本相对照。',
  'The useful question is whether a focused receive, stock, and ship record fits the way your team actually works.':'有用的问题是 重点接收、库存和船舶记录是否与你们团队的实际工作方式相符。',
  'Yes. IMS is being designed for small businesses that want to move from paper or spreadsheets to a clearer receive, stock, and ship record.':'对 IMS是为希望从纸质或电子表格转向更清晰的接收、储存和船舶记录的小企业设计的。',
  'The development preview uses sample data to show inventory search, receiving, shipping, and low-stock status.':'开发预览使用样本数据来显示存货的搜索,接收,运输,以及低库存状态.',
  'The development preview uses sample data to show inventory search, receiving, shipping, and low-stock status. Preview changes are temporary and do not prove final product scope.':'开发预览使用样本数据来显示存货的搜索,接收,运输,以及低库存状态. 预览修改是临时性的,不证明最终产品范围.',
  'This browser-only demo is a simplified representation of the v1.0 workflow. It does not connect to the IMS server, save your changes, provide authentication or roles, or create a production backup.':'这个只浏览器的演示是V1.0工作流程的简化表示. 它不连接到IMS服务器,保存您的更改,提供认证或角色,或创建生产备份.',
  'IMS is being developed for small businesses that want to replace repeated paper notes, scattered spreadsheets, or an unnecessarily complex inventory workflow with a clearer record of stock movement.':'IMS正在开发,对象是希望用更清晰的库存流动记录来取代重复的纸币、分散的电子表格或不必要的复杂库存工作流程的小企业。',
  'Small operations often need a dependable answer to a few basic questions: what is in stock, what came in, what went out, and what may be running low. IMS is being shaped around that narrower workflow.':'小业务往往需要一个可靠的答案来回答几个基本问题:什么是库存的,什么是流入的,什么是流出的,什么可能是流出的低. IMS正在围绕这个狭窄的工作流程形成.',
  'The purchaser is planned to manage backups and recovery. Technical documentation is planned, but validated procedures and final support boundaries remain under development.':'采购人计划管理备份和回收。 计划编写技术文件,但验证的程序和最后支助界限仍在拟订中。',
  'No public repositories, websites, social media, or public file shares':'不得发布到公开代码库、网站、社交媒体或公共文件空间',
};
