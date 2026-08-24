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

# Staging and production must use separate backends and Turnstile widgets.
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

site_key_match = re.search(
    r"window\.FDE_TURNSTILE_SITE_KEY\s*=\s*FDE_IS_STAGING\s*\?\s*'([^']+)'\s*:\s*'([^']+)'",
    config,
    re.S,
)
if not site_key_match:
    fail("contact-config.js must select Turnstile site keys by environment")
else:
    staging_site_key, production_site_key = site_key_match.groups()
    if staging_site_key == production_site_key:
        fail("staging and production must not share the same Turnstile site key")
    if not staging_site_key.startswith("0x4") or not production_site_key.startswith("0x4"):
        fail("Turnstile site keys do not look valid")

contact_direct = text("contact-direct.js")
if "formsubmit.co" in contact_direct.lower() or "FORM_SUBMIT_ENDPOINT" in contact_direct:
    fail("contact-direct.js must not retain the legacy FormSubmit fallback")
if "CONTACT_ENDPOINT_NOT_CONFIGURED" not in contact_direct:
    fail("contact-direct.js must fail closed when no Worker endpoint is configured")
if "STAGING_RESPONSE_MISMATCH" not in contact_direct or "kales-fde-contact-staging." not in contact_direct:
    fail("contact-direct.js must verify the staging endpoint and dry-run response")

# The staging Worker must be physically isolated: no production Worker import and no mail runtime.
staging_worker = text("worker/src/staging-worker.js")
for marker in (
    "TURNSTILE_NOT_CONFIGURED",
    "TURNSTILE_EXPECTED_HOSTNAME",
    "staging:submission:",
    "mailSent:false",
    "STAGING_OPERATION_DISABLED",
    "productionImported:false",
    "kvConfigured",
    "turnstileConfigured",
    "X-FDE-Environment",
):
    if marker not in staging_worker:
        fail(f"staging Worker missing safety marker: {marker}")
for forbidden in (
    "productionWorker",
    "baseWorker",
    "index-v14.js",
    "index-v13.js",
    "index-v12.js",
    "BREVO",
    "FROM_EMAIL",
    "FROM_NAME",
):
    if forbidden in staging_worker:
        fail(f"staging Worker must not reference production/mail runtime: {forbidden}")
if re.search(r"^\s*import\s+.+from\s+['\"]\./index-v\d+\.js['\"]", staging_worker, re.M):
    fail("staging Worker must never import a versioned production Worker entry")

staging_workflow = text(".github/workflows/deploy-staging.yml")
for marker in (
    "branches:\n      - develop",
    "kales-fde-contact-order-status-staging",
    "kales-fde-staging",
    "kales-fde-contact-staging",
    'main = "src/staging-worker.js"',
    "Deploy hard-isolated staging Worker",
    "Smoke test staging Worker identity and safety",
    "for attempt in 1 2 3 4 5 6 7 8 9 10; do",
    "curl -fsS --max-time 10",
    "retrying in 2 seconds",
    "productionImported == false",
    "kvConfigured == true",
    "turnstileConfigured == true",
    "TURNSTILE_TOKEN_REQUIRED",
    "wrangler@4 pages deploy",
    "X-Robots-Tag: noindex, nofollow, noarchive",
):
    if marker not in staging_workflow:
        fail(f"staging deployment workflow missing marker: {marker}")
if "a634212e677e4e48bd23875a7e42dae9" in staging_workflow:
    fail("staging workflow must never bind the production ORDER_STATUS namespace")

# Staging-only Worker modules must not trigger a production Worker deployment.
production_workflow = text(".github/workflows/deploy-worker.yml")
if "- 'worker/**'" not in production_workflow:
    fail("production Worker workflow must include worker/**")
if "- '!worker/src/staging-*.js'" not in production_workflow:
    fail("production Worker workflow must exclude staging-only Worker modules")

# Inspect only the generated Wrangler heredoc, not guard strings elsewhere in the workflow.
wrangler_block_match = re.search(
    r"cat > worker/wrangler\.staging\.generated\.toml <<EOF\n(?P<body>.*?)\n\s*EOF",
    staging_workflow,
    re.S,
)
if not wrangler_block_match:
    fail("staging workflow must generate an explicit staging Wrangler configuration")
else:
    wrangler_block = wrangler_block_match.group("body")
    for forbidden in ('[ai]', 'binding = "AI"', 'FROM_NAME =', 'BREVO_API_KEY', 'FROM_EMAIL'):
        if forbidden in wrangler_block:
            fail(f"generated staging Wrangler config must not provision production/mail capability: {forbidden}")

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
