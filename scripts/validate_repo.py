from pathlib import Path
import json
import re
import sys
import xml.etree.ElementTree as ET
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
errors = []

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

required_markers = {
    "index.html": ("class=\"news-strip", "id=\"product\"", "id=\"plans\"", "id=\"compare\"", "id=\"security\"", "id=\"faq\"", "gallery-ui.css", "gallery-ui.js", "cms-content.js", "data-demo-open"),
    "ja/index.html": ("class=\"news-strip", "id=\"product\"", "id=\"plans\"", "id=\"compare\"", "id=\"security\"", "id=\"faq\"", "gallery-ui.css", "gallery-ui.js", "cms-content-ja.js", "data-demo-open"),
    "why.html": ("visual-story-poster", "visual-story-stages", "assets/why-fde-editorial-collage.webp"),
    "ja/why.html": ("visual-story-poster", "visual-story-stages", "../assets/why-fde-editorial-collage.webp"),
    "goals.html": ("visual-story-poster", "visual-story-stages", "assets/kales-goals-editorial-collage.webp"),
    "ja/goals.html": ("visual-story-poster", "visual-story-stages", "../assets/kales-goals-editorial-collage.webp"),
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
                if lastmod != "2026-08-28":
                    fail(f"sitemap.xml: {loc} lastmod must be 2026-08-28")
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
    except Exception as exc:
        fail(f"content/site-content.json: invalid JSON: {exc}")
else:
    fail("content/site-content.json is missing")

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
    required_secret_names = {"BREVO_API_KEY", "FROM_EMAIL", "ADMIN_FULFILLMENT_KEY", "TURNSTILE_SECRET_KEY"}
    block = re.search(r"\[secrets\](.*?)(?=\n\[|\Z)", wt, re.DOTALL)
    names = set(re.findall(r"[\"']([A-Z0-9_]+)[\"']", block.group(1))) if block else set()
    for missing in sorted(required_secret_names - names):
        fail(f"worker/wrangler.toml: required secret declaration missing: {missing}")

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
