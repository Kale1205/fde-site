from pathlib import Path
from html.parser import HTMLParser
import json
import re
import sys
import xml.etree.ElementTree as ET
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
errors = []


class PublicHtmlTextParser(HTMLParser):
    """Collect visible text and complete heading text from a public HTML page."""

    HIDDEN = {"script", "style", "template"}
    HEADING = {f"h{level}" for level in range(1, 7)}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.hidden_depth = 0
        self.text_parts = []
        self.heading_stack = []
        self.headings = []

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag in self.HIDDEN:
            self.hidden_depth += 1
            return
        if not self.hidden_depth and tag in self.HEADING:
            self.heading_stack.append([tag, []])

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in self.HIDDEN:
            self.hidden_depth = max(0, self.hidden_depth - 1)
            return
        if not self.hidden_depth and self.heading_stack and self.heading_stack[-1][0] == tag:
            heading_tag, parts = self.heading_stack.pop()
            visible = re.sub(r"\s+", " ", "".join(parts)).strip()
            self.headings.append((heading_tag, visible))

    def handle_data(self, data):
        if self.hidden_depth:
            return
        self.text_parts.append(data)
        for _, parts in self.heading_stack:
            parts.append(data)

    def visible_text(self):
        return re.sub(r"\s+", " ", " ".join(self.text_parts)).strip()


def localized_text(value, locale):
    """Flatten one active locale without pulling text from inactive translations."""

    parts = []

    def flatten(node):
        if isinstance(node, str):
            parts.append(node)
        elif isinstance(node, list):
            for child in node:
                flatten(child)
        elif isinstance(node, dict):
            for child in node.values():
                flatten(child)

    def visit(node):
        if isinstance(node, dict):
            if locale in node:
                flatten(node[locale])
            else:
                for child in node.values():
                    visit(child)
        elif isinstance(node, list):
            for child in node:
                visit(child)
        elif isinstance(node, str):
            parts.append(node)

    visit(value)
    return re.sub(r"\s+", " ", " ".join(parts)).strip()

def fail(message):
    errors.append(message)

version_file = ROOT / "build-version.txt"
if not version_file.exists():
    fail("build-version.txt is missing")
    version = ""
else:
    version = version_file.read_text(encoding="utf-8").strip()
    if not re.fullmatch(r"[0-9A-Za-z._-]+", version):
        fail(f"Invalid build version: {version!r}")

EN_PAGES = {"index.html", "why.html", "goals.html", "news.html", "contact.html", "order.html", "license.html", "demo.html"}
JA_PAGES = {f"ja/{name}" for name in EN_PAGES}
ROOT_ONLY_PUBLIC = {"customer.html"}
ALL_PUBLIC = EN_PAGES | JA_PAGES | ROOT_ONLY_PUBLIC

GALLERY_INNER_PAGE_NAMES = {"why.html", "goals.html", "news.html", "contact.html", "license.html", "demo.html"}
GALLERY_INNER_PAGES = GALLERY_INNER_PAGE_NAMES | {f"ja/{name}" for name in GALLERY_INNER_PAGE_NAMES}
COMMON_NAV_NAMES = ("index.html", "why.html", "goals.html", "news.html")
FOOTER_NAV_NAMES = ("why.html", "goals.html", "news.html", "license.html", "contact.html")

OBSOLETE_FILES = {
    "contact-mailer.js", "fulfillment-v2.js", "faq-admin-v2.js", "translations.js",
    "order-language.js", "order-preview-lock.js", "order-preview-stabilize.js",
    "purchase-currency-clean.js", "purchase-currency-clean.css", "content/pricing-rates.json",
    "scripts/enable_fixed_localization.py", "scripts/refine_language_selector.py",
    "CMS_ENGLISH_ONLY_CHECK.md", "MAINTENANCE_ENGLISH_ONLY.md",
    "products-clean.js", "products-clean.css", "order.js", "commerce-ui.js",
    "license-spec-patch.js", "license-page-i18n.js", "ims-plan-spec-patch.js",
    "order-status-admin.js", "customer-orders-admin.js", "customer-orders-operations.js",
    "order-documents-admin.js", "status-email-admin.js", "news-delete-v2.js",
    ".github/scripts/apply_brand_editorial.py", ".github/scripts/apply_cms_public.py",
    ".github/scripts/apply_green_brand.py", ".github/scripts/apply_responsive_news.py",
    ".github/scripts/cms_update.py", ".github/scripts/refresh-news-visual-assets.py",
    "license-page-en.js", "cms-fallback.js", "cms.css", "news-reuters.css",
    "visual-story.css", "entry-motion.css", "entry-motion.js",
    "ims-compare-en.js", "ims-compare-ja.js",
    "assets/why-fde-flow.svg", "assets/goals-business-model.svg",
}

OBSOLETE_WORKFLOWS = {
    ".github/workflows/apply-brand-editorial-redesign.yml",
    ".github/workflows/apply-cms-public.yml",
    ".github/workflows/apply-copy-polish.yml",
    ".github/workflows/apply-fixed-localization.yml",
    ".github/workflows/apply-green-brand.yml",
    ".github/workflows/apply-language-selector.yml",
    ".github/workflows/apply-responsive-news.yml",
    ".github/workflows/refine-contact-i18n.yml",
    ".github/workflows/update-pricing-rates.yml",
    ".github/workflows/add-google-verification.yml",
    ".github/workflows/refresh-news-visual-assets.yml",
    ".github/workflows/cms-news-add.yml",
    ".github/workflows/cms-news-edit.yml",
    ".github/workflows/cms-news-delete.yml",
    ".github/workflows/cms-instagram.yml",
    ".github/workflows/cms-latest-strip.yml",
}

for rel in sorted(OBSOLETE_FILES | OBSOLETE_WORKFLOWS):
    if (ROOT / rel).exists():
        fail(f"obsolete file should be deleted: {rel}")

asset_ref = re.compile(r"(?:src|href)=[\"'](?P<ref>[^\"']+)[\"']", re.IGNORECASE)
version_param = re.compile(r"(?:\?|&)v=([^&]+)")
public_visible_text = {}
public_heading_text = {}
public_source_text = {}

