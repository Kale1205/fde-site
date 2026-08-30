# P2-4 payment service decision

- Status: accepted for staging design
- Production activation: blocked pending the launch gates below
- Decision date: 2026-08-25
- Provider: Stripe
- Primary UI: Stripe-hosted Checkout
- Recorded scope: staging FDE IMS License and License Plus (one-time); License-only Updates add-on remains outside Checkout
- Catalog status: two-product allowlist implemented; Checkout activation and live payments are off

## Two-product catalog status

The current public offer is FDE IMS License and FDE IMS License Plus. Updates is not a third product: it is an optional License-only add-on. Production payments remain blocked.

The staging code now allowlists the two base product keys and rejects the retired standalone Updates key. A separately reviewed Stripe configuration and Sandbox test are still required before any activation decision. That work must configure environment-specific Price IDs, reconcile License entitlements, and re-run EULA, Checkout, webhook, cancellation, and fulfillment-boundary verification. The add-on remains outside Checkout until purchase-date eligibility and recurring billing rules are implemented and reviewed.

## Decision

Baked Kale will use Stripe as the initial payment platform.

The intended merchant model is:

1. Japan domestic transactions use standard Stripe Payments with Stripe-hosted Checkout. Baked Kale remains the merchant of record and remains responsible for Japanese tax and invoice compliance.
2. Eligible cross-border digital-product transactions use Stripe Managed Payments when the Stripe account and product pass eligibility review. Stripe acts as merchant of record for those transactions.
3. If Managed Payments eligibility or tax coverage is not confirmed for a destination, cross-border sales remain disabled for that route until Baked Kale has a documented compliance path. The system must not silently fall back to an unreviewed tax model.
4. PayPal may be evaluated later as a secondary payment method. It is not a separate primary order system.
5. Paddle is not selected for the initial implementation.

This is a provider decision, not permission to accept live payments. The public website must continue to say that FDE IMS is in development and not yet available for purchase until the production launch gates are explicitly cleared.

## Why Stripe

### One platform for one-time and recurring product models

Stripe Checkout supports one-time purchases and subscriptions. Billing supports recurring payments, and Stripe Invoicing supports one-time or recurring invoice workflows.

- License and License Plus: one-time Checkout Sessions in `payment` mode after activation review.
- License-only Updates add-on: future `subscription` mode after entitlement review; no standalone subscription route.
- All enabled models use the same order ID, webhook boundary, audit model, and Customer Portal status flow.

### Fit for Japan and international digital software sales

Stripe accounts based in Japan are eligible for Managed Payments subject to Stripe review. Managed Payments supports software and downloadable business software categories, including `txcd_10202003` for downloadable software used by a commercial enterprise.

Managed Payments handles indirect-tax compliance for supported cross-border digital-product sales, but it explicitly does not assume Japanese domestic indirect-tax compliance for a Japan-based seller. This is why the domestic and cross-border merchant paths must remain explicit.

### Hosted payment surface

Stripe-hosted Checkout keeps card data out of the Baked Kale frontend and Cloudflare Worker. The site creates a Checkout Session server-side and redirects the buyer to Stripe. The Baked Kale Worker stores only provider identifiers, order references, payment state, amount, currency, timestamps, and non-sensitive audit metadata.

## Staging product mapping

The mappings below describe the disabled staging implementation. USD amounts are unapproved candidates pending final international pricing.

### FDE IMS License

- Internal product key: `fde-ims-license`
- Mode: `payment`
- Japanese price book: JPY 49,800
- English price book: USD 349 candidate
- Candidate Managed Payments tax code: `txcd_10202003` (downloadable software - business use)
- Entitlement: perpetual internal-use License under the accepted License Agreement / EULA
- Delivery: separate from payment confirmation

### FDE IMS License Plus

- Internal product key: `fde-ims-license-plus`
- Mode: `payment`
- Japanese price book: JPY 99,800
- English price book: USD 699 candidate
- Candidate Managed Payments tax code: `txcd_10202003`
- Entitlement: perpetual internal use, full source, permitted internal modification, and customer-managed/self-hosted operation under the accepted License Agreement / EULA
- Updates add-on: not eligible

### License-only Updates add-on

- Not a standalone product and not present in the Checkout allowlist
- Months 1–3: included with License
- Months 4–6: JPY 4,900 / USD 31 candidate per month after explicit opt-in
- Month 7 onward: JPY 9,800 / USD 62 candidate per month after explicit opt-in
- License Plus: not eligible
- Stripe implementation remains blocked until purchase-date eligibility, renewal, cancellation, and entitlement rules are reviewed

## Currency policy

The public English site remains USD and the public Japanese site remains JPY, matching the website master specification.

For standard Stripe Payments, Checkout uses the order's fixed price-book currency. No browser-calculated exchange rate is authoritative.

Managed Payments currently uses Adaptive Pricing. Therefore, before enabling a Managed Payments Checkout Session:

- the formal quotation currency and amount must remain recorded on the Baked Kale order;
- the local Checkout amount and currency returned by Stripe must be recorded separately;
- the UI must disclose that Stripe may present and settle the customer charge in a localized currency;
- the webhook must validate the paid amount and currency against the Checkout Session created for that exact order;
- a country mismatch between the order and Stripe billing details must stop automatic fulfillment and require review.

## Payment state contract

A provider event may move an order to `payment_confirmed` only when all of the following are true:

