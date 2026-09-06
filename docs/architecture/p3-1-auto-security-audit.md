# P3-1 Auto Security audit foundation

- Status: complete
- Scope: `Kale1205/fde-site`
- Production write access: disabled
- Automatic fixes: disabled
- Automatic merge: disabled
- Schedule: **daily GitHub Actions scheduled audit** (`.github/workflows/auto-security-audit.yml`; the current cron declaration is daily, but GitHub does not guarantee exact start-time execution)

## Roadmap mapping

This implements the first P3 item from the FDE Work Agent roadmap: start Auto Security with a once-daily audit.

The standing Auto Security policy is:

- inspect GitHub code regularly for obsolete code, duplication, vulnerabilities, and lightweight/refactoring candidates;
- produce findings and later repair proposals / PRs;
- require administrator approval before production changes;
- never make unapproved automatic production fixes.

P3-1 deliberately implements only the deterministic audit foundation. Automatic repair PR generation is not enabled by this step.

## Audit behavior

The daily `Auto Security audit` GitHub Actions workflow runs with `contents: read` only.

It checks the checked-out repository for:

- high-confidence credential patterns such as GitHub tokens, Stripe secret keys, Stripe webhook signing secrets, Slack webhook/token values, private-key blocks, Brevo API keys, and AWS access keys;
- tracked secret-bearing filenames such as `.env`, `.dev.vars`, private-key files, and certificate/key bundles;
- selected dynamic JavaScript patterns that require manual review;
- accumulation of versioned Worker entry files as an obsolete-runtime review candidate;
- whether CodeQL and Dependabot configuration are present.

The first two groups can create a critical finding. Critical findings fail the workflow. Review candidates remain warnings and do not alter the repository.

## Reporting

Each scheduled/manual run produces:

- a GitHub Actions job summary;
- `security-audit.json`;
- `security-audit.md`;
- a 14-day workflow artifact containing both reports.

The existing Slack failure workflow monitors `Auto Security audit`, so a failed audit is reported to `#fde-work-agents` using the existing GitHub Actions failure-alert path.

## PR gate

The same read-only audit is executed in `PR checks` so a newly introduced critical credential pattern cannot be merged through the normal path without first resolving the finding.

## Current safety contract

P3-1 must remain read-only:

- no `contents: write`;
- no pull-request write permission;
- no deployment permission;
- no GitHub Actions secrets consumed by the audit workflow;
- no Wrangler invocation;
- no `git push`;
- no automated merge;
- no Cloudflare production change;
- no payment/delivery activation.

`scripts/validate_p3_security.py` enforces these markers.

## Target Guard architecture — future specification only

The current deterministic behavior remains in place. The future target is:

`Deterministic Security Scan → AI Semantic Guard Review → Severity Classification → Escalation`

Target severity taxonomy includes at least `Critical`, `High`, `Medium`, `Low`, and `Informational`.

Alert-fatigue policy for the future semantic layer:

- `Critical` / `High`: normally eligible for immediate Slack escalation when Administrator attention is time-sensitive;
- `Medium` / `Low` / `Informational` and ordinary review candidates: normally retained in GitHub summary, artifact, or structured finding without a Slack alert for every finding.

AI Semantic Guard Review may generate findings, classify severity, explain evidence, and recommend response. It may not automatically remediate, mutate production, self-approve, merge, release, or activate production.

This target semantic layer and severity-aware Slack routing are **not activated by this document update**. Current behavior remains: critical finding → workflow failure → existing Slack notification; warnings/review candidates → report evidence.

## Follow-up candidates

These remain separate reviewed steps:

- CodeQL enablement;
- Dependabot configuration;
- dependency/SBOM scanning where applicable;
- structured Auto Security finding triage;
- AI Semantic Guard Review runtime;
- severity-aware escalation routing;
- administrator-approved repair PR generation.
