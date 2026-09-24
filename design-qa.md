# Design QA — Homepage operating-model comparison, 2026-09-24

## Source and rendered comparison

- Source visual truth: the current production homepage and its plans section, typography, paper texture, forest/orange accents, fine rules, and `section-frame` rhythm.
- Reproducible combined comparison: `docs/design-review/home-comparison-20260924/comparison.html`. It places the production plan surface and the new local comparison surface together, plus Japanese and Simplified Chinese 390 × 844 views.
- Browser checks: English at 1440 × 1000; Japanese at 1024 × 900 and 390 × 844; Simplified Chinese at 390 × 844.

## Findings and iteration history

| Priority | Finding | Fix | Post-fix evidence |
| --- | --- | --- | --- |
| P1 | The homepage did not provide a short, neutral comparison of Excel/spreadsheets, typical cloud inventory SaaS, and FDE IMS License Plus. | Added one static HTML comparison section after the plan cards, with cautious product-dependent language and an explicit development/purchase-status note. | All three locales expose the same six comparison rows in the accessibility tree and source HTML. |
| P2 | A four-column table cannot remain readable at 390px without either tiny type or an alternate interaction. | Kept 13px body type, added a keyboard-focusable horizontal region, and made the row-heading column sticky with an opaque paper background. | At 390px the document has zero overflow; the table region is 350px wide with 760px scroll content and reaches the FDE IMS column at `scrollLeft=410`. |
| P2 | The first sticky-column version covered the beginning of the final FDE IMS column at the right edge. | Rebalanced the mobile table to 16% row headings and 28% data columns. | At the right edge the 122px row-heading column and 213px FDE IMS column both fit inside the 350px region without text overlap. |

## Required fidelity surfaces

- Typography and spacing: reuses the existing serif/sans/mono hierarchy, `section-frame` widths, and section rhythm.
- Color and material: uses existing paper, forest, orange, sage, and rule tokens. The FDE IMS column receives restrained emphasis without a ranking badge.
- Content: the comparison explains differences in ownership, change scope, infrastructure, pricing model, and update/security responsibility without claiming universal superiority.
- Responsive behavior: no page-level horizontal overflow at 1440, 1024, or 390px. The table itself scrolls only at mobile width; text remains 13px.
- Accessibility: native `table`, `caption`, `thead`, `tbody`, `th scope="col"`, and `th scope="row"`; the overflow region is named and keyboard focusable.

No actionable P0, P1, or P2 issue remains in the checked states.

final result: passed

---

# Design QA — License selector responsiveness, 2026-09-23

## Source and rendered comparison

- Source visual truth: `docs/design-review/license-switcher-20260923/source-reported.jpg` (590 × 1280), the supplied iPhone screenshot showing the selector stuck over scrolled content.
- Reproducible combined comparison: `docs/design-review/license-switcher-20260923/comparison.html`, inspected in the Codex in-app browser at 830 × 900. Each side is normalized to a 390 × 844 CSS viewport; the source is scaled from the supplied capture and the implementation iframe renders at deviceScaleFactor 1.
- Additional implementation states: English at 1440 × 1000, Simplified Chinese at 1024 × 900, and Japanese at 390 × 844.

## Findings and iteration history

| Priority | Before | Fix | Post-fix evidence |
| --- | --- | --- | --- |
| P1 | The mobile selector used `position: sticky`, so it obscured later policy content while scrolling. | Removed sticky positioning and backdrop blur; the selector now remains in normal document flow. | At 390px its computed position is `static`; after scrolling to `scrollY=824`, its top is `-468px`, fully outside the viewport. The combined comparison shows the formerly obscured content unobstructed. |
| P1 | The selector was `display:none` above 760px, preventing selection on tablet and desktop. | Made the two-button selector available at every width, with a bounded 620px desktop/tablet width and full-width mobile layout. | Both buttons are visible and clickable at 1024px and 1440px with no horizontal overflow. |
| P2 | Selecting License changed the summary, but the comparison table continued to visually emphasize License Plus. | Added a shared selected-plan state so the corresponding table column, button, product name, price, and responsibility list change together. | License produces $349 / 49,800円 and highlights the License column; License Plus produces $699 / 99,800円 and highlights the Plus column. zh-CN also switches $349 ↔ $699. |