- the webhook signature is valid;
- the event timestamp is within the accepted replay window;
- the event ID has not already been processed;
- the event type is on the explicit allowlist;
- the Stripe object is in a paid/succeeded state;
- `client_reference_id` or protected metadata matches the Baked Kale order ID;
- product, price, amount, and currency match the server-created Checkout Session;
- the order is currently in an eligible pre-payment state;
- the order is not cancelled, delivered, or already confirmed through a conflicting provider reference;
- an append-only audit event can be persisted.

Payment confirmation must never directly mark the order as `delivered`. It only advances the order to `payment_confirmed`; installer and document delivery remain separate controlled transitions.

## Webhook boundary

The Cloudflare Worker webhook must:

1. Read the raw request body before JSON parsing.
2. Verify the `Stripe-Signature` header with the environment-specific webhook signing secret.
3. Use a bounded timestamp tolerance and constant-time signature comparison.
4. Accept only the minimum required events:
   - `checkout.session.completed` when the Session is paid;
   - `checkout.session.async_payment_succeeded` for delayed methods;
   - `invoice.paid` for entitled subscription renewals;
   - failure/cancellation events only when their state transitions are separately specified.
5. Deduplicate by Stripe event ID and, when necessary, by object ID plus event type.
6. Persist the normalized event and append-only audit record before triggering downstream work.
7. Return a successful response for an already-processed valid event.
8. Fail closed on signature, amount, currency, order, product, or state mismatch.

Stripe can retry undelivered webhook events. Idempotency is therefore mandatory, not optional.

## Environment isolation

The following resources must be separate between staging and production:

- Stripe API key or restricted key;
- Stripe webhook endpoint;
- Stripe webhook signing secret;
- Stripe Product and Price IDs;
- Cloudflare Worker;
- Cloudflare KV namespace;
- Checkout success and cancellation URLs.

Expected secret names:

- staging: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- production: the same binding names in the production Worker, backed by different secret values

No Stripe secret or webhook signing secret may be committed to GitHub, placed in Slack, rendered into HTML, or returned by a health endpoint.

## Launch gates

Live payment acceptance remains blocked until every gate is complete:

- Stripe Japan account is activated and the legal business identity is verified.
- Managed Payments eligibility is confirmed for Baked Kale and for each enabled product.
- License, License Plus, and Updates tax codes are reviewed.
- Japanese domestic consumption-tax and invoice handling is documented.
- Cross-border tax coverage or an explicit disabled-country policy is documented.
- License Agreement / EULA acceptance is stored with version and timestamp.
- Checkout Session creation is server-side and uses an allowlisted price catalog.
- Staging and production secrets are separate.
- Webhook signature, replay, duplication, amount mismatch, currency mismatch, country mismatch, cancellation, and out-of-order event tests pass.
- No automatic installer delivery occurs from an unverified browser redirect.
- Refund, dispute, subscription cancellation, and failed-renewal policies are documented.
- Browser QA is complete for English and Japanese purchase paths.
- The public pre-release notice is removed only in the same reviewed release that enables live sales.

## Alternatives considered

### Paddle

Paddle is a software-focused merchant of record and currently advertises 5% + USD 0.50 per Checkout transaction, including tax and compliance. It reduces international compliance work, but would introduce a separate merchant, billing, invoice, and support surface while the Japanese domestic flow still needs careful operational review. Stripe provides a more coherent single-provider path for Baked Kale's domestic and international requirements.

### Standard Stripe only

Standard Stripe has lower direct processing cost and maximum control, but Baked Kale would remain responsible for indirect-tax registration, calculation, filing, and remittance in each relevant market. This is not the preferred default for the intended Asia-wide and later global rollout.

### Managed Payments only

Managed Payments alone is not sufficient because Stripe explicitly leaves Japanese domestic indirect-tax compliance with a Japan-based seller, account/product eligibility is reviewed, and the product must be a fully automated eligible digital product.

### PayPal as the primary provider

PayPal can be added later as a payment method where commercially useful. Running it as a separate primary order system would duplicate webhook, reconciliation, refund, dispute, and invoice logic during the initial launch.

## Cost snapshot

Verified on 2026-08-25; recheck before launch.

- Stripe card payments in Japan: 3.6% per successful card payment.
- Stripe currency conversion: an additional 2% when conversion is required.
- Stripe Checkout: included with Payments under standard pricing.
- Stripe Billing: 0.7% of Billing volume.
- Stripe Invoicing Starter: 0.4% per paid invoice.
- Stripe Managed Payments: 3.5% in addition to Payments fees.
- Paddle pay-as-you-go: 5% + USD 0.50 per Checkout transaction.

Fees alone do not decide the architecture. Tax liability, invoice ownership, disputes, refunds, customer support, and operational duplication are included in the decision.

## Authoritative references

- [Stripe Japan pricing](https://stripe.com/jp/pricing)
- [Stripe Managed Payments](https://docs.stripe.com/payments/managed-payments)
- [Managed Payments eligibility](https://docs.stripe.com/payments/managed-payments/eligibility)
- [Managed Payments tax compliance](https://docs.stripe.com/payments/managed-payments/tax-compliance)
- [How Managed Payments works](https://docs.stripe.com/payments/managed-payments/how-it-works)
- [Stripe Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment)
- [Stripe webhook security](https://docs.stripe.com/webhooks)
- [Stripe Checkout Session API](https://docs.stripe.com/api/checkout/sessions/create)
- [Paddle pricing](https://www.paddle.com/pricing)

## Required next payment work

The next payment task is the separately reviewed two-product Sandbox configuration and License add-on entitlement design described above. It must preserve the existing fail-closed boundaries and keep Checkout activation, live payments, production fulfillment, installer release, and customer fulfillment email disabled throughout migration and Sandbox verification.
