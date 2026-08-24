from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
errors = []


def fail(message):
    errors.append(message)


def read(rel):
    path = ROOT / rel
    if not path.exists():
        fail(f"missing P2 staging file: {rel}")
        return ""
    return path.read_text(encoding="utf-8")


cron = read("worker/src/staging-expiry-cron.js")
stripe = read("worker/src/staging-stripe-webhook.js")
staging_worker = read("worker/src/staging-worker.js")
staging_deploy = read(".github/workflows/deploy-staging.yml")
production_deploy = read(".github/workflows/deploy-worker.yml")
production_wrangler = read("worker/wrangler.toml")
gitignore = read(".gitignore")

for marker in (
    "EXPIRY_CRON = '0 * * * *'",
    "order_received",
    "billing_preparation",
    "awaiting_payment",
    "payment_confirmed",
    "preparing_delivery",
    "delivered",
    "cancelled",
    "system:cron",
    "quote_validity_elapsed",
    "scheduled_expiry_scan",
    "auditPending",
    "staging:order:",
    "list_complete",
):
    if marker not in cron:
        fail(f"staging expiry Cron missing safety marker: {marker}")

for marker in (
    "async scheduled(controller,env)",
    "runExpirySweep",
    "autoCancelEnabled:true",
    "auditLogEnabled:true",
    "expiryCron:EXPIRY_CRON",
):
    if marker not in staging_worker:
        fail(f"staging Worker missing P2-3 marker: {marker}")

for marker in (
    "STRIPE_WEBHOOK_PATH = '/__staging/stripe/webhook'",
    "STRIPE_SIGNATURE_TOLERANCE_SECONDS = 5 * 60",
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "invoice.paid",
    "crypto.subtle.verify('HMAC'",
    "STRIPE_SIGNATURE_TIMESTAMP_OUTSIDE_TOLERANCE",
    "staging:stripe-event:",
    "STRIPE_AMOUNT_MISMATCH",
    "STRIPE_CURRENCY_MISMATCH",
    "STRIPE_ORDER_STATE_NOT_ELIGIBLE",
    "source: 'stripe_webhook'",
    "toStatus: 'payment_confirmed'",
):
    if marker not in stripe:
        fail(f"staging Stripe webhook missing P2-5 safety marker: {marker}")

for forbidden in ("sk_live_", "whsec_", "STRIPE_SECRET_KEY =", "STRIPE_WEBHOOK_SECRET ="):
    if forbidden in stripe:
        fail(f"staging Stripe webhook contains forbidden secret marker: {forbidden}")

for marker in (".dev.vars", ".env", ".wrangler/"):
    if marker not in gitignore:
        fail(f".gitignore must exclude local Worker secret state: {marker}")

for marker in (
    "handleStripeWebhook",
    "stagingOrderIndexKey",
    "stripeWebhookBoundaryEnabled:true",
    "stripeWebhookConfigured:Boolean",
    "livePaymentsEnabled:false",
):
    if marker not in staging_worker:
        fail(f"staging Worker missing P2-5 marker: {marker}")

if '[triggers]' not in staging_deploy or 'crons = [ "0 * * * *" ]' not in staging_deploy:
    fail("staging deploy must configure the hourly expiry Cron")
for marker in (
    '.p2.auditLogEnabled == true',
    '.p2.autoCancelEnabled == true',
    '.p2.expiryCron == "0 * * * *"',
    'node scripts/test_p2_expiry_cron.mjs',
    'node scripts/test_p2_stripe_webhook.mjs',
    '.p2.stripeWebhookBoundaryEnabled == true',
    '.p2.livePaymentsEnabled == false',
):
    if marker not in staging_deploy:
        fail(f"staging deploy missing P2-3 verification: {marker}")

if "- '!worker/src/staging-*.js'" not in production_deploy:
    fail("production deploy must exclude staging-only Worker modules")
if re.search(r"\bcrons\s*=", production_wrangler):
    fail("production wrangler must not enable the staging expiry Cron")

for path in sorted((ROOT / "worker" / "src").glob("index-v*.js")):
    text = path.read_text(encoding="utf-8")
    if "staging-expiry-cron" in text or "runExpirySweep" in text or "staging-stripe-webhook" in text:
        fail(f"production Worker imports a staging-only P2 module: {path.relative_to(ROOT)}")

if errors:
    print("P2 staging validation failed:\n")
    for item in errors:
        print(f"- {item}")
    sys.exit(1)

print("P2 staging validation passed: hourly expiry Cron is staging-only.")
