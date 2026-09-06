# Baked Kale / FDE — Current Agent Runtime Operating Model

- Status: **CURRENT TARGET OPERATING MODEL**; changes in a draft PR await Administrator merge approval.
- Effective basis: 2026-09-06 current GitHub / Slack state and Administrator storage clarification.
- Governance source of truth: GitHub.
- Final authority: Administrator Kale.

This separates Role, Authority, Runtime, Data and Approval. Historical P3 acceptance evidence, especially `P3_AGENT_GOVERNANCE_ACCEPTANCE.md` and `p3-agent-governance.json`, remains point-in-time evidence and is not rewritten to match this target.

## Architecture principle

| Plane | Responsibility |
| --- | --- |
| GitHub | Agent Constitution / Source of Truth: roles, authority, handoffs, safety policy, machine-readable governance, validators, negative tests, historical evidence |
| Codex | Governed Engineering and Kale Outreach Sales execution profiles |
| ChatGPT Work | Target for Kale Desk, Kale’s Office and future Kale Compliance; not Outreach's primary runtime |
| Administrator-designated MacBook share-folder Sales Operations workspace | Target local persistent sales data; actual paths/access/bootstrap pending |
| GitHub Actions / Cloudflare / Cron / Webhook / Stripe state machines | Deterministic Execution Plane |
| Administrator Kale | Final Authority |

**Runtime ≠ Governance.** **Kale Outreach Role ≠ Codex itself.** Role profiles and contract tests do not install custom agents, an automatic router, local paths or independent OS/tool sandboxes. They do not authenticate an LLM-generated approval boolean. Runtime enforcement requires separately verified configuration/adapters.

No schedule, webhook, sender, CRM, local workspace or autonomous action is considered implemented merely because it is described as a target.

## Codex multi-role architecture

### Codex / Mirror Engineering Mode

Mirror engineering responsibilities are inherited by Codex; a standalone Mirror runtime is not required. Initial IMS v1.0 remains Codex-owned. Preserve historical Mirror capability evidence.

Within approved non-main scope: feature implementation, bug fixes, tests, approved database migrations, dependencies, UI/product-source changes, documentation, version/CHANGELOG proposals and implementation handoff.

Flow: `Administrator → Codex Engineering → independent checks → Kale Review → Kale Guard → Codex summary → Administrator`.

No self-approval, final QA/security ACCEPT, merge, release, production activation, customer distribution or outbound-sales send authority.

### Codex / Kale Outreach Sales Mode

Kale Outreach remains the world-market GTM and outbound sales role.

Target runtime: **Codex / Kale Outreach Sales Mode**.

Within approved scope: country/region/channel research, ICP and industry selection, real B2B prospect research, source-backed shortlist/qualification/Fit Score, account research, campaign segmentation, personalized Email/LinkedIn drafts, follow-up/meeting requests, funnel measurement, campaign analysis, bounded Sales Operations updates and approved outbound execution.

No product-source/GitHub implementation, merge, release, deployment/activation, public publish, pricing-policy, self-approval or unrestricted CRM authority.

`Codex Engineering Mode → code`

`Codex / Kale Outreach Sales Mode → sales operations`

Use a separate sales workspace/task. Never import real sales data into engineering or modify products as a side effect of sales. Sales system code changes are separate Engineering tasks. No role inherits the other's tools or approval scope merely because both use Codex.

## Role loading and actual installation state

The sales workspace needs its own `AGENTS.md` routing instructions. The template is `docs/operations/templates/KALE_OUTREACH_WORKSPACE_AGENTS.md`; it is not installed on the MacBook by this PR.

At task start, verify the active workspace, approved data path and read-only access to a specific approved fde-site governance revision. Read the runtime, sales instructions, sales execution and Sales Operations documents/models at that revision. Report the loaded commit, role, scope, destination and missing capabilities. A role name alone does not guarantee that a separate GitHub repository has been read.

