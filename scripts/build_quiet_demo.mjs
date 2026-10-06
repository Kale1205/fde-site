import {readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const labels = {
  en: {views:'Demo views', inventory:'Inventory', operation:'Stock operations', history:'Movement history', flow:'Simplified v1.0 workflow', selected:'Product', use:'Use'},
  ja: {views:'デモ画面の切り替え', inventory:'在庫', operation:'在庫操作', history:'移動履歴', flow:'v1.0の簡易業務フロー', selected:'商品', use:'選択'},
  zh: {views:'切换演示视图', inventory:'库存', operation:'库存操作', history:'移动记录', flow:'v1.0 简化业务流程', selected:'商品', use:'选择'},
};

// Recompose existing text/fields; never replace this simulation with a native-product claim.
export function renderQuietDemo(source, locale='en') {
  const text = labels[locale];
  const finish = html => html
    .replace(/(<nav class="demo-view-switcher"[^>]*aria-label=")[^"]+/, `$1${text.views}`)
    .replace(/(data-demo-view="inventory"[^>]*>)[^<]+/, `$1${text.inventory}`)
    .replace(/(data-demo-view="operation"[^>]*>)[^<]+/, `$1${text.operation}`)
    .replace(/(data-demo-view="history"[^>]*>)[^<]+/, `$1${text.history}`)
    .replace(/(<summary id="demoGuideTitle">)[^<]+/, `$1${text.flow}`)
    .replace(/(<small data-demo-selected-label>)[^<]+/, `$1${text.selected}`)
    .replace(/<th scope="col">(?:Use|選択|选择)<\/th>/g, `<th scope="col">${text.use}</th>`);
  if (source.includes('demo-renewal')) return finish(source);
  const take = regex => { const m=source.match(regex); if(!m)throw new Error(`Missing Demo region: ${regex}`); return m[0]; };
  const intro = take(/    <section class="section-intro compact demo-intro">[\s\S]*?    <\/section>/);
  const notice = intro.match(/      <div class="ims-pre">[\s\S]*?<\/div>/)[0];
  const brandNote = intro.match(/      <small class="demo-note">[^<]+<\/small>/)[0];
  const flow = take(/    <ol class="demo-flow"[\s\S]*?    <\/ol>/);
  const kpis = take(/      <div class="demo-kpis">[\s\S]*?\n      <\/div>/);
  const reset = take(/<button id="demoReset"[\s\S]*?<\/button>/);
  const inventoryTitle = take(/<h2>[^<]+<\/h2>/).replace(/<\/?h2>/g,'');
  const historyTitle = take(/<h2 id="demoHistoryTitle">[^<]+<\/h2>/).replace(/<[^>]+>/g,'');
  const stockHeadings = take(/<thead><tr><th>[^<]+<\/th>[\s\S]*?<\/tr><\/thead>/).match(/<th>([^<]*)<\/th>/g).slice(1,4).map(th=>th.replace(/<[^>]+>/g,''));
  const summary = `<div class="demo-selected-product" aria-live="off"><small data-demo-selected-label>${text.selected}</small><strong data-demo-selected-name></strong><small data-demo-selected-sku></small><dl>${stockHeadings.map((label,i)=>`<div><dt>${label}</dt><dd data-demo-selected-stock="${i}"></dd></div>`).join('')}</dl></div>`;
  const nav = `<nav class="demo-view-switcher" aria-label="${text.views}" hidden><button type="button" data-demo-view="inventory" aria-pressed="true" aria-controls="demoInventoryView demoOperationForm">${text.inventory}</button><button type="button" data-demo-view="operation" aria-pressed="false" aria-controls="demoOperationForm">${text.operation}</button><button type="button" data-demo-view="history" aria-pressed="false" aria-controls="demoHistoryView">${text.history}</button></nav>`;
  const hero = intro.replace(notice,'').replace(brandNote,'').replace('    </section>', `      <p class="demo-simulation-label">${notice.match(/<strong>([^<]+)<\/strong>/)[1]}</p>\n      ${nav}\n    </section>`).replace('section-intro compact demo-intro','section-frame section-intro compact demo-intro');
  let html = source.replace(' demo-app"',' demo-app demo-renewal"')
    .replace('class="demo-dashboard section-frame"','class="demo-dashboard"')
    .replace(intro,`    <div class="demo-hero">\n${hero}\n    </div>`)
    .replace(flow+'\n','').replace(kpis+'\n','').replace(reset,'')
    .replace('class="demo-workspace"','class="demo-workspace section-frame"')
    .replace('class="demo-inventory-panel"','class="demo-inventory-panel" id="demoInventoryView"')
    .replace('<h2>'+inventoryTitle+'</h2>','<h2 id="demoInventoryTitle">'+inventoryTitle+'</h2>')
    .replace('          <label class="demo-search-label"',`${kpis}\n          <label class="demo-search-label"`)
    .replace('class="demo-history" aria-labelledby','class="demo-history" id="demoHistoryView" aria-labelledby')
    .replace('        </form>',`          ${summary}\n        </form>`)
    .replace('      <div class="demo-scope-grid">',`      <div class="demo-workbench-actions">${reset}</div>\n      <details class="demo-guide" id="demoGuide"><summary id="demoGuideTitle">${text.flow}</summary><div data-demo-notes>\n${notice}\n${brandNote}\n${flow}\n      <div class="demo-scope-grid">`)
    .replace(/(      <p class="demo-note">[^<]+<\/p>)\n    <\/section>/, '$1\n      </div></details>\n    </section>');
  let tableIndex=0;
  html = html.replace(/<div class="demo-table-wrap">/g,()=>`<div class="demo-table-wrap" role="region" aria-labelledby="${tableIndex++===0?'demoInventoryTitle':'demoHistoryTitle'}" tabindex="0">`)
    .replace(/<table class="demo-table([^"<>]*)">/g,(all,extra)=>`${all}<caption class="sr-only">${extra.includes('history')?historyTitle:inventoryTitle}</caption>`)
    .replace(/<th>/g,'<th scope="col">').replace('<th scope="col"></th>',`<th scope="col">${text.use}</th>`);
  return finish(html);
}

if(process.argv[1]===fileURLToPath(import.meta.url)) {
  for(const [folder,locale] of [['','en'],['ja/','ja']]) {
    const file=path.join(root,folder,'demo.html');
    const source=readFileSync(file,'utf8');
    const rendered=renderQuietDemo(source,locale);
    if(process.argv.includes('--check')) {if(rendered!==source)throw Error(`${folder}demo.html is not composed`);}
    else writeFileSync(file,rendered);
  }
  console.log('Quiet Form Demo composition is current.');
}
