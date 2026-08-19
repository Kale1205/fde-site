from pathlib import Path
import json
import re
import sys
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

EN_PAGES = {"index.html", "why.html", "goals.html", "news.html", "contact.html", "order.html", "license.html"}
JA_PAGES = {f"ja/{name}" for name in EN_PAGES}
ROOT_ONLY_PUBLIC = {"customer.html", "demo.html"}
ALL_PUBLIC = EN_PAGES | JA_PAGES | ROOT_ONLY_PUBLIC

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
    "index.html": ("class=\"news-strip\"", "id=\"plans\"", "class=\"ims-compare\"", "cms-content.js", "ims-compare-en.js"),
    "ja/index.html": ("class=\"news-strip\"", "id=\"plans\"", "class=\"ims-compare\"", "cms-content-ja.js", "ims-compare-ja.js"),
    "news.html": ("cms-content.js", "id=\"cmsNewsLead\""),
    "ja/news.html": ("cms-content-ja.js", "id=\"cmsNewsLead\""),
    "contact.html": ("contact-config.js", "contact-direct.js", "faq-cms.js"),
    "ja/contact.html": ("contact-config.js", "contact-direct.js", "faq-cms.js"),
    "license.html": ("license-page-en.js",),
}
for rel, markers in required_markers.items():
    path = ROOT / rel
    if not path.exists():
        continue
    text = path.read_text(encoding="utf-8")
    for marker in markers:
        if marker not in text:
            fail(f"{rel}: required marker/runtime missing: {marker}")

# Shared public runtimes must not depend on retired browser language state.
for rel in ("site.js", "faq-cms.js", "contact-direct.js", "cms-content.js", "cms-content-ja.js"):
    path = ROOT / rel
    if not path.exists():
        fail(f"{rel} is missing")
        continue
    text = path.read_text(encoding="utf-8")
    for legacy in ("fde-lang", "querySelector('#lang')", 'querySelector("#lang")', "getElementById('lang')", 'getElementById("lang")'):
        if legacy in text:
            fail(f"{rel}: retired browser language-state dependency found: {legacy}")

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
