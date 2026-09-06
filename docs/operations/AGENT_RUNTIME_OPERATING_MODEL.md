# Baked Kale / FDE — Current Agent Runtime Operating Model

- Status: **CURRENT TARGET OPERATING MODEL**
- Effective basis: 2026-09-06 current GitHub / Slack state
- Governance source of truth: GitHub
- Final authority: Administrator Kale

This document defines the current runtime architecture for Baked Kale / FDE. It separates **role / responsibility / authority semantics** from the runtime that executes a role.

Historical P3 acceptance evidence remains point-in-time evidence. In particular, `docs/operations/P3_AGENT_GOVERNANCE_ACCEPTANCE.md` and `docs/operations/p3-agent-governance.json` record the completed P3 baseline and are not rewritten to make the historical record look as though the current runtime model already existed.

## Architecture principle

| Plane | Target responsibility |
| --- | --- |
| GitHub | Agent Constitution / Source of Truth: roles, authority, handoffs, safety policy, machine-readable governance, validators, negative tests, historical acceptance evidence |
| ChatGPT Work | Business Agent Runtime for Kale Outreach, Kale Desk, Kale’s Office, and future Kale Compliance execution |
| Codex | Engineering Agent Runtime |
| GitHub Actions / Cloudflare / Cron / Webhook / Stripe deterministic state machines | Deterministic Runtime / Execution Plane |
| Administrator Kale | Final Authority |

**Runtime ≠ Governance.** A Work or Codex conversation is an execution context, not the sole definition of an Agent role or its authority.

No runtime integration, credential, event trigger, schedule, sender, CRM, or autonomous business action is considered implemented merely because it is described here as a target.

## Engineering runtime — Codex / Mirror Engineering Mode

Mirror Kale is no longer a required standalone runtime in the current target architecture. Its engineering responsibilities are inherited by Codex as **Codex / Mirror Engineering Mode**.

Codex engineering responsibility includes, within Administrator-approved scope and on non-main branches:

- feature implementation;
- bug fixes and regressions;
- automated tests;
- database migrations using the approved migration mechanism;
- dependency changes within approved compatibility / security policy;
- UI and product-source changes;
- technical documentation and version / CHANGELOG proposals;
- implementation evidence and handoff summaries.

This preserves the engineering semantics established by the historical Mirror Kale foundation without requiring a separate persistent Mirror runtime. Initial IMS v1.0 remains Codex-owned, consistent with current P4-2 execution.

Post-v1.0 engineering flow:

`Administrator → Codex Engineering → independent checks → Kale Review → Kale Guard → Codex summary → Administrator`

Codex does **not** receive:

- self-approval;
- final QA `ACCEPT` authority;
- final security `ACCEPT` authority;
- merge authority;
- release authority;
- production activation authority;
- customer installer distribution authority.

Historical P3/P4 evidence that says Mirror Kale existed as a standalone role or capability candidate remains historical evidence and must not be rewritten as if that was never true.

## Kale Review — independent assurance

Kale Review remains **Independent QA / Review / Red Team** and is not merged into Codex engineering.

The hard independence rule is:

> A material author and the final QA `ACCEPT` execution/context must not be the same execution/context.

Kale Review may be triggered by future PR activity or another reviewed event mechanism, but no unapproved external runtime, credential, webhook, or automatic acceptance path is activated by this architecture update.

Kale Review evidence never grants merge, release, production activation, or customer distribution authority.

## Kale Guard — deterministic-first security

### Current runtime — preserved

The current Auto Security implementation remains unchanged in authority and behavior:

- `.github/workflows/auto-security-audit.yml`;
- **daily GitHub Actions scheduled audit**; GitHub scheduled workflows do not guarantee exact start time;
- `contents: read` only;
- critical-finding gate;
- GitHub summary plus JSON / Markdown artifact;
- existing Slack failure notification path;
- automatic fix: OFF;
- automatic PR/remediation: OFF;
- auto-merge: OFF;
- production write: OFF.

Current notification behavior remains: a critical finding fails the workflow and therefore enters the existing Slack failure-notification path; non-critical warning / review candidates remain report evidence.

### Target Guard architecture — specification only

Future architecture:

`Deterministic Security Scan → AI Semantic Guard Review → Severity Classification → Escalation`

Severity taxonomy must support at least:

- `Critical`
- `High`
- `Medium`
- `Low`
- `Informational`

