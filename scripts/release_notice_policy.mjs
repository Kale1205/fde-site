// Build-time copy policy. Never controls checkout or changes product terms.
export const releaseCopy = {
  en: {date: 'Releases November 1, 2026', unavailable: 'Not yet available for purchase.'},
  ja: {date: '2026年11月1日リリース', unavailable: '現在は購入できません。'},
  zh: {date: '2026年11月1日发布', unavailable: '目前尚不可购买。'},
};

export function removePurchaseStatusCopy(text) {
  return text
    .replaceAll('IMSは正式販売前です。', '')
    .replaceAll('IMSは正式販売前のため、現時点では予定価格です。', '')
    .replaceAll('IMS is not yet formally on sale, and all USD figures', 'All USD figures')
    .replaceAll('IMS 尚未正式销售，所有美元金额', '所有美元金额')
    .replaceAll('まだ正式販売前のため、現在は購入対象の製品バージョンはありません。', '')
    .replaceAll(' Because the product is not yet formally on sale, there is no current purchase-version number.', '')
    .replaceAll(' Formal sales are not open.', '')
    .replaceAll('正式販売は開始していません。', '')
    .replaceAll(' 正式销售不公开。', '');
}

export function applyReleaseNoticePolicy(source, page) {
  const key=source.includes('<html lang="ja">')?'ja':source.includes('<html lang="zh-CN">')?'zh':'en';
  const t=releaseCopy[key];
  if(page==='license') {
    if(source.includes('data-release-notice'))return source;
    return source.replace('<p class="license-note">', `<p class="license-note" data-release-notice><strong>${t.date}。 ${t.unavailable}</strong><br>`)
      .replace('November 1, 2026。', 'November 1, 2026.');
  }
  if(page==='contact'||page==='news') {
    let html=source.replace(/\s*<article class="faq-item" data-faq-id="ims-sale-status">[\s\S]*?<\/article>/g, '');
    html=html.replace(/(<footer\b[\s\S]*?<\/footer>)/, footer=>footer.replace(/(?:^[ \t]*)?<small>[\s\S]*?<\/small>/m, ''));
    // These replacements are restricted to visible body copy; SEO stays intact.
    const start=html.indexOf('<body');
    return html.slice(0,start)+removePurchaseStatusCopy(html.slice(start));
  }
  return source;
}
