# Baked Kale / FDE — Sales Operations Architecture

- Owner role: **Kale Outreach**
- Execution profile: **Codex / Kale Outreach Sales Mode**
- Target persistent store: **Baked Kale shared Google Drive / Google Sheets**
- Connection state: **TARGET / PENDING RUNTIME CONNECTION**
- Final authority: **Administrator Kale**

## Purpose

Real outbound sales work must not disappear inside a single conversation. The target architecture keeps prospect, campaign, activity and funnel evidence as persistent Sales Operations data while preserving a strict separation between AI reasoning and deterministic data integrity.

No Google Drive / Sheets credential, OAuth grant, folder ID, file ID or write permission is created or assumed by this document.

## Data classification and storage boundary

Real prospect and recipient data is business-purpose operational data and must be handled on a minimum-necessary basis.

Allowed real-sales storage target:

- Administrator-approved Baked Kale shared Google Drive / Google Sheets Sales Master.

Prohibited storage for real prospect / recipient data:

- GitHub source or repository history;
- repository fixtures;
- GitHub Actions artifacts;
- public Slack channels;
- synthetic test datasets.

GitHub stores only schemas, Agent instructions, architecture, deterministic validation code and synthetic tests.

Sensitive personal data is outside the Sales Master design. Prefer company-level and professional business contact data; avoid personal channels when a business route is available.

## Recommended Google Sheets workbook

Create one Administrator-owned workbook after the runtime connection is separately approved. Recommended logical tabs follow.

### Prospects

Required / recommended columns:

- `Prospect ID`
- `Company`
- `Country`
- `Industry`
- `Website`
- `Company size signal`
- `Fit Score`
- `Fit rationale`
- `Source URL`
- `Source system`
- `Source checked date`
- `Evidence`
- `Confidence`
- `Contact route`
- `Contact person`
- `Business email`
- `Current status`
- `Campaign ID`
- `Last contact`
- `Next follow-up`
- `Reply status`
- `Meeting status`
- `Conversion status`
- `Notes`

`Contact person` and `Business email` are optional and should be stored only when needed for a legitimate business-purpose route and permitted by the relevant compliance gate.

### Activities

Append-only logical activity history:

- `Activity ID`
- `Prospect ID`
- `Timestamp`
- `Channel`
- `Action`
- `Message / template reference`
- `Result`
- `Reply category`
- `Next action`

Do not overwrite history merely to make the latest state look cleaner. Corrections should preserve an auditable activity trail where practical.

### Campaigns

- `Campaign ID`
- `Product`
- `Market`
- `Country`
- `Segment`
- `Start date`
- `Approval scope`
- `Sender / channel`
- `Status`

### Metrics

At minimum aggregate:

- researched prospects;
- approved prospects;
- messages sent;
- replies;
- positive replies;
- meetings;
- wins;
- losses;
- reply rate;
- positive reply rate;
- meeting rate;
- conversion rate.

### Dashboard

Target views:

- country performance;
- industry performance;
- channel performance;
- funnel;
- monthly activity;
- reply rate;
- meeting rate;
- sales conversion;
- Fit Score vs actual response;
- campaign performance.

Dashboard cells are derived views; they are not a substitute for the underlying Prospects / Activities / Campaigns records.

## Deterministic Sales Operations layer

Separate AI reasoning from deterministic data handling.

### Kale Outreach / Codex Sales Mode

Owns:

- research;
- reasoning;
- qualification recommendation;
- Fit Score rationale;
- personalization;
- campaign recommendation;
- follow-up recommendation;
- evidence interpretation.

### Deterministic Sales Operations

Owns:

- schema validation;
- ID format / assignment;
- duplicate detection;
- lifecycle transition validation;
- approval-protected state enforcement;
- activity-history integrity;
- KPI calculation;
- dashboard aggregation;
- data-quality checks.

An LLM recommendation must not bypass deterministic approval-state checks.

## Duplicate detection

Primary business duplicate key:

1. normalize the company website to a registrable-looking domain / hostname;
2. if a usable domain exists, use the normalized domain as the primary duplicate key;
3. otherwise use a normalized company-name fallback and require human review before merging records.

Multiple contacts at one company may be separate contact routes but should normally reference one company Prospect record unless an approved account model later requires otherwise.

## Prospect lifecycle

Current target lifecycle:

`RESEARCHED`

→ `QUALIFIED` or `DISQUALIFIED`

→ `ADMIN_APPROVED`

→ `READY_FOR_OUTREACH`

→ `SENT`

→ `REPLIED`

→ `POSITIVE_REPLY` or `NEGATIVE_REPLY`

→ `MEETING` where applicable

→ `WON` or `LOST`

Terminal states: `DISQUALIFIED`, `WON`, `LOST`.

### Approval-protected transitions

- `QUALIFIED → ADMIN_APPROVED` requires explicit Administrator approval evidence and bounded `approvalScopeId`.
- `ADMIN_APPROVED → READY_FOR_OUTREACH` requires the full execution-gate set for the scope.
- `READY_FOR_OUTREACH → SENT` requires the same gates to remain valid and `noMaterialClaimChanged=true`.

The LLM may recommend a transition but may not manufacture the approval evidence.

## Source provenance

For every real prospect, retain where available:

- source URL;
- source system;
- checked date;
- evidence summary;
- confidence.

A low-confidence or unverified field must remain visibly uncertain rather than being converted into a confirmed fact.

Stale-source refresh should be a later scheduled review capability, not silently assumed active.

## Send-gate binding

A `READY_FOR_OUTREACH` or `SENT` state must bind to the current execution scope:

- `factsConfirmedPublished=true`;
- `prospectSourceApproved=true`;
- `countryComplianceApproved=true`;
- `complianceEvidenceRef` present;
- `administratorApproval=true`;
- bounded `approvalScopeId`;
- approved sender/channel;
- `noMaterialClaimChanged=true` before send.

Approval reuse outside the scope is invalid.

## Current commercial boundary

`PRODUCTION_COMMERCE_ENABLED = "false"` is the current repository state.

Until commercial launch is separately approved, the Sales Master may track discovery / relationship outreach, but transactional CTAs remain blocked. Valid CTA intent is limited to learn more, Demo, Contact, or a discovery conversation.

## Recommended Google Drive / Sheets permissions

When implemented later:

- Administrator Kale should own or control the shared location;
- runtime access should be limited to the specific Sales Master resource needed for approved work;
- no public link sharing;
- no broad Drive-wide write permission when a narrower resource permission is sufficient;
- write access should be separated from approval authority;
- credentials and OAuth grants must not be committed to GitHub;
- a dedicated connection review should verify account, scope, retention, backup and revocation behavior.

These are target permissions only. None are enabled by this PR.

## Runtime connection gate

Before declaring persistence implemented, verify:

1. approved Google account / shared-drive ownership;
2. OAuth / connector capability;
3. least-privilege read/write scope;
4. actual workbook ID and tabs;
5. schema compatibility;
6. write / read-back test using synthetic data;
7. duplicate and lifecycle checks on the deterministic path;
8. privacy / retention / compliance requirements;
9. Administrator approval for production use.

Until those checks pass, status remains `TARGET_PENDING_RUNTIME_CONNECTION`.
