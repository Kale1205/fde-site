# Baked Kale / FDE — Sales Operations Architecture

- Owner role: **Kale Outreach**
- Execution profile: **Codex / Kale Outreach Sales Mode**
- Target persistent store: **Administrator-designated MacBook share-folder Sales Operations workspace**
- Connection state: **TARGET / PENDING LOCAL WORKSPACE SETUP**
- Final authority: **Administrator Kale**

## Purpose and storage decision

Sales work must persist beyond a conversation. The Administrator has replaced the proposed Google Drive / Google Sheets backend with a separate local sales workspace/repository in the MacBook's `share` folder. No Google connection is required. The absolute paths and local permissions are not yet specified or verified; no filesystem work is performed by this PR.

`share` is a folder label, not a known absolute path or a grant of network sharing. Do not assume `/Users/Shared`, a home-folder location, SMB access, cloud synchronization or another repository remote.

## Data classification and storage boundary

Real prospect and recipient data is minimum-necessary business-purpose operational data. The approved target is the Administrator-designated local data area, isolated from the product repositories and Git tracking.

The separate sales repository can version Agent instructions, schema, validators, deterministic code, architecture and synthetic tests. Its existence does not authorize committing or pushing real sales records. Prefer a separate data directory outside every Git working tree. An ignored local data directory is an alternative only after a tracked-file check, permission review and verification that exports/backups are not remotely published. `.gitignore` alone is not a security boundary.

Real prospect/recipient records, business contact details, actual message drafts, activity logs and associated evidence must not enter GitHub source/history, repository fixtures, GitHub Actions artifacts, public Slack or synthetic test datasets. Private GitHub repositories are not an exception. No unapproved cloud mirror or public link sharing.

Sensitive personal data remains prohibited. Contact person and Business email are optional and collected only where necessary and within the applicable business-purpose/compliance scope. Local persistence does not imply offline model processing; runtime data handling requires its own review.

## Sales Master logical datasets

The existing machine-readable `sheets` key is retained for compatibility as a **logical dataset map**, not a requirement for Google Sheets or a physical workbook. Local file/database formats and paths are a later Administrator-approved setup choice. Candidate representations include CSV/JSON/SQLite; no format adapter or database is installed by this PR.

### Prospects

Columns: `Prospect ID`, `Company`, `Country`, `Industry`, `Website`, `Company size signal`, `Fit Score`, `Fit rationale`, `Source URL`, `Source system`, `Source checked date`, `Evidence`, `Confidence`, `Contact route`, `Contact person`, `Business email`, `Current status`, `Campaign ID`, `Last contact`, `Next follow-up`, `Reply status`, `Meeting status`, `Conversion status`, `Notes`.

### Activities

Columns: `Activity ID`, `Prospect ID`, `Timestamp`, `Channel`, `Action`, `Message / template reference`, `Result`, `Reply category`, `Next action`.

Append-only logical history. Corrections preserve an audit trail instead of rewriting past outcomes. Real history persistence and concurrency/retry controls are pending implementation, not implied by a schema.

### Campaigns

Columns: `Campaign ID`, `Product`, `Market`, `Country`, `Segment`, `Start date`, `Approval scope`, `Sender / channel`, `Status`.

### Metrics

Researched prospects, approved prospects, messages sent, replies, positive replies, meetings, wins, losses, reply rate, positive reply rate, meeting rate and conversion rate. Preserve denominators and reporting scope; never describe an unsent draft as a sent activity.

### Dashboard

Country, industry and channel performance; funnel; monthly activity; reply/meeting/sales conversion; Fit Score vs actual response; campaign performance. Derived views do not replace the underlying datasets. Dashboard UI and persistent aggregations remain future implementation.

## Deterministic Sales Operations layer

Kale Outreach / Codex Sales Mode owns research, reasoning, qualification/Fit Score recommendations, personalization, follow-up/campaign recommendations and evidence interpretation.

Deterministic Sales Operations owns schema validation, ID assignment, duplicate detection, status validation, approval-protected transition validation, activity history integrity, KPI calculation, dashboard aggregation and data-quality checks.

