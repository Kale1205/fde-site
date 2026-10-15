# W05 selected bookshelf implementation QA

Earlier accepted page evidence is preserved in [the pre-W05 QA archive](docs/design-qa-before-w05.md).

final result: passed

Scope: the approved W05 presentation and interactions, not Instagram API
authorization, production deployment, or physical-device acceptance.

## Visual truth and comparison evidence

- Closed mobile reference: `exec-92d4a0a7-dfa1-430b-b774-5dc0d9de9044.png`
  in `.codex/generated_images/01a09ff4-cb43-7e40-9219-753898992b07/`.
  It is also preserved at the private review Site's `/w05/assets/closed-refined.png`.
- Open desktop reference: `exec-1337fe28-33ea-42d3-b53e-b8fbf66b78e0.png`
  in the same generated-image directory and `/w05/assets/open-refined.png`.
- Browser-rendered screenshots are preserved in the companion workspace directory
  `fde-site-review-evidence/w05-ideation/`: `w05-final-ja-390.png`,
  `w05-final-en-1440.png`, `w05-final-zh-1024.png`,
  `w05-final-ja-reader-1440.png`, and `w05-final-ja-reader-390.png`.
- Local implementation: `/ja/news.html`, `/news.html`, `/zh/news.html` on the
  existing Node development server. Chrome DevTools MCP, not code-only review.
- Closed comparison: 958×1641 source normalized to 390 CSS px wide; the final
  390px implementation is captured at device scale 1. Both were provided together
  in one image-comparison input, then compared again after the mobile book fix.
- Open comparison: 1487×1058 source and 1440×1000 implementation, normalized to
  equal logical page widths. Both show the featured article's opened reader and
  were provided together in one comparison input. This is a generated direction,
  not a pixel-exact browser reference; preserved common header and full CMS body
  deliberately differ from its shorter mock content.
- Focused regions: book edges/spine labels, center artwork/date, title/read CTA,
  app icons/profile links, and reader image/body were inspected separately at
  readable scale in the same captures. No device chrome is fabricated.

## Comparison history and fixes

1. P1: the module was initially served with the wrong MIME type when named mjs.
   Renamed it to the site's supported `.js` format; browser execution and all
   interactions now work. No development-server replacement was needed.
2. P2: inherited CMS Instagram card styling distorted the app icon.
   Added a narrowly scoped override; the genuine app artwork is now 48–56px.
3. P2: the initial 54vw mobile books cropped the neighbor covers and mismatched
   the selected reference's contained shelf. Changed to 42vw and adjusted mobile
   side offsets/spine insets. The final three covers fit inside 390px, without
   obscured spine text. Re-captured and compared against the source together.
4. P2 accessibility: explicit button labels disagreed with decorative date and
   category text. Added one native, localized accessible name via sr-only text;
   decorative duplicate faces are hidden from assistive technology. Lighthouse
   now reports zero failing audits, including label-content-name-mismatch.
5. P2 keyboard: after rotation, focus could remain on the old center book.
   It now follows the selected book; Escape closes the reader and restores focus.

No actionable P0/P1/P2 visual findings remain in the approved UI scope.

## Required fidelity surfaces

- Typography: retains the existing Quiet Form family/fallbacks and forest text;
  responsive titles, date hierarchy, and 16px mobile reader body remain readable.
  Neighbor spine text is a preview; the complete title is always below the shelf
  and in the reader, with no shortened article body.
- Spacing/layout: shared section-frame and common green hero retained. The shelf
  is contained on mobile, centered on desktop; reader uses image left/body right
  on desktop and vertical content on iPhone-sized widths. Close control's desktop
  overhang is intentional, not a horizontal page scrollbar.
- Colors/tokens: existing paper/forest/orange variables, subtle binding texture,
  restrained border/shadow, and orange keyboard focus. No parallel design system.
- Assets: generated individual blank cover/spread surfaces, existing IMS/CMS
  artwork, real Instagram/LinkedIn app artwork, and existing Phosphor-family UI
  icons. WebP image budget is tested. No approximate CSS/handmade SVG book art.
- Copy/content: all three locales retain the exact CMS titles, dates and full
  bodies, including historical-policy clarification. Existing price, conditions,
  navigation, canonical/hreflang, robots and JSON-LD remain unchanged apart from
  cache keys. Removed only the approved duplicate visible article lists.

## Browser and repository evidence

- English, Japanese and Simplified Chinese × 1440, 1024 and 390px: nine final
  checks; no document horizontal overflow, failed resource or Console warning/
  error. All three articles' complete bodies were checked in each size/locale.
- Twelve forward steps return to the starting article, with exactly five book
  nodes. Reverse/normal-motion navigation also tested; manual carousel has no end.
- Enter opens, Escape closes, native dialog traps focus, focus returns to trigger.
  Shared Mobile menu → Chinese News navigation works. Both profile targets have
  44px-high text links and correct canonical URLs.
- Instagram connected rendering tested only with browser-local, explicitly
  labelled TEST FIXTURE captions. Twelve nodes; both source usernames; movement,
  pause and dialog suspension verified. No fixture enters the repository/feed.
- Reduced motion, hidden/offscreen checks and fixed-size recycling prevent
  unnecessary background animation. No SDK, iframe, tracking or third-party API
  request was added.
- Lighthouse snapshots: mobile closed 33 passed / 0 failed; mobile reader 24 / 0;
  desktop closed 33 / 0. Accessibility, Best Practices, SEO and Agentic Browsing
  each scored 100. These are lab snapshots, not complete WCAG certification.
- One diagnostic warm local trace, JA 390px / Fast 4G / 4× CPU: LCP 832ms,
  CLS 0.00. Baseline diagnostic was 1016ms / 0.00. One sample per version is not
  a statistically established improvement; no field/CrUX data was available.
- Node suite: 311 passed; static News parser: 6 passed; sitemap lastmod: 3 passed.
  Generated News/Chinese source checks, syntax checks and diff whitespace checks
  pass. The buildless repository has no separate build/lint package command.

## Intentional differences and remaining gates

- Preserve real article copy and common header/hero instead of mockup wording.
- Instagram remains disconnected: Meta app not created, neither account
  authorized, no captions fetched. Show an honest empty state rather than the
  source mock's placeholder bubbles. Creator `@kale1999_` and Business
  `@bakedkale` are registered separately; each requires its own authorization.
- LinkedIn personal-post integration is excluded. Its icon links to the official
  entry point because no personal profile URL was provided.
- Physical iPhone/Safari, real-account ingestion and field performance remain
  unverified. Browser normal-motion testing used a test-only media-query override
  because the host's system preference is reduce; production honors that setting.
- Main merge and public production deployment are not part of this QA pass.

## Implementation checklist

- [x] Approved books, circular controls and full-body reader implemented.
- [x] Multilingual responsive, keyboard, reduced-motion and empty state verified.
- [x] Existing product/CMS/commerce/SEO boundaries preserved by regression tests.
- [ ] Meta app setup, per-account OAuth and reviewed server-side importer.
- [ ] Owner review and explicit merge authorization for W05.