def resolve_local(html_path: Path, ref: str):
    if ref.startswith(("http://", "https://", "//", "data:", "mailto:", "tel:", "#", "javascript:")):
        return None
    raw = urlsplit(ref).path
    if not raw:
        return None
    if raw.startswith("/fde-site/"):
        candidate = ROOT / raw[len("/fde-site/"):]
    elif raw.startswith("/"):
        return None
    else:
        candidate = (html_path.parent / raw).resolve()
    try:
        candidate.relative_to(ROOT.resolve())
    except ValueError:
        fail(f"{html_path.relative_to(ROOT)}: local reference escapes repository: {ref}")
        return None
    return candidate

for rel in sorted(ALL_PUBLIC):
    path = ROOT / rel
    if not path.exists():
        fail(f"missing public page: {rel}")
        continue
    text = path.read_text(encoding="utf-8")
    parser = PublicHtmlTextParser()
    parser.feed(text)
    parser.close()
    public_visible_text[rel] = parser.visible_text()
    public_heading_text[rel] = parser.headings
    public_source_text[rel] = text
    expected = "ja" if rel.startswith("ja/") else "en"
    if not re.search(rf"<html\s+lang=[\"']{expected}[\"']", text, re.IGNORECASE):
        fail(f"{rel}: expected html lang={expected}")
    if re.search(r"id=[\"']lang[\"']|data-i18n=|fde-lang|language-selector", text, re.IGNORECASE):
        fail(f"{rel}: legacy in-page language switching must not be present")
    for match in asset_ref.finditer(text):
        ref = match.group("ref")
        target = resolve_local(path, ref)
        if target is None:
            continue
        suffix = target.suffix.lower()
        if suffix in {".js", ".css", ".html", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".json"} and not target.exists():
            fail(f"{rel}: local reference does not exist: {ref}")
        if suffix in {".js", ".css"}:
            vm = version_param.search(ref)
            if not vm:
                fail(f"{rel}: local JS/CSS is missing ?v= build key: {ref}")
            elif version and vm.group(1) != version:
                fail(f"{rel}: asset build key {vm.group(1)!r} != {version!r}: {ref}")

for name in sorted(EN_PAGES):
    if not (ROOT / name).exists() or not (ROOT / "ja" / name).exists():
        fail(f"paired English/Japanese page missing: {name}")

# Search and AI discovery must be grounded in visible, bilingual product facts.
search_markers = {
    "index.html": (
        "Moving from paper, spreadsheets, or an existing inventory system?",
        "Paper records", "Spreadsheets", "Existing systems",
        "Data import, migration services, supported file formats, and final deployment scope are not yet confirmed.",
        "FDE IMS is the inventory product from Baked Kale.",
        "FDE describes how the product is shaped and maintained alongside real work.",
    ),
    "ja/index.html": (
        "紙・Excel・いまの在庫管理から、次の仕組みへ",
        "紙で管理している", "Excelで管理している", "既存システムを見直したい",
        "データ移行の対応範囲、対応ファイル形式、導入支援の条件は現在検討中です。",
        "FDE IMSはBaked Kaleが提供する在庫管理ソフトです。",
        "FDEは、現場を理解しながら製品をつくり、保守する方法を指します。",
    ),
}
for rel, markers in search_markers.items():
    visible = public_visible_text.get(rel, "")
    for marker in markers:
        if marker not in visible:
            fail(f"{rel}: inventory adoption / entity marker missing: {marker}")

seo_page_markers = {
    "contact.html": ("Inventory Software Adoption & Migration Questions", "Ask about adopting or moving to FDE IMS"),
    "ja/contact.html": ("在庫管理ソフトの導入・移行相談", "FDE IMSの導入・移行を相談する"),
    "demo.html": ("Inventory Management Software Demo", "Inventory management software demo"),
    "ja/demo.html": ("在庫管理ソフトの操作デモ",),
    "license.html": ("One-Time, Source-Code & Self-Hosted Inventory Plans",),
    "ja/license.html": ("買い切り・ソースコード・自社サーバー運用を比較",),
}
for rel, markers in seo_page_markers.items():
    source = public_source_text.get(rel, "")
    for marker in markers:
        if marker not in source:
            fail(f"{rel}: page-specific inventory search marker missing: {marker}")

for rel in ("index.html", "ja/index.html", "why.html", "ja/why.html", "goals.html", "ja/goals.html"):
    if '<meta property="og:site_name" content="Baked Kale">' not in public_source_text.get(rel, ""):
        fail(f"{rel}: og:site_name must identify the provider as Baked Kale")

for rel in ("overview.html", "products.html"):
    source = (ROOT / rel).read_text(encoding="utf-8") if (ROOT / rel).exists() else ""
    if 'content="noindex,follow"' not in source:
        fail(f"{rel}: redirect-only duplicate must be noindex,follow")

if (ROOT / "llms.txt").exists():
    fail("llms.txt must not substitute for visible HTML and supported structured data")

