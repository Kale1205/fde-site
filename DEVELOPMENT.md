# Development workflow

Kale’s FDE uses `main` as the production source of truth.

## Public-site architecture

The public website is intentionally split into two independent static sites that share assets, CMS data, and backend services:

- English: `/` — authoritative English presentation, USD pricing.
- Japanese: `/ja/` — Japanese presentation, JPY pricing.

There is no browser language selector, persisted language state, or runtime translation layer between the two sites.

For every page that exists in both sites, structure and functionality must remain paired. Copy may differ naturally by language, and prices may differ by currency, but navigation, CMS behavior, product-plan structure, comparison behavior, and core interaction patterns must stay aligned.

## CMS invariant

CMS administration is performed in Japanese. Editors enter Japanese source content. The CMS stores both Japanese and English public fields:

- Japanese public pages read the Japanese fields directly.
- English public pages read the English fields.
- A CMS save is not complete if required English output was not generated.

Do not add a browser-side translation layer to compensate for missing CMS translations.

## Standard flow

1. Start from the latest `main`.
2. Create a working branch such as `feat/...`, `fix/...`, or `chore/...`.
3. Make changes only on the working branch.
4. When a public feature exists in both languages, update the English and Japanese pages in the same branch.
5. Open a Pull Request targeting `main`.
6. Wait for `PR checks / validate` to pass.
7. Review the diff and perform any requested browser checks.
8. Merge only after validation and review are complete.

## Required validation

Repository validation must cover both public sites, not only root HTML. It checks:

- paired English/Japanese page existence;
- `lang=en` for English pages and `lang=ja` for Japanese pages;
- local JS/CSS/image/HTML references resolving to existing files;
- one shared build-version cache key across both sites;
- required CMS and comparison runtimes on each site;
- Japanese CMS administration and Japanese/English CMS data completeness;
- absence of obsolete localization, pricing, commerce, and migration artifacts;
- Cloudflare Worker entry/import consistency;
- obvious committed secret patterns;
- Python and JavaScript syntax.

## File-removal policy

Do not preserve obsolete behavior by disabling it, converting it to a no-op, or leaving an unused compatibility file behind. Once a runtime, workflow, or migration helper is superseded and no active dependency remains, remove its references and delete the file.

Historical source is available from Git history; it does not need to remain in the production tree.

## Build-version policy

`build-version.txt` is shared by both sites. `scripts/sync_build_version.py` must update root HTML and `/ja/*.html` together. A cache-bust change that updates only one site is invalid.

## Cloudflare Worker policy

`worker/wrangler.toml` defines the production Worker entry. Every imported Worker module must exist. Historical Worker entry files that are no longer reachable from the configured entry should be deleted rather than retained as dormant versions.

## Secrets

Never commit secret values to GitHub. Secret values belong in Cloudflare Secrets or GitHub Actions Secrets. Public identifiers such as a Turnstile Site Key may be committed when required by the client application.

## Merge policy

Use **Squash and merge** for ordinary feature/fix branches. Do not merge a PR with failing checks.
