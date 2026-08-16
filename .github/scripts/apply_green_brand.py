from pathlib import Path
import re

STAMP='20260816-1852'
pages=['index.html','why.html','goals.html','contact.html','news.html','demo.html']

for filename in pages:
    p=Path(filename)
    s=p.read_text(encoding='utf-8')
    if 'assets/baked-kale-mark.svg' not in s:
        s=s.replace('</head>', '<link rel="icon" type="image/svg+xml" href="assets/baked-kale-mark.svg">\n</head>', 1)
    if 'brand-green.css' not in s:
        s=s.replace('</head>', f'<link rel="stylesheet" href="brand-green.css?v={STAMP}">\n</head>', 1)
    s=s.replace('<a class="brand" href="index.html">','<a class="brand" href="index.html" aria-label="Baked Kale / Kale’s FDE">')
    p.write_text(s,encoding='utf-8')