## Required fidelity surfaces

- Typography and copy: existing serif/sans/mono hierarchy and all EN/JA/zh-CN product wording are unchanged.
- Spacing and layout: selector is right-aligned and bounded on desktop/tablet, full-width on mobile, and no longer overlays scrolled content.
- Colors and tokens: existing paper, forest, orange, rule, and tint tokens are reused for active states.
- Images and assets: no product or brand imagery changed; the supplied defect screenshot is retained only as QA evidence.
- Interaction and accessibility: native buttons retain `aria-pressed`; selected name, price, responsibility copy, and table emphasis stay synchronized.

No actionable P0, P1, or P2 issue remains in the checked states. Focused inspection was limited to the selector, comparison matrix, and decision-summary region because no other visual surface changed.

final result: passed

---

# Design QA — Mobile navigation repair and full Simplified Chinese locale, 2026-09-22

## Scope and reference

This pass uses the two supplied iPhone screenshots as the defect reference. The first shows the intended closed state; the second shows the failure state where the backdrop also dims the bottom sheet and menu links only close the sheet. The existing Baked Kale visual system is retained. No new design system, framework, dependency, tracking, or external runtime translation was added.

## Findings and repairs

| Priority | Finding | Repair |
| --- | --- | --- |
| P1 | On iOS-sized browsers the backdrop could be painted above the sheet because the two layers lived in different stacking contexts. | Both layers now mount directly under `body`; backdrop uses z-index 1000 and the sheet 1010. The sheet stays bright and interactive while only the page behind it is dimmed. |
| P1 | Hiding the sheet synchronously in its link click handler could cancel Safari's default navigation. | Link-triggered closing is deferred until after the default navigation begins. Product, Demo, Contact, Goals, News, and locale links now navigate. |
| P2 | The former binary EN/JA link did not scale to a third locale. | Desktop now uses a compact language selector; tablet and mobile place English, 日本語, and 简体中文 together in the navigation sheet. |
| P2 | Simplified Chinese existed only on the License page. | Added generated, indexed zh-CN pages for all 10 public sitemap routes plus the purchase-preview route, with localized navigation, product interactions, contact labels, demo behavior, CMS labels, metadata, canonical URLs, and hreflang. |

No actionable P0, P1, or P2 issue remains in the checked states.

## Browser and behavior verification

- Codex in-app browser at 390 × 844, 1024 × 900, and 1440 × 1000. Page-level horizontal overflow was zero at every checked width.
- At 390px, the bottom sheet was compared directly with the supplied defect screenshot. It remains undimmed above the backdrop; Product/Demo/Contact shortcuts, Goals/News rows, and the three-language selector are visible without overlap.
- At 1024px, the right drawer, backdrop, all shortcuts, secondary rows, and the three-language selector fit without clipping or document overflow.
- At 1440px, the inline navigation and compact language popover were exercised. English → 日本語 navigation succeeded.
- Mobile Simplified Chinese navigation to News and Goals succeeded. Backdrop click and Escape both closed the sheet; Escape returned the closed state. Desktop and mobile locale selection navigated to the matching locale route.
- Simplified Chinese home, Goals, and News were visually inspected. Chinese headings and body copy wrap without collisions; the existing night-lab hero, product UI, brand colors, pricing, and product facts remain intact.
- Browser console reported no warnings or errors during the final local pass.

## Boundaries

The Simplified Chinese locale is generated from a versioned static translation catalog; no browser-time translation service or data transmission is used. Figma was not used because this was a screenshot-defined defect repair and an extension of the existing approved components rather than a new visual direction. Physical-device testing is outside this pass; the reported iPhone result is a real browser responsive viewport test at 390px.

final result: passed

---

# Design QA — Editorial Inspector license and navigation, 2026-09-22

## Scope and selected source

This pass implements the user-selected second comparison design: an editorial, technical plan-inspector page at desktop and tablet widths, with the selected compact iPhone bottom sheet. The selected source visual is preserved at `docs/design-review/editorial-inspector-20260922/source-selected.png`; final browser captures are stored beside it.

