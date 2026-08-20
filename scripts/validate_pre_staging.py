from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
errors = []


def fail(message):
    errors.append(message)


def text(path):
    p = ROOT / path
    if not p.exists():
        fail(f"missing pre-staging file: {path}")
        return ""
    return p.read_text(encoding="utf-8")


# Demo is a paired feature in the two-site architecture.
en_demo = text("demo.html")
ja_demo = text("ja/demo.html")
ja_home = text("ja/index.html")
site_js = text("site.js")
if en_demo and not re.search(r'<html\s+lang=["\']en["\']', en_demo, re.I):
    fail("demo.html must be English source")
if ja_demo and not re.search(r'<html\s+lang=["\']ja["\']', ja_demo, re.I):
    fail("ja/demo.html must be Japanese source")
if ja_home and ('href="demo.html"' not in ja_home or 'data-demo-open' not in ja_home):
    fail("ja/index.html must open the Japanese demo")
if "../demo.html" in site_js:
    fail("site.js must not route Japanese pages back to the English demo")

# Turnstile must follow the source language of the independent EN/JA sites.
turnstile = text("turnstile-protection.js")
for legacy in ("zh-CN", "zh-TW", "ko:", "id:", "ms:", "vi:", "th:", "hi:", "ar:", "querySelector('#lang')", 'querySelector("#lang")'):
    if legacy in turnstile:
        fail(f"turnstile-protection.js contains retired multilingual state: {legacy}")
if "document.documentElement.lang" not in turnstile:
    fail("turnstile-protection.js must derive language from html lang")

# Staging must fail closed until P1-5 supplies dedicated resources.
config = text("contact-config.js")
for marker in ("location.hostname.endsWith('.pages.dev')", "FDE_RUNTIME_ENV", "FDE_CMS_BRANCH", "FDE_IS_STAGING ? ''", "window.FDE_CONTACT_API"):
    if marker not in config:
        fail(f"contact-config.js missing staging safety marker: {marker}")

cms_html = text("cms-admin.html")
cms_loader = text("cms-admin-loader.js")
if 'id="cmsRuntimeManifest"' not in cms_html or "cms-admin-loader.js" not in cms_html:
    fail("cms-admin.html must use the environment-aware CMS runtime loader")
for required in ("cms-admin.js", "news-translation-hook.js", "faq-admin-v3.js"):
    if required not in cms_html:
        fail(f"CMS runtime manifest missing: {required}")
if "FDE_RUNTIME_ENV==='staging'" not in cms_loader or "showStagingLock" not in cms_loader:
    fail("cms-admin-loader.js must block production CMS runtimes on staging")

# The repository policy must document the staging isolation contract.
dev = text("DEVELOPMENT.md")
for marker in ("## Staging baseline", "dedicated staging Worker", "dedicated staging namespace", "fails closed"):
    if marker not in dev:
        fail(f"DEVELOPMENT.md missing staging policy: {marker}")

if errors:
    print("Pre-staging validation failed:\n")
    for item in errors:
        print(f"- {item}")
    sys.exit(1)

print("Pre-staging integrity checks passed.")
