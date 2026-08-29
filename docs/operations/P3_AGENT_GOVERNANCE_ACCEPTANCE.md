# P3-8 Agent Governance Acceptance

## Purpose

P3-8 is the organization-level acceptance gate for the Baked Kale / FDE Agent Operating Foundation completed in P3-1 through P3-7.

It does not create another product, support, editorial, sales, security, or operations agent. It verifies that the existing agents remain separated as one operating system: handoffs are explicit, privileges are least-necessary, evidence is auditable, failures escalate instead of silently self-remediating, and Administrator approval remains the authority boundary.

P3-8 is a **point-in-time acceptance** of the verified P3 baseline. It does not permanently certify future changes. Later product, infrastructure, communications, or commercial changes must continue to pass their applicable local gates.

## Verified baseline

P3-8 is pinned to the connected-state baseline verified at the start of this step:

- `Kale1205/fde-site` main: `cac523901574910b07b21dff715a2a1589364a24`
- `Kale1205/fde-ims` main: `3923cd8da13cea10a62995143a933a4d068f8fcc`
- production commerce: disabled
- Kale Sentinel hourly schedule: disabled
- Kale Outreach real execution: `EXECUTION_BLOCKED_UNTIL_P5_3_AND_ADMIN_APPROVAL`

The machine-readable authority model is `docs/operations/p3-agent-governance.json`.

Because `fde-ims` is private, the public `fde-site` P3-8 workflow does **not** add a cross-repository credential merely to fetch it. The verified `fde-ims` source-of-truth SHA is pinned in the acceptance model. This keeps the P3-8 evidence workflow read-only and avoids creating a new secret or cross-repository privilege.

## Authority model

### Kale Guard — Security / Attack Surface

Owns security assurance: attack surface, credential/secret posture, dependencies, supply-chain risk, and security-relevant configuration.

Kale Guard does not own product implementation, final independent QA, operational mutation, merge, release, public publication, customer send, outbound send, or production activation.

Security remediation follows:

`Kale Guard finding → Mirror Kale remediation → Kale Review regression/quality review → Kale Guard security re-check → Administrator`

### Mirror Kale — Product Brain / Engineering

Owns product requirements, architecture, implementation, tests, maintainability, and product-source changes on non-main branches.

Mirror Kale does not issue the final independent QA verdict on its own material change, self-certify security acceptance, merge, release, distribute customer installers, or activate production commerce.

### Kale Review — Independent QA / Review / Red Team

Owns independent quality challenge and the QA verdict: `ACCEPT`, `CHANGES_REQUIRED`, or `BLOCKED`.

A materially authoring reviewer cannot issue the final `ACCEPT` for that same change. `ACCEPT` is QA evidence only; it is not security acceptance, merge approval, release approval, production activation, or customer distribution authorization.

### Kale Sentinel — Operations Monitor

Owns read-only operational observation and exception reporting.

Kale Sentinel does not change order/payment/fulfillment state, deploy, write Cloudflare business records, merge, release, send to customers, or perform automatic remediation. Its dedicated Cloudflare credential remains read-only.

The P3-4 foundation is complete with manual operational observation. The hourly schedule remains **OFF**. Enabling periodic scheduling is a separate reviewed change and is not a prerequisite for P3-4 or P3-8 completion.

### Kale Desk — Inbound Customer Support

Owns inbound inquiry analysis, source grounding, reply drafting, escalation flags, and FAQ candidates.

It does not send the reply, perform outbound sales, alter Contact behavior, mutate commerce state, publish FAQ/content, deploy, merge, or release.

Required route:

**Customer → Kale Desk → Administrator approval → Reply**

### Kale’s Office — Public Editorial

Owns public editorial drafting from verified source facts.

It does not publish CMS/public/social content, conduct outbound campaigns, send customer messages, announce unreleased features as released, deploy, merge, or release.

Required publication route:

**Mirror/Guard → Kale’s Office → Administrator approval → Publish**

### Kale Outreach — Outbound Growth

Owns outbound segment proposals and sales/campaign drafts using confirmed, already-published information only.

It does not harvest or look up real recipients, create recipient lists, write CRM/contact databases, use unpublished Kale’s Office drafts, promote unreleased features, call Brevo/Gmail/LinkedIn senders, send messages, publish, deploy, merge, or release.

Real campaign execution remains:

`EXECUTION_BLOCKED_UNTIL_P5_3_AND_ADMIN_APPROVAL`

## Cross-agent handoffs

### Product → Review → Security → Approval → Release

**Mirror Kale → Kale Review → Kale Guard → Administrator approval → Release**

No single agent owns implementation, final independent QA, security acceptance, and release authority.

A `CHANGES_REQUIRED` or `BLOCKED` Kale Review verdict stops progression. A security finding returns to Mirror for implementation and then repeats the independent quality/security gates as applicable.

### Public editorial → Approval → Publish → Outreach → Approval → Send

**Mirror/Guard → Kale’s Office → Administrator approval → Publish → Kale Outreach → Administrator approval → Send**

Kale Outreach cannot use an unpublished Kale’s Office draft as campaign truth. Publication approval and outbound-send approval are separate Administrator gates.

### Customer → Kale Desk → Approval → Reply

**Customer → Kale Desk → Administrator approval → Reply**

Inbound support drafting and outbound growth are separate responsibilities. Kale Desk is not a prospecting agent and Kale Outreach is not an inbound-support agent.

### Read-only operations monitoring

