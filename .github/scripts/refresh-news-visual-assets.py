from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')
s = s.replace('cms.css?v=20260816-1903', 'cms.css?v=20260816-1952')
s = s.replace('cms-content.js?v=20260816-1903', 'cms-content.js?v=20260816-1952')
s = s.replace('<b data-i18n="latestStrip">最新情報</b><span data-i18n="latestStripText">IMS Starter デモ v0.1.0 を公開</span>', '<b>Product Update</b><span>IMS Starter デモ v0.1.0 を公開</span>')
p.write_text(s, encoding='utf-8')
