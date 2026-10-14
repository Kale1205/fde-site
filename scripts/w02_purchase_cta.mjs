// Approved W02 change only. A disabled native button has no destination,
// handler, or form association. Enabling sales is a separate decision.
export const purchaseCtaLabels = {
  en:'Buy (not yet available)',
  ja:'購入する（販売開始前）',
  'zh-CN':'购买（尚未开售）',
};
export function applyW02PurchaseCta(file,source) {
  if(file==='content/zh-translations.json')return JSON.stringify({[purchaseCtaLabels.en]:purchaseCtaLabels['zh-CN'],...JSON.parse(source)},null,2)+'\n';
  if(!/^(?:(?:ja|zh)\/)?license\.html$/.test(file))return source;
  const locale=source.match(/<html lang="([^"]+)"/)?.[1];
  const label=purchaseCtaLabels[locale];
  if(!label)return source;
  return source.replace(/<a class="button button-primary" href="contact\.html">(?:Ask about these terms|この条件について相談|咨询这些条件)<\/a>/,
    `<button class="button button-primary" type="button" data-license-purchase disabled aria-disabled="true">${label}</button>`);
}
