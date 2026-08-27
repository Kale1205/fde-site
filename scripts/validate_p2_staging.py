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
checkout = read("worker/src/staging-stripe-checkout.js")
p27 = read("worker/src/staging-p2-7-qa.js")
p28 = read("worker/src/staging-p2-8-fulfillment.js")
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

for marker in (
    "STRIPE_CHECKOUT_PATH = '/__staging/stripe/checkout-session'",
    "https://api.stripe.com/v1/checkout/sessions",
    "X-FDE-Staging-Checkout-Key",
    "STAGING_CHECKOUT_ENABLED",
    "STAGING_CHECKOUT_SETUP_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_PRICE_LICENSE_USD",
    "STRIPE_PRICE_LICENSE_JPY",
    "STRIPE_PRICE_UPDATES_USD",
    "STRIPE_PRICE_UPDATES_JPY",
    "fde-ims-license:usd",
    "amountTotal: 31300",
    "amountTotal: 49800",
    "amountTotal: 6200",
    "amountTotal: 9800",
    "Idempotency-Key",
    "checkout_session_created",
    "CHECKOUT_EULA_ACCEPTANCE_REQUIRED",
    "session?.livemode !== false",
    "toStatus: 'awaiting_payment'",
):
    if marker not in checkout:
        fail(f"staging Stripe Checkout missing P2-6 safety marker: {marker}")

for forbidden in ("sk_live_", "sk_test_", "rk_live_", "rk_test_", "whsec_"):
    if forbidden in checkout:
        fail(f"staging Stripe Checkout contains a key-like secret marker: {forbidden}")

for marker in (
    "P2_7_QA_PATH = '/__staging/p2-7'",
    "P2_7_ORDER_PATH = '/__staging/p2-7/order'",
    "P2_7_EULA_PATH = '/__staging/p2-7/eula'",
    "P2_7_STATUS_PATH = '/__staging/p2-7/status'",
    "P2_7_EULA_VERSION = 'FDE-IMS-STAGING-EULA-2026-08-27'",
    "X-FDE-Staging-Checkout-Key",
    "STAGING_CHECKOUT_SETUP_KEY",
    "staging_test_only",
    "action: 'eula_accepted'",
    "source: 'p2_7_qa'",
    "getQuoteState(order.quoteExpiresAt, now)",
    "webhookConfirmed",
    "Content-Security-Policy",
):
    if marker not in p27:
        fail(f"staging P2-7 EULA QA missing safety marker: {marker}")

for forbidden in ("sk_live_", "sk_test_", "rk_live_", "rk_test_", "whsec_"):
    if forbidden in p27:
        fail(f"staging P2-7 EULA QA contains a key-like secret marker: {forbidden}")

for marker in (
    "P2_8_QA_PATH = '/__staging/p2-8'",
    "P2_8_PREPARE_PATH = '/__staging/p2-8/prepare'",
    "P2_8_SIMULATE_DELIVERY_PATH = '/__staging/p2-8/simulate-delivery'",
    "P2_8_STATUS_PATH = '/__staging/p2-8/status'",
    "payment_confirmed",
    "preparing_delivery",
    "delivered",
    "X-FDE-Staging-Checkout-Key",
    "STAGING_CHECKOUT_SETUP_KEY",
    "action: 'fulfillment_preparation_started'",
    "action: 'delivery_simulated'",
    "source: 'p2_8_qa'",
    "staging_simulation_only",
    "withheld_product_not_released",
    "customerMailSent: false",
    "installerReleased: false",
    "productionDeliveryEnabled: false",
    "Content-Security-Policy",
):
    if marker not in p28:
        fail(f"staging P2-8 fulfillment QA missing safety marker: {marker}")

for forbidden in ("sk_live_", "sk_test_", "rk_live_", "rk_test_", "whsec_"):
    if forbidden in p28:
        fail(f"staging P2-8 fulfillment QA contains a key-like secret marker: {forbidden}")

