from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

start_marker = '<select id="lang" class="lang" aria-label="Language">'
end_marker = '</select>'
start = s.find(start_marker)
if start == -1:
    raise SystemExit('Language selector not found')
end = s.find(end_marker, start)
if end == -1:
    raise SystemExit('Language selector closing tag not found')
end += len(end_marker)

new_select = '''<select id="lang" class="lang" aria-label="Language / 言語" title="Language / 言語">
<option value="ja">日本語</option>
<option value="en">English</option>
<option value="zh-CN">简体中文</option>
<option value="zh-TW">繁體中文</option>
<option value="ko">한국어</option>
<option value="id">Bahasa Indonesia</option>
<option value="ms">Bahasa Melayu</option>
<option value="vi">Tiếng Việt</option>
<option value="th">ไทย</option>
<option value="hi">हिन्दी</option>
<option value="ar">العربية</option>
</select>'''
s = s[:start] + new_select + s[end:]

s = s.replace(
    "asiaLead:'日本語・英語を基軸に、東南アジア、南アジア、西アジア、中央アジアへ段階的に展開します。言語プルダウンから主要言語へ切替できます。'",
    "asiaLead:'日本語・英語を基軸に、中国語・韓国語・インドネシア語・マレー語・ベトナム語・タイ語・ヒンディー語・アラビア語など、主要市場の言語へ段階的に対応します。'"
)
s = s.replace(
    "asiaLead:'Japanese and English are the base, with staged expansion into Southeast, South, West and Central Asia. Major languages are available from the selector.'",
    "asiaLead:'Japanese and English are the base, with priority support for major Asian markets including Chinese, Korean, Indonesian, Malay, Vietnamese, Thai, Hindi and Arabic.'"
)

s = s.replace(
    "else{location.href='https://translate.google.com/translate?sl=auto&tl='+encodeURIComponent(n)+'&u='+encodeURIComponent(location.href.split('#')[0])}",
    "else{localStorage.setItem('fde-lang',n);location.href='https://translate.google.com/translate?sl=ja&tl='+encodeURIComponent(n)+'&u='+encodeURIComponent(location.href.split('#')[0])}"
)

s = s.replace(
    "let L=localStorage.getItem('fde-lang')||'ja';if(!['ja','en'].includes(L))L='ja';",
    "const supportedLangs=['ja','en','zh-CN','zh-TW','ko','id','ms','vi','th','hi','ar'];let L=localStorage.getItem('fde-lang')||'ja';if(!supportedLangs.includes(L))L='ja';if(!['ja','en'].includes(L))L='ja';"
)

p.write_text(s, encoding='utf-8')
