# Kale Sentinel — Operational Monitoring Foundation

## Mission

Kale Sentinel is Baked Kale / FDE's operational exception monitor. It observes whether the current deterministic system is behaving as expected and reports evidence when it is not.

Kale Sentinel is not an order processor, payment processor, fulfillment operator, deployment owner, merge owner, or release owner.

## Authority boundary

Kale Sentinel may:
- read GitHub Actions operational state;
- read Cloudflare staging health and read-only KV records through a dedicated read-only token;
- inspect Stripe webhook processing markers already recorded in staging KV;
- inspect order / payment / fulfillment records for contradictions and defined stuck-state conditions;
- perform non-mutating HTTP reachability and fail-closed probes;
- produce JSON / Markdown evidence and cause its own workflow to fail when an incident is detected;
- route workflow failure through the existing Slack failure notification path.

Kale Sentinel must not:
- change order status;
- cancel or advance an order;
- create Checkout Sessions or payments;
- replay or synthesize Stripe webhook events;
- send customer email;
- release an installer or fulfillment artifact;
- deploy Cloudflare resources;
- write Cloudflare KV business records;
- create / merge PRs automatically;
- release software or activate production commerce.

The deterministic execution plane remains responsible for quote expiry, status transitions, payment confirmation, webhook signature validation, audit logging, and fulfillment transitions.

## Current P3-4 monitored scope

### GitHub Actions

Kale Sentinel checks the current `Kale1205/fde-site` automation surface and reports abnormal workflow state. Existing event-driven failure alerts remain active; Sentinel adds periodic reconciliation rather than replacing them.

The current foundation treats `Auto Security audit` as a freshness-sensitive scheduled workflow. It also checks the latest completed state of deployment / validation workflows where available.

### Cloudflare

The periodic probe verifies:
- staging Worker health is reachable;
- staging is still isolated from production;
- KV and Turnstile configuration markers are present;
- hourly quote-expiry Cron remains declared;
- Stripe webhook / Checkout boundaries remain present;
- P2-7 EULA and P2-8 fulfillment QA boundaries remain present;
- `productionDeliveryEnabled=false`;
- `customerFulfillmentMailEnabled=false`;
- `installerDeliveryEnabled=false`;
- `livePaymentsEnabled=false`.

No Cloudflare deployment command is permitted in the Sentinel workflow.

### Stripe / order / payment / fulfillment

Kale Sentinel reads staging KV through a dedicated API token limited to Workers KV read access.

It detects structural incidents such as:
- invalid order JSON;
- order ID index mismatch;
- expired quotation remaining in an expiry-eligible status beyond the monitoring grace period;
- a retained `auditPending` condition beyond the monitoring grace period;
- payment-confirmed / delivery states without the expected Stripe payment and EULA evidence;
- `preparing_delivery` without its staging fulfillment manifest;
- `delivered` without a completed staging-only delivery simulation;
- any staging fulfillment record claiming customer mail sent, installer released, or production delivery enabled;
- Stripe event marker remaining in `processing` beyond the processing-stuck threshold;
- invalid / unknown Stripe event marker state.

Kale Sentinel does not invent a time-based SLA for `awaiting_payment`, `payment_confirmed`, or `preparing_delivery` where the product specification has not defined one. It reports deterministic contradictions, and only uses explicit monitoring grace windows for mechanisms that are already expected to progress automatically.

## Monitoring thresholds

These are monitoring thresholds only. They do not authorize state transitions.

- Quote-expiry stuck grace: **2 hours** after `quoteExpiresAt`. The deterministic expiry Cron runs hourly; the extra grace avoids flagging normal scheduling delay.
- Expiry audit-pending stuck grace: **2 hours** after the most relevant cancellation / update timestamp.
- Stripe event `processing` stuck threshold: **30 minutes** after `receivedAt`.
- Auto Security freshness warning / incident threshold: latest completed run should remain within the scheduled daily operating window defined by the probe.

Threshold changes are governance changes and must be reviewed; they must not silently become business-state transition rules.

## Credential model

P3-4 deliberately does not reuse the deployment-capable `CLOUDFLARE_API_TOKEN`.

Use a separate GitHub Actions secret:

`CLOUDFLARE_SENTINEL_TOKEN`

Required Cloudflare permission:
- Account → Workers KV Storage → Read

Scope it to the Baked Kale Cloudflare account only.

The Sentinel workflow must never contain the token value and must never request Workers KV write permission.

## Reporting model

Each run produces evidence containing:
- generated time;
- check source;
- expected state;
- observed state;
- severity;
- incident code;
- aggregate counts only for operational records.

Reports must not contain customer names, email addresses, message bodies, payment secrets, Stripe signing secrets, Cloudflare tokens, or raw credential material.

Operational verdicts:
- `HEALTHY` — no incident / warning finding;
- `DEGRADED` — non-blocking warning exists;
- `INCIDENT` — one or more incident findings require Administrator attention;
- `BLOCKED` — required observation source is unavailable, so Sentinel cannot reliably conclude health.

A Sentinel verdict is evidence only. It does not authorize remediation.

## Notification path

`GitHub / Cloudflare / staging Stripe records -> Kale Sentinel workflow -> workflow failure -> existing Slack failure notifier -> Administrator`

The existing Slack failure notifier remains the only alert-sending component in this phase. Kale Sentinel does not hold a Slack webhook secret directly.

## Activation gate

P3-4 is not considered fully active until all of the following are confirmed:
1. `CLOUDFLARE_SENTINEL_TOKEN` is configured as a GitHub Actions secret with read-only KV permission.
2. Sentinel contract / fixture tests pass in PR checks.
3. A manual live Sentinel run succeeds with the dedicated token.
4. Hourly schedule is enabled only after the manual live run succeeds.
5. Sentinel workflow failures are included in the existing Slack failure notification workflow.

## Hard safety gates — unchanged

- Live payments: OFF
- Production fulfillment: OFF
- Real installer customer distribution: OFF
- Automatic customer fulfillment mail: OFF
- Agent auto-merge: OFF
- Agent auto-release: OFF
- Unapproved public posting: OFF
- Unapproved customer send: OFF
