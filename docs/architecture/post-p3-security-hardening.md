# Post-P3 Kale Guard security hardening

## Scope

This hardening is a post-P3 incremental security change. It does not revise or overwrite P3-1 Auto Security or P3-8 Governance historical acceptance evidence.

Kale Guard remains the independent Security / Attack Surface assurance layer. A security finding is evidence for engineering and Administrator review; it is not remediation, merge, release, deployment, customer-send, or business-state authority.

The preserved remediation boundary is:

`Guard finding -> engineering remediation -> independent Review -> Guard re-check -> Administrator`

## Preserved security contract

The existing deterministic Auto Security audit remains in place and is not replaced by CodeQL or Dependabot.

- read-only audit
- automatic fixes OFF
- automatic merges OFF
- production writes OFF
- critical finding -> workflow failure
- workflow failure -> Slack notification
- warning -> GitHub summary / artifact / review candidate
- Administrator approval remains required

Warnings are intentionally not converted into Slack alerts in order to avoid alert fatigue.

## Layered security tooling

### Existing Kale Guard deterministic audit

`.github/workflows/auto-security-audit.yml` and `scripts/security_audit.py` remain the repository-specific deterministic security layer for secrets, sensitive tracked files, risky dynamic JavaScript patterns, versioned Worker accumulation, and policy evidence.

### CodeQL

`.github/workflows/codeql.yml` adds GitHub CodeQL analysis for the languages currently present and materially used in this repository:

- JavaScript / TypeScript
- Python

It runs for pull requests targeting `main`, pushes to `main`, a weekly schedule, and manual dispatch. Its token is restricted to read access for repository/actions metadata plus `security-events: write` for code-scanning results. It has no production credential, Cloudflare command, deployment permission, merge authority, or release authority.

### Dependabot

`.github/dependabot.yml` covers only dependency ecosystems verified in the current repository:

- npm at repository root (`package.json` exists)
- GitHub Actions (`.github/workflows/` contains action dependencies)

Both are checked weekly with bounded open version-update PR volume. Minor and patch version updates may be grouped to reduce PR noise. Major version updates are deliberately excluded from those groups and remain independent review items. Dependabot PR creation is not merge approval; existing CI and Administrator review remain required. Auto-merge is not configured.

## Versioned Worker investigation

Current production configuration in `worker/wrangler.toml` points to:

`src/index-v14.js`

The production entry is not standalone. Direct source inspection establishes this active import chain:

`index-v14.js -> index-v13.js -> index-v12.js -> index-v11.js -> index-v10.js -> index-v9.js -> index-v8.js -> index-v7.js -> index-v6.js -> index-v5.js -> index-v4.js -> index-v3.js -> index-v2.js`

`index-v2.js` is the base implementation. Therefore all 13 versioned Worker files detected by `versioned_worker_accumulation` are currently reachable from the configured production entry and are classified **ACTIVE**.

The staging deployment separately generates a staging configuration whose entry is `src/staging-worker.js`. The versioned production chain is not the staging entry.

### Classification

| Worker file | Classification | Evidence basis |
| --- | --- | --- |
| `worker/src/index-v14.js` | ACTIVE | Direct production entry in `worker/wrangler.toml` |
| `worker/src/index-v13.js` | ACTIVE | Imported by v14 |
| `worker/src/index-v12.js` | ACTIVE | Imported by v13 |
| `worker/src/index-v11.js` | ACTIVE | Imported by v12 |
| `worker/src/index-v10.js` | ACTIVE | Imported by v11 |
| `worker/src/index-v9.js` | ACTIVE | Imported by v10 |
| `worker/src/index-v8.js` | ACTIVE | Imported by v9 |
| `worker/src/index-v7.js` | ACTIVE | Imported by v8 |
| `worker/src/index-v6.js` | ACTIVE | Imported by v7 |
| `worker/src/index-v5.js` | ACTIVE | Imported by v6 |
| `worker/src/index-v4.js` | ACTIVE | Imported by v5 |
| `worker/src/index-v3.js` | ACTIVE | Imported by v4 |
| `worker/src/index-v2.js` | ACTIVE | Imported by v3; base implementation |

No versioned Worker file is classified `OBSOLETE_SAFE_TO_REMOVE` in this hardening.

## Cleanup decision

Worker runtime cleanup is **BLOCKED** for this change because deleting any current `index-v*.js` file would break the configured production import graph. No Worker file is deleted and no Worker runtime file is modified in the Security Tooling PR.

The current Auto Security warning should remain visible as an architectural review candidate. Its present operational meaning is a deep version-layer runtime chain and associated maintainability / attack-surface debt, not a proven set of stale files.

A future cleanup must be a separate engineering refactor that first flattens or otherwise safely replaces the inherited runtime chain, then proves behavior with dependency search, deterministic tests, staging validation, deployment-configuration validation, explicit current production entry confirmation, independent Review, Guard re-check, and Administrator approval.

## Hard safety gates preserved

This hardening does not enable:

- agent auto-fix to production
- agent auto-merge
- agent auto-release
- production deployment
- live payments
- production fulfillment
- real installer distribution
- automatic customer email
- unapproved customer send
- unapproved outbound send

No production deployment is part of this hardening procedure.
