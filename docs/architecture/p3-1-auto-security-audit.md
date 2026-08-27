# P3-1 Auto Security audit foundation

- Status: implementation candidate
- Scope: `Kale1205/fde-site`
- Production write access: disabled
- Automatic fixes: disabled
- Automatic merge: disabled
- Schedule: once daily at `00:00 UTC` (`09:00 JST`)

## Roadmap mapping

This implements the first P3 item from the FDE Work Agent roadmap: start Auto Security with a once-daily audit.

The standing Auto Security policy is:

- inspect GitHub code regularly for obsolete code, duplication, vulnerabilities, and lightweight/refactoring candidates;
- produce findings and later repair proposals / PRs;
- require administrator approval before production changes;
- never make unapproved automatic production fixes.

P3-1 deliberately implements only the audit foundation. Automatic repair PR generation is not enabled by this step.

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

## Safety contract

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

## Follow-up candidates

These are intentionally outside P3-1 and require a separate reviewed step:

- CodeQL enablement;
- Dependabot configuration;
- dependency/SBOM scanning where applicable;
- structured Auto Security finding triage;
- administrator-approved repair PR generation.