- Desktop: `ja-desktop.png`, `en-desktop.png` at 1440 × 1024.
- Tablet: `ja-tablet-closed.png`, `ja-tablet-menu.png` at 1024 × 900.
- Mobile: `ja-mobile-closed.png`, `ja-mobile-menu.png`, `en-mobile-closed.png`, `zh-mobile-closed.png` at 390 × 844.
- The source, final desktop, and final mobile-menu captures were inspected together at original detail. Layout, spacing, hierarchy, colors, table treatment, and responsive menu behavior were compared directly.

## Findings and repairs

| Priority | Finding | Repair |
| --- | --- | --- |
| P2 | Binary plan differences were slower to scan as prose. | Source delivery and internal modification now use visible `✓` and `—`, with screen-reader-only descriptions retaining their full meaning. |
| P2 | A full mobile navigation panel obscured too much of the product page. | iPhone navigation is now a compact lower sheet with a handle, close control, three shortcuts, and three secondary rows; tablet retains a right-side drawer. |
| P2 | License conditions were visually repetitive and hard to compare. | Desktop and tablet use one wide comparison matrix plus a persistent decision summary; mobile uses a sticky plan selector and native disclosure sections. |
| P2 | Initial mobile Lighthouse found 4.21:1 contrast on small decision labels. | Darkened those labels and the candidate-price note. The repeated audit reports Accessibility 100 with zero failures. |

No actionable P0, P1, or P2 issue remains in the checked states.

## Browser and behavior verification

- Chrome DevTools MCP: Japanese and English license pages at 1440 × 1024, 1024 × 900, and 390 × 844; Simplified Chinese at 1440 × 1024 and 390 × 844. Page-level horizontal overflow was zero at each width.
- Plan selector: License Plus defaults correctly; choosing License updates price and all three responsibility statements in Japanese, English, and Simplified Chinese.
- Navigation: desktop inline links, tablet right drawer, mobile bottom sheet, backdrop/close actions, focus trap, and Escape focus return were exercised. The shared menu was also opened on the Japanese homepage.
- Disclosures: the initial Deliverables section and an additional Internal use section were opened and read in the accessibility tree.
- Console and network: no warnings/errors; all eight page resources returned HTTP 200 on the final Japanese tablet load.
- Lighthouse: English mobile and desktop, plus Simplified Chinese mobile, each returned Accessibility 100, Best Practices 100, SEO 100, and Agentic Browsing 100.
- Local performance trace, Japanese tablet: CLS 0.00 and LCP 109 ms in an unthrottled loopback environment. These are local lab observations, not production field data.

## Implementation boundaries

The existing brand palette, logo, copy, prices, development notice, legal-entity scope, and commerce-disabled state remain intact. No dependency, tracking, analytics, framework, purchase path, or external transmission was added. Figma MCP was not used because there was no linked Figma source for this selected variant; the user-approved generated visual was the implementation source. The site remains a static project with `dev` and `validate` scripts and no separate build or lint command.

---

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

---

# 2026-09-15 — Source-code-led homepage implementation

Scope: English and Japanese homepages. Existing tracked files were clean at the start; pre-existing untracked output/ screenshots were preserved. Existing Why FDE / Goals QA above is retained.

## Visual target and approved changes

Source visual: /Users/junenature/.codex/generated_images/01a09ff4-cb43-7e40-9219-753898992b07/exec-2b2556d3-e686-42ca-bf37-91e49ae3db81.png (836 × 1881).
The user's subsequent approved copy changes are authoritative: encourage building an internal system from source, replace the generic migration challenge with Read / Adapt / Refine, merge pricing and comparison, fold maintenance into plan details, and prioritize License Plus.
Figma MCP get_metadata inspected the previously captured 1440 × 5989 existing homepage in file kYfXENf0rnnxRkMW5F01XF, node 1:2. This was structural context, not a new Figma design or a token export. Implementation reuses gallery-ui.css tokens, the supplied brand logo, the existing inventory preview, and the selected visual.

## Evidence