structured_faq_pairs = {
    "index.html": (
        ("Can I purchase FDE IMS now?", "No. FDE IMS is still in development. The USD prices shown are unapproved candidates pending final international pricing, and purchasing is not yet available."),
        ("Can I try the product workflow?", "Yes. The development preview uses sample data and lets you search inventory and record temporary receive or ship actions."),
        ("Where can I review detailed terms or ask a question?", "Review the License page for the current planned terms, use the comparison above for the responsibility split, or open Contact for the searchable FAQ and inquiry form."),
        ("Is FDE IMS intended for teams using paper or spreadsheets?", "Yes. FDE IMS is being designed for small businesses that want to move from paper or spreadsheets to a clearer receive, stock, and ship record."),
        ("Can Baked Kale migrate or import data from an existing system?", "Not yet confirmed. Data-import formats, migration services, and deployment support will be defined before formal sales."),
    ),
    "ja/index.html": (
        ("FDE IMSは今すぐ購入できますか？", "いいえ。FDE IMSは現在開発中です。表示価格は日本円の予定価格で、購入機能はまだ利用できません。"),
        ("製品の操作を試せますか？", "はい。開発プレビューではサンプルデータを使い、在庫検索と一時的な入庫・出庫操作を試せます。"),
        ("詳しい条件の確認や質問はどこでできますか？", "現在の予定条件はLicenseページ、責任分担は上の比較表で確認できます。その他の質問は、お問い合わせページのFAQまたはフォームをご利用ください。"),
        ("紙やExcelで在庫管理している会社にも向いていますか？", "はい。紙やExcelから、入庫・在庫確認・出庫をひとつの分かりやすい記録へ移したい小規模企業向けに開発しています。"),
        ("既存システムのデータを移行・取り込みできますか？", "現在は未確定です。対応するファイル形式、データ移行、導入支援の範囲は、正式販売前にご案内します。"),
    ),
}
for rel, expected_pairs in structured_faq_pairs.items():
    source = public_source_text.get(rel, "")
    scripts = re.findall(r'<script\s+type="application/ld\+json">\s*(.*?)\s*</script>', source, re.DOTALL | re.IGNORECASE)
    if len(scripts) != 1:
        fail(f"{rel}: expected exactly one JSON-LD graph, found {len(scripts)}")
        continue
    try:
        graph_document = json.loads(scripts[0])
    except Exception as exc:
        fail(f"{rel}: invalid JSON-LD: {exc}")
        continue
    graph = graph_document.get("@graph", [])
    types = {item.get("@type") for item in graph if isinstance(item, dict)}
    for required_type in ("Organization", "WebSite", "WebPage", "SoftwareApplication", "FAQPage"):
        if required_type not in types:
            fail(f"{rel}: JSON-LD graph missing {required_type}")
    if "Offer" in json.dumps(graph_document, ensure_ascii=False):
        fail(f"{rel}: JSON-LD must not claim an Offer while commerce and USD pricing are unapproved")
    faq_nodes = [item for item in graph if isinstance(item, dict) and item.get("@type") == "FAQPage"]
    entities = faq_nodes[0].get("mainEntity", []) if len(faq_nodes) == 1 else []
    actual_pairs = tuple((item.get("name"), item.get("acceptedAnswer", {}).get("text")) for item in entities)
    if actual_pairs != expected_pairs:
        fail(f"{rel}: JSON-LD FAQ must match the five visible FAQ answers exactly")
    visible = public_visible_text.get(rel, "")
    for question, answer in expected_pairs:
        if question not in visible or answer not in visible:
            fail(f"{rel}: structured FAQ is not mirrored in visible HTML: {question}")

# Japanese editorial headings are short labels, not prose sentences.
for rel in sorted(JA_PAGES):
    for tag, heading in public_heading_text.get(rel, []):
        if heading.endswith("。"):
            fail(f"{rel}: visible {tag} must not end in Japanese full stop: {heading!r}")

# Active public commerce surfaces use two purchasable products. Updates may be
# described only as a License add-on, never as a third or standalone product.
PUBLIC_PLAN_PAGES = (
    "index.html", "license.html", "order.html", "contact.html",
    "ja/index.html", "ja/license.html", "ja/order.html", "ja/contact.html",
)
PUBLIC_PRICE_PAGES = (
    "index.html", "license.html", "order.html",
    "ja/index.html", "ja/license.html", "ja/order.html",
)
CONTENT_PLAN_NAME_PATTERNS = {
    "License": re.compile(r"(?<![A-Za-z0-9])License(?![A-Za-z0-9]|\s+Plus)"),
    "License Plus": re.compile(r"(?<![A-Za-z0-9])License Plus(?![A-Za-z0-9])"),
}

for rel in PUBLIC_PLAN_PAGES:
    visible = public_visible_text.get(rel, "")
    for plan, pattern in CONTENT_PLAN_NAME_PATTERNS.items():
        if not pattern.search(visible):
            fail(f"{rel}: active public plan name missing: {plan}")

public_plan_text = {
    "en": " ".join(public_visible_text.get(rel, "") for rel in PUBLIC_PRICE_PAGES if not rel.startswith("ja/")),
    "ja": " ".join(public_visible_text.get(rel, "") for rel in PUBLIC_PRICE_PAGES if rel.startswith("ja/")),
}
canonical_public_prices = {
    "en": ("$349", "$699", "$31", "$62"),
    "ja": ("49,800円", "99,800円", "4,900円", "9,800円"),
}
for locale, prices in canonical_public_prices.items():
    active_text = public_plan_text[locale]
    for price in prices:
        if price not in active_text:
            fail(f"active public {locale} plan content missing canonical price: {price}")

# Each active plan page must be complete on its own, rather than passing only
# because a price happens to appear on a different page.
for rel in PUBLIC_PRICE_PAGES:
    locale = "ja" if rel.startswith("ja/") else "en"
    visible = public_visible_text.get(rel, "")
    for price in canonical_public_prices[locale]:
        if price not in visible:
            fail(f"{rel}: canonical {locale} plan price missing from page: {price}")

# Bind the primary homepage cards to their actual prices and responsibilities.
homepage_plan_facts = {
    "index.html": {
        "<h3>FDE IMS License</h3>": ("$349", "$31", "$62", "First 3 months of Updates included", "Source code and source-level modification are not included", "No automatic paid conversion"),
        "<h3>FDE IMS License Plus</h3>": ("$699", "Full source code included", "Customer-server/self-hosted operation planned", "documentation planned", "Purchaser manages updates and security", "No included Updates entitlement"),
    },
    "ja/index.html": {
        "<h3>FDE IMS License</h3>": ("49,800円", "4,900円", "9,800円", "購入後3か月はUpdatesを含む", "ソースコードとソースレベルの改変権は含まない", "有料契約へ自動移行しない"),
        "<h3>FDE IMS License Plus</h3>": ("99,800円", "ソースコード一式", "顧客管理サーバーでの自社運用を予定", "資料を提供予定", "更新・セキュリティは購入者が管理", "Updates特典は含まない"),
    },
}
for rel, plans in homepage_plan_facts.items():
    source = public_source_text.get(rel, "")
    plans_start = source.find('id="plans"')
    plans_end = source.find('id="compare"', plans_start + 1)
    plan_section = source[plans_start:plans_end] if plans_start >= 0 and plans_end > plans_start else ""
    markers = list(plans)
    for index, marker in enumerate(markers):
        start = plan_section.find(marker)
        end = plan_section.find(markers[index + 1], start + len(marker)) if index + 1 < len(markers) else len(plan_section)
        segment = plan_section[start:end] if start >= 0 and end > start else ""
        for fact in plans[marker]:
            if fact not in segment:
                fail(f"{rel}: plan card {marker} is missing bound fact: {fact}")

