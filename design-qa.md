# W05 bookshelf and independent cover editor revision QA

final result: passed

Scope: the owner's 2026-10-15 book fidelity corrections, opening interaction,
independent CMS cover editing, and explicit text removals. The three new SNS
layouts and five intro sentences remain proposals, not selected implementations.
PR #95 is not merged; this is not a production-release or physical-iPhone pass.
Previous reports are preserved in docs/design-qa-before-w05-r2.md and its archive.

## Source and browser comparison

The exact owner attachment is 46D95568-FB26-4F1D-BC53-D4DB08B11C72/1-Pasted-Image-1.jpg.
It shows a green selected book between real thick ivory spines with date/rule/title.
The screenshot and final JA390 browser render were supplied together in one
comparison input, normalized to equal logical widths. The reference is a mobile
crop; existing common header/hero and previous deliberate duplicate-list removals
remain. They were not copied back from the older screenshot.

Evidence in the companion workspace fde-site-review-evidence/w05-ideation:
- w05-r2-ja-390.png, w05-r2-en-1440.png, w05-r2-zh-1024.png
- w05-r2-reader-ja-390.png, w05-r2-reader-ja-1440.png
- w05-r2-opening-ja-390.png (normal-motion animation frozen at 320ms for inspection)
- w05-r2-cms-cover-ja-390.png (browser-local fake API; no real account or write)

## Findings fixed

- P2 image/layout: flat side covers and hidden spine text replaced by two real
  generated thickness assets (18.8/17.7 KB). Date, divider and title remain live
  CMS content, not baked into imagery. Center width is 47vw on mobile, 280/320px
  on larger screens; no neighboring label is hidden behind the center cover.
- P2 motion: preparing/opening/ready states are separated by two animation frames.
  A 1050ms cover turn now stays visibly closed long enough to read before opening.
  Normal motion was checked with a browser-only test override because the host
  preference is reduce. Production honors reduced motion with a 180ms dissolve;
  the cover is not silently display:none. Escape/close cancel pending timers.
- P2 interaction: pointer taps do not show the rejected red/orange book outline.
  Keyboard Tab/Shift-Tab still gives the selected book a visible 2px forest outline;
  Enter opens, native dialog contains focus, Escape closes and restores the trigger.
- P2 CMS: coverImage is independent of article image and fallback imagery.
  Create/replace/reset controls and a cover-only save use the original authenticated
  GitHub contents API. Blank covers show the title on cloth. Current article image,
  all language text, date, category and commercial conditions remain unchanged.
- P2 text: JA heading is SNS, EN Social, ZH 社交媒体. Rejected creative-account
  description and visible unavailable/error copy are removed, without inventing posts.
  Actual owner-supplied LinkedIn profile URL is used; no LinkedIn photo is added.

## Fidelity and resilience

Existing Inter/Japanese system typography, forest/paper/orange tokens, margins,
header/footer/navigation and body copy are retained. Cover images use object-fit
contain. New ivory skins share the original cloth/paper art direction and actual
alpha; no CSS/SVG substitute illustrations or new design system were added.
At 390/1024/1440, all three locales preserve readable selected titles and complete
article bodies. Narrow non-selected spines abbreviate visually by available area;
the selected title and each button's accessible name retain the full CMS title.
The desktop reader's close button intentionally projects 12px beyond its paper;
spread/page/body have equal client/scroll widths and no horizontal content overflow.
Mobile reader is a readable vertical reflow, desktop remains image-left/body-right.
All controls meet their existing 44/48px targets. Existing duplicated lists stay deleted.

## Verification

- Chrome DevTools MCP: 3 locales x 390/1024/1440, 9 final checks; no document overflow,
  broken images, Console warnings/errors or failed page resources. Twelve forward
  steps return to the initial article; render pool stays at five, not growing.
- Reduced-motion open/ready/close/focus return checked in all nine cases. Normal
  cover turning also inspected at 320ms with test-only animation/timer freezing.
- CMS 390px browser fake API: upload then cover-only save, blank reset, 409 conflict
  recovery/button re-enable, invalid SVG rejection/no-write. Deep comparison proves
  every non-cover field, including JA/EN/ZH article text, is unchanged. Actual PUTs: 0.
- Desktop and mobile Lighthouse navigation: Accessibility, Best Practices, SEO and
  Agentic Browsing each 100; 53 passed/0 failed on each. These are local lab checks,
  not a WCAG certification or physical Safari acceptance.
- One warm local 390px diagnostic, no throttle: LCP158ms, CLS0.00. No field data;
  this is not a statistically established speed claim or a cold cellular measurement.
- 318 Node tests; static News parser6; sitemap lastmod3 passed. Generation is
  idempotent, JS syntax and diff whitespace checks pass. Full repository validation
  is repeated after committing HTML and updating the sitemap as required.
- Historical guards strip only named cover additions. A dedicated regression
  asserts the remainder matches the pre-revision CMS baseline, apart from existing
  automatic asset keys. No auth, original translation pipeline, payment gate or
  article facts were weakened. No new dependency, tracker or external API.

## Remaining selection and external gates

- SNS layout1/2/3 and intro A/B/C/D/E require owner selection. Generation text is
  layout-proposal text only; final heading will be SNS and LinkedIn label Kakeru
  Okumoto, not an unverified Japanese name or the rejected legacy heading.
- Instagram public-avatar permission is not OAuth. Meta app and both account
  authorizations/ingestion remain not connected, with zero shipped fake posts.
- CMS production write, physical iPhone/Safari, cold/field performance and merge
  are not claimed. Existing commerce and native IMS release gates stay unchanged.
