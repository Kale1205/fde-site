# W05 Chronicle Rail and continuous motion QA

final result: passed

Scope: original W05 option 3, Chronicle Rail, for Updates only.
SNS option 1 and intro D unchanged. PR #95 remains unmerged.
Previous report: docs/design-qa-before-w05-r4.md.

## Visual truth and comparison

Source: /Users/junenature/Desktop/Share/Codex/fde-w01-cta-mobile-review/dist/w05/assets/design-3.png
725x2048 raster, approximately390x1102 logical px at1.86x.
Implementation: fde-site-review-evidence/w05-ideation/w05-r4-ja-390.png
780px-wide full-page raster,390x844 CSS viewport, deviceScaleFactor2.
Both opened together in the SAME comparison input, normalized to390px logical
width. Rest state: featured August19 story; no browser chrome or device bezel.
Full hierarchy plus focused date rail, panel depth, art, headline/date/CTA were
readable in that input. Original W05 option3 is not SNS option3.

Intentional differences: keep approved real fonts/article text/navigation arrows;
do not restore the concept's duplicate archive rows or old bubble SNS (rejected
in later user decisions). Genuine supplied kale mark replaces the concept's
illustrative circuit leaf, not fabricated brand artwork.

## Findings and iterations

- P1 baseline centered hardbound bookshelf did not match option3. Replaced skins,
  spines and hinge with three flat planes stacked front-left to back-right, fixed
  left date rail, orange active marker and left-aligned selected copy.
- P2 first comparison: art too small due to transparent image padding plus8% inset.
  Removed redundant inset. Final rest screenshot has readable update/customize
  imagery and the selected source's proportions.
- P2 motion310ms: outgoing plane crossed date rail. Clipped chronicle-panels
  separately from rail. Post-fix evidence: w05-r4-selection-ja-390.png.
- P2 keyboard: outgoing focused panel briefly became aria-hidden. Blur before
  hiding, then immediately focus new center. Six-step cycle now has no Console
  warning, correct focus and five nodes; new regression test.
- P2 variable title height moved date/Read. Reserved two lines (three below360px).
  Post-fix normal six-step diagnostic CLS0, overflow0, SNS position unchanged.
- Post-fix same-input source comparison has no actionable P0/P1/P2 differences.

## Five fidelity surfaces

Typography: existing Inter/system Japanese/Chinese families;24px mobile headline,
responsive desktop, body15/16px, established weights/line heights. No truncated
CMS titles or text. Existing forest typography is retained rather than adopting
the raster concept's black oversized type verbatim.
Layout: left rail,18:25 planes, rear-right perspective, narrow responsive widths,
existing section-frame gutters. Title/date/Read left aligned and translation space
reserved. Desktop reflows naturally; no image-only screenshot of the page.
Tokens: canonical forest/paper/surface/line/muted/orange. Modest radius/shadow,
no leather, glow, new gradient or parallel design system.
Images: existing alpha update/customize WebPs, supplied baked-kale-mark.svg,
original CMS image inside reader and authorized genuine Instagram photos/icons.
No handmade substitute artwork, external image tracker or new dependency.
Content: article bodies/dates, commercial terms, hero, header/footer and SEO
unchanged. SNS HTML/main CSS byte-identical to approved6c27def. CMS independent
cover/explicit blank/title-only semantics and security guards remain intact.

## Browser evidence and interaction checks

Chrome DevTools MCP JA/EN/ZH x390x844@2,1024x1000@1,1440x1000@1:
all nine have document overflow0, five pooled nodes/three visible planes, broken
images0; date rows fixed during selection. Short and60-paragraph stress content
have identical outer reader width/height; inner scroll reaches end, dialog
scrollTop0 and close visible.320x568 and844x390 landscape retain these properties.

Evidence in fde-site-review-evidence/w05-ideation:
- w05-r4-ja-390.png: final full mobile comparison.
- w05-r4-en-1440.png: final desktop composition.
- w05-r4-selection-ja-390.png: normal selection paused at310ms.
- w05-r4-opening-ja-390.png: normal expansion paused at600ms.

Native reduced motion tested throughout viewport matrix. Normal motion tested
with browser-only media/CSS override, never shipped.680ms bounded selection and
marker movement connect to1120ms plane-to-reader expansion, close reverses.
Hidden recycling only; pure tests exercise mixed +/-1 and +/-2 for1/2/3/7/24
articles. Real DevTools drag selects without opening. ArrowRight/Enter open,
Tab focuses inner reader, PageDown scrolls363.5px on long published article,
Escape restores focus. Early close clears lifted state. Browser wheel event
checks horizontal navigation; physical trackpad feel not claimed. Vertical page
scroll not intercepted. No idle animation loop or growing DOM.

Normal six-step diagnostic CLS0/overflow0; no Console warning/error after fix.
Representative News24/24 requests HTTP200.
JA Mobile and EN Desktop Lighthouse navigation each Accessibility100,
Best Practices100,SEO100,Agentic Browsing100;55 passed/0 failed.
327 Node tests, static News parser6 and sitemap regression3 pass. Generation
idempotent; syntax/diff checks pass. Fresh exact-head CI is reported in PR/Space
only after execution, not inferred from this local report.

## Remaining gates and checklist

- [x] Source and render compared together after fixes.
- [x] Option3, supplied artwork, continuous selection/marker/expansion.
- [x] Three locales, mobile/tablet/desktop, keyboard/reduced motion.
- [x] Long-reader containment, CMS semantics, SNS/SEO preserved.
- [ ] Owner final UI review and separate merge approval.

Physical iPhone/Safari, field metrics and real CMS save are unverified.
Instagram Meta app/OAuth/ingestion disconnected, no fabricated posts.
No LinkedIn API, purchase/payment/native IMS gate changes.