retired_price_patterns = {
    "en": (
        ("$313", re.compile(r"\$\s*313(?!\d)")), ("$565", re.compile(r"\$\s*565(?!\d)")),
        ("$79", re.compile(r"\$\s*79(?!\d)")), ("$75", re.compile(r"\$\s*75(?!\d)")),
        ("$38", re.compile(r"\$\s*38(?!\d)")), ("$252", re.compile(r"\$\s*252(?!\d)")),
        ("$350", re.compile(r"\$\s*350(?!\d)")),
    ),
    "ja": (
        ("89,800円", re.compile(r"(?<![\d,])89,?800\s*円")),
        ("12,000円", re.compile(r"(?<![\d,])12,?000\s*円")), ("6,000円", re.compile(r"(?<![\d,])6,?000\s*円")),
        ("40,000円", re.compile(r"(?<![\d,])40,?000\s*円")), ("50,000円", re.compile(r"(?<![\d,])50,?000\s*円")),
    ),
}
for locale, patterns in retired_price_patterns.items():
    active_text = public_plan_text[locale]
    for label, pattern in patterns:
        if pattern.search(active_text):
            fail(f"active public {locale} plan content contains retired price: {label}")

if re.search(r"\bthree\s+plans\b", public_plan_text["en"], re.IGNORECASE):
    fail("active English plan content still describes the retired three-plan model")

if re.search(r"\bJPY\b|Japanese\s+yen|[¥￥]|\d[\d,]*\s*円", public_plan_text["en"], re.IGNORECASE):
    fail("active English plan pages must use the USD price book, not JPY/yen")
if re.search(r"\bUSD\b|U\.S\.\s*dollars?|US\s*dollars?|\$\s*\d", public_plan_text["ja"], re.IGNORECASE):
    fail("active Japanese plan pages must use the JPY price book, not USD/dollars")

english_plan_source = " ".join(public_source_text.get(rel, "") for rel in PUBLIC_PRICE_PAGES if not rel.startswith("ja/"))
japanese_plan_source = " ".join(public_source_text.get(rel, "") for rel in PUBLIC_PRICE_PAGES if rel.startswith("ja/"))
if re.search(r"\bJPY\b|Japanese\s+yen|[¥￥]|\d[\d,]*\s*円", english_plan_source, re.IGNORECASE):
    fail("active English plan source/metadata must not contain JPY/yen pricing")
if re.search(r"\bUSD\b|U\.S\.\s*dollars?|US\s*dollars?|\$\s*\d", japanese_plan_source, re.IGNORECASE):
    fail("active Japanese plan source/metadata must not contain USD/dollar pricing")

allowed_money_values = {
    "en": {"349", "699", "31", "62"},
    "ja": {"49,800", "99,800", "4,900", "9,800"},
}
for rel in PUBLIC_PRICE_PAGES:
    locale = "ja" if rel.startswith("ja/") else "en"
    source = public_source_text.get(rel, "")
    found = set(re.findall(r"\$\s*([\d,]+)", source)) if locale == "en" else set(re.findall(r"([\d,]+)\s*円", source))
    unexpected = found - allowed_money_values[locale]
    if unexpected:
        fail(f"{rel}: unexpected {locale} monetary value(s): {', '.join(sorted(unexpected))}")

currency_disclosure_markers = {
    "index.html": "UNAPPROVED USD CANDIDATE",
    "license.html": "unapproved candidate",
    "order.html": "unapproved candidates",
    "ja/index.html": "日本円",
    "ja/license.html": "日本円",
    "ja/order.html": "JPY",
}
for rel, marker in currency_disclosure_markers.items():
    if marker not in public_source_text.get(rel, ""):
        fail(f"{rel}: explicit public price-book currency is missing: {marker}")

required_markers = {
    "index.html": ("class=\"news-strip", "id=\"product\"", "id=\"plans\"", "id=\"compare\"", "id=\"security\"", "id=\"faq\"", "gallery-ui.css", "gallery-ui.js", "cms-content.js", "data-demo-open"),
    "ja/index.html": ("class=\"news-strip", "id=\"product\"", "id=\"plans\"", "id=\"compare\"", "id=\"security\"", "id=\"faq\"", "gallery-ui.css", "gallery-ui.js", "cms-content-ja.js", "data-demo-open"),
    "why.html": ("visual-story-poster", "visual-story-stages", "assets/why-fde-editorial-collage.webp"),
    "ja/why.html": ("visual-story-poster", "visual-story-stages", "../assets/why-fde-editorial-collage.webp"),
    "goals.html": ("visual-story-poster", "visual-story-stages", "assets/kales-goals-editorial-collage-v2.webp"),
    "ja/goals.html": ("visual-story-poster", "visual-story-stages", "../assets/kales-goals-editorial-collage-v2.webp"),
    "news.html": ("cms-content.js", "cms-news-page", "id=\"cmsNewsLead\"", "id=\"cmsLatestList\"", "id=\"cmsNewsWire\"", "id=\"cmsInstagram\""),
    "ja/news.html": ("cms-content-ja.js", "cms-news-page", "id=\"cmsNewsLead\"", "id=\"cmsLatestList\"", "id=\"cmsNewsWire\"", "id=\"cmsInstagram\""),
    "contact.html": ("contact-config.js", "contact-direct.js", "faq-cms.js"),
    "ja/contact.html": ("contact-config.js", "contact-direct.js", "faq-cms.js"),
}
for rel, markers in required_markers.items():
    path = ROOT / rel
    if not path.exists():
        continue
    text = path.read_text(encoding="utf-8")
    for marker in markers:
        if marker not in text:
            fail(f"{rel}: required marker/runtime missing: {marker}")

# The customer portal must remain a non-interactive pre-release notice until
# the two-product payment catalog, add-on entitlements, and fulfillment flow have been reviewed.
customer_portal = ROOT / "customer.html"
if not customer_portal.exists():
    fail("customer.html is missing")
