from pathlib import Path
import re

STAMP='20260816-1903'
pages=['index.html','why.html','goals.html','news.html']
for filename in pages:
    p=Path(filename);s=p.read_text(encoding='utf-8')
    if 'cms.css' not in s:s=s.replace('</head>',f'<link rel="stylesheet" href="cms.css?v={STAMP}">\n</head>')
    if 'cms-content.js' not in s:s=s.replace('</head>',f'<script defer src="cms-content.js?v={STAMP}"></script>\n</head>')
    p.write_text(s,encoding='utf-8')

p=Path('news.html');s=p.read_text(encoding='utf-8')
s=s.replace('<body data-default-title="News | Kale’s FDE">','<body class="cms-news-page" data-default-title="News | Kale’s FDE">')
new_main='''<main>
<section class="page-hero news-page-hero"><div class="shell"><div class="eyebrow">News</div><h1 class="display">News</h1><p class="lede" data-i18n="newsLead">製品アップデート、開発情報、関連する発信先をまとめています。</p></div></section>
<section class="section news-desk"><div class="shell">
  <div class="news-category-nav"><span class="active">Latest</span><span>Product</span><span>Development</span><span>Social</span></div>
  <div class="news-lead-grid">
    <a id="cmsNewsLead" class="news-lead-story" href="#"><div class="news-label">Loading</div><h2>News</h2></a>
    <aside id="cmsLatestList" class="news-latest-list"><h2>Latest</h2></aside>
  </div>
  <div class="news-section-rule"><h2>Updates</h2></div>
  <div id="cmsNewsWire" class="news-wire-list"></div>
  <a id="cmsInstagram" class="instagram-editorial" href="#"><div class="instagram-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4.2"></circle><circle cx="17.4" cy="6.7" r="1"></circle></svg></div><div class="instagram-copy"><small>Instagram / Creative</small><h2>Instagram</h2></div></a>
</div></section>
</main>'''
s=re.sub(r'<main>.*?</main>',new_main,s,count=1,flags=re.S)
p.write_text(s,encoding='utf-8')
