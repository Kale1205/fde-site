from pathlib import Path
import re

pages = {
    'index.html':'products',
    'why.html':'why',
    'goals.html':'goals',
    'contact.html':'contact',
}

def nav(active):
    items=[
        ('products','index.html','Products','navProducts'),
        ('why','why.html','Why FDE','navWhy'),
        ('goals','goals.html','Kale’s Goals','navAbout'),
        ('news','news.html','News','navNews'),
        ('contact','contact.html','Contact','navContact'),
    ]
    links=[]
    for key,href,label,i18n in items:
        cls=' class="active"' if key==active else ''
        links.append(f'<a{cls} href="{href}" data-i18n="{i18n}">{label}</a>')
    return '<nav class="main-nav">'+''.join(links)+'</nav>'

footer='''<footer class="site-footer"><div class="shell"><div class="footer-grid"><div><div class="footer-brand">Kale’s FDE</div><p>Forward Deployed Engineering</p></div><div><div class="footer-title">Menu</div><a href="index.html">Products</a><a href="why.html">Why FDE</a><a href="goals.html">Kale’s Goals</a><a href="contact.html">Contact</a><a href="news.html">News</a></div></div><div class="copyright">© 2026 Kale’s FDE.</div></div></footer>'''

for filename,active in pages.items():
    p=Path(filename)
    s=p.read_text(encoding='utf-8')
    s=re.sub(r'<a class="button dark" href="contact\.html"[^>]*data-i18n="contactButton"[^>]*>.*?</a>','',s,count=1,flags=re.S)
    s=re.sub(r'<nav class="main-nav">.*?</nav>',nav(active),s,count=1,flags=re.S)
    if 'editorial.css' not in s:
        s=s.replace('</head>','<link rel="stylesheet" href="editorial.css?v=20260816-1744">\n</head>')
    if 'i18n-brand.js' not in s:
        marker='<script defer src="site.js'
        pos=s.find(marker)
        if pos!=-1:
            s=s[:pos]+'<script defer src="i18n-brand.js?v=20260816-1744"></script>'+s[pos:]
        else:
            s=s.replace('</head>','<script defer src="i18n-brand.js?v=20260816-1744"></script>\n</head>')
    s=re.sub(r'<footer class="site-footer">.*?</footer>',footer,s,count=1,flags=re.S)
    p.write_text(s,encoding='utf-8')

p=Path('index.html')
s=p.read_text(encoding='utf-8')
if 'class="news-strip"' not in s:
    strip='<div class="news-strip"><a href="news.html"><b data-i18n="latestStrip">最新情報</b><span data-i18n="latestStripText">IMS Starter デモ v0.1.0 を公開</span><span>→</span></a></div>'
    s=s.replace('</header>','</header>'+strip,1)
p.write_text(s,encoding='utf-8')

p=Path('contact.html')
s=p.read_text(encoding='utf-8')
if 'class="business-profile"' not in s:
    profile='''
<section class="business-profile">
  <div class="business-profile-head"><div><div class="section-kicker" data-i18n="businessProfileKicker">運営情報</div><h2 class="business-profile-title" data-i18n="businessProfileTitle">Baked Kale / Kale’s FDE</h2></div></div>
  <div class="business-profile-grid">
    <div class="business-profile-item"><small data-i18n="tradeNameLabel">屋号</small><strong>Baked Kale</strong></div>
    <div class="business-profile-item"><small data-i18n="serviceNameLabel">サービス名</small><strong>Kale’s FDE</strong></div>
    <div class="business-profile-item"><small data-i18n="productsLabel">製品名</small><strong>IMS Starter<br>Business DX Pack</strong></div>
    <div class="business-profile-item"><small data-i18n="originLabel">出身地</small><strong data-i18n="originValue">日本・奈良県</strong></div>
  </div>
</section>'''
    marker='</div></section>\n</main>'
    if marker in s:
        s=s.replace(marker,profile+'\n</div></section>\n</main>',1)
    else:
        s=s.replace('</main>',profile+'\n</main>',1)
p.write_text(s,encoding='utf-8')

p=Path('demo.html')
s=p.read_text(encoding='utf-8')
if 'editorial.css' not in s:
    s=s.replace('</head>','<link rel="stylesheet" href="editorial.css?v=20260816-1744">\n</head>')
if 'i18n-brand.js' not in s:
    marker='<script defer src="site.js'
    pos=s.find(marker)
    if pos!=-1:
        s=s[:pos]+'<script defer src="i18n-brand.js?v=20260816-1744"></script>'+s[pos:]
p.write_text(s,encoding='utf-8')

p=Path('sitemap.xml')
s=p.read_text(encoding='utf-8')
if '/news.html' not in s:
    entry='  <url><loc>https://kale1205.github.io/fde-site/news.html</loc><lastmod>2026-08-16</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>\n'
    s=s.replace('</urlset>',entry+'</urlset>')
p.write_text(s,encoding='utf-8')