Baseline: output/chrome-devtools/baseline/source-led-before-{1440,1024,390}.png.
Final screenshots: output/source-led-qa/en-1440.png (1440 × 3826), en-1024.png (1024 × 4569), en-390.png; ja-1440.png (1440 × 3777), ja-1024.png (1024 × 4506), ja-390.png (390 × 6854).
Final capture viewports: 1440 × 1024, 1024 × 900, 390 × 844, using Chrome DevTools MCP emulation with deviceScaleFactor 1. All widths were verified from innerWidth. Baseline desktop captures were 2× density; final captures are 1×.
State: public homepage, sample inventory, plan details closed, first FAQ open. Mobile plan-details-open state was also exercised.
Full-view comparison: source and rendered EN homepage were opened together in the same multi-image comparison input, with Japanese mobile and tablet evidence. Source/render proportions were compared relative to page width; the approved content consolidation intentionally changes page height and section count. This is not a claim of pixel-identical reproduction.
Focused evidence: output/source-led-qa/pricing-focus.png at 1440 × 1024, plus the post-fix 1024 × 900 hero viewport inspected in Chrome. Prices share y=461.58 and plan buttons y=610.22 in the focused pricing capture.

## Findings and fixes

- P1, tablet hero: an inherited translateX(-50%) moved the inventory preview over the editorial panel despite zero page overflow. Explicitly reset preview transform and hero-visual margin. Final 1024px inspection shows no overlap and a 24px gap; ja-1024.png and en-1024.png were recaptured.
- P2, mobile prices: inherited grid/flex alignment split the Japanese currency label and shortened CTA widths. Restored a column flex layout with stretched children and nowrap price text. Final mobile capture keeps 49,800円 and 99,800円 on one line.
- P2, desktop pricing alignment: different description lengths offset prices/buttons. Equal minimum text-block heights now align both plans without forcing mobile card heights.
- P2, Japanese headline wrapping: shortened line groups and adjusted the display scale to prevent orphaned characters.
- P2, keyboard menu: Escape hid a focused menu item without returning focus. Focus now returns to the menu button; verified with actual Escape input.
- P2, accessible inventory names: redundant aria-label strings did not match visible cell text. Removed those labels and allow live cell content to supply the accessible name. Final EN Lighthouse audits report zero failed audits.
- P2, reading order: moved plan disclosures after price/CTA in the HTML so keyboard and visual order agree.
- P2, metadata consistency: updated FAQ JSON-LD and visible text together after removing the separate comparison table. Updated the repository's old copy assertions to the approved source-code message while retaining all price, entitlement, release-state, and license-condition checks.

## Required fidelity surfaces

- Typography: existing Georgia display, system sans / Japanese stack, and mono labels retained; large editorial hierarchy and comfortable 14–15px body copy. Japanese headings use their existing sans family. Plan prices and CTA baselines align.
- Layout: dark asymmetric hero, a full-width workflow strip, research-note layout, facing pricing pages, compact related links, FAQ, and source-led final CTA. No overlapping primary regions at 1440/1024/390.
- Colors: existing forest, paper, ink, and burnt orange tokens reused; lighter orange is restricted to high-contrast dark-surface actions/headline accents.
- Images: custom night lab and blank binder generated with built-in ImageGen and saved as local WebP assets (about 102KB + 64KB). Existing logo and paper texture reused. Readable website text and the working inventory interface remain HTML.
- Copy: English/Japanese parity, source access as the main proposition, two existing plans, existing currency/prices and commercial restrictions. No new migration or development-service promise.

## Verification

- npm run validate: passed.
- python3 scripts/validate_pre_staging.py: passed.
- node --check for gallery-ui.js, cms-content.js, cms-content-ja.js and demo-v1.js: passed.
- node scripts/test_production_commerce_gate.mjs: passed.
- node scripts/test_contact_email_routing.mjs: passed.
- git diff --check: passed.
- This is an existing static HTML site. package.json has dev and validate scripts; it has no separate build or lint script.
- Chrome: 1440, 1024 and 390px, EN and JA; page-level overflow zero. Images loaded successfully; inspected homepage requests returned HTTP 200; no console warnings/errors.
- Primary homepage inventory row selection, Receive (+1), Ship (-1), License Plus anchors, plan disclosures and local navigation destinations: passed.
- Mobile menu open/close, Escape focus restoration, visible focus styles, native details keyboard affordances: checked.
- Separate Japanese Web Demo: search/filter path, Receive success, insufficient-stock error, Reset and restored sample history: checked; no console errors.
- Contact form: all six required field definitions present; empty form is invalid; no message submitted.
- Lighthouse EN desktop and mobile: Accessibility 100, Best Practices 100, SEO 100, zero failed audits after repairs. JA mobile first pass: same category scores; inherited accessible-name issue subsequently fixed in both locales.
- Chrome performance trace on local JA at 1024px: CLS 0.00, LCP 81ms, unthrottled local environment. These are local observations, not production field performance.