else:
    customer_text = customer_portal.read_text(encoding="utf-8")
    for retired in ('customer.js', 'contact-config.js', 'id="statusForm"'):
        if retired in customer_text:
            fail(f"customer.html: pre-release portal must not load active lookup/payment runtime: {retired}")
    for marker in ("Customer portal / PRE-RELEASE", "customer portal is not available yet", "payment confirmation", "disabled"):
        if marker.lower() not in customer_text.lower():
            fail(f"customer.html: pre-release portal notice missing: {marker}")

pre_release_sales_pages = {
    "order.html": ("noindex", "not yet available for purchase", "Orders cannot be completed yet"),
    "ja/order.html": ("noindex", "現在は購入できません", "注文・決済はできません"),
}
for rel, markers in pre_release_sales_pages.items():
    source = public_source_text.get(rel, "")
    for marker in markers:
        if marker.lower() not in source.lower():
            fail(f"{rel}: pre-release sales marker missing: {marker}")
    for forbidden in ("<form", "stripe.com", "__staging/stripe", "customer.js"):
        if forbidden.lower() in source.lower():
            fail(f"{rel}: active sales/checkout surface must remain disabled: {forbidden}")

for rel, markers in {
    "index.html": ("IN DEVELOPMENT", "purchasing is not available"),
    "ja/index.html": ("開発中", "購入機能はまだ利用できません"),
}.items():
    visible = public_visible_text.get(rel, "")
    for marker in markers:
        if marker.lower() not in visible.lower():
            fail(f"{rel}: public pre-release notice missing: {marker}")

for rel in ("why.html", "ja/why.html", "goals.html", "ja/goals.html"):
    path = ROOT / rel
    if not path.exists():
        continue
    text = path.read_text(encoding="utf-8")
    for retired in ("page-card-grid", "concept-ledger", "principle-ledger"):
        if retired in text:
            fail(f"{rel}: retired text-heavy story layout found: {retired}")

# Gallery UI inner pages share one visual system and one crawlable navigation model.
def attrs_from_tag(tag):
    return dict((key.lower(), value) for key, _, value in re.findall(r"([:\w-]+)\s*=\s*([\"'])(.*?)\2", tag))


def local_target_rel(html_path, href):
    target = resolve_local(html_path, href)
    if target is None:
        return None
    raw_path = urlsplit(href).path
    if raw_path.endswith("/") or target.is_dir():
        target = target / "index.html"
    try:
        return target.relative_to(ROOT.resolve()).as_posix()
    except ValueError:
        return None


def anchor_targets(html_path, fragment):
    result = []
    for tag in re.findall(r"<a\b[^>]*>", fragment, re.IGNORECASE):
        attrs = attrs_from_tag(tag)
        href = attrs.get("href", "")
        result.append((attrs, local_target_rel(html_path, href)))
    return result


for rel in sorted(GALLERY_INNER_PAGES):
    path = ROOT / rel
    if not path.exists():
        continue
    text = path.read_text(encoding="utf-8")
    for marker in ("gallery-ui.css", "gallery-pages.css"):
        if marker not in text:
            fail(f"{rel}: Gallery UI stylesheet missing: {marker}")

    prefix = "ja/" if rel.startswith("ja/") else ""
    expected_common = {f"{prefix}{name}" for name in COMMON_NAV_NAMES}
    expected_footer = {f"{prefix}{name}" for name in FOOTER_NAV_NAMES}
    nav_blocks = re.findall(r"<nav\b(?P<attrs>[^>]*)>(?P<body>.*?)</nav>", text, re.IGNORECASE | re.DOTALL)
    desktop = [body for attrs, body in nav_blocks if "desktop-nav" in attrs_from_tag(f"<nav {attrs}>").get("class", "").split()]
    mobile = [body for attrs, body in nav_blocks if attrs_from_tag(f"<nav {attrs}>").get("id") == "mobile-nav"]
    if not desktop:
        fail(f"{rel}: shared desktop navigation is missing")
    if not mobile:
        fail(f"{rel}: shared mobile navigation is missing")
    for label, blocks in (("desktop", desktop), ("mobile", mobile)):
        targets = {target for block in blocks for _, target in anchor_targets(path, block) if target}
        for missing in sorted(expected_common - targets):
            fail(f"{rel}: {label} navigation link missing: {missing}")

    footer_match = re.search(r"<footer\b[^>]*>(.*?)</footer>", text, re.IGNORECASE | re.DOTALL)
    if not footer_match:
        fail(f"{rel}: shared footer is missing")
    else:
        footer_targets = {target for _, target in anchor_targets(path, footer_match.group(1)) if target}
        for missing in sorted(expected_footer - footer_targets):
            fail(f"{rel}: footer navigation link missing: {missing}")

    page_name = Path(rel).name
    if page_name in {"why.html", "goals.html", "news.html"}:
        for label, blocks in (("desktop", desktop), ("mobile", mobile)):
            active_ok = any(
                target == rel and attrs.get("aria-current", "").lower() == "page"
                for block in blocks
                for attrs, target in anchor_targets(path, block)
            )
            if not active_ok:
                fail(f"{rel}: active {label} navigation link must use aria-current=page")
    elif page_name == "contact.html":
        header_match = re.search(r"<header\b[^>]*>(.*?)</header>", text, re.IGNORECASE | re.DOTALL)
        active_ok = bool(header_match) and any(
            target == rel and attrs.get("aria-current", "").lower() == "page"
            for attrs, target in anchor_targets(path, header_match.group(1))
        )
        if not active_ok:
            fail(f"{rel}: active header Contact link must use aria-current=page")

# Shared public runtimes must not depend on retired browser language state.
for rel in ("site.js", "gallery-ui.js", "faq-cms.js", "contact-direct.js", "cms-content.js", "cms-content-ja.js"):
    path = ROOT / rel
    if not path.exists():
        fail(f"{rel} is missing")
        continue
    text = path.read_text(encoding="utf-8")
    for legacy in ("fde-lang", "querySelector('#lang')", 'querySelector("#lang")', "getElementById('lang')", 'getElementById("lang")'):
        if legacy in text:
            fail(f"{rel}: retired browser language-state dependency found: {legacy}")

