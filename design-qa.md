# Design QA — Gallery UI × Warehouse Art site integration

## Scope

- Approved reference: Baked Kale FDE homepage direction, “Gallery UI × Warehouse Art”
- Implementation: Home, Why FDE, Kale’s Goals, News, Contact, License, and Demo
- Locales: English at root and Japanese under `/ja/`, using one shared information architecture
- Viewports checked: desktop 1363 × 936 and mobile 390 × 844

## Visual comparison

The homepage remains the visual source of truth: warm paper background, dark warehouse green, muted lime and orange accents, editorial serif display type, mono operational labels, thin technical rules, and warehouse imagery. Inner pages reuse that system without copying the homepage layout verbatim.

| Area | Result | Notes |
|---|---|---|
| Header and navigation | Passed | Product, Why FDE, Kale’s Goals, News, Contact, and locale routes are consistent across all integrated pages. |
| Why FDE | Passed | Editorial hero, Understand / Translate / Deploy sequence, and Integration Gap ledger match the approved visual language. |
| Kale’s Goals | Passed | Who / Method / Delivery and principles are expressed as one coherent narrative rather than repeated blocks. |
| News | Passed | Top Story, Latest, and Archive use unique records; the article modal closes with Escape and restores focus. |
| Contact | Passed | Form review flow, validation hooks, FAQ search, and all 35 policy-aware FAQ items work in both languages. |
| License | Passed | Rights, restrictions, pricing, source-code terms, security responsibility, and Updates comparison are present in matching EN/JA structures. |
| Demo | Passed | Search, Receive, Ship, and Reset interactions remain operational; mobile table scrolling stays within its container. |
| Responsive layout | Passed | No page-level horizontal overflow on the integrated desktop or mobile pages. |

## Deduplication decisions

- Removed the second homepage workflow explanation; the compact Receive / Track / Ship sequence remains.
- Removed repeated purchase-unavailable copy from individual offer cards and retained one contextual development notice.
- Reduced repeated plan-condition FAQ entries to unique next-step questions.
- Consolidated Why FDE and Goals explanations into single narratives while retaining distinct factual content.
- Split News content into unique Top Story, Latest, and Archive entries to prevent duplicate rendering.
- Removed obsolete styles, scripts, and superseded diagram assets that were no longer referenced.

## Issues found and resolved

- Corrected the compact News hero from an unintended horizontal layout to the intended stacked editorial composition.
- Corrected the Japanese FAQ policy-additions path so both locales load the same 35-item policy set.
- Corrected responsive story navigation from five columns to the four available destinations.

## Verification

- Repository, pre-staging, notifications, staging-isolation, security, browser-JavaScript, Worker-JavaScript, and P2 policy tests all pass.
- Security audit: 0 critical findings. One pre-existing warning remains for historical versioned Worker files; this integration does not change active Worker behavior.

final result: passed