## Constraints / follow-up polish

- No deployment, merge, external announcement, purchase, or form submission was performed.
- Dedicated guide, license, demo and contact pages remain the existing product surfaces; top-page layout changes are scoped to source-home. Their navigation and shared styling remain available.
- Newly generated assets are decorative compositions, not photographs of the company's actual facilities.
- Figma was inspected for existing structure; the accepted image and approved copy, not a newly authored Figma file, define this implementation.
- P3: open plan disclosures lengthen the archival binder background; it remains decorative and all terms stay readable.
- Production cache versioning remains managed by the repository's existing build-version / deployment workflow.

final result: passed

---

# 2026-09-15 — English headline, product layering, and editorial pages

Scope: the requested English headline change, shared homepage product presentation, and EN/JA Why FDE, Goals, News and Contact. This entry supersedes the previous entry's statement that Contact and the company pages remain unchanged. Existing homepage work, assets and untracked evidence were preserved; there was no reset, dependency change, new framework or deployment.

## Reference and design decisions

- Current code and the user's latest selected direction were authoritative. Product Design's image-to-code and design-QA workflow informed the rendered comparison and corrections without restarting concept generation.
- Linear's live site was inspected as a reference for restrained product layering and edge fades, not copied. No Linear code, text, logo, image or proprietary asset was imported.
- Figma MCP get_metadata read the existing homepage structure in file kYfXENf0rnnxRkMW5F01XF, node 1:2 (1440 × 5989). This was structural context only: no new Figma design, token export or Figma mutation.
- English H1 is now “Your company’s system. / Yours to build on.” Japanese retains the approved “自社で使うシステムを、 / 自社で育てていく。” The duplicate English proposition was removed.
- The existing inventory table supplies one decorative overlapping fragment with a fading edge. It is inert, aria-hidden, ID-free and excluded from operational row selection. Focus within the real preview disables its edge mask so controls remain clear.
- Why FDE uses an image beside unboxed, vertically ordered stages. Goals uses an asymmetric editorial layout. News prioritizes dates and titles in rows, with smaller images and a compact social link. Contact puts the form first and retains all existing searchable FAQ content in a native disclosure.
- Existing Gallery tokens, brand colors, fonts and illustrations were reused. No new imagery, tracking, fingerprinting or outbound integration was added. Existing prices, plan conditions and release restrictions were retained.

## Evidence and comparison

- Before: output/refinement-qa/before/{why,goals,news,contact}-{1440,1024,390}.png, English, 12 captures. Homepage comparison also uses the preceding output/source-led-qa/ evidence.
- After: output/refinement-qa/after/{en,ja}-{index,why,goals,news,contact}-{1440,1024,390}.jpg, 30 route/viewport captures.
- Capture viewport sizes: Desktop 1440 × 1024, Tablet 1024 × 1024, Mobile 390 × 844; device pixel ratio 1. Before images are PNG; final matrix images are JPEG at quality 85. Full-page heights vary with content.
- Focused final evidence: after/en-index-final-390.jpg, after/contact-review-final-390.jpg and after/ja-news-dialog-390.jpg. The focused English hero capture follows the final mobile font adjustment and supersedes the earlier matrix image for that headline. JA Contact, Why and Goals mobile full-page captures were refreshed after their last relevant corrections.
- Before/after Why, Goals and News were opened in paired visual comparisons. Final mobile screenshots, the contact review state and article dialog were inspected directly. Typography, hierarchy, spacing, alignment, color, image crop and content preservation were compared; the requested reflow deliberately changes section proportions and page heights.
- Raw viewport checks and per-route console/network evidence: output/refinement-qa/results.json.

