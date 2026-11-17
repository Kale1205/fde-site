// Project the exact 2026-11-17 JPY-only delta out of old migration comparisons.
// Current output, the new pricing, the unchanged USD book and commerce gates
// are tested separately. Historical releases and unrelated copy are not edited.
const copy=[
  ['4か月目以降は一律月額4,900円（税込）','4〜6か月目は月額4,900円、7か月目以降は月額9,800円'],
  ['購入後最初の6か月は、継続利用権','購入後最初の6か月（無料の3か月と半額の3か月）は、継続利用権'],
  ['<span>購入後3か月は含む</span><span>4か月目以降 <strong>¥4,900/月（税込）</strong></span>','<span>最初の3か月は含む</span><span>4〜6か月目 <strong>¥4,900/月</strong></span><span>7か月目以降 <strong>¥9,800/月</strong></span>'],
  ['<dt>購入後3か月は含む</dt><dd class="sr-only">License Updates</dd></div><div><dt>4か月目以降</dt><dd>¥4,900/月（税込）</dd>','<dt>最初の3か月は含む</dt><dd class="sr-only">License Updates</dd></div><div><dt>4〜6か月目</dt><dd>¥4,900/月</dd></div><div><dt>7か月目以降</dt><dd>¥9,800/月</dd>'],
];
const prior=(text,pairs=copy)=>pairs.reduce((s,[after,before])=>s.replaceAll(after,before),text);
export const priorJapaneseUpdatesHtml=source=>/<html lang="ja">/.test(source)?prior(source):source;
const priced=new Set(['updates-price','license-updates-entitlement']);
const answers=new Set([...priced,'updates-term','license-security-responsibility','cancel-updates-after-license','cancel-updates-only']);
export function priorJapaneseUpdatesFaqItem(item){
  if(!answers.has(item.id)||typeof item.answer?.ja!=='string')return item;
  const result=structuredClone(item);const original=result.answer.ja;result.answer.ja=prior(original,copy.slice(0,2));
  if(original!==result.answer.ja&&priced.has(item.id)&&Array.isArray(result.keywords?.ja)&&!result.keywords.ja.includes('9,800円')){
    const index=result.keywords.ja.indexOf('4,900円');if(index>=0)result.keywords.ja.splice(index+1,0,'9,800円');
  }
  return result;
}
export function priorJapaneseUpdatesFaq(file,source){
  if(!/^content\/faq-(?:content|policy-additions)\.json$/.test(file))return source;
  const data=JSON.parse(source),faq=data.faq.map(priorJapaneseUpdatesFaqItem);
  return faq.some((item,i)=>JSON.stringify(item)!==JSON.stringify(data.faq[i]))?JSON.stringify({...data,faq},null,2)+'\n':source;
}
