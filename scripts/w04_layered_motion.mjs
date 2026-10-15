// Approved W04 Layered Desk: a truthful sample-code animation and real recording.
export const sampleCode = `// Illustration only — not IMS implementation code.
enum StockState { OutOfStock, LowStock, Healthy }

fn stock_state(quantity: i64, threshold: i64) -> StockState {
    if quantity <= 0 {
        StockState::OutOfStock
    } else if quantity <= threshold {
        StockState::LowStock
    } else {
        StockState::Healthy
    }
}

struct StockItem {
    name: String,
    quantity: i64,
    threshold: i64,
}

fn receive(item: &mut StockItem, quantity: i64) {
    item.quantity += quantity;
}

fn main() {
    let mut item = StockItem {
        name: String::from("Sample product"),
        quantity: 8,
        threshold: 3,
    };
    receive(&mut item, 2);
    let state = stock_state(item.quantity, item.threshold);
}
`;

const copy = {
  en: {note: 'Illustrative sample code, not the IMS implementation.', label: 'Sample inventory code', read: 'Read the sample code', pause: 'Pause motion', play: 'Play motion', error: 'The recording could not be played. You can read the operation steps below.'},
  ja: {note: '説明用のサンプルコードです。IMSの実装コードではありません。', label: '在庫管理のサンプルコード', read: 'サンプルコードを読む', pause: '動きを一時停止', play: '動きを再生', error: '操作動画を再生できませんでした。下の文章で操作の流れをご確認いただけます。'},
  zh: {note: '用于说明的示例代码，并非 IMS 的实际实现。', label: '库存管理示例代码', read: '阅读示例代码', pause: '暂停动态演示', play: '播放动态演示', error: '操作视频暂时无法播放。您可以阅读下方的操作步骤。'},
};
const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export function localizeW04Motion(source, locale) {
  let html=source;
  for(const key of Object.keys(copy.en)) html=html.replaceAll(copy.en[key],copy[locale][key]);
  return html;
}

export function applyW04LayeredMotion(source) {
  if (source.includes('data-goals-motion')) return source;
  const lang = /<html lang="ja">/.test(source) ? 'ja' : /<html lang="zh-CN">/.test(source) ? 'zh' : 'en';
  const prefix = lang === 'en' ? '' : '../';
  const t = copy[lang];
  let html = source.replace('</head>', `  <link rel="stylesheet" href="${prefix}goals-motion.css?v=20261015-082040">\n  <script defer src="${prefix}goals-motion.js?v=20261015-082040"></script>\n</head>`);
  html = html.replace(/<div class="mission-proof">([\s\S]*?)\n        <\/div>\n        <details class="mission-transcript">/, (_, proof) => {
    const intro = proof.match(/<figcaption>([\s\S]*?)<\/figcaption>/)[1].replace(/<small>[\s\S]*?<\/small>/, '');
    const recording = proof.match(/<figure class="mission-recording">([\s\S]*?)<\/figure>/)[1];
    // Autoplay is JS-gated so reduced-motion visitors never start moving media.
    const video = recording.match(/<video[\s\S]*?<\/video>/)[0].replace('controls muted loop playsinline preload="none"', 'controls muted loop playsinline preload="none" data-motion-video');
    const caption = recording.match(/<figcaption>([\s\S]*?)<\/figcaption>/)[1];
    return `<div class="mission-proof mission-layered" data-goals-motion>
          <div class="mission-proof-intro" id="layered-desk">${intro}<small>${t.note}</small></div>
          <div class="mission-desk">
            <figure class="mission-code"><div class="mission-code-window">
              <div class="code-file"><span>SAMPLE CODE</span><span>inventory-example.rs · Rust</span></div>
              <pre class="mission-code-feed" aria-hidden="true"><code data-code-feed></code></pre>
            </div></figure>
            <figure class="mission-recording">${video}<div class="mission-motion-tools"><button type="button" data-motion-toggle data-pause-label="${t.pause}" data-play-label="${t.play}" aria-pressed="false" hidden>${t.play}</button></div><figcaption>${caption}</figcaption></figure>
          </div>
          <p class="mission-motion-status" data-motion-status role="status" hidden>${t.error}</p>
          <details class="mission-sample"><summary>${t.read}</summary><pre tabindex="0" aria-label="${t.label}"><code data-code-source>${escape(sampleCode)}</code></pre></details>
        </div>
        <details class="mission-transcript">`;
  });
  return html;
}