## Findings corrected during the browser loop

- P2: inherited stage borders produced a stray right rule and doubled mobile separators. Removed the conflicting borders in the scoped refinement.
- P2: the English mobile hero left an isolated “system.” Adjusted only its responsive headline scale; the final 390px capture fits each intended phrase on one line.
- P2: Japanese Contact's headline had an awkward short final line and the business-information heading competed with the form. Added balanced wrapping and reduced that secondary heading.
- P2: the review state inherited an oversized serif heading and crowded labels/values. Introduced a restrained heading and readable two-column summary with safe long-value wrapping.
- P2: review/back hid the previously focused control. Focus now moves to the review heading, and back to the first input after Edit. Actual Tab/Enter operation and retained values were verified.
- P2: the transformed offscreen skip link appeared in mobile full-page capture stitching. Added a standard visually-hidden non-focus state; focused link is visible at top 8px, with a solid outline and a 120 × 48.8px box.
- P3: removed a redundant News list separator. No unresolved actionable P0/P1/P2 visual finding remained in the inspected scope.

## Browser and functional verification

- Chrome DevTools MCP: EN and JA Home, Why, Goals, News and Contact at all three widths, 30 combinations. No horizontal page overflow, missing images or duplicate IDs in the recorded checks. Per-route console warning/error lists were empty, and captured network logs contained no failed/error responses. All ten local page URLs returned HTTP 200 in a final same-origin GET check.
- Homepage: select row, Receive 18 → 19, Ship 19 → 18; real preview retains five rows; duplicate fragment is inert. Source-plan CTA anchor, mobile menu and Escape focus restoration passed. Actual desktop CTA hover changes its background; focused preview has no edge mask.
- News: article opened, close control received focus, mobile dialog remained in bounds; Escape closed it and restored focus to its trigger.
- Contact: six required fields and invalid empty state checked. Synthetic values were filled, Review opened with six retained values and no overflow, and Edit restored the form without losing values. The final English keyboard path was review-heading focus → Tab to Edit → Enter → focus on name input. No Send action was taken and no inquiry email was submitted.
- FAQ: disclosure, query filtering, matching results and no-results state checked on Japanese mobile. Search “LicensePlus” returned 22 entries; a synthetic no-match query returned zero with the empty state visible.
- Lighthouse navigation audits: JA Home desktop, EN News mobile and EN Contact mobile each scored Accessibility 100 and Best Practices 100 (also SEO 100), with zero failed audits. These are representative routes, not an assertion that every page received a Lighthouse audit. JSON evidence is in output/refinement-qa/lighthouse-{home-desktop,news-mobile,contact-mobile}.json.
- Local JA homepage performance trace, 1440px, CPU 1× and no network throttling: LCP 111ms, CLS 0.00. No CrUX field data was available; these are local measurements, not production performance certification.

## Final code checks

- npm run validate: passed.
- python3 scripts/validate_pre_staging.py: passed.
- node scripts/test_production_commerce_gate.mjs: passed.
- node scripts/test_contact_email_routing.mjs: passed.
- node --check gallery-ui.js and contact-direct.js: passed.
- git diff --check: passed.
- The repository is static HTML/CSS/JS and defines no separate build or lint command; repository validation and JavaScript syntax checks were used instead.

## Files and remaining boundaries

Changed this turn: index.html; why.html and ja/why.html; goals.html and ja/goals.html; news.html and ja/news.html; contact.html and ja/contact.html; gallery-ui.css; gallery-pages.css; gallery-ui.js; contact-direct.js; scripts/validate_repo.py; this QA log. Existing ja/index.html changes and the two generated WebP assets predate this turn and were preserved.

No deployment, merge, GitHub/Slack update, purchase or inquiry submission was performed. Real-device Safari/iOS/Android testing and production-origin checks are not covered by these local Chrome results. Source cache versioning remains with the existing release workflow. License, guide and dedicated demo layouts were not redesigned in this turn.

final result: passed

---

