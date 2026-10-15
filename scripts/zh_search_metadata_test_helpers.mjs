// Historical copy/design contracts accept only these reviewed metadata deltas.
// Do not strip meta tags or ignore unknown text. The dedicated metadata tests
// independently compare current HTML/body/dictionary against the exact main base.
export function applyReviewedZhSearchMetadata(file,source){
 const home='了解开发中的 IMS 库存管理软件及 License、License Plus 两种产品，比较使用条件，并通过浏览器演示体验基本库存流程。';
 const license='比较开发中的 IMS License 与 License Plus：了解使用权、源代码范围、维护责任、使用限制及价格状态。';
 const entries=[
  ['Build on a working inventory system with IMS source-code License Plus. Compare planned licenses, explore the demo, and shape a system around your team. In development.','利用IMS源码许可证加号建立工作清单系统。 比较计划许可,探索演示, 并构建一个系统围绕你的团队。 发展之中.',home],
  ['Compare planned IMS License and License Plus rights, source-code scope, maintenance responsibility, restrictions, and price status.','比较计划中的 IMS 许可证和许可证加码权利,源码范围,维护责任,限制和价格状况.',license],
  ['Review the two planned IMS products, rights, restrictions, maintenance responsibility, and price status.','审查两个计划中的IMS产品、权利、限制、维护责任和价格状况。',license]
 ];
 if(file==='content/zh-translations.json')for(const [key,old,value] of entries)source=source.replace(`${JSON.stringify(key)}: ${JSON.stringify(old)}`,`${JSON.stringify(key)}: ${JSON.stringify(value)}`);
 if(file==='zh/index.html')for(const attribute of ['name="description"','property="og:description"'])source=source.replace(`<meta ${attribute} content="利用IMS源码License Plus建立工作清单系统。 比较计划许可,探索演示, 并构建一个系统围绕你的团队。 发展之中.">`,`<meta ${attribute} content="${home}">`);
 if(file==='zh/license.html'){
  source=source.replace('<meta name="description" content="比较计划中的 IMS License和License Plus码权利,源码范围,维护责任,限制和价格状况.">',`<meta name="description" content="${license}">`);
  source=source.replace('<meta property="og:description" content="审查两个计划中的IMS产品、权利、限制、维护责任和价格状况。">',`<meta property="og:description" content="${license}">`);
 }
 if(file==='zh/demo.html')source=source.replace('<meta property="og:locale" content="en_US">','<meta property="og:locale" content="zh_CN">\n  <meta property="og:locale:alternate" content="en_US">');
 return source;
}
