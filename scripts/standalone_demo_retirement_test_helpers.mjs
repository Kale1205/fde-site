const html = /^(?:(?:ja|zh)\/)?(?:index|quiet-form|customer|order|news)\.html$/;
const exactNews = /("id":\s*"ims-demo-preview"(?:(?!"id":)[\s\S]){0,160}?"link":\s*)"demo\.html"/;
export function withStandaloneDemoRetired(file, input) {
  if (!html.test(file) && !['sitemap.xml','site.js','gallery-ui.js','content/site-content.json','content/zh-translations.json'].includes(file)) return input;
  const source = input.toString();
  let changed = source;
  if (html.test(file)) {
    changed = changed.replace('<a href="demo.html">ブラウザデモ</a>では','トップページの操作プレビューでは')
      .replace(/<a\b[^>]*\bhref="(?:\.\.\/|\/fde-site\/|https:\/\/kale1205\.github\.io\/fde-site\/)?(?:ja\/|zh\/)?demo\.html(?:#[^"]*)?"[^>]*>.*?<\/a>/g,'')
      .replace(exactNews,'$1""');
  } else if (file==='content/zh-translations.json') {
    changed = changed.replace(/^  "https:\/\/kale1205\.github\.io\/fde-site\/demo\.html":.*\n/m,'');
  } else if (file==='content/site-content.json') {
    changed = changed.replace(exactNews,'$1""');
  } else if (file==='sitemap.xml') {
    changed = changed.replace(/  <url>\n    <loc>https:\/\/kale1205\.github\.io\/fde-site\/(?:ja\/|zh\/)?demo\.html<\/loc>\n(?:(?!  <\/url>)[\s\S])*  <\/url>\n/g,'');
  } else if (file==='site.js') {
    changed = changed.replace(/^function openDemo\([^\n]+\n/m,'')
      .replace(/^function addDemoDemandCallout\(\)\{[\s\S]*?\n\}\n(?=function init\(\))/m,'')
      .replace(/^ qsa\('\[data-demo-open\]'\)[^\n]+\n/m,'')
      .replace(/^ const close=qs\('#closeDemo'\)[^\n]+\n/m,'')
      .replace(/^ addDemoDemandCallout\(\);\n/m,'');
  } else if (file==='gallery-ui.js') {
    changed = changed.replace(/^    const desktopNav = document\.querySelector\("\.desktop-nav"\);\n    if \(desktopNav && !desktopNav\.querySelector\([^\n]*demo\.html.*?\n    \}\n/ms,'')
      .replace(/^    const demoLink = document\.createElement\("a"\);[\s\S]*?page"\);\n/m,'')
      .replace(', makeShortcut(demoLink, "demo", text.demo)','')
      .replace('makeShortcut(demoLink, "demo", text.demo), ','');
  }
  return Buffer.isBuffer(input)?Buffer.from(changed):changed;
}