# 2026-09-15 — Unified Our Goals and genuine IMS operation media

## Scope and source of truth

The user requested one bilingual Our Goals page combining Why FDE and Goals, in three chapters: what FDE means; Baked Kale's source-code-included systems as a lower-barrier starting point; remaining the customer's software people and partner. The user also requested a real source excerpt and real IMS v1.0 operations, not an invented interface or the website's Web Demo.

Existing uncommitted site work and assets were preserved. The existing selected Gallery design and current page screenshots were the visual baseline, with the requested content/structure changes taking precedence. Product Design's source comparison and QA loop were used; no new framework, design-system fork or dependency was introduced. Linear's live site informed the use of a clipped code surface, without copying its code or assets. Figma MCP read existing homepage metadata (kYfXENf0rnnxRkMW5F01XF / 1:2) only; the old Figma capture was not implemented or edited.

## Implementation and copy

- One goals.html / ja/goals.html pair with #fde, #approach and #partnership sections, a local chapter index, actual code excerpt and real native-app capture sequence.
- Japanese core headlines: “現場を知り、使える仕組みに変える”; “動くシステムと、その中身を届ける”; “あなたのシステム屋であり、パートナーであり続ける”.
- English equivalents: “Understand the work. Build what helps.”; “A working system. And the code behind it.”; “Your software people. Your partner, for the long run.”
- The copy describes a goal, not a currently contracted support entitlement. Development status, undefined assistance/maintenance scope and purchaser-managed License Plus updates/security remain explicit.
- Why FDE is removed from public header/footer navigation and homepage related links. Both old why.html URLs remain as noindex, canonicalized redirects to the matching goals.html#fde, with a normal fallback link. Sitemap now lists only the unified destination.
- The existing forest/ivory/orange palette, logo, Georgia English display type and Japanese sans hierarchy are retained. Narrow rules and spacing organize the story; no extra illustrations or decorative cards were introduced.

## Genuine code and capture provenance

- Source excerpt: fde-ims crates/ims-domain/src/lib.rs lines 140–148, stock_state; exact logic with signature line breaks adjusted, identical in both locales.
- IMS source commit: a195e39ce3609f05a52247dade3626747cb3b367. The source working tree was clean before and after this work.
- Built the actual unoptimized React/Tauri development-shell, changing only the runtime bundle identifier/name via command-line configuration to com.bakedkale.fdeims.sitecapture / FDE IMS Site Capture. No IMS source file was edited.
- The separate identifier uses a fresh app-local SQLite database, populated with the application's own 12-product synthetic dataset. The existing IMS application data was not used or modified.
- Actual English UI operation: DEMO-003 Paper Cups, stock 3 → receive 17 → stock 20; healthy state and movement +17 verified.
- Actual Japanese UI operation: DEMO-011 Ballpoint Pen, stock 2 → receive 18 → stock 20; healthy state and movement +18 verified.
- Each localized MP4 is four unchanged native-app window captures held for three seconds each: 12 seconds, 900 × 700, 15 fps, silent H.264. This is an actual-operation capture sequence, NOT continuous cursor footage. No interface was generated, drawn, mocked or composited. Page captions disclose the sequence and development status.
- Videos are approximately 596KB EN / 602KB JA; posters approximately 93KB / 87KB. Native playback controls and text transcripts remain available. Playback begins when visible unless reduced motion is requested; it pauses offscreen.
- Full capture/build/hash evidence: output/ims-capture/provenance.md and raw captures/encoder script in that directory. This development-shell recording is not release approval or proof of production Local/LAN authentication.

## Visual comparison and fixes

Source captures: output/refinement-qa/after/en-goals-1440.jpg (1440 × 1048), prior JA mobile Goals and output/goals-merged-before-390.jpg. Final matrix: output/goals-merged-qa/{en,ja}-goals-{1440,1024,390}.jpg. Final desktop EN is 1440 × 3825; JA mobile is 390 × 3712. Viewports are 1440 × 1024, 1024 × 1024 and 390 × 844; all DPR 1, JPEG quality 85. Content is substantially longer by request, so page height is intentionally different.

