# Release notice placement — 2026-10-07

User-approved rule: FDE IMS releases on November 1, 2026 and cannot currently
be purchased. Show the general purchase-unavailable notice only on the
homepage, product terms (`license.html`) and W07 purchase (`order.html`).

Implementation: `bc6dadd0e84e3d6ded098ff919acd6fabc274e1f`.

- English, Japanese and Simplified Chinese have the same release/status facts.
- Removed the general purchase-status FAQ and repetitive Contact/News footer
  notices, plus matching FAQ answer suffixes in the CMS source.
- The shared build-time policy prevents page composition and Chinese locale
  generation from restoring the removed notices. No runtime hiding is used.
- Prices, terms, contact form fields, actual demo provenance and customer
  portal unavailability remain unchanged. Checkout remains disabled.
- No changes to canonical, hreflang, robots, JSON-LD or route inventory.

## Browser evidence

Chrome DevTools MCP checked homepage, terms, W07 purchase, Contact and News
in EN/JA/ZH at 1440×960, 1024×900 and 390×844 (mobile/touch): 45 cases.
No page-level horizontal overflow, release-copy overflow, stale purchase
FAQ, console warnings/errors or failed network requests were observed.
English News initially had two pending CMS image requests; after decoding
the hydrated images, both completed with HTTP 200 and no broken images.
The EN/JA Contact CMS hydrated 37 FAQs without the removed sale-status entry.

Screenshot inspection: Japanese homepage at 390px, Japanese terms notice at
1440px and 390px. Date/status copy wraps readably in the existing design.
Lighthouse mobile snapshot audits of Japanese homepage and terms each scored
100 for Accessibility, Best Practices, SEO and Agentic Browsing (not a
performance audit or a physical-device certification).

## Automated evidence

79 related Node tests passed, including four release-copy policy regressions
and the contact email-routing regression. Chinese generation `--check` passed.
Sitemap uses the existing commit-derived lastmod workflow. The first generation
hit the unchanged 30-second Git history timeout; the initial validation read the
old manifest and failed on six lastmod dates. After a warm retry, generation,
generation `--check`, `npm run validate` and all three sitemap regression tests
passed. No timeout or validation criterion was relaxed.

Main/public production is not merged or deployed. Owner-private review
publication is separate from the FDE production repository.

## Private review publication

The existing owner-private Site now includes 21 actual W01–W07 routes (3 locales).
15 changed/retained-notice routes were additionally checked at mobile 390px in
the packaged preview, without page overflow, stale FAQ, errors or production
navigation escapes. W07's language picker navigated from Japanese to Chinese
and preserved the release date and disabled-purchase notice.

- Site source: `2f21a0b7dff87d6eb896a5cfd12b3721215cefe6`.
- Native deployment: `appgdep_6ac59b5ca4708191a838a7ac748ff19d`, `succeeded`.
- Review: https://fde-w02-design-review.kale-1999.chatgpt.site/preview/ja/
- W08 remains image-only and awaits design selection. No release authorization
  or actual checkout activation was added by this copy change.
