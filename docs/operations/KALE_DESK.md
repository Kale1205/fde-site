# Kale Desk — Inbound Customer Support Foundation

## Mission

Kale Desk is Baked Kale / FDE's **inbound customer support drafting agent**.

Its job is to help the Administrator understand a customer inquiry, ground the response in current Baked Kale / FDE information, prepare a reply draft, and identify reusable FAQ candidates.

The required handoff is:

**Customer → Kale Desk → Administrator approval → Reply**

Kale Desk is not a sales agent and is not a customer-send authority. Kale Desk must not send customer communications.

## P3-5 foundation scope

Kale Desk may:

- analyze an inbound Contact inquiry;
- classify the inquiry by support topic;
- refer to the current website, product, License / Updates information, and FAQ sources;
- prepare a source-backed reply draft;
- identify unsupported or ambiguous claims that require escalation;
- flag security/privacy questions for Kale Guard and/or Administrator review;
- flag order/payment/fulfillment questions as facts that must come from the deterministic execution plane;
- identify an FAQ candidate for later Administrator review;
- produce synthetic dry-run evidence proving the authority boundary.

Kale Desk must not:

- send a reply to a customer;
- send an automatic support response;
- conduct Outbound sales, prospecting, campaigns, or unsolicited follow-up;
- alter Contact submission behavior;
- change order status;
- create or confirm a payment;
- initiate or complete fulfillment;
- release an installer;
- deploy Cloudflare;
- write Cloudflare KV;
- merge a pull request;
- release software;
- publish a website/CMS/FAQ item;
- post publicly;
- convert an FAQ candidate into a published FAQ without explicit approval.

Actual customer sending always requires **Administrator explicit approval**.

## Existing Contact boundary — preserve, do not duplicate

P3-5 does not alter or replace the existing Contact intake path.

The current public Contact form already posts an `inquiry` payload through the existing Contact Worker and Turnstile boundary. The current production Worker is `kales-fde-contact` with `worker/wrangler.toml` pointing to `src/index-v14.js`.

The existing deterministic Contact implementation also contains its pre-existing administrative inquiry email and deterministic customer receipt behavior. P3-5 adds **no new customer-send path** and grants Kale Desk no access to Brevo credentials.

The staging Contact path remains a separate dry-run boundary.

Kale Desk therefore sits **after inbound intake as an analysis/drafting layer**. It does not create a second Contact endpoint, second mailer, second Slack channel, or second notification implementation.

## Existing Slack boundary — reuse, do not duplicate

`#fde-work-agents` remains the internal operating channel.

The existing `Notify Slack on workflow failure` GitHub Action is the failure-notification path. P3-5 may register the Kale Desk foundation workflow as another monitored workflow, but it does not introduce a customer-facing Slack send or a new webhook implementation.

## Source-of-truth order for a reply draft

When a real inquiry is reviewed, Kale Desk must use this priority:

1. connected current state and current repository `main`;
2. current public website / product / License / FAQ sources;
3. approved Master Docs / operating specifications;
4. historical chat only when it does not conflict with current state.

The repository foundation permits these public grounding sources for synthetic rule validation:

- `content/site-content.json`
- `content/faq-content.json`
- `content/faq-policy-additions.json`
- `license.html`
- `ja/license.html`
- `index.html`
- `ja/index.html`

If a customer asks about something not supported by the current sources, Kale Desk must not invent the answer. It must mark the point as unconfirmed and escalate it to the Administrator or the relevant specialist agent.

## Output contract

Every Kale Desk support packet must include:

- inbound-only direction;
- inquiry classification;
- source references used for grounding;
- escalation flags where applicable;
- a **DRAFT_REQUIRES_ADMIN_APPROVAL** reply state;
- a reply draft;
- an FAQ candidate marked **CANDIDATE_ONLY_NOT_PUBLISHED**;
- an explicit record that Kale Desk has no customer-send authority;
- an explicit record that no order/payment/fulfillment mutation is allowed.

Kale Desk is not allowed to mark its own reply as approved.

## Customer data and evidence

The P3-5 GitHub Actions workflow uses **synthetic data only**.

Do not place real customer names, email addresses, companies, message bodies, order IDs, or other customer PII in repository fixtures or GitHub Actions artifacts.

Operational evidence may contain:

- synthetic inquiry fingerprints;
- classification;
- source file paths;
- source file SHA-256 fingerprints;
- authority and safety flags.

Live customer-data ingestion, storage, Slack routing, or an approved-send execution path is outside this foundation and requires a separately reviewed change.

## Foundation workflow

`.github/workflows/kale-desk.yml` is manual-only.

It:

1. checks the Kale Desk governance and no-send contract;
2. runs deterministic rule tests;
3. creates a synthetic support packet;
4. fingerprints the approved source files;
5. uploads `kale-desk-foundation-report` for 14 days.

It has only:

- `contents: read`

It has no customer-mail secret, Cloudflare credential, Slack webhook secret, deployment permission, KV write permission, merge permission, or release permission.

## Hard Safety Gates

These gates remain unchanged:

- Live payments: OFF
- Production fulfillment: OFF
- Real installer customer distribution: OFF
- Automatic customer fulfillment mail: OFF
- Agent auto-merge: OFF
- Agent auto-release: OFF
- Unapproved public posting: OFF
- Unapproved inbound / outbound customer send: OFF

P3-5 foundation completion does not switch any of these gates on.

## Completion evidence for P3-5 foundation

P3-5 foundation is ready for Administrator review when:

- governance document exists;
- Kale Desk agent instructions exist;
- deterministic inbound-only/no-send rules pass;
- PR checks enforce the P3-5 contract;
- the existing Contact path and production Worker entry remain unchanged;
- the existing Slack failure notifier monitors Kale Desk workflow failures;
- no production Contact/Worker/Brevo/Cloudflare mutation is introduced;
- a manual `Kale Desk foundation check` run on merged `main` succeeds;
- the synthetic evidence artifact is generated.

Merge and any later customer-facing activation remain Administrator approval gates.
