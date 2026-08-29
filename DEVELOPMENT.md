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

`gallery-ui.css` provides the shared visual tokens, header, navigation, product presentation, footer, and responsive foundations. `gallery-pages.css` extends that system across Why FDE, Kale’s Goals, News, Contact, License, and Demo. `gallery-ui.js` owns shared navigation and product-preview behavior; the locale-specific CMS readers render the same structured News data in each language. Contact, License, and Demo retain only the page-specific runtimes needed for their real interactions. Order and Customer Portal remain non-interactive pre-release information surfaces until their release policy is finalized. Do not create separate English/Japanese copies of design primitives unless a true language-specific rendering requirement exists.

## Public product-plan source of truth

The public site uses three planned FDE IMS plans. These values and entitlements must stay synchronized across Product, comparison, License, FAQ, News, Contact, Order preview, and SEO copy.

| Plan | Japanese price | English price | Term | Source code | Update entitlement |
| --- | ---: | ---: | --- | --- | --- |
| License | JPY 49,800 one-time | USD 349 candidate | Perpetual internal use | Not provided | Months 1–3 included; continuation after month 3 is optional at the standard Updates price |
| License Plus | JPY 99,800 one-time | USD 699 candidate | Perpetual internal use | Full source code for permitted internal modification | Not included; customer-managed operation |
| Updates | JPY 12,000 monthly | USD 79 monthly candidate | Active contract term | Not provided | Functionality, security, compatibility, and bug-fix updates provided by FDE during the active term |

The proposed License-to-License Plus upgrade is JPY 50,000 / USD 350 candidate. License includes three months of Updates-equivalent service; after that, continuing at the standard Updates price requires an active choice and never begins automatically. Ending optional Updates never extinguishes a previously acquired perpetual License or License Plus right. An Updates-only subscription does not become perpetual after cancellation.

All prices remain planned while FDE IMS is in development. Japanese prices are the current Product Plan v2 proposal; every USD figure is an unapproved candidate pending final international pricing. License Plus is planned to include full source, internal customization rights, technical documentation, and customer-server/self-hosted operation. Local/LAN mode, customer-server mode, multiple-location registration, and multi-site synchronization remain architecture plans under development and must never be described as released features. Deployment, hosting, backup, support-SLA, refund, tax, delivery, and final EULA terms remain unfinalized until separately approved. Production payments, fulfillment, installer release, and customer fulfillment email remain disabled.

### Payment catalog migration boundary

The currently deployed staging Stripe/Checkout catalog is a legacy two-plan test implementation. It still represents `fde-ims-license` and `fde-ims-updates` with the earlier price and entitlement assumptions. Checkout activation remains off, live payments remain off, and this legacy catalog must not be treated as an implementation of the public three-plan offer.

A separate reviewed migration must add the License Plus product and Price IDs, replace the Updates price, reconcile License entitlements, update the staging allowlist and automated payment tests, and repeat end-to-end Sandbox verification. Until that migration is complete, no public purchase action may route into the legacy staging catalog and no production payment capability may be enabled.

Japanese public copy must be written as natural Japanese rather than as a line-by-line translation of English. Visible Japanese headings, buttons, labels, and short art annotations do not end in `。`; normal sentences and explanatory body copy do.

## Search and AI discovery contract

Public search intent starts with the customer problem, not the delivery role. `Baked Kale` is the provider and site entity, `FDE IMS` is the inventory-management product, and `FDE` / Forward Deployed Engineering describes how the product is shaped and maintained alongside real work. Do not use FDE as the primary keyword for people comparing inventory software.

The English and Japanese homepages must visibly support small-business searches about moving from paper records, spreadsheets / Excel, or an existing inventory system. They must also state that data import, migration services, supported file formats, deployment assistance, and final multi-site scope are not yet confirmed. Search copy, FAQ content, and structured data may describe only visible, current facts; planned architecture must remain labeled as in development.

Each homepage publishes one JSON-LD `@graph` containing `Organization`, `WebSite`, locale-specific `WebPage`, `SoftwareApplication`, and `FAQPage` entities. The five structured FAQ answers must match the five visible homepage answers. Do not add `Offer`, price, availability-for-sale, review, rating, customer count, delivery record, or released-feature claims while commerce is disabled and international pricing is unapproved. Do not add `llms.txt` as a substitute for accessible HTML, accurate metadata, crawlable links, or supported structured data.

This repository is served as the GitHub Pages project path `/fde-site/`. A file at `/fde-site/robots.txt` does not control crawling for the `kale1205.github.io` origin; only the origin-root `/robots.txt` does. The current missing origin-root file implies no explicit crawler block, but future crawler directives or a robots-advertised sitemap require control of the root Pages site or a custom domain. Keep the project sitemap discoverable through normal links and search-console submission.

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
- active public three-plan names, locale-specific price books, retired-price exclusion, and Japanese heading punctuation;
- Japanese/English completeness and active-locale pricing checks for both base FAQ data and policy additions;
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