The repository contains foundational pure rules for schema checks, ID formatting, dedupe, transitions and KPIs, plus architecture contracts for persistence/history/dashboard behavior. These are not an installed local database, enforced access-control service or verified end-to-end operational system.

## Duplicate detection

Use the normalized website hostname/domain as the primary duplicate signal: normalize the hostname and the `www.` prefix, then flag duplicate candidates. This does not implement public-suffix/registrable-domain or corporate-identity resolution. Company-name fallback preserves international characters and requires human review; do not blindly merge unrelated subsidiaries or shared-domain entities. Multiple business contacts normally reference the same company Prospect.

## Prospect lifecycle

`RESEARCHED → QUALIFIED → ADMIN_APPROVED → READY_FOR_OUTREACH → SENT → REPLIED → POSITIVE_REPLY / NEGATIVE_REPLY → MEETING where applicable → WON / LOST`.

`RESEARCHED` or `QUALIFIED` may instead become `DISQUALIFIED`. Terminal states are `DISQUALIFIED`, `WON` and `LOST`. Actual transitions are enumerated in `sales-operations-governance.json`.

### Approval-protected transitions

`QUALIFIED → ADMIN_APPROVED` requires explicit Administrator approval evidence and bounded `approvalScopeId`. `ADMIN_APPROVED → READY_FOR_OUTREACH` requires every outbound gate. `READY_FOR_OUTREACH → SENT` requires those gates to remain valid, unchanged material claims, and verified actual send evidence from the future approved delivery adapter.

The LLM can recommend a transition but cannot manufacture approvals. Pure contract checks on booleans are not authentication of approval evidence. The future local persistence/send adapter must verify the approval origin, scope, sender/channel and recipient/message binding, and prevent bypass through direct state edits. No such adapter is activated here.

## Source provenance

Preserve Source URL, Source system, Source checked date, Evidence and Confidence where available. Keep uncertain fields visibly uncertain. Do not promote unsupported facts to confirmed records. Source refresh scheduling remains inactive.

## Send-gate binding

Require `factsConfirmedPublished=true`, `prospectSourceApproved=true`, `countryComplianceApproved=true`, `complianceEvidenceRef`, `administratorApproval=true`, bounded `approvalScopeId`, approved sender/channel and `noMaterialClaimChanged=true`. An approval is not reusable beyond its recipient/message/campaign scope.

No unrestricted bulk send, mass scraping/harvesting, purchased unreviewed lists, sensitive-data collection, self-approval, unapproved discount, unsupported commercial claim, unrestricted CRM mutation or marketing reuse of the Cloudflare/Brevo customer/order mail path.

## Current commercial boundary

`PRODUCTION_COMMERCE_ENABLED = "false"` is the verified repository baseline. Until a later reviewed launch changes this, only learn more, Demo, Contact or discovery-conversation CTAs are allowed. No buy-now, Checkout/payment, installer delivery or commercial-availability claim.

## Local workspace setup gate

Before declaring persistence or role loading operational, verify:

1. Administrator-supplied sales repository/workspace and real-data absolute paths, separate from fde-site/fde-ims product work.
2. A local Codex task with verified access; do not assume a cloud environment sees MacBook paths.
3. Sales workspace `AGENTS.md` installed from the bootstrap template, plus verified read-only access to the approved GitHub governance revision.
4. Exact governance commit and loaded role files recorded without real prospect data in public logs.
5. Local ACLs, repository tracking, private data/exports/backups and synchronization boundaries. No existing real-data files in the Git index/history; violations require containment, not a false clean report.
6. Least-privilege tools and write roots. Instructions do not replace OS/tool restrictions; separate sales from engineering contexts and approvals.
7. Synthetic write/read-back and schema/dedupe/lifecycle/KPI tests in the approved local location, without contacting real recipients.
8. Retention, backup, deletion, recovery and country/channel/data-handling policy.
9. Administrator approval for actual local persistence/research scope. Sender activation remains a separate gate.

The machine-readable overall state stays `TARGET_PENDING_RUNTIME_CONNECTION` for compatibility; the specific local state is `TARGET_PENDING_LOCAL_WORKSPACE_SETUP`. Neither state implies a Google OAuth requirement. No guessed paths, installed bootstrap, real research, real data creation, sending, schedule activation or merge occurs in this PR.