for marker in (".dev.vars", ".env", ".wrangler/"):
    if marker not in gitignore:
        fail(f".gitignore must exclude local Worker secret state: {marker}")

for marker in (
    "handleStripeWebhook",
    "stagingOrderIndexKey",
    "stripeWebhookBoundaryEnabled:true",
    "stripeWebhookConfigured:Boolean",
    "handleStripeCheckout",
    "stripeCheckoutBoundaryEnabled:true",
    "stripeCheckoutConfigured:stripeCheckoutConfiguration(env)",
    "stripeCheckoutActivationEnabled:",
    "handleP27Qa",
    "eulaAcceptanceBoundaryEnabled:true",
    "eulaVersion:P2_7_EULA_VERSION",
    "p27QaEnabled:true",
    "handleP28Qa",
    "fulfillmentBoundaryEnabled:true",
    "p28QaEnabled:true",
    "deliverySimulationOnly:true",
    "productionDeliveryEnabled:false",
    "customerFulfillmentMailEnabled:false",
    "installerDeliveryEnabled:false",
    "livePaymentsEnabled:false",
):
    if marker not in staging_worker:
        fail(f"staging Worker missing P2 safety marker: {marker}")

if '[triggers]' not in staging_deploy or 'crons = [ "0 * * * *" ]' not in staging_deploy:
    fail("staging deploy must configure the hourly expiry Cron")
for marker in (
    '.p2.auditLogEnabled == true',
    '.p2.autoCancelEnabled == true',
    '.p2.expiryCron == "0 * * * *"',
    'node scripts/test_p2_expiry_cron.mjs',
    'node scripts/test_p2_stripe_webhook.mjs',
    'node scripts/test_p2_stripe_checkout.mjs',
    'node scripts/test_p2_eula_acceptance.mjs',
    'node scripts/test_p2_fulfillment.mjs',
    '.p2.stripeWebhookBoundaryEnabled == true',
    '.p2.stripeCheckoutBoundaryEnabled == true',
    '(.p2.stripeCheckoutConfigured | type) == "boolean"',
    '(.p2.stripeCheckoutActivationEnabled | type) == "boolean"',
    '.p2.eulaAcceptanceBoundaryEnabled == true',
    '.p2.eulaVersion == "FDE-IMS-STAGING-EULA-2026-08-27"',
    '.p2.p27QaEnabled == true',
    '.p2.fulfillmentBoundaryEnabled == true',
    '.p2.p28QaEnabled == true',
    '.p2.deliverySimulationOnly == true',
    '.p2.productionDeliveryEnabled == false',
    '.p2.customerFulfillmentMailEnabled == false',
    '.p2.installerDeliveryEnabled == false',
    '.p2.livePaymentsEnabled == false',
):
    if marker not in staging_deploy:
        fail(f"staging deploy missing P2 verification: {marker}")

if "- '!worker/src/staging-*.js'" not in production_deploy:
    fail("production deploy must exclude staging-only Worker modules")
if re.search(r"\bcrons\s*=", production_wrangler):
    fail("production wrangler must not enable the staging expiry Cron")

for path in sorted((ROOT / "worker" / "src").glob("index-v*.js")):
    text = path.read_text(encoding="utf-8")
    if (
        "staging-expiry-cron" in text or
        "runExpirySweep" in text or
        "staging-stripe-webhook" in text or
        "staging-stripe-checkout" in text or
        "staging-p2-7-qa" in text or
        "staging-p2-8-fulfillment" in text
    ):
        fail(f"production Worker imports a staging-only P2 module: {path.relative_to(ROOT)}")

if errors:
    print("P2 staging validation failed:\n")
    for item in errors:
        print(f"- {item}")
    sys.exit(1)

print("P2 staging validation passed: expiry, Stripe, EULA, and P2-8 fulfillment QA remain staging-only.")