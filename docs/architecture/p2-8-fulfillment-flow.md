# P2-8 fulfillment flow contract

- Status: staging implementation
- Production activation: blocked
- Decision date: 2026-08-27
- Scope: payment-confirmed order to controlled delivery completion

## Roadmap mapping

The remaining P2 roadmap item is the final commercial flow:

`invoice/payment guidance -> payment -> delivery note / receipt / installer -> delivered`

P2-5 through P2-7 established the Stripe webhook, Checkout, EULA acceptance, and Sandbox end-to-end confirmation. P2-8 fixes the boundary after `payment_confirmed` without enabling live sales or real product delivery.

## State contract

The fulfillment portion of the order state machine is:

`payment_confirmed -> preparing_delivery -> delivered`

A Stripe webhook may only move an eligible order to `payment_confirmed`. It must never mark the order `preparing_delivery` or `delivered`.

`preparing_delivery` is a separate controlled transition. It requires:

- a staging order while P2-8 is under QA;
- stored EULA acceptance;
- a verified Stripe payment record created by the webhook boundary;
- a persisted fulfillment manifest;
- an append-only audit event.

`delivered` is also a separate controlled transition. During P2-8 staging QA this transition is simulation-only and does not send customer mail, release an installer, or enable production delivery.

## Fulfillment manifest

The staging manifest records the required artifact classes without claiming that unreleased production artifacts exist:

- invoice: payment-provider reference only in P2-8 staging;
- delivery note: simulated ready state;
- receipt: payment-provider reference only in P2-8 staging;
- installer: withheld because FDE IMS is not released.

No document URL or installer URL is fabricated. No secret, signed download URL, or payment credential is stored in the manifest.

## Safety invariants

The following remain false throughout P2-8:

- `livePaymentsEnabled`
- production delivery activation
- customer fulfillment email sending
- real installer release

The P2-8 module is staging-only and must not be imported by a production Worker entry.

## Staging QA

P2-8 exposes an operator-protected staging QA surface at `/__staging/p2-8` using the existing staging operator secret binding. The QA flow is:

1. Paste an Order ID already confirmed through P2-7 Sandbox Checkout/Webhook.
2. Verify the order is `payment_confirmed`.
3. Transition to `preparing_delivery` and persist the manifest/audit record.
4. Explicitly confirm a staging-only delivery simulation.
5. Transition to `delivered` while keeping `customerMailSent=false`, `installerReleased=false`, and production delivery disabled.

This simulation validates the state contract only. It is not evidence that the production product, installer, invoice policy, tax handling, or delivery mechanism is launch-ready.

## Production launch gate

A later reviewed phase must replace simulation-only artifact states with actual approved production behaviors. Live fulfillment must remain blocked until, at minimum:

- the FDE IMS release artifact exists and has an approved integrity/signing/distribution design;
- invoice and receipt ownership/content are fixed for Japan domestic and supported cross-border routes;
- delivery-note contents are fixed;
- customer fulfillment email behavior is approved and tested;
- installer authorization, expiry/revocation, and audit requirements are fixed;
- refund/dispute/cancellation interactions with entitlement and delivery are implemented;
- English and Japanese browser QA is complete;
- live payment launch gates in `payment-service-decision.md` are cleared.