**GitHub / Cloudflare / Stripe → Kale Sentinel → Administrator**

Kale Sentinel reports observed conditions. It does not convert a monitoring verdict into permission to alter business state.

## Least privilege

P3-8 accepts the foundation only when the following remain true:

- Kale Guard audit workflow uses repository read access only and no production/deployment credential.
- Kale Sentinel uses GitHub read permissions plus the dedicated `CLOUDFLARE_SENTINEL_TOKEN` for Cloudflare KV read observation; it does not use the deploy-capable `CLOUDFLARE_API_TOKEN`.
- Kale Desk, Kale’s Office, Kale Outreach, and P3-8 evidence workflows are manual, read-only GitHub Actions workflows.
- Drafting agents do not receive sender, CMS-write, Cloudflare-deploy, merge, release, CRM, or recipient-harvesting credentials.
- `allow_auto_merge=false` remains consistent with the operating policy; agents do not own auto-merge or auto-release authority.
- The private `fde-ims` repository does not gain a new public-workflow credential for P3-8.

Least privilege is evaluated by actual workflow permissions and forbidden capability checks, not only narrative declarations.

## Communications separation

The P3 communications model is:

- Kale Desk = inbound only / draft only / no-send.
- Kale’s Office = public editorial only / draft only / no-publish.
- Kale Outreach = outbound growth only / draft only / no-send.
- Existing deterministic Contact/order email behavior is not repurposed into an Agent sender.
- Slack failure notifications are internal operational alerts, not a customer or prospect communication channel.
- Any CMS publication, customer reply, or outbound send requires its own Administrator explicit approval.

No Agent may approve, publish, or send its own communication artifact.

## Failure handling and escalation

An Agent that detects a failure or governance conflict must not use the finding as authority to exceed its role.

The required response is:

1. identify the affected system or handoff;
2. preserve evidence;
3. state impact and confidence;
4. state the recommended next action;
5. escalate to the Administrator or the responsible Agent;
6. stop when an approval gate or missing evidence prevents safe progression.

Automatic recovery is allowed only when the recovery is deterministic, bounded, and explicitly approved in advance. A monitoring or review verdict by itself never creates production mutation authority.

## Auditability and evidence

P3-8 adds a composite, synthetic evidence workflow:

`.github/workflows/p3-agent-governance.yml`

It validates:

- the seven-agent authority matrix;
- implementation / QA / security separation;
- Sentinel observation / mutation separation;
- inbound / public / outbound communication separation;
- approved handoff ordering;
- Administrator approval gates;
- hard safety gates;
- production-commerce fail-closed state;
- P5-3 Outreach execution hold;
- workflow least privilege;
- stale-governance reconciliation;
- Slack failure-notification coverage.

It then generates `p3-agent-governance-acceptance-report` with 14-day retention.

The evidence run uses no real customer or recipient data, no recipient lookup, no external network, no sender secret, no Cloudflare write, no Git write, no CMS/public publication, no customer/outbound send, no CRM write, no merge, no release, and no production activation.

The artifact is evidence only. It is not Administrator approval.

## Cloudflare and production-commerce boundary

P3-8 does not change the production Worker, staging Worker, KV namespaces, Cloudflare Pages, DNS, sender routing, or Cloudflare Secrets.

The verified repository configuration remains:

`PRODUCTION_COMMERCE_ENABLED = "false"`

P3-8 does not activate production commerce, live payments, production fulfillment, installer distribution, or automatic customer fulfillment email.

No Cloudflare credential is added to the P3-8 governance workflow.

## Hard Safety Gates

All remain OFF:

- Live payments: OFF
- Production fulfillment: OFF
- Real installer customer distribution: OFF
- Automatic customer fulfillment mail: OFF
- Agent auto-merge: OFF
- Agent auto-release: OFF
- Unapproved public posting: OFF
- Unapproved inbound customer send: OFF
- Unapproved outbound customer send: OFF

P3-8 does not activate production commerce.

## Reconciliation of stale foundation wording

P3-8 also reconciles two documentation states that no longer matched the accepted operating state:

1. P3-1 Auto Security had already completed, while its architecture document still said `implementation candidate`. The document now records the foundation as complete without changing its read-only behavior.
2. P3-4 Kale Sentinel had already completed with its hourly schedule intentionally OFF, while an older activation paragraph implied scheduling was required for full activation. The document now matches the accepted Master Docs and actual manual-only workflow. Enabling hourly operation remains a separate reviewed change.

These are governance-document corrections only. They do not enable additional authority.

## Acceptance criteria

P3-8 is ready for Administrator merge review when:

- the machine-readable authority model validates;
- deterministic negative tests prove prohibited authority combinations fail;
- the exact four cross-agent handoffs validate;
- every Agent remains unable to self-approve/self-publish/self-send/self-release beyond its role;
- all P3 Agent workflows preserve their least-privilege contracts;
- PR checks enforce the composite P3-8 validator;
- the existing Slack failure notifier monitors the P3-8 workflow;
- production commerce remains explicitly disabled;
- all Hard Safety Gates remain OFF;
- P3-1 and Sentinel stale wording is reconciled;
- the PR CI is green.

After **Administrator explicit approval** and merge, completion additionally requires a manual `P3 Agent Governance acceptance check` run on merged `main` to succeed and generate the evidence artifact. Only then should Slack Master Docs / Historical Delivery Record record P3-8 as complete.

Merge, release, CMS/public publication, customer send, outbound send, and production activation remain Administrator explicit approval gates.
