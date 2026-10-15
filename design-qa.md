# W05 selected social directory and continuous book motion QA

final result: passed

Scope: selected SNS option 1, approved intro D, viewport-bounded article reading,
and the follow-up request for tactile, continuous book selection/opening motion.
PR #95 remains unmerged. This is local browser evidence, not physical Safari or
production acceptance. Previous report: docs/design-qa-before-w05-r3.md.

## Visual truth and comparison

Source: /Users/junenature/.codex/generated_images/01a09ff4-cb43-7e40-9219-753898992b07/exec-9231170f-0d3c-4152-9872-ae233385e3d1.png
(949 x 1657 raster, intended 390 x 680 logical component; ~2.43x).
Implementation: fde-site-review-evidence/w05-ideation/w05-r3-sns-ja-390.png
(780 x 1688 raster, 390 x 844 CSS viewport, deviceScaleFactor 2).
Both images were supplied together in the same comparison input. Compare the SNS
component, not browser chrome or the surrounding book/footer. Density was accounted
for as 390px logical width. Source has no intro; approved D is an intentional addition.
Existing site heading/body typography and Phosphor arrow assets are retained rather
than adopting the mock's oversized heading or its unverified Japanese name.

Focused comparison: genuine app icons at left; two actual Instagram avatar/handle
links stacked at right with one thin rule; a full divider and LinkedIn row below.
LinkedIn has no photograph, placeholder or initials. Display name Kakeru Okumoto.
All source imagery is present as local genuine assets, not handcrafted replacements.
No individual social cards, invented posts, duplicate excerpts or archive list.

## Findings and iteration history

- P1 reader containment: baseline mobile spread was 1163px tall inside a 764px dialog;
  article content determined page height. Added a definite responsive book height,
  min-height:0 tracks, and a named, keyboard-focusable inner reader-copy scroller.
  Short and 60-paragraph stress bodies now have exactly equal outer book bounds.
  Heading is inside that scroller too, so long titles cannot push body off the page.
- P2 motion discontinuity: modal opening previously began at its destination instead
  of the selected cover. Source-to-reader cover bounds now connect lift, enlargement,
  a perspective hinge turn and paper/text arrival in a 1120ms timeline. Close reverses
  the cover to its shelf; native Escape restores the original focus.
- P2 mid-animation blank: the first global easing turned the cover away before ink
  appeared. Segment easing on a linear master timeline fixes it; re-inspected at
  580ms with browser-only freezing. Mobile background belongs to the animated spread.
- P2 input feel: 680ms composite transform settle; dragging resumes from actual live
  transforms and takes flick velocity into account. Neighbor tap selects, center tap
  opens. Bounded pending intent avoids a long queue. Horizontal wheel/Shift-wheel work;
  ordinary vertical scrolling is not intercepted.
- P2 small-height close: 844x390 initially put close above the viewport.
  Viewport-aware offset now keeps its top at >=8px.
- Polish: short title fade/slide, reserved translated-headline space, forest keyboard
  focus (inset on scroller), no rejected red/orange pointer-tap outline.

## Required fidelity surfaces

Typography: existing Inter/system Japanese/Chinese families, body15/16px and heading
scale retained. Full CMS titles/bodies remain; long words wrap inside the paper.
Spacing/layout: selected open directory, unboxed rows, section-frame gutters;
mobile image above text, desktop image left/text right.
Colors/tokens: existing forest/paper/body/line/orange, no parallel design system.
Images: authorized 100x100 Instagram photos; local app icons; existing cloth,
ivory spines, open-book asset and independent CMS cover art, no substitutes.
Copy: D exactly in Japanese, natural equivalent English/Chinese. Article facts,
SEO metadata, commercial conditions and original CMS fields remain unchanged.

## Browser evidence and interactions

Chrome DevTools MCP: JA/EN/ZH x 390x844@2, 1024x1000@1, 1440x1000@1.
All nine: document overflow0, book/spread height identical, outer height unchanged
with 60 long added paragraphs, inner scroll reaches final paragraph, dialog scrollTop0,
close visible. Stress fixture is browser-only. Additional 320x568 and 844x390 checks
preserve readable text, internal scrolling and reachable close.

Evidence in fde-site-review-evidence/w05-ideation:
- w05-r3-baseline-reader-ja-390.png
- w05-r3-reader-ja-390.png
- w05-r3-stress-ja-390.png, w05-r3-stress-zh-1024.png, w05-r3-stress-en-1440.png
- w05-r3-opening-ja-390.png (normal-motion 580ms inspection)
- w05-r3-sns-ja-390.png

Real DevTools drag changes mobile selection without opening. Arrow keys/Enter,
Tab into reader-copy, PageDown (361.5px), Escape and focus return work. Six forward
steps cycle to the original story; pool remains five. Horizontal wheel handler
checked with browser-local WheelEvent; physical trackpad is not claimed.
Normal lift/open/close complete and clear is-lifted. Host uses reduced motion:
normal mode tested with browser-only media/CSS override, never exported. Production
honors OS preference with immediate selection and 180ms dissolve, not perspective
flight. No idle animation loop, dependency, SDK, tracker or external social API added.

Desktop EN/Mobile JA Lighthouse navigation: Accessibility, Best Practices, SEO and
Agentic Browsing each100; 55 audits passed/0 failed each. Representative desktop
Console warnings/errors0; observed page resources26/26 HTTP200.
Warm local interaction diagnostic CLS <=0.01, not a cold/field speed claim.
322 Node tests, static News parser6 and sitemap regression3 pass; generation
idempotent, JS syntax and diff checks pass. Exact-head CI goes into PR/Space only
after its fresh result, never inferred from local checks.

## Remaining external gates

Physical iPhone/Safari, real CMS write and field performance not claimed.
Instagram Meta app/OAuth/ingestion remain disconnected with zero fabricated posts.
SNS selection and D are implemented, no longer pending; final owner UI review and
merge authorization remain separate. Purchase/payment/native IMS gates stay.
