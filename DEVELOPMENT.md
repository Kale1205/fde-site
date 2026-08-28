# Development workflow

Kale’s FDE uses `main` as the production source of truth.

## Public-site architecture

The public website is one multilingual product site with a shared codebase, shared assets, CMS data, and backend services. Searchable language-specific URLs remain explicit:

- English: `/` — English presentation and USD pricing.
- Japanese: `/ja/` — Japanese presentation and JPY pricing.

Each paired page must provide a visible direct link to its counterpart and static `hreflang` metadata. There is no automatic language redirect, persisted language state, cookie, or runtime translation layer. A visitor's explicit language choice is always respected.

For every page that exists in both languages, structure and functionality must remain paired. Copy may differ naturally by language, and prices may differ by currency, but navigation, CMS behavior, product-plan structure, comparison behavior, and core interaction patterns must stay aligned. Shared CSS and JavaScript are the default; separate language-specific presentation code requires a documented reason.

The IMS development preview is a paired public feature: `demo.html` is English and `ja/demo.html` is Japanese. The Customer Portal remains a root-only operational utility until the formal sales/customer-portal language policy is finalized.

## Public visual system

The shared public-site visual direction is **Gallery UI × Warehouse Art**. It applies equally to the English and Japanese sites and must be implemented through shared assets and shared CSS wherever practical.

Core design rules:

- warm ivory/paper background rather than a cold SaaS-white surface;
- charcoal/ink typography with deep kale green as the primary accent;
- serif display typography paired with a restrained sans-serif UI/body layer;
- generous editorial spacing and thin rules instead of dense rounded-card layouts;
- warehouse imagery, paper texture, operational ledgers, and restrained annotation marks used as supporting editorial elements, never as a replacement for product information;
- deliberately restrained asymmetry: slight offsets, staggered blocks, registration marks and paper-like framing may be used to avoid a uniform SaaS-grid feel;
- product plans and comparisons should read like designed information plates or technical-journal spreads rather than generic application cards;
- News, Why FDE and Kale’s Goals preserve a publication/editorial reading rhythm, using semantic ledgers and CMS imagery instead of repeating the same proposition or process in multiple diagrams;
- square or near-square controls/cards with minimal shadows;
- product screenshots, CMS imagery and diagrams remain readable and functional;
- motion stays restrained: reveal, slight lift and gentle transitions only;
- mobile layouts must preserve the editorial hierarchy without clipping, hidden content, forced ornamental asymmetry or decorative obstruction.

`gallery-ui.css` provides the shared visual tokens, header, navigation, product presentation, footer, and responsive foundations. `gallery-pages.css` extends that system across Why FDE, Kale’s Goals, News, Contact, License, and Demo. `gallery-ui.js` owns shared navigation and product-preview behavior; the locale-specific CMS readers render the same structured News data in each language. Contact, License, and Demo retain only the page-specific runtimes needed for their real interactions. The order and customer utilities remain outside this editorial migration until their release policy is finalized. Do not create separate English/Japanese copies of design primitives unless a true language-specific rendering requirement exists.

## CMS invariant

CMS administration is performed in Japanese. Editors enter Japanese source content. The CMS stores both Japanese and English public fields:

- Japanese public pages read the Japanese fields directly.
- English public pages read the English fields.
- A CMS save is not complete if required English output was not generated.

Do not add a browser-side translation layer to compensate for missing CMS translations.

Production CMS writes remain production-only. Until P1-5 creates a dedicated staging CMS data path and staging Worker, `*.pages.dev` must not execute the production CMS write runtimes. The environment-aware CMS loader therefore fails closed on staging instead of allowing a staging page to write to `main`.

## Standard flow

1. Start from the latest `main`.
2. Create a working branch such as `feat/...`, `fix/...`, or `chore/...`.
3. Make changes only on the working branch.
4. When a public feature exists in both languages, update the English and Japanese pages in the same branch.
5. Open a Pull Request targeting `main`.
6. Wait for `PR checks / validate` to pass.
7. Review the diff and perform any requested browser checks.
8. Merge only after validation and review are complete.

## Staging baseline

`develop` is reserved as the staging baseline and must be synchronized from the latest accepted `main` before P1-5 staging deployment is configured. Do not use an old divergent `develop` branch as the staging source.

P1-5 will use a fully separated staging boundary:

- frontend: Cloudflare Pages staging project;
- source baseline: `develop`;
- Worker: dedicated staging Worker, not `kales-fde-contact` production;
- KV: dedicated staging namespace, not production `ORDER_STATUS`;
- Contact/Order email: staging-safe destination or dry-run behavior;
- CMS: no production writes from staging; a dedicated staging data path must be introduced before CMS writes are enabled there.

`contact-config.js` treats `*.pages.dev` as staging. Before the dedicated staging Worker exists, the staging Contact API is intentionally blank so the staging site cannot silently send requests to production.

## Required validation

Repository validation must cover both public sites, not only root HTML. It checks:

- paired English/Japanese page existence;
- `lang=en` for English pages and `lang=ja` for Japanese pages;
- local JS/CSS/image/HTML references resolving to existing files;
- one shared build-version cache key across both sites;
- required CMS and shared Gallery UI layers across paired editorial pages;
- shared Product / Why FDE / Kale’s Goals / News navigation and five-link editorial footers;
- reciprocal static language links, self-canonical URLs, and `en` / `ja` / `x-default` alternates;
- Japanese CMS administration and Japanese/English CMS data completeness;
- absence of obsolete localization, pricing, commerce, and migration artifacts;
- Cloudflare Worker entry/import consistency;
- obvious committed secret patterns;
- Python and JavaScript syntax.

Pre-staging validation additionally checks that the Japanese IMS preview exists, Turnstile uses only source-language `en`/`ja`, the staging Contact API fails closed, and the CMS staging lock remains active until a dedicated staging CMS is implemented.

## File-removal policy

Do not preserve obsolete behavior by disabling it, converting it to a no-op, or leaving an unused compatibility file behind. Once a runtime, workflow, or migration helper is superseded and no active dependency remains, remove its references and delete the file.

Historical source is available from Git history; it does not need to remain in the production tree.

## Build-version policy

`build-version.txt` is shared by both sites. `scripts/sync_build_version.py` must update root HTML and `/ja/*.html` together. A cache-bust change that updates only one site is invalid.

## Cloudflare Worker policy

`worker/wrangler.toml` defines the production Worker entry. Every imported Worker module must exist. Historical Worker entry files that are no longer reachable from the configured entry should be deleted rather than retained as dormant versions.

Production and staging Worker resources must not share mutable customer/order state. P1-5 must use a distinct Worker name, KV namespace and staging-specific secret set.

## Payment architecture

The P2-4 payment provider and merchant-of-record baseline is defined in [docs/architecture/payment-service-decision.md](docs/architecture/payment-service-decision.md).

Stripe-hosted Checkout is the only accepted initial payment surface. Payment sessions must be created by a Cloudflare Worker from an allowlisted server-side price catalog. Browser redirects are never proof of payment; only a signature-verified, idempotent webhook can move an order to `payment_confirmed`.

Japan domestic and eligible cross-border transactions have different merchant and tax boundaries. Live payment acceptance remains disabled until the launch gates in the decision record are complete. Payment confirmation and product delivery are separate state transitions.

P2-5 adds the hard-isolated staging webhook boundary at `/__staging/stripe/webhook`. It verifies the raw request body with the staging signing secret, rejects replayed signatures outside the five-minute tolerance, validates the server-stored order expectation, deduplicates provider event IDs, and appends an audit event before updating the order.

P2-6 adds an operator-only staging Checkout Session boundary at `/__staging/stripe/checkout-session`. It calls Stripe only when `STAGING_CHECKOUT_ENABLED=true`, a constant-time-verified `X-FDE-Staging-Checkout-Key` is supplied, an unexpired staging order includes versioned EULA acceptance, and the requested product/currency exists in the fixed server-side catalog. The Worker accepts only Stripe Sandbox Session responses, records the exact expected product, Price, amount, currency and mode, and appends an audit event before moving the order to `awaiting_payment`.

The P2-6 boundary remains fail-closed until its Stripe Sandbox key, operator key, four Price IDs, and two staging return URLs are present. Setup is documented in [docs/setup/stripe-staging-setup-ja.md](docs/setup/stripe-staging-setup-ja.md). P2-6 does not add a public Checkout button, send mail, deliver an installer, or enable production payments.

## Secrets

Never commit secret values to GitHub. Secret values belong in Cloudflare Secrets or GitHub Actions Secrets. Public identifiers such as a Turnstile Site Key may be committed when required by the client application.

## Merge policy

Use **Squash and merge** for ordinary feature/fix branches. Do not merge a PR with failing checks.
