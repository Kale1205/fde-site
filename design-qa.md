# Design QA — Closer Linear composition, current brand palette, 2026-09-13

final result: passed

## Brief and scope

The latest user instruction is to preserve the current colors and bring the other design elements substantially closer to Linear. This revision covers the EN/JA home, Why FDE, Goals and shared marketing presentation. The approved Excel headline, product facts, pre-release disclosures and License/License Plus rights remain in place.

- Reference: [Linear homepage](https://linear.app/), captured from the live page on 2026-09-13.
- Evidence folder: [docs/design-review/linear-20260913](docs/design-review/linear-20260913/).
- Source captures: `source-linear.jpg` (first screen) and `source-sections.jpg` (lower three-column composition).
- Final captures: `home-en.jpg`, `home-ja.jpg`, `why-ja.jpg`, `goal-ja.jpg`, `contact-ja.jpg`, `mobile-ja.jpg`, `mobile-why.jpg`, `mobile-goal.jpg` and `tablet-ja.jpg`.
- Desktop viewport: 1363 × 936 CSS px; browser screenshot output: 1348 × 926 px for both reference and implementation. No density resampling was applied.
- Responsive frames: 390 × 844 and 768 × 844 CSS px, captured at those dimensions. Content widths are 375 and 753 px because of the scrollbar. These are browser responsive checks, not physical-device tests.

## Visual comparison and iteration

The actual reference and built page were inspected together at the same capture size in `comparison-desktop.jpg` (2696 × 926). The comparison covers the aligned navigation, headline scale, restrained body/CTA row and large product panel. `comparison-detail.jpg` compares identical product-region crops at 1298 × 406 each, without resampling. `comparison-principles.jpg` compares Linear's lower section with the three-column Why FDE composition, at 1348 × 926 each; their route, text and content are intentionally different.

| Finding | Repair and inspected evidence |
| --- | --- |
| P2: mobile hero actions inherited a vertical grid and pushed the product too far down. | Explicit flex layout keeps both actions readable on one row. Before/final captures are included in `comparison-responsive.jpg`. |
| P2: tablet navigation controls collected on the left and the hero lead had a narrow column. | Right-aligned header actions and a stacked hero-copy layout below 1000px. The 768px before/final pair is in `comparison-responsive.jpg`. |
| P2: the shared contact heading retained an overly heavy weight; correcting the weight exposed an orphan final character. | Unified heading weight, increased the title measure and balanced wrapping. Final `contact-ja.jpg` shows the complete title on one desktop line. |

No actionable P0/P1/P2 finding remains in the inspected states. Content and brand differences from Linear are part of the brief, not claims of exact visual cloning. The retained development notice makes the hero's vertical rhythm slightly different from the reference.

## Required surfaces

- **Palette:** near-white `#fcfcfc`, ink `#171b1a`, deep-green `#073e2c` actions and the existing green Goal/closing sections. The supplied green logo is retained without inversion. Browser computed colors and final captures confirm the light brand palette.
- **Typography:** locally bundled Inter Variable for Latin characters, existing Japanese fallback, 64px English hero display and responsive Japanese display. Font license is retained in `assets/fonts/Inter-LICENSE.txt`.
- **Layout:** a wider 1280px outer frame, aligned left edges, slim header and much larger product presentation. Four equally weighted purpose guides follow the hero. Why FDE uses three principles with compact illustrative UI; Goals pairs the green manifesto with the rights summary. Responsive columns collapse without document overflow in the checked 390px, 768px and desktop states.
- **Assets and product presentation:** existing logo, icons and sample inventory markup. A workspace rail and item inspector frame the sample table; the illustration has no interactive controls and remains inert. No Linear logo, customer endorsement or product claim is presented as Baked Kale content.
- **Copy and locale:** EN/JA route parity and chosen copy are preserved. Japanese workflow/sample-location labels are localized. The distinction between License and License Plus remains explicit.
- **Motion:** short staggered arrival, restrained hover transitions, and scroll-linked product perspective from 6° to 0° with drift bounded at 18px. Content is visible without JavaScript. Reduced-motion behavior is checked in code/contracts; OS preference emulation was not performed.

## Behavior and validation

- EN and JA hero demo links open their corresponding demo page; locale navigation, Why FDE navigation and the JA plans anchor were exercised.
- JA demo receive changed paper-cup total 346 → 351; searching LR-0041 and Reset were exercised, and Reset restored 346. Closing the demo returned to the JA homepage.
- Mobile menu opens with `aria-expanded=true`; Escape closes it and restores `false`.
- Observed scroll at 518px produced 15.54px drift and 0.82° tilt, within the intended bounds.
- No site-origin errors in the inspected browser logs; browser-extension metadata errors were excluded.
- All 37 executable validation steps from `.github/workflows/pr-checks.yml` passed locally. Results are recorded in `docs/design-review/linear-20260913/validation.json`; these cover repository/locale/SEO consistency, redesign contracts, governance and staging boundaries, contact/commerce tests and Python/JavaScript syntax. The final contact-title CSS adjustment was followed by repository validation and `git diff --check`.
- No real contact submission, payment or production mutation was needed for this presentation QA. The PR remains a reviewable branch change; merging and production publication are separate actions.

---

# Historical QA — initial Linear-inspired revision, 2026-09-12

final result: passed

## Current scope and visual target

User-approved Linear-inspired layout, white/ink/deep-green palette and copy; this is an adaptation, not a pixel-for-pixel clone of Linear's dark site. Homepage, Why FDE, Kale’s Goal and shared EN/JA navigation/styles were revised. Commerce and demo command runtimes are unchanged.

- Source: https://linear.app/; capture `/workspace/scratch/linear-reference-linear-review.jpg`.
- Implementation: `docs/design-review/linear-20260912/` (home-ja, why-ja, goal-ja, intent-en, mobile-ja).
- Combined comparison: `/workspace/scratch/linear-comparison.jpg`, 2696 × 926, source and implementation side by side, each 1348 × 926. Both show desktop first-screen state; palette and content differences are intentional per the approved brief.
- Browser viewport: 1363 × 936; returned desktop captures 1348 × 926. No density resampling in the comparison. Mobile responsive iframe 390 × 844 (375px content width with scrollbar); final screenshot cropped to 390 × 844. This is responsive browser QA, not physical iPhone testing.

## Findings and comparison history

1. Initial mobile capture: [P2] secondary CTA wrapped and preview status text overflowed. Fixed mobile button font/spacing and preview status sizing.
2. Follow-up capture: [P2] balanced Japanese headline split a word. Replaced automatic balancing with a mobile-only break between phrases. `mobile-ja.jpg` is the inspected final result, with legible buttons and unbroken Japanese phrases.
3. Desktop: no remaining actionable P0/P1/P2 issue within the reviewed scope. Individual full-resolution captures were inspected for headline wrapping, product details, guide rows and manifesto copy; the focused mobile capture provides the small-control inspection.

## Required surfaces

- Typography: system sans-serif/JP fallback, restrained display hierarchy, large left-aligned headlines, readable body text. Native JP weight differs intentionally from Linear English typography.
- Layout: bounded 1120px frame, generous whitespace, product illustration beneath the hero; equal-weight guide rows. Mobile columns collapse without horizontal document overflow (375px scrollWidth/clientWidth).
- Colors: near-white/ink with deep-green actions. All four guide backgrounds are identical before interaction. Keyboard focus has an explicit outline. Formal contrast/accessibility certification is outside scope.
- Assets: existing supplied logo and product markup retained. Decorative warehouse images and collage presentation are suppressed/replaced; no fabricated customer imagery or testimonials. Homepage illustration has zero buttons and is inert.
- Copy: selected Excel headline, source-code question, Why FDE, and Kale’s Goal/自社のシステムを、自分たちの手に applied. License Plus rights and pre-release disclosures retained.

## Behavior and validation

- EN and JA hero buttons navigate directly to their respective demo.html.
- JA demo receive: paper cups total changed 346 → 351. Search LR-0041 and Reset exercised.
- Mobile menu opens and closes; locale navigation retained.
- Motion: short reveal, bounded 14px passive/requestAnimationFrame drift; content is not hidden awaiting observation. Reduced-motion behavior checked in code/contract tests, not via OS preference emulation.
- No site-origin errors in inspected browser logs. Browser-extension metadata errors were excluded and are not site errors.
- 35 single-command PR validation/test steps passed locally, including new redesign contracts, repository/locale/SEO checks, staging integrity, commerce gating and contact routing. No real form submission/payment or installer distribution performed.

## Follow-up limits

Physical-device testing and native release QA are outside this presentation PR. Production is unchanged until merge. Full dark-mode parity with Linear is not part of the approved light palette.

---

# Historical QA — superseded visual-story direction

## Scope and source

- Selected reference: option 3, “See the work. Shape the system.” (`exec-286310a0-a87d-4f60-8502-927822353ec8.png`), 1536 × 1024.
- Revised routes: `/why.html`, `/goals.html`, `/ja/why.html`, and `/ja/goals.html`.
- Art direction: warm paper, forest green, burnt orange, editorial serif display type, mono operational labels, and very low copy density. Why FDE uses documentary fieldwork; Kale’s Goals uses an object-led systems collage.
- Browser capture: Chrome at 1363 × 936; responsive QA frames at 390 × 844 (375 px content viewport).

## Combined visual comparison

The reference and final Why FDE implementation were normalized to the same 1536 × 1024 frame and inspected together in one 3072 × 1024 comparison image. The final implementation preserves the target’s primary hierarchy: concise two-line headline, one connected warehouse → collaboration → software collage, three oversized stages, and a compact next-step row.

| Surface | Result | Evidence |
|---|---|---|
| Layout and hierarchy | Passed | Headline, collage, and all three stages are visible together at desktop width; the CTA begins inside the first browser viewport. |
| Typography | Passed | Georgia-based editorial display, mono kicker/indices, and the existing Japanese sans stack remain consistent with the selected direction and shared site system. |
| Color and surfaces | Passed | Paper, forest, orange, ink, and technical rules map directly to existing tokens; no generic card styling, gradients, or decorative CSS art was introduced. |
| Imagery | Passed | Why FDE retains the people-led warehouse fieldwork collage. Kale’s Goals now uses a visually distinct, people-free overhead composition that moves from varied operational fragments to a shared pattern and an organized product system. Both load at full intrinsic width and crop safely. |
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
- **P2 — Why FDE and Kale’s Goals used near-duplicate subjects and composition:** replaced only the Goals asset with `assets/kales-goals-editorial-collage-v2.webp`. The new art removes the warehouse worker, collaborating pair, and monitor; the page now reads as pattern recognition and productization while preserving the shared Art UI language.

## Final pass

- P0 findings: none.
- P1 findings: none.
- P2 findings: none remaining.
- P3 note: the production header and responsive browser chrome make the final frame slightly taller than the concept image; this preserves the live site’s navigation and readable stage labels.
- Browser console: no site-origin warnings or errors during four-page responsive QA.
- Asset separation check: Why FDE and Kale’s Goals resolve to different source files in both locales; the new Goals image loads at 1774 × 887 with zero page-level overflow.
- Repository validator and all seven P2 policy/fulfillment test suites pass.

final result: passed