# The multilingual site uses paired crawlable URLs and reciprocal static links.
paired_seo = {
    "index.html": {
        "canonical": "https://kale1205.github.io/fde-site/",
        "en_url": "https://kale1205.github.io/fde-site/",
        "ja_url": "https://kale1205.github.io/fde-site/ja/",
        "locale_href": "ja/",
        "locale_hreflang": "ja",
    },
    "ja/index.html": {
        "canonical": "https://kale1205.github.io/fde-site/ja/",
        "en_url": "https://kale1205.github.io/fde-site/",
        "ja_url": "https://kale1205.github.io/fde-site/ja/",
        "locale_href": "../",
        "locale_hreflang": "en",
    },
}
for name in sorted(GALLERY_INNER_PAGE_NAMES):
    en_url = f"https://kale1205.github.io/fde-site/{name}"
    ja_url = f"https://kale1205.github.io/fde-site/ja/{name}"
    paired_seo[name] = {
        "canonical": en_url,
        "en_url": en_url,
        "ja_url": ja_url,
        "locale_href": f"ja/{name}",
        "locale_hreflang": "ja",
    }
    paired_seo[f"ja/{name}"] = {
        "canonical": ja_url,
        "en_url": en_url,
        "ja_url": ja_url,
        "locale_href": f"../{name}",
        "locale_hreflang": "en",
    }

for rel, expected in paired_seo.items():
    path = ROOT / rel
    if not path.exists():
        continue
    text = path.read_text(encoding="utf-8")
    link_tags = re.findall(r"<link\b[^>]*>", text, re.IGNORECASE)
    links = []
    for tag in link_tags:
        attrs = dict((key.lower(), value) for key, _, value in re.findall(r"([:\w-]+)\s*=\s*([\"'])(.*?)\2", tag))
        links.append(attrs)
    canonical = [item for item in links if item.get("rel", "").lower() == "canonical"]
    if not canonical or canonical[0].get("href") != expected["canonical"]:
        fail(f"{rel}: canonical must be {expected['canonical']}")
    alternates = {(item.get("hreflang"), item.get("href")) for item in links if item.get("rel", "").lower() == "alternate"}
    required_alternates = {
        ("en", expected["en_url"]),
        ("ja", expected["ja_url"]),
        ("x-default", expected["en_url"]),
    }
    for alternate in sorted(required_alternates - alternates):
        fail(f"{rel}: missing hreflang alternate {alternate}")
    locale_tags = re.findall(r"<a\b[^>]*data-locale-link[^>]*>", text, re.IGNORECASE)
    locale_ok = False
    for tag in locale_tags:
        attrs = dict((key.lower(), value) for key, _, value in re.findall(r"([:\w-]+)\s*=\s*([\"'])(.*?)\2", tag))
        if attrs.get("href") == expected["locale_href"] and attrs.get("hreflang") == expected["locale_hreflang"]:
            locale_ok = True
            break
    if not locale_ok:
        fail(f"{rel}: reciprocal static language link is missing or incorrect")

# Sitemap mirrors the public Gallery UI pairs and their exact language alternates.
sitemap_path = ROOT / "sitemap.xml"
sitemap_names = ("license.html", "demo.html", "why.html", "goals.html", "contact.html", "news.html")
sitemap_pairs = [
    (
        "https://kale1205.github.io/fde-site/",
        "https://kale1205.github.io/fde-site/ja/",
    )
] + [
    (
        f"https://kale1205.github.io/fde-site/{name}",
        f"https://kale1205.github.io/fde-site/ja/{name}",
    )
    for name in sitemap_names
]
expected_sitemap_urls = {url for pair in sitemap_pairs for url in pair}
if not sitemap_path.exists():
    fail("sitemap.xml is missing")
else:
    try:
        sitemap_root = ET.parse(sitemap_path).getroot()
        ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9", "xhtml": "http://www.w3.org/1999/xhtml"}
        sitemap_entries = {}
        for item in sitemap_root.findall("sm:url", ns):
            loc = item.findtext("sm:loc", default="", namespaces=ns).strip()
            if not loc:
                fail("sitemap.xml: url entry is missing loc")
                continue
            if loc in sitemap_entries:
                fail(f"sitemap.xml: duplicate loc: {loc}")
            sitemap_entries[loc] = item
        actual_sitemap_urls = set(sitemap_entries)
        for missing in sorted(expected_sitemap_urls - actual_sitemap_urls):
            fail(f"sitemap.xml: expected URL missing: {missing}")
        for unexpected in sorted(actual_sitemap_urls - expected_sitemap_urls):
            fail(f"sitemap.xml: unexpected URL: {unexpected}")
        for en_url, ja_url in sitemap_pairs:
            required = {("en", en_url), ("ja", ja_url), ("x-default", en_url)}
            for loc in (en_url, ja_url):
                item = sitemap_entries.get(loc)
                if item is None:
                    continue
                lastmod = item.findtext("sm:lastmod", default="", namespaces=ns).strip()
                if lastmod != "2026-08-29":
                    fail(f"sitemap.xml: {loc} lastmod must be 2026-08-29")
                alternates = {
                    (link.get("hreflang"), link.get("href"))
                    for link in item.findall("xhtml:link", ns)
                    if link.get("rel") == "alternate"
                }
                for alternate in sorted(required - alternates):
                    fail(f"sitemap.xml: {loc} missing hreflang alternate {alternate}")
    except ET.ParseError as exc:
        fail(f"sitemap.xml: invalid XML: {exc}")

# CMS admin has one News/Media core and one FAQ runtime. Dead order/fulfillment UI is forbidden.
cms_admin = ROOT / "cms-admin.html"
if not cms_admin.exists():
    fail("cms-admin.html is missing")
else:
    text = cms_admin.read_text(encoding="utf-8")
    if not re.search(r"<html\s+lang=[\"']ja[\"']", text, re.IGNORECASE):
        fail("cms-admin.html: admin UI must remain Japanese")
    for required in ("cms-admin.js", "news-translation-hook.js", "faq-admin-v3.js"):
        if required not in text:
            fail(f"cms-admin.html: required CMS runtime missing: {required}")
    for forbidden in ("fulfillmentPanel", 'data-admin-tab="fulfillment"', "order-status-admin.js", "news-delete-v2.js"):
        if forbidden in text:
            fail(f"cms-admin.html: obsolete CMS surface/runtime found: {forbidden}")

