from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Load fixed translation dictionaries before the existing site script.
marker='<script>\nconst T='
if '<script src="translations.js"></script>' not in s:
    if marker not in s:
        raise SystemExit('main translation script marker not found')
    s=s.replace(marker,'<script src="translations.js"></script>\n'+marker,1)

# Merge fixed translations into the site's translation table.
merge_old='}};const supportedLangs='
merge_new='}};Object.assign(T,window.FDE_EXTRA_TRANSLATIONS||{});const supportedLangs='
if merge_old in s:
    s=s.replace(merge_old,merge_new,1)
elif merge_new not in s:
    raise SystemExit('translation merge marker not found')

# Allow all supported languages to persist as the selected language.
old_init="const supportedLangs=['ja','en','zh-CN','zh-TW','ko','id','ms','vi','th','hi','ar'];let L=localStorage.getItem('fde-lang')||'ja';if(!supportedLangs.includes(L))L='ja';if(!['ja','en'].includes(L))L='ja';"
new_init="const supportedLangs=['ja','en','zh-CN','zh-TW','ko','id','ms','vi','th','hi','ar'];let L=localStorage.getItem('fde-lang')||'ja';if(!supportedLangs.includes(L))L='ja';"
if old_init in s:
    s=s.replace(old_init,new_init,1)

# Apply RTL direction for Arabic while keeping all other languages LTR.
old_render="function render(){document.documentElement.lang=L;"
new_render="function render(){document.documentElement.lang=L;document.documentElement.dir=L==='ar'?'rtl':'ltr';"
if old_render in s:
    s=s.replace(old_render,new_render,1)

# Remove runtime Google Translate behavior: every language now uses fixed site copy.
old_handler="document.getElementById('lang').addEventListener('change',e=>{let n=e.target.value;if(['ja','en'].includes(n)){L=n;localStorage.setItem('fde-lang',n);render()}else{localStorage.setItem('fde-lang',n);location.href='https://translate.google.com/translate?sl=ja&tl='+encodeURIComponent(n)+'&u='+encodeURIComponent(location.href.split('#')[0])}});"
new_handler="document.getElementById('lang').addEventListener('change',e=>{let n=e.target.value;if(T[n]){L=n;localStorage.setItem('fde-lang',n);render()}});"
if old_handler in s:
    s=s.replace(old_handler,new_handler,1)
elif 'translate.google.com/translate' in s:
    raise SystemExit('unexpected Google Translate handler remains')

# Add a small RTL layout adjustment for Arabic.
rtl_css='[dir="rtl"] body{text-align:right}[dir="rtl"] .q{text-align:right}[dir="rtl"] .nav,[dir="rtl"] .head,[dir="rtl"] .hero-actions,[dir="rtl"] .micro,[dir="rtl"] .app-head,[dir="rtl"] .footer-grid{direction:rtl}'
if rtl_css not in s:
    s=s.replace('</style>',rtl_css+'\n</style>',1)

p.write_text(s,encoding='utf-8')
