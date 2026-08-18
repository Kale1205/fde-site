# Development workflow

Kale’s FDE uses `main` as the production source of truth.

## Standard flow

1. Start from the latest `main`.
2. Create a working branch such as `feat/...`, `fix/...`, or `chore/...`.
3. Make changes only on the working branch.
4. Open a Pull Request targeting `main`.
5. Wait for the `PR checks / validate` GitHub Actions job to pass.
6. Review the diff and perform any requested manual browser checks.
7. Merge only after the checks and review are complete.
8. Production deployment is handled separately from the PR and will be automated in the next CI/CD phase.

## Branch roles

- `main`: production source. Do not use for routine edits.
- `develop`: reserved for future staging/integration use.
- `feat/*`, `fix/*`, `chore/*`: short-lived working branches.

## Required checks before merge

The PR workflow currently checks:

- repository/build-version consistency;
- English default on customer-facing entry points;
- required Contact and Order runtimes;
- absence of legacy Contact/Fulfillment loaders in HTML;
- Cloudflare Worker entry-point consistency;
- obvious committed secret patterns;
- Python helper syntax;
- browser JavaScript syntax;
- Cloudflare Worker JavaScript module syntax.

## Secrets

Never commit secret values to GitHub. Secret values belong in the relevant secret store, such as Cloudflare Secrets or GitHub Actions Secrets. A private password manager can keep an operator backup. Public identifiers such as the Cloudflare Turnstile Site Key may be committed when required by the client application.

## Merge policy

Use **Squash and merge** for ordinary feature/fix branches so `main` stays easy to audit. Do not merge a PR with failing checks.