cms_core = ROOT / "cms-admin.js"
if not cms_core.exists():
    fail("cms-admin.js is missing")
else:
    text = cms_core.read_text(encoding="utf-8")
    for forbidden in ("cms.faq", "faqCreateQEn", "faqEditQEn", "sendFulfillment", "fulfillOrderId"):
        if forbidden in text:
            fail(f"cms-admin.js: obsolete FAQ/fulfillment implementation found: {forbidden}")

site_content = {}
site_content_path = ROOT / "content" / "site-content.json"
if site_content_path.exists():
    try:
        site_content = json.loads(site_content_path.read_text(encoding="utf-8"))
        for item in site_content.get("news", []):
            item_id = item.get("id", "<unknown>")
            for field in ("title", "body"):
                value = item.get(field, {})
                if not isinstance(value, dict) or not str(value.get("ja", "")).strip() or not str(value.get("en", "")).strip():
                    fail(f"content/site-content.json: news {item_id} missing ja/en {field}")
            ja_title = str(item.get("title", {}).get("ja", "")).strip()
            if ja_title.endswith("。"):
                fail(f"content/site-content.json: Japanese news heading must not end in full stop: {item_id}")
    except Exception as exc:
        fail(f"content/site-content.json: invalid JSON: {exc}")
else:
    fail("content/site-content.json is missing")

faq_data = {}
faq_path = ROOT / "content" / "faq-content.json"
if faq_path.exists():
    try:
        faq_data = json.loads(faq_path.read_text(encoding="utf-8"))
        locales = faq_data.get("locales", [])
        if locales != ["ja", "en"]:
            fail(f"content/faq-content.json: locales must be exactly ['ja', 'en'], got {locales!r}")
        for item in faq_data.get("faq", []):
            item_id = item.get("id", "<unknown>")
            for field in ("question", "answer"):
                value = item.get(field, {})
                if not isinstance(value, dict) or not str(value.get("ja", "")).strip() or not str(value.get("en", "")).strip():
                    fail(f"content/faq-content.json: FAQ {item_id} missing ja/en {field}")
    except Exception as exc:
        fail(f"content/faq-content.json: invalid JSON: {exc}")
else:
    fail("content/faq-content.json is missing")

faq_policy_data = {}
faq_policy_path = ROOT / "content" / "faq-policy-additions.json"
if faq_policy_path.exists():
    try:
        faq_policy_data = json.loads(faq_policy_path.read_text(encoding="utf-8"))
        for item in faq_policy_data.get("faq", []):
            item_id = item.get("id", "<unknown>")
            for field in ("question", "answer"):
                value = item.get(field, {})
                if not isinstance(value, dict) or not str(value.get("ja", "")).strip() or not str(value.get("en", "")).strip():
                    fail(f"content/faq-policy-additions.json: FAQ {item_id} missing ja/en {field}")
    except Exception as exc:
        fail(f"content/faq-policy-additions.json: invalid JSON: {exc}")
else:
    fail("content/faq-policy-additions.json is missing")

# Validate only the active Japanese and English fields consumed by the public
# CMS runtimes. Dormant historical translations and the disabled staging
# checkout catalog are deliberately excluded from this public-content gate.
localized_public_data = {
    "content/faq-content.json": {
        locale: localized_text(faq_data, locale) for locale in ("ja", "en")
    },
    "content/faq-policy-additions.json": {
        locale: localized_text(faq_policy_data, locale) for locale in ("ja", "en")
    },
    "content/site-content.json": {
        locale: localized_text(site_content, locale) for locale in ("ja", "en")
    },
}

for source, items in (
    ("content/faq-content.json", faq_data.get("faq", [])),
    ("content/faq-policy-additions.json", faq_policy_data.get("faq", [])),
    ("content/site-content.json", site_content.get("news", [])),
):
    for item in items:
        item_id = item.get("id", "<unknown>")
        english = " ".join(
            str(item.get(field, {}).get("en", ""))
            for field in ("answer", "body")
            if isinstance(item.get(field), dict)
        )
        if "$" in english and not ("candidate" in english.lower() and "unapproved" in english.lower()):
            fail(f"{source}: English price-bearing item {item_id} must identify USD amounts as unapproved candidates")

if not any(item.get("id") == "inventory-adoption-migration-fit" for item in faq_data.get("faq", [])):
    fail("content/faq-content.json: inventory adoption / migration FAQ is missing")

for source, localized in localized_public_data.items():
    for locale, active_text in localized.items():
        if source != "content/faq-policy-additions.json":
            for plan, pattern in CONTENT_PLAN_NAME_PATTERNS.items():
                if not pattern.search(active_text):
                    fail(f"{source}: active {locale} content missing plan name: {plan}")
        for label, pattern in retired_price_patterns[locale]:
            if pattern.search(active_text):
                fail(f"{source}: active {locale} content contains retired price: {label}")

for source in ("content/faq-content.json", "content/site-content.json"):
    for locale, base_prices in {
        "en": ("$349", "$699", "$31", "$62"),
        "ja": ("49,800円", "99,800円", "4,900円", "9,800円"),
    }.items():
        active_text = localized_public_data[source][locale]
        for price in base_prices:
            if price not in active_text:
                fail(f"{source}: active {locale} content missing canonical plan price: {price}")

for locale, continuation_prices in {"en": ("$31", "$62"), "ja": ("4,900円", "9,800円")}.items():
    active_text = localized_public_data["content/faq-policy-additions.json"][locale]
    for continuation_price in continuation_prices:
        if continuation_price not in active_text:
            fail(f"content/faq-policy-additions.json: active {locale} content missing continuation price: {continuation_price}")

for source in ("content/faq-content.json", "content/faq-policy-additions.json"):
    english_faq = localized_public_data[source]["en"]
    if re.search(r"\bJPY\b|\d[\d,]*\s*yen\b|\d[\d,]*\s*円", english_faq, re.IGNORECASE):
        fail(f"{source}: active English FAQ content must not use JPY/yen pricing")