The source and revised desktop captures were opened in the same comparison input. Full desktop and mobile layouts, source typography, colors, spacing, image/media quality and copy hierarchy were inspected. Focused native-operation and mobile video frames were inspected at readable scale rather than judged only from a downscaled full-page screenshot.

- P2: default figure margins made the mobile code block unnecessarily narrow. Reset horizontal figure margins and retained a controlled right-edge fade.
- P2: inherited eyebrow color made the code block label weak against forest. Added a high-contrast light label.
- P2: the first implementation inherited bold sans display headings in English, drifting from the selected site language. Restored the existing Georgia display family and regular weight.
- P2: after that font correction, the English mobile headline left isolated “do.” and “own.” lines. Reduced only the English mobile hero to 32px. Focused post-fix capture output/goals-merged-qa/en-hero-final-390.jpg supersedes the earlier full-page mobile image for this headline and shows the intended two lines.
- P2: the old simple preview server served MP4 as octet-stream without byte ranges, so Chrome exposed seekable [0,0] despite buffered [0,12]. Added MP4 MIME, HEAD and bounded single-range responses to scripts/dev-server.mjs. Started the updated preview at loopback port 4183 without terminating the existing 4173 process. Playback now exposes seekable [0,12], and seeking to 7 seconds succeeds.
- P3: the actual native UI is dense when scaled to mobile. The video keeps native fullscreen controls and an adjacent text transcript; no fake enlarged UI replaces it.

## Validation

- EN and JA Our Goals: Desktop 1440, Tablet 1024, Mobile 390. All six checks report no page overflow, missing images or duplicate IDs. Per-route console warnings/errors were empty. Evidence: output/goals-merged-qa/results.json.
- Real video playback: decoded 900 × 700, duration 12s, readyState 4; pause and seek succeeded. Focused Japanese playback: output/goals-merged-qa/ja-video-playing-390.jpg.
- Updated preview server: HEAD 200 / video/mp4 / correct length; bytes 0–31 returns 206 with 32 bytes; suffix request returns 206 with 16 bytes; out-of-range request returns expected 416. The intentionally invalid-range test produced an expected Console 416 entry; a subsequent clean navigation had no errors.
- Reduced-motion branch checked with a controlled matchMedia preference fixture: video remained paused after scrolling into view. This did not change the user's OS or browser preferences.
- Old EN and JA Why URLs resolve to the correct localized Goals #fde; target top 28px. Chapter anchor navigation passed. Mobile menu Escape closes it and restores button focus.
- Contact CTA: focused with visible solid outline, activated with actual Enter input, reached the existing contact page/form. No inquiry was submitted.
- Lighthouse: EN mobile and JA desktop each Accessibility 100 / Best Practices 100 / SEO 100, zero failed audits. Saved reports: output/goals-merged-qa/lighthouse-en-mobile.json and lighthouse-ja-desktop.json.
- npm run validate, node scripts/test_goals_content.mjs, python3 scripts/validate_pre_staging.py, production-commerce gate test, contact-email-routing test, JS syntax checks and git diff --check: passed.
- The existing static site has no separate build/lint script. IMS capture build and built-asset compatibility check also passed; this does not certify a released binary or OS support.

## Files and boundaries

Core files: goals.html, ja/goals.html, why.html, ja/why.html, gallery-pages.css, gallery-ui.css, gallery-ui.js, sitemap.xml, scripts/validate_repo.py, scripts/test_goals_content.mjs, scripts/dev-server.mjs, four assets/ims-v1-operation-* files and this report. Public HTML header/footer links were updated mechanically across both locales; other page functions/content were preserved.

No deployment, merge, external announcement, analytics, tracking, inquiry submission or release authorization was performed. The new preview is http://127.0.0.1:4183/ja/goals.html (EN /goals.html); the older preview server remains untouched. Production-origin and physical Safari/iOS/Android checks are outside this local Chrome verification.

Browser cleanup: the task-owned Chrome DevTools pages 9, 10 and 12 were closed; no pre-existing normal user Chrome session was targeted. Closing the remaining task-owned page 11 was attempted, but Chrome DevTools MCP refuses to close its last page. This remaining page and the tool limitation are reported in the handoff.

final result: passed
