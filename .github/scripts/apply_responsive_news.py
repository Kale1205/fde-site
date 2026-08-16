from pathlib import Path
import re

STAMP='20260816-1810'
main_pages=['index.html','why.html','goals.html','contact.html','news.html','demo.html']
strip='<div class="news-strip"><a href="news.html"><b data-i18n="latestStrip">最新情報</b><span data-i18n="latestStripText">IMS Starter デモ v0.1.0 を公開</span><span>→</span></a></div>'

for filename in main_pages:
    p=Path(filename)
    s=p.read_text(encoding='utf-8')
    if 'responsive.css' not in s:
        s=s.replace('</head>',f'<link rel="stylesheet" href="responsive.css?v={STAMP}">\n</head>')
    if 'i18n-final.js' not in s:
        marker='<script defer src="site.js'
        pos=s.find(marker)
        if pos!=-1:
            s=s[:pos]+f'<script defer src="i18n-final.js?v={STAMP}"></script>'+s[pos:]
        else:
            s=s.replace('</head>',f'<script defer src="i18n-final.js?v={STAMP}"></script>\n</head>')
    if filename=='news.html' and 'news-reuters.css' not in s:
        s=s.replace('</head>',f'<link rel="stylesheet" href="news-reuters.css?v={STAMP}">\n</head>')
    if filename in {'index.html','why.html','goals.html','news.html'}:
        if 'class="news-strip"' not in s:
            s=s.replace('</header>','</header>'+strip,1)
    if filename=='contact.html':
        s=re.sub(r'<div class="news-strip">.*?</div>','',s,count=1,flags=re.S)
    p.write_text(s,encoding='utf-8')

# Replace News content with a newsroom-style hierarchy.
p=Path('news.html')
s=p.read_text(encoding='utf-8')
new_main='''<main>
<section class="page-hero news-page-hero"><div class="shell"><div class="eyebrow">News</div><h1 class="display">News</h1><p class="lede" data-i18n="newsLead">製品アップデート、開発情報、関連する発信先をまとめています。</p></div></section>
<section class="section news-desk"><div class="shell">
  <div class="news-category-nav"><span class="active">Latest</span><span>Product</span><span>Development</span><span>Social</span></div>
  <div class="news-lead-grid">
    <a class="news-lead-story" href="demo.html" data-demo-open>
      <div class="news-label">Product Update</div>
      <h2 data-i18n="news1Title">IMS Starter デモ v0.1.0 を公開</h2>
      <p data-i18n="news1Body">在庫一覧、検索、入出庫操作、在庫アラートを試せる初回デモを公開しました。</p>
      <div class="news-meta">2026.08.16 / IMS Starter</div>
    </a>
    <aside class="news-latest-list"><h2>Latest</h2>
      <a class="latest-row" href="index.html"><small>2026.08.16 / Development</small><strong data-i18n="news2Title">Kale’s FDE サイトを更新</strong></a>
      <a class="latest-row" href="https://www.instagram.com/kale1999_?igsi=MXRzYnp5eGl2b3NxMw%3D%3D&utm_source=qr" target="_blank" rel="noopener"><small>Social / Instagram</small><strong>@kale1999_</strong></a>
    </aside>
  </div>

  <div class="news-section-rule"><h2>Updates</h2></div>
  <div class="news-wire-list">
    <a class="wire-row" href="demo.html" data-demo-open><div class="wire-type">Product</div><div><h3 data-i18n="news1Title">IMS Starter デモ v0.1.0 を公開</h3><p data-i18n="news1Body">在庫一覧、検索、入出庫操作、在庫アラートを試せる初回デモを公開しました。</p></div><time>2026.08.16</time></a>
    <a class="wire-row" href="index.html"><div class="wire-type">Development</div><div><h3 data-i18n="news2Title">Kale’s FDE サイトを更新</h3><p data-i18n="news2Body">Products、Why FDE、Kale’s Goals、Contactを中心に情報構成と多言語表示を整理しました。</p></div><time>2026.08.16</time></a>
  </div>

  <a class="instagram-editorial" href="https://www.instagram.com/kale1999_?igsi=MXRzYnp5eGl2b3NxMw%3D%3D&utm_source=qr" target="_blank" rel="noopener">
    <div class="instagram-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4.2"></circle><circle cx="17.4" cy="6.7" r="1"></circle></svg></div>
    <div class="instagram-copy"><small>Instagram / Creative</small><h2>@kale1999_</h2><p data-i18n="instagramBody">写真・映像・小説を中心とした個人のクリエイティブ活動を発信しています。</p></div>
    <div class="instagram-cta" data-i18n="openInstagram">Instagramを開く ↗</div>
  </a>
</div></section>
</main>'''
s=re.sub(r'<main>.*?</main>',new_main,s,count=1,flags=re.S)
p.write_text(s,encoding='utf-8')