for source, localized in localized_public_data.items():
    if re.search(r"\bJPY\b|\d[\d,]*\s*円", localized["en"], re.IGNORECASE):
        fail(f"{source}: active English content must use the USD price book")
    if re.search(r"\bUSD\b|\$\s*\d", localized["ja"], re.IGNORECASE):
        fail(f"{source}: active Japanese content must use the JPY price book")

# Dynamic local assets must exist and use the same build key.
contact_config = ROOT / "contact-config.js"
if not contact_config.exists():
    fail("contact-config.js is missing")
else:
    text = contact_config.read_text(encoding="utf-8")
    for match in re.finditer(r"[\"'](?P<path>(?!https?://|//)[A-Za-z0-9_./-]+\.(?:js|css))\?v=(?P<v>[0-9A-Za-z._-]+)[\"']", text):
        rel = match.group("path")
        if rel.startswith("/fde-site/"):
            rel = rel[len("/fde-site/"):]
        elif rel.startswith("/"):
            continue
        if not (ROOT / rel).exists():
            fail(f"contact-config.js: dynamic local asset does not exist: {match.group('path')}")
        if version and match.group("v") != version:
            fail(f"contact-config.js: dynamic asset build key {match.group('v')!r} != {version!r}: {match.group('path')}")

# Worker configuration and import closure.
wrangler = ROOT / "worker" / "wrangler.toml"
worker_reachable = set()
if not wrangler.exists():
    fail("worker/wrangler.toml is missing")
else:
    wt = wrangler.read_text(encoding="utf-8")
    main = None
    mm = re.search(r"^main\s*=\s*[\"']([^\"']+)[\"']", wt, re.MULTILINE)
    if not mm:
        fail("worker/wrangler.toml: main entry is missing")
    else:
        main = (wrangler.parent / mm.group(1)).resolve()
        if not main.exists():
            fail(f"worker/wrangler.toml: configured entry does not exist: {mm.group(1)}")
        else:
            stack = [main]
            while stack:
                current = stack.pop()
                if current in worker_reachable:
                    continue
                worker_reachable.add(current)
                text = current.read_text(encoding="utf-8")
                for imp in re.findall(r"(?:import|export)\s+(?:[^;]*?\s+from\s+)?[\"'](\./[^\"']+)[\"']", text):
                    dep = (current.parent / imp).resolve()
                    if not dep.exists():
                        fail(f"{current.relative_to(ROOT)}: missing Worker import {imp}")
                    else:
                        stack.append(dep)
    if not re.search(r"^account_id\s*=\s*[\"'][0-9a-fA-F]{32}[\"']", wt, re.MULTILINE):
        fail("worker/wrangler.toml: production account_id must be pinned")
    if not re.search(r"^keep_vars\s*=\s*true\s*$", wt, re.MULTILINE):
        fail("worker/wrangler.toml: keep_vars = true is required")
    if not re.search(r'^PRODUCTION_COMMERCE_ENABLED\s*=\s*["\']false["\']\s*$', wt, re.MULTILINE):
        fail("worker/wrangler.toml: legacy production commerce must remain explicitly disabled")
    required_secret_names = {"BREVO_API_KEY", "FROM_EMAIL", "ADMIN_FULFILLMENT_KEY", "TURNSTILE_SECRET_KEY"}
    block = re.search(r"\[secrets\](.*?)(?=\n\[|\Z)", wt, re.DOTALL)
    names = set(re.findall(r"[\"']([A-Z0-9_]+)[\"']", block.group(1))) if block else set()
    for missing in sorted(required_secret_names - names):
        fail(f"worker/wrangler.toml: required secret declaration missing: {missing}")

    production_entry = ROOT / "worker" / "src" / "index-v14.js"
    if main != production_entry.resolve():
        fail("worker/wrangler.toml: production entry must retain the reviewed pre-release commerce gate")
    else:
        entry_text = production_entry.read_text(encoding="utf-8")
        required_blocked_types = {
            "order", "status_lookup", "status_update", "admin_orders_list",
            "admin_order_update", "admin_order_cancel", "admin_pdf", "fulfillment",
        }
        gate_match = re.search(r"PRE_RELEASE_COMMERCE_TYPES\s*=\s*new Set\(\[([^\]]+)\]\)", entry_text)
        gated_types = set(re.findall(r"['\"]([a-z_]+)['\"]", gate_match.group(1))) if gate_match else set()
        if gated_types != required_blocked_types:
            fail("worker/src/index-v14.js: pre-release commerce gate must block the complete legacy route set")
        for marker in ("FDE_COMMERCE_DISABLED_PRE_RELEASE", "PRE_RELEASE_COMMERCE_TYPES.has(type)"):
            if marker not in entry_text:
                fail(f"worker/src/index-v14.js: production commerce gate marker missing: {marker}")

for path in sorted((ROOT / "worker" / "src").glob("index*.js")):
    if path not in worker_reachable:
        fail(f"stale Worker entry should be deleted: {path.relative_to(ROOT)}")

text_extensions = {".html", ".js", ".css", ".py", ".yml", ".yaml", ".toml", ".md", ".txt", ".json"}
secret_patterns = {
    "GitHub token": re.compile(r"\b(?:github_pat_[A-Za-z0-9_]{20,}|ghp_[A-Za-z0-9]{20,})\b"),
    "OpenAI-style key": re.compile(r"\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b"),
    "Brevo API key": re.compile(r"\bxkeysib-[A-Za-z0-9_-]{20,}\b"),
    "Private key block": re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    "Literal runtime secret assignment": re.compile(r"\b(?:BREVO_API_KEY|FROM_EMAIL|ADMIN_FULFILLMENT_KEY|TURNSTILE_SECRET_KEY)\s*=\s*[\"'][^\"']{8,}[\"']"),
}
for path in ROOT.rglob("*"):
    if not path.is_file() or path.suffix.lower() not in text_extensions or ".git" in path.parts:
        continue
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        continue
    rel = path.relative_to(ROOT).as_posix()
    for label, pattern in secret_patterns.items():
        if pattern.search(text):
            fail(f"{rel}: possible {label} detected")

if errors:
    print("Repository validation failed:\n")
    for item in errors:
        print(f"- {item}")
    sys.exit(1)
print(f"Repository validation passed. Build version: {version}")