Target escalation policy is alert-fatigue aware:

- `Critical` / `High`: normally eligible for immediate Slack escalation because Administrator attention may be time-sensitive;
- `Medium` / `Low` / `Informational` and ordinary review candidates: normally accumulate as GitHub summary, artifact, or structured finding and do **not** generate a Slack alert for every finding;
- severity policy may be tightened for a specifically approved risk class, but silent authority expansion is prohibited.

AI Semantic Guard Review may generate findings, classify severity, explain evidence, and recommend response. It may **not** automatically remediate, mutate production, self-approve, merge, release, or activate production.

The AI semantic layer and new severity-aware Slack routing are **TARGET ONLY / NOT ACTIVE** in this change.

## Kale Sentinel — deterministic read-only monitoring

Kale Sentinel remains a **read-only Operations Monitor**. Its primary runtime is deterministic observation through GitHub Actions, Cloudflare read-only observation, and approved probes.

Current activation state is preserved:

- manual workflow available;
- hourly schedule: **OFF**;
- state mutation: prohibited;
- automatic remediation: prohibited.

Target flow:

`scheduled deterministic observation → finding / incident → Slack → Administrator`

Any schedule activation remains a separate Administrator approval gate. This architecture update does not enable the Sentinel schedule.

## Business Agent Runtime — ChatGPT Work target

### Kale Outreach

Role remains world-market GTM, country / regional targeting, funnel KPI ownership, real B2B prospect research, source-backed shortlist creation, personalized sales drafting, follow-up design, and gated outbound execution.

Target runtime: Work one-shot execution, future scheduled Work, and future event-triggered Work where supported and separately approved.

Real outbound execution continues to require all existing gates:

`factsConfirmedPublished + prospectSourceApproved + countryComplianceApproved + complianceEvidenceRef + administratorApproval + approvalScopeId + approved sender/channel`

No autonomous bulk send. No new sender or CRM is activated by this document.

### Kale Desk

Role remains inbound customer support analysis / drafting.

Target runtime: Work.

Target future event flow:

`Customer event → Kale Desk analysis → reply draft → Administrator approval → Reply`

Unapproved customer send remains prohibited. No Gmail/event wiring is activated by this document.

### Kale’s Office

Role remains public / organic editorial drafting for LinkedIn, Instagram, YouTube, Website News, and SEO / AEO.

Target runtime: Work. Public publish remains Administrator authority.

### Kale Compliance

Role remains future commercial / country-channel / recipient-data / data-handling review.

Target runtime may be Work, but P5 is still pending and the formal Kale Compliance foundation is not represented as complete. No legal automation or new compliance authority is activated by this document.

## Deterministic Execution Plane — remains outside AI Agent authority

Keep these deterministic systems separated from free-form Agent state mutation:

- GitHub Actions;
- Cloudflare Worker / KV;
- Stripe;
- Cron;
- Webhook;
- payment / order / fulfillment state machines.

AI Agents may analyze evidence or prepare bounded requests, but may not freely mutate business state. Deterministic mutation must remain explicitly implemented, reviewed, bounded, and approved.

## Administrator final authority

Administrator explicit approval remains required for:

- material product scope;
- material architecture;
- merge;
- release;
- production deployment / activation;
- customer installer distribution;
- public publish;
- inbound customer send;
- outbound sales send;
- live payments;
- production fulfillment.

Agent self-approval is prohibited.

## Hard Safety Gates — all preserved OFF

- Live payments
- Production fulfillment
- Real installer customer distribution
- Automatic customer fulfillment mail
- Agent auto-merge
- Agent auto-release
- Unapproved public posting
- Unapproved inbound customer send
- Unapproved outbound customer send
- Autonomous bulk sales send
- Automatic remediation with production mutation

## Runtime wiring status

The following remain future work unless a later change verifies product capability, permission, credentials, compliance, and Administrator approval:

- Work event triggers / schedules;
- Codex automation beyond the existing approved engineering workflow;
- AI Semantic Guard Review runtime;
- severity-aware Guard Slack routing beyond the existing workflow-failure path;
- Sentinel schedule activation;
- CRM;
- outbound sender integration;
- automatic business actions.

## Historical evidence rule

Current operating-model documents may supersede runtime assumptions, but historical P3 acceptance artifacts and point-in-time evidence must remain intact. Validators must distinguish **historical acceptance** from **current target runtime governance** rather than rewriting history.