After merge use the approved main revision; do not silently treat this draft as active or use stale main. Instructions can be read through an available repository connection or accessible checkout; updating GitHub does not automatically update a local checkout/session. Verify web-research and local-file capabilities separately. A cloud task is not assumed to mount the MacBook share folder.

See `KALE_OUTREACH_CODEX_RUNTIME.md` for the setup/read sequence. Missing paths, access or instructions block real research until resolved. No absolute paths or local permissions are inferred in this foundation.

## Kale Review — independent assurance

Kale Review remains Independent QA / Review / Red Team, outside Engineering and Sales Mode.

The material author and the final QA `ACCEPT` execution/context must not be the same execution/context.

Future PR-triggered review remains target-only. Review evidence grants no merge, release, activation or distribution authority. No automatic acceptance or new review credentials are activated here.

## Kale Guard — deterministic-first security

Current Auto Security remains `.github/workflows/auto-security-audit.yml`: **daily GitHub Actions scheduled audit**, no exact-start guarantee, `contents: read`, critical-finding gate, GitHub summary/JSON/Markdown artifacts and existing Slack failure notification. Automatic fix, automatic PR/remediation, auto-merge and production write remain OFF. Non-critical warning/review candidates remain report evidence.

Existing CodeQL/Dependabot hardening is untouched by this sales PR; Worker files are untouched.

Target-only flow: `Deterministic Security Scan → AI Semantic Guard Review → Severity Classification → Escalation`.

Severity: Critical, High, Medium, Low, Informational. `Critical` / `High` are normally eligible for immediate Slack escalation. Lower severities accumulate as GitHub summary/artifact/structured findings with no per-finding Slack alert by default. Any risk-specific tightening needs separate review.

The semantic layer can propose findings, severity, evidence explanations and responses. No automatic remediation, production mutation, self-approval, merge, release or production activation. AI semantic runtime and new severity-aware Slack routing remain TARGET ONLY / NOT ACTIVE.

## Kale Sentinel — deterministic read-only monitoring

Read-only Operations Monitor using deterministic observation and approved probes. Manual workflow available; hourly schedule: **OFF**. No state mutation or automatic remediation.

Target flow: `scheduled deterministic observation → finding / incident → Slack → Administrator`. Schedule activation remains a separate Administrator gate, not part of this change.

## Customer / GTM runtime distribution

Kale Outreach uses Codex Sales Mode as above. One-shot work is Administrator-directed; scheduled research, stale-source refresh, follow-up review and funnel reporting are future targets. Event-driven sales replies, meeting outcomes, campaign events and status changes are also future targets. No schedule/event/sender is activated here.

Kale Desk — Target runtime: Work. Inbound classification/grounding/reply draft/FAQ candidates. `Customer event → Kale Desk analysis → reply draft → Administrator approval → Reply`. No unapproved send or Gmail/event wiring.

Kale’s Office — Target runtime: Work. Public/organic editorial drafts for LinkedIn, Instagram, YouTube, News and SEO/AEO. `Outreach GTM brief → Office draft → Administrator approval → Publish → Outreach measurement`. Administrator owns publish.

Kale Compliance — Target runtime: Work after its separate foundation approval. **P5 is still pending**. Country/channel sales-email, recipient-data, privacy/data handling and commercial risk review are not represented as complete. No unbuilt legal-automation authority. Outreach cannot self-clear compliance.

## Sales Operations persistent data layer

Target: **Administrator-designated MacBook share-folder Sales Operations workspace**. This replaces the prior Google Drive / Google Sheets proposal. No Google OAuth is required for the local target.

Local state: **TARGET / PENDING LOCAL WORKSPACE SETUP**. The overarching compatibility enum `TARGET_PENDING_RUNTIME_CONNECTION` includes unverified local paths/access/bootstrap. It is not a Google connection requirement.

