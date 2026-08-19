from pathlib import Path
import re
import sys

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

asset_ref = re.compile(r"(?:src|href)=[\"'](?P<path>[^\"']+\.(?:js|css)(?:\?[^\"']*)?)[\"']", re.IGNORECASE)
version_param = re.compile(r"(?:\?|&)v=([^&]+)")
public_pages = {"index.html","why.html","goals.html","news.html","contact.html","order.html","customer.html","demo.html","license.html"}
legacy_loaders = ("contact-mailer.js", "fulfillment-v2.js")
obsolete_runtime_names = ("i18n-v2.js","i18n-overrides.js","i18n-polish.js","i18n-brand.js","i18n-final.js","ims-plan-flip.js")

for path in sorted(ROOT.glob("*.html")):
    text = path.read_text(encoding="utf-8")
    if path.name in public_pages and not re.search(r"<html\s+lang=[\"']en[\"']", text, re.IGNORECASE):
        fail(f"{path.name}: customer-facing entry point must use lang=en")
    for legacy in legacy_loaders + obsolete_runtime_names:
        if legacy in text:
            fail(f"{path.name}: obsolete runtime must not be referenced: {legacy}")
    for match in asset_ref.finditer(text):
        ref = match.group("path")
        if ref.startswith(("http://", "https://", "//", "data:")):
            continue
        vm = version_param.search(ref)
        if not vm:
            fail(f"{path.name}: local asset is missing ?v= build key: {ref}")
            continue
        if version and vm.group(1) != version:
            fail(f"{path.name}: asset build key {vm.group(1)!r} != {version!r}: {ref}")

contact_config = ROOT / "contact-config.js"
if not contact_config.exists():
    fail("contact-config.js is missing")
else:
    text = contact_config.read_text(encoding="utf-8")
    for match in re.finditer(r"[\"'](?P<path>(?!https?://|//)[A-Za-z0-9_./-]+\.(?:js|css))\?v=(?P<version>[0-9A-Za-z._-]+)[\"']", text):
        if version and match.group("version") != version:
            fail(f"contact-config.js: dynamic asset build key {match.group('version')!r} != {version!r}: {match.group('path')}")

for obsolete in obsolete_runtime_names:
    if (ROOT / obsolete).exists():
        fail(f"obsolete runtime file should be deleted: {obsolete}")

wrangler = ROOT / "worker" / "wrangler.toml"
if not wrangler.exists():
    fail("worker/wrangler.toml is missing")
else:
    wrangler_text = wrangler.read_text(encoding="utf-8")
    main_match = re.search(r"^main\s*=\s*[\"']([^\"']+)[\"']", wrangler_text, re.MULTILINE)
    if not main_match:
        fail("worker/wrangler.toml: main entry is missing")
    else:
        main_rel = main_match.group(1)
        if not re.fullmatch(r"src/index-v\d+\.js", main_rel):
            fail(f"worker/wrangler.toml: Worker entry must use a versioned src/index-vN.js file, got {main_rel}")
        if not (wrangler.parent / main_rel).exists():
            fail(f"worker/wrangler.toml: configured entry does not exist: {main_rel}")
    account_match = re.search(r"^account_id\s*=\s*[\"']([0-9a-fA-F]{32})[\"']", wrangler_text, re.MULTILINE)
    if not account_match:
        fail("worker/wrangler.toml: production account_id must be pinned to a 32-character Cloudflare Account ID")
    if not re.search(r"^keep_vars\s*=\s*true\s*$", wrangler_text, re.MULTILINE):
        fail("worker/wrangler.toml: keep_vars = true is required to preserve dashboard-managed vars")
    blocks = re.findall(r"\[\[kv_namespaces\]\](.*?)(?=\n\[|\Z)", wrangler_text, re.DOTALL)
    order_status = next((b for b in blocks if re.search(r"^\s*binding\s*=\s*[\"']ORDER_STATUS[\"']", b, re.MULTILINE)), None)
    if order_status is None:
        fail("worker/wrangler.toml: ORDER_STATUS KV binding is missing")
    elif not re.search(r"^\s*id\s*=\s*[\"'][0-9a-fA-F]{32}[\"']", order_status, re.MULTILINE):
        fail("worker/wrangler.toml: ORDER_STATUS must reference an existing 32-character KV namespace ID")
    required_secret_names = {"BREVO_API_KEY","FROM_EMAIL","ADMIN_FULFILLMENT_KEY","TURNSTILE_SECRET_KEY"}
    secrets_block = re.search(r"\[secrets\](.*?)(?=\n\[|\Z)", wrangler_text, re.DOTALL)
    if not secrets_block:
        fail("worker/wrangler.toml: [secrets] required list is missing")
    else:
        names = set(re.findall(r"[\"']([A-Z0-9_]+)[\"']", secrets_block.group(1)))
        missing = sorted(required_secret_names - names)
        if missing:
            fail(f"worker/wrangler.toml: required secrets missing from declaration: {', '.join(missing)}")

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

required_runtime = {
    "contact.html": ("contact-config.js", "contact-direct.js"),
    "license.html": ("license-page-i18n.js",),
}
for filename, required in required_runtime.items():
    path = ROOT / filename
    if not path.exists():
        fail(f"{filename} is missing")
        continue
    text = path.read_text(encoding="utf-8")
    for asset in required:
        if asset not in text:
            fail(f"{filename}: required runtime is missing: {asset}")

if errors:
    print("Repository validation failed:\n")
    for item in errors:
        print(f"- {item}")
    sys.exit(1)
print(f"Repository validation passed. Build version: {version}")
