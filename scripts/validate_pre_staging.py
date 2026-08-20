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
        fail(f"missing staging integrity file: {path}")
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
retired_locale_patterns = (
    r"['\"]zh-CN['\"]\s*:",
    r"['\"]zh-TW['\"]\s*:",
    r"(?:^|[,{])\s*(?:ko|id|ms|vi|th|hi|ar)\s*:\s*\{\s*title\s*:",
)
for pattern in retired_locale_patterns:
    if re.search(pattern, turnstile, re.M):
        fail(f"turnstile-protection.js contains a retired locale dictionary entry: {pattern}")
for legacy in ("querySelector('#lang')", 'querySelector("#lang")'):
    if legacy in turnstile:
        fail(f"turnstile-protection.js contains retired browser language state: {legacy}")
if "document.documentElement.lang" not in turnstile:
    fail("turnstile-protection.js must derive language from html lang")

# Staging and production must use separate backends.
config = text("contact-config.js")
for marker in (
    "location.hostname.endsWith('.pages.dev')",
    "FDE_RUNTIME_ENV",
    "FDE_CMS_BRANCH",
    "kales-fde-contact-staging.reyouinjune.workers.dev",
    "kales-fde-contact.reyouinjune.workers.dev",
    "window.FDE_CONTACT_API",
):
    if marker not in config:
        fail(f"contact-config.js missing staging isolation marker: {marker}")

contact_direct = text("contact-direct.js")
if "formsubmit.co" in contact_direct.lower() or "FORM_SUBMIT_ENDPOINT" in contact_direct:
    fail("contact-direct.js must not retain the legacy FormSubmit fallback")
if "CONTACT_ENDPOINT_NOT_CONFIGURED" not in contact_direct:
    fail("contact-direct.js must fail closed when no Worker endpoint is configured")

staging_worker = text("worker/src/staging-worker.js")
for marker in (
    "TURNSTILE_NOT_CONFIGURED",
    "TURNSTILE_EXPECTED_HOSTNAME",
    "staging:submission:",
    "mailSent:false",
    "STAGING_OPERATION_DISABLED",
):
    if marker not in staging_worker:
        fail(f"staging Worker missing safety marker: {marker}")
if "BREVO" in staging_worker or "FROM_EMAIL" in staging_worker:
    fail("staging Worker must not contain outbound mail configuration")

staging_workflow = text(".github/workflows/deploy-staging.yml")
for marker in (
    "branches:\n      - develop",
    "kales-fde-contact-order-status-staging",
    "kales-fde-staging",
    "kales-fde-contact-staging",
    'main = "src/staging-worker.js"',
    "wrangler@4 pages deploy",
    "X-Robots-Tag: noindex, nofollow, noarchive",
):
    if marker not in staging_workflow:
        fail(f"staging deployment workflow missing marker: {marker}")
if "a634212e677e4e48bd23875a7e42dae9" in staging_workflow:
    fail("staging workflow must never bind the production ORDER_STATUS namespace")

cms_html = text("cms-admin.html")
cms_loader = text("cms-admin-loader.js")
if 'id="cmsRuntimeManifest"' not in cms_html or "cms-admin-loader.js" not in cms_html:
    fail("cms-admin.html must use the environment-aware CMS runtime loader")
for required in ("cms-admin.js", "news-translation-hook.js", "faq-admin-v3.js"):
    if required not in cms_html:
        fail(f"CMS runtime manifest missing: {required}")
if "FDE_RUNTIME_ENV==='staging'" not in cms_loader or "showStagingLock" not in cms_loader:
    fail("cms-admin-loader.js must keep CMS write runtimes locked on staging until dedicated staging CMS activation")

# The repository policy must document the staging isolation contract.
dev = text("DEVELOPMENT.md")
for marker in ("## Staging baseline", "dedicated staging Worker", "dedicated staging namespace", "fails closed"):
    if marker not in dev:
        fail(f"DEVELOPMENT.md missing staging policy: {marker}")

if errors:
    print("Staging integrity validation failed:\n")
    for item in errors:
        print(f"- {item}")
    sys.exit(1)

print("Staging integrity checks passed.")
