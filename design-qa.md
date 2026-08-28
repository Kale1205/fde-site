# Design QA — Why FDE / Kale’s Goals visual-story revision

## Scope and source

- Selected reference: option 3, “See the work. Shape the system.” (`exec-286310a0-a87d-4f60-8502-927822353ec8.png`), 1536 × 1024.
- Revised routes: `/why.html`, `/goals.html`, `/ja/why.html`, and `/ja/goals.html`.
- Art direction: warm paper, forest green, burnt orange, documentary warehouse collage, editorial serif display type, mono operational labels, and very low copy density.
- Browser capture: Chrome at 1363 × 936; responsive QA frames at 390 × 844 (375 px content viewport).

## Combined visual comparison

The reference and final Why FDE implementation were normalized to the same 1536 × 1024 frame and inspected together in one 3072 × 1024 comparison image. The final implementation preserves the target’s primary hierarchy: concise two-line headline, one connected warehouse → collaboration → software collage, three oversized stages, and a compact next-step row.

| Surface | Result | Evidence |
|---|---|---|
| Layout and hierarchy | Passed | Headline, collage, and all three stages are visible together at desktop width; the CTA begins inside the first browser viewport. |
| Typography | Passed | Georgia-based editorial display, mono kicker/indices, and the existing Japanese sans stack remain consistent with the selected direction and shared site system. |
| Color and surfaces | Passed | Paper, forest, orange, ink, and technical rules map directly to existing tokens; no generic card styling, gradients, or decorative CSS art was introduced. |
| Imagery | Passed | Two purpose-built raster collages supply real visual content for Why FDE and Goals; both load at full intrinsic width and crop safely. |
| Copy density | Passed | Long hero paragraphs, card grids, integration ledger, and principle ledger were replaced with one sentence plus three short stage captions per page. |
| EN / JA parity | Passed | Both locales use the same structure, destinations, image narrative, and concise meaning. Japanese headings and labels wrap without collisions. |
| Responsive layout | Passed | All four pages have zero page-level horizontal overflow at mobile width. Poster art remains fully visible and stages become one readable column. |
| Navigation and states | Passed | Desktop navigation, reciprocal locale links, both primary CTAs, and the mobile menu open/closed states were exercised in the browser. |
| Accessibility | Passed | One H1 per page, ordered process lists, descriptive image alt text, semantic links/buttons, visible focus styling, adequate tap targets, and no required motion. |

## Issues found and resolved

- **P2 — Poster height followed the HTML image height attribute:** the first capture made the collage 864 px tall and pushed the three-stage story below the intended first-screen hierarchy. Fixed by explicitly controlling desktop image height and restoring intrinsic height below 1080 px.
- **P2 — Latest-news strip competed with the selected visual target:** removed the strip only from Why FDE and Goals while retaining News in shared navigation and on its dedicated page.
- **P2 — Excessive text repeated the same explanation:** removed the process cards, integration-gap ledger, operating-model cards, and product-principle ledger. Their distinct meaning now survives in the short stage captions, metadata, and linked product/license pages.
- **P2 — CTA sat entirely below the desktop viewport:** tightened top rhythm and poster height so the path and next action now begin inside the first viewport without crowding the collage.

## Final pass

- P0 findings: none.
- P1 findings: none.
- P2 findings: none remaining.
- P3 note: the production header and responsive browser chrome make the final frame slightly taller than the concept image; this preserves the live site’s navigation and readable stage labels.
- Browser console: no site-origin warnings or errors during four-page responsive QA.
- Repository validator and all seven P2 policy/fulfillment test suites pass.

final result: passed