The Administrator will specify a separate sales repository/workspace and real-data path in the MacBook `share` folder. Do not infer an absolute path, SMB sharing or cloud synchronization. `sales-operations-governance.json` keeps the logical Prospects / Activities / Campaigns / Metrics / Dashboard model; storage format and adapter remain pending.

The sales repository can version instructions/schema/software/synthetic tests. Real prospects, recipients, messages, activities, evidence and exports must remain outside Git tracking and remote synchronization, preferably outside any Git working tree. An ignored directory requires verification of tracking, permissions, exports and backups; `.gitignore` alone is not an access boundary. No real records in GitHub/history, fixtures, Actions artifacts, public Slack or synthetic tests, including private remotes.

Runtime paths, bootstrap installation, governance read access, data-write permission and actual isolation remain unverified. No MacBook directories/data or external integrations are created here. Local persistence does not imply offline model processing or a private shared folder.

## Deterministic Sales Operations

The Agent owns research/reasoning/qualification/personalization/recommendations. Deterministic components own schema validation, ID assignment, duplicate detection, status validation, approval-protected transition validation, activity history integrity, KPI calculation, dashboard aggregation and data-quality checks.

Pure foundation rules and architecture contracts exist; local persistence/history adapters, Dashboard UI and actual approval authentication are not implied. Future adapters must independently enforce scope-bound approval and actual send evidence, not merely trust generated booleans.

Lifecycle: `RESEARCHED → QUALIFIED → ADMIN_APPROVED → READY_FOR_OUTREACH → SENT → REPLIED → POSITIVE_REPLY / NEGATIVE_REPLY → MEETING where applicable → WON / LOST`. `DISQUALIFIED` is available from research/qualification. The LLM may recommend transitions but never issue/override approval.

Provenance: source URL/system, checked date, evidence, confidence. Preserve uncertainty and minimum-necessary business-purpose data; no sensitive collection or fabricated facts.

## Outbound and current commercial gates

Real bounded send requires `factsConfirmedPublished + prospectSourceApproved + countryComplianceApproved + complianceEvidenceRef + administratorApproval + approvalScopeId + approved sender/channel + noMaterialClaimChanged`, with actual reviewed evidence and exact scope binding. No autonomous unrestricted bulk send, approval reuse, unreviewed harvesting/lists, unapproved discounts/claims or unrestricted CRM writes. Never repurpose Cloudflare/Brevo customer/order mail for marketing.

Verified repository baseline: `PRODUCTION_COMMERCE_ENABLED = "false"`; Slack records IMS as under development. Until separately launched, CTA is limited to learn more, Demo, Contact or discovery conversation. No buy-now, Checkout/payment, installer delivery or commercial availability.

## Deterministic Execution Plane and Administrator

GitHub Actions, Cloudflare Worker/KV, Stripe, Cron/Webhook, order/payment/fulfillment state machines and Sales Operations data checks remain outside free-form AI mutation. Changes must be implemented, reviewed, bounded and approved.

Administrator explicit approval is required for material product scope/architecture, pricing/commercial policy, merge, release, production deployment/activation, customer installer distribution, public publish, inbound customer send, outbound sales send, live payments and production fulfillment. No Agent self-approval.

## Hard Safety Gates — all preserved OFF

Live payments; Production fulfillment; Real installer customer distribution; Automatic customer fulfillment mail; Agent auto-merge; Agent auto-release; Unapproved public posting; Unapproved inbound customer send; Unapproved outbound customer send; Autonomous bulk sales send; Unapproved CRM mutation; Automatic remediation with production mutation.

## Pending runtime wiring and history

Work event/schedules for Desk/Office/Compliance; Codex Sales schedule/events; local sales workspace/bootstrap and permissions; AI semantic Guard/routing; Sentinel schedule; CRM; sender; automatic business actions all remain inactive/unverified as applicable. The superseded Google backend is not connected or required.

Historical P3 evidence remains intact. Slack canonical is not changed before Administrator merge approval; archive the old snapshot before any later canonical update and attach PR/evidence in its thread.
