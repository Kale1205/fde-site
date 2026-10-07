# W08 Quiet Access customer input preview — 2026-10-07

## Source and intentional changes

- Selected displayed option **1**, verified against `fde-w02-review-site/dist/w08-prompts.json`: **Quiet Access**, `w08-option-1.png` (1024×1536). Original image retained; local copy `output/w08-implementation/source-option-1.png`.
- W08 uses the forest band, faint genuine kale mark, soft ivory surface and document/payment/delivery icon rows. User explicitly changed the warning-only concept into an editable screen and approved EN/JA/ZH. Removed pre-release/unavailable headings, development notice and planned suffixes. The original generated board did not include a form; the form and review/error states extend the approved W06 input style instead of pretending to be literal image content.
- Added JA/ZH `customer.html` routes; all three have static localized copy, reciprocal canonical/hreflang and noindex,follow. No new indexed sitemap route, JSON-LD, analytics or dependency. Approved W01–W07 navigation, font, tokens, footer and Mobile sheet reused. The board's approximate logo and gradient texture are not copied; genuine assets and the existing forest/paper tokens remain the source of truth.
- Order ID/email inputs support validation → local review → edit. The button says Review details, not Check status. Privacy and review text clearly identify local entered information, not retrieved customer data. Nothing is sent or persisted. Legacy customer.js is not loaded; Worker production commerce guard and A01 Japanese CMS are byte-preserved against f95aa4d.

## Visual comparisons and iterations

- Before captures: `output/w08-implementation/w08-before-{1440,1024,390}.png`. Initial JA capture `w08-first-ja390.png` and confirmation `w08-review-ja390.png` retained.
- Final native Chrome captures: `output/w08-implementation/final-{en,ja,zh}-{1440,1024,390}.png`. Viewports 1440×960, 1024×960 and 390×844, DPR1. EN full-page captures are 1440×1836 and 390×1898; JA final Mobile is approximately 390×1816. Source board crops are presentation, not literal CSS dimensions: mobile x727–1024 is normalized to 390px; Desktop x0–715 is compared at proportional content scale, with no invented pixel-perfect viewport assertion.
- Source and implementation opened together in one comparison input; normalized Mobile comparison rendered and inspected as `output/w08-implementation/comparison.html`, native capture `comparison.png`. Full composition plus readable hero, form, icon rows, CTA and footer inspected. Approved content changes intentionally change page length/region proportions.
- [P2, fixed] Initial new library payment/truck assets were black beside forest document art. Recolored only their fill to #073e2c, preserving original Phosphor regular path geometry. Post-fix nine-view captures show consistent icons. Real sources: `https://raw.githubusercontent.com/phosphor-icons/core/main/assets/regular/credit-card.svg` and `truck.svg`, existing MIT license retained.
- [P2, fixed] Initial hidden errors were referenced in aria-describedby, so accessible descriptions included errors before submission. Initial descriptions now contain only the order-format hint; runtime associates an error only when invalid. Native fresh snapshot verifies no premature email error and submitted error focus is correct.
- Repository validation found a Japanese full stop on the new h1. Removed it in renderer and JA HTML without changing validation rules; re-rendered and recaptured JA 1440/1024/390.
- Typography: local Inter + established JA/ZH/system fallback, display 36–76px, body 16–17px, input 16px, clear weight hierarchy; no tiny text or ellipsis hiding input. Spacing: shared 1280px frame, 48/22px gutters, two Desktop input columns / one Mobile column, 64/32px document gap and unboxed rows. Colors: existing forest/paper/surface tokens, restrained shadow/borders, orange focus. Image quality: genuine SVG mark/logo, reserved dimensions, sharp library SVG icons; zero broken images. Copy: three manually authored locales with the same input/confirmation boundaries and no unavailable warning. All five required fidelity surfaces inspected.

## Browser and functional evidence

- All nine locale/width combinations: no document overflow, no broken images; both inputs enabled with 16px font. Console warning/error lists empty for EN/JA/ZH clean loads; all observed 13 per-locale asset/document requests HTTP200.
- JA invalid submit, valid lower-case normalization, focus to confirmation and edit-back tested. EN Desktop and ZH Mobile real keyboard Enter submit succeeded. Confirmation output uses textContent; no simulated payment/order status. Form unit fixture confirms validation focus, safe text rendering and preserved values on edit.
- Shared sheet: eight visible private-package links hit-testable above backdrop. Escape closes and restores trigger focus. Actual ZH→EN source language click and JA→ZH private language click stay on customer route. Private package JA form keyboard confirmation succeeded with zero external requests; private scope includes all 24 W01–W08 routes. No inquiry submitted.
- Native Lighthouse snapshot: ZH Mobile and EN Desktop Accessibility / Best Practices / SEO / Agentic Browsing 100, zero failed audits. EN local trace observed CLS 0.00 and LCP 89ms unthrottled; not field performance, physical-device QA or full WCAG certification.
- An initial stale native input UID was rejected after a viewport/page change. Fresh snapshot then EN form Enter check succeeded. Initial private 4178 navigation failed because its server was no longer running; restarted task-owned loopback preview and successfully checked the actual bundle. Failed evidence was not called application success.
- 87 related Node tests passed. W08 six tests passed again after punctuation correction. Renderer idempotence, Chinese eight-page generator and JS syntax checks passed. Full repository validation passed after correcting the Japanese heading without weakening rules; sitemap lastmod regression tests (3) passed. The separate final `npm run sitemap -- --check` retry timed out while Git read the existing HTML commit history (30s), so that command is not recorded as PASS. No sitemap, robots or indexed route was changed. This static repository has no separate build/lint command.

## Boundaries and handoff

- No FDE push, PR, main merge, public FDE deployment, Worker activation, customer/order lookup, payment or CMS write. Existing output and original checkout preserved. Owner-private review Site is a separate preview publication; all-page user approval still precedes FDE merge/publication.
- A01 remains Japanese-only and untouched. W08 final implementation awaits user visual confirmation. Physical iPhone Safari/other vendor engines remain user/device QA, not claimed from Chrome emulation.
- Owner-private review publication succeeded: Site source `49606a032d4d77095db651765125876edfd49493`, deployment `appgdep_6ac624f83460819191ce527a8fa5267a`, URL `https://fde-w02-design-review.kale-1999.chatgpt.site/preview/ja/customer.html`. FDE implementation checkpoint is `e45a1b249713f386865b0eaa85f6c670a39e03b8`; this evidence-only QA addition follows that checkpoint. Space renewal, project table and unchecked ToDo were updated and read back, with final visual approval and consolidated main merge still pending.
- No actionable P0/P1/P2 visual finding remains. Implementation checklist: review published private W08; decide A01 visual scope separately; perform consolidated approval and exact-head PR/CI review before any FDE main merge.

CodeQL reported seven new high findings in offline composition/test string operations. Titles and table labels now use restricted capture groups instead of generic tag stripping; head recomposition removes scripts case-insensitively until stable; newline replacement covers every occurrence. Copy extraction repeats until stable. Negative tests cover uppercase and re-formed executable tags. No production HTML, price, copy, authentication or feature change is intended. The failed initial security scan is retained; the corrected exact head must pass CodeQL before merge.

The corrected local suite passes all 94 tests, zero skips. An initial in-flight run still loaded the first version of the new copy-extraction fixture, and also reported a transient Chinese release-notice mismatch during iCloud reads. The corrected fixture and an unchanged readback of all three Chinese release notices pass on the full rerun; no release copy or condition was altered.

The second security scan reduced findings to three but still rejected regex-based script filtering. Homepage/order builders now recompose the known generated asset suffix from an approved static metadata prefix, reject unexpected executable scripts before that boundary, and permit only the validated JSON-LD block on the homepage. Legacy order favicons are retained explicitly. Negative tests cover uppercase, whitespace/malformed closing tags, extra scripts and missing boundaries. No dependency was added and production output remains byte-identical. All 95 related tests pass without skips.

An iCloud Git index write then timed out before committing this correction. The original folders and source were preserved. A fresh checkout outside iCloud was created from the already-pushed exact PR head; only the four correction files and this evidence were transferred for normal validation and push. Local repository/sitemap history checks in the original iCloud worktree also timed out; those attempts are failures, not passes.

The non-iCloud checkout passes all 95 Node tests, repository validation, unchanged composition checks, sitemap check, three sitemap regression tests, all eight Chinese pages, staging integrity and whitespace checks. No generated HTML or sitemap change was needed.

final result: passed (local visual and functional QA; corrected exact-head CI/security recheck pending)

---

# W07 approved combined Order — 2026-10-07

## Source, composition and boundaries

- Approved target: `fde-w02-review-site/dist/w07-refined.png`, 1024×1536. Desktop x0–726 and Mobile x738–1024 are board presentation crops, not literal CSS viewports. Inspected source and actual captures together, then a normalized 390px Mobile side-by-side comparison (`output/w07-implementation/comparison.html`). Final captures: `final-{ja,en,zh}-{390,1024,1440}.png` in that directory; original and initial failed captures are retained. Actual source art replaces generated approximations; complete readable copy and the approved shared header/footer account for the longer Mobile page.
- EN/JA/ZH `order.html` now use option-one forest hero, genuine faint brand mark and unboxed product display, with option-two connected purchase-process rail (horizontal Desktop, vertical Mobile). Exact product names, taglines, illustrations, JPY prices and release line are extracted from each approved homepage. Updates is required for License, first three months included, ¥4,900/month for months 4–6 and ¥9,800/month from month 7; ending Updates retains the existing version. Plus remains purchaser-managed and outside our Updates. These are user-approved commercial alignment changes, not incidental copy invention.
- Existing canonical/hreflang/meta descriptions and noindex,follow remain unchanged. No checkout, form, payment runtime, analytics, new external request or dependency is introduced. Source renderer is idempotent and emits ordinary HTML. No new indexed route, schema, sitemap or robots change. Primary terms/contact/product links and locale switching retain their destinations.
- Genuine Phosphor regular user, package, file-text, warning-circle, check, minus and arrow-right assets reuse the existing MIT license; path geometry comes unchanged from `https://raw.githubusercontent.com/phosphor-icons/core/main/assets/regular/{name}.svg`, only fill uses the existing forest token value. No handcrafted icon drawings. Warning uses the library outline rather than the source mock's orange bitmap; JPY is explicitly disclosed beside prices.

## Iterations and verification

1. [P1] Inherited hero rule initially put white type on white; scoped specificity restores forest and post-fix captures confirm it.
2. [P2] Legacy order-page class duplicated the brand and stacked the footer. Removed obsolete class while retaining gallery/quiet-page common components; final captures confirm one logo and consistent footer.
3. [P2] Hidden definition-list value was initially visible. Scoped sr-only rule hides it visually while preserving accessible semantics. Final captures confirmed Updates rows have no duplicate visible text.
4. Capture-only issue: one screenshot preceded async image paint. Awaited all image decodes and two animation frames, then recaptured all nine views. License Plus art is visible in final evidence; no missing asset was concealed.
- Chrome DevTools MCP: JA/EN/ZH at 390, 1024 and 1440 CSS px, all loaded images, zero document overflow and zero Console error/warning. All observed asset/document requests were HTTP 200; observed local CLS 0 in these nine loads (not field-performance certification).
- Shared Mobile sheet's eight links are above the backdrop and hit-testable. Escape closes it and restores trigger focus; actual language-picker click navigates JA Order to EN Order, not Home. Keyboard/accessibility and static link integrity verified without submitting anything.
- Lighthouse snapshot: JA Mobile and ZH Desktop Accessibility, Best Practices, SEO and Agentic Browsing 100, no failed checks. Does not certify full WCAG, Performance or physical iPhone/Safari behavior.
- 70 related Node tests pass, covering W01–W07 including source preservation and approved Order facts. Order renderer check, `git diff --check`, `npm run sitemap -- --check` and `npm run validate` pass. First validation retained a legacy USD-price-book failure; narrowed the new approved JPY Order branch with explicit price and static/purchase-disabled invariants, keeping legacy commercial-page checks intact. No conventional build/lint script exists in this static repository.
- Original checkout and pre-existing output are preserved. FDE source remains local on `preview/quiet-form-motion`; no FDE push, PR, merge, sales activation or actual production publication. Owner-private review packaging is separate. W08 Customer stays unchanged until design selection; English-only route and missing JA/ZH routes require a separate decision.

## Final handoff

- Verified implementation checkpoint `68499cd3dec673cca6990faa815ea60d30c96ecb`, no FDE push. Contact email-routing regression also passes (71 related tests including the prior 70). Private-package English 320/760/761 boundary probes have no overflow and correct one/three-column rail transitions. Focused terms CTA has a visible orange 3px outline; actual Enter navigates to private English License. JA terms click and ZH locale routes also remain private.
- Existing owner-only audience retained. Sites source `bf2a828f72a410cb831ac6fd1dcc6671fb6ac55d` was pushed and archive-built by the native source workflow; deployment `appgdep_6ac596c509d481919874282052fb3661` returned `succeeded` at `https://fde-w02-design-review.kale-1999.chatgpt.site` on 2026-10-07T00:48:24Z. This is the separate private review site, not FDE production. `/w07-complete.html` links all three actual Order previews; prior galleries/preview safety remain preserved. No deployed-URL fetch or recurring task was used.
- W08 generated exactly three independent image boards, shown in current-chat arrival order and retained as `dist/w08-option-{1,2,3}.png` in the review Site; full prompts and actual attached source references are in `dist/w08-prompts.json`. `/w08.html` Mobile/Desktop/board and 1/2/3 controls work at 390/1024/1440; actual keyboard selects option 3; no overflow, Console errors or failed requests. Gallery Accessibility/Best Practices/Agentic Browsing 100; SEO 80 from missing private-gallery description, not public SEO regression. Generated extra decorative slogan/approximated logos are explicitly not implementation copy/assets. `customer.html` remains untouched awaiting selection; JA/ZH new routes and CMS remain separate scope decisions.
- Space renewal page (sequence 22), ToDo (62) and project table (104) all saved successfully and targeted readback confirmed W07 implementation/W08 selection state, correcting the earlier stale W06 status. Original other-page history, future IMS demo replacements, all-page-before-merge agreement and unrelated release/governance conditions are preserved.

final result: passed (scoped W07 implementation, private handoff and Space sync; W08 design selection pending)

---

# W06 approved FAQ-first Contact — 2026-10-07

## Reference and implementation

- User approved `fde-w02-review-site/dist/w06-refined.png` (1024×1536), original displayed option two with the same faint News kale mark, FAQ 01 and form 02. Inspected the reference and final JA Desktop/Mobile captures together in one comparison input. Desktop reference region x0–733 and Mobile x742–1024 are presentation crops, not literal CSS viewports; compared hierarchy, grouping, materials and reading order at natural 1440/390 CSS px. No bitmap stretching or generated form imagery in the implementation.
- EN/JA/ZH now share a forest hero with white type, the actual existing News SVG mark at opacity .065, a quiet FAQ disclosure followed by one raised ivory form surface, two Desktop field columns and one Mobile column. Existing six required fields, copy, product options, confirmation/back/send/success markup, business details, common nav/footer, head metadata and contact runtime are retained. Chinese static FAQ questions/search now work; EN/JA CMS population remains unchanged.
- Deliberate source differences: retain the complete existing helper text, business details and shared header/footer rather than the mock's condensed copy; reuse approved common 64px Desktop / 32px Mobile title scale. The real brand mark replaces the generated approximation. No new price/License terms, dependencies, tracking, outbound submissions or extra features.

## Visual iterations

1. [P2] Original rows-based textarea was too tall; scoped sizing is now 200px Desktop and 160px Mobile without changing fields/content.
2. [P2] Inherited compact-intro max-width placed the Desktop FAQ chevron mid-surface. Set the disclosure summary to full available width and re-captured all nine locale/viewports. Real Phosphor regular caret-right asset with retained MIT license is decorative/aria-hidden; native details/summary owns interaction.
3. Final captures: `output/w06-implementation/final-{ja,en,zh}-{390,1024,1440}.jpg`. Initial/baseline captures remain separately preserved. No actionable P0/P1/P2 visual issue remains in this scoped implementation.

## Verification

- Chrome DevTools MCP, three locales × 390/1024/1440 CSS px: no document overflow, clipping, missing images or Console error/warning on clean reloads. Observed local CLS maximum .001031; no field/performance certification claimed. Final JA local assets all HTTP 200.
- Native FAQ disclosure Enter toggles with visible keyboard focus. Search/question expansion works in all languages, including no-result state. Shared Mobile sheet's eight links are hit-testable above backdrop; Escape closes and returns focus to menu button.
- JA required/invalid input, six-row confirmation, edit/back preserves input, sending-disabled state and success/reset tested. EN invalid email, confirmation and success; ZH confirmation, mocked error/retry and success tested. Synthetic fetch intercepts all contact submissions; no actual Worker POST/email sent. Expected mock-failure warning retained as test evidence, absent after reload. Production Turnstile/mail-delivery integration is unchanged and not re-certified by these mocked tests.
- Lighthouse snapshot JA Desktop and Mobile: Accessibility, Best Practices, SEO and Agentic Browsing 100, zero failing checks. Excludes Performance; not full WCAG or physical iPhone/Safari certification.
- 66 related Node tests pass (W01–W06 including page/copy/SEO preservation). Chinese regeneration and Contact renderer check pass; diff whitespace check passes. This static repository has no conventional build/lint script. Initial repository/sitemap validation correctly refused uncommitted indexed HTML; commit-derived lastmod verification follows the existing workflow, without bypassing that guard.
- User's original checkout and pre-existing untracked output are preserved. W06 source remains on `preview/quiet-form-motion`; FDE push/PR/merge/publication is deferred until all-page approval. Separate owner-private review package may display a review-only notice and simulate completion without contacting email/Turnstile services.

## Final source and private handoff

- Contact implementation checkpoint `b783cd7f30d356b3e0e83db386e7899d5ac69c9a`. Contact email-routing test also passes (67 related Node tests total). JS syntax checks pass. Two commit-history reads exceeded the existing 30-second Git guard; retained both failures, warmed the same history with read-only Git log/rev-list, then the normal sequential `npm run sitemap`, `npm run sitemap -- --check`, `npm run validate` and three sitemap regression tests all passed. Did not weaken validation or change timeouts. Only EN/JA/ZH Contact lastmod advances from 2026-10-05 to 2026-10-07; canonical/hreflang/robots/JSON-LD and other dates stay unchanged.
- Owner-private review source `fb464f80d71bea5fe8138c6a94d2aaf89b049a6b` passed gallery/package checks, was pushed and packaged from that exact source by the native Sites workflow. Archive-backed deployment `appgdep_6ac58cc923c481918457337be44f2599` returned `succeeded` at `https://fde-w02-design-review.kale-1999.chatgpt.site` on 2026-10-07T00:05:46Z. Existing audience preserved; no recurring task or deployed-URL fetch. `/w06-complete.html` links all three actual previews; local private-package tests confirm no Worker/Turnstile request, successful simulated completion, correct locale routes, no overflow or Console errors.
- W07 three independent image concepts were displayed in generated-result order and saved as `fde-w02-review-site/dist/w07-option-{1,2,3}.png`; exact built-in prompts/references in `dist/w07-prompts.json`. `/w07.html` has iPhone-friendly 1/2/3 and Mobile/Desktop/board controls, tested at 390/1024/1440, loaded images, no overflow, Console error or failed request; keyboard selection works. Gallery Lighthouse Accessibility/Best Practices 100; SEO 80 from the private review gallery's absent description, not an FDE SEO change. W07 order source/price/conditions/purchase-disabled state remains untouched; images are design-only pending selection, using the current source and approved W06 style as actual attached references. Generated icon/text inaccuracies are explicitly excluded from implementation: retain the existing approved artwork/prose.
- Space renewal, project table and ToDo writes returned native internal errors. Renewal readback showed unchanged content; no Space completion is claimed. Pending guarded drafts are preserved in untracked `output/w06-implementation/space-update-pending.json`; reread/reconcile before any retry. No unrelated governance rows or future demo replacement tasks changed.

final result: passed (scoped site implementation and repository QA; Space synchronization blocked by connector save errors)

---

# W05 selected Soft Dispatch News — 2026-10-07

## Scope and visual truth

- User selected original displayed option two, not the subsequent text-only consolidated proposal. Reference: `/Users/junenature/Desktop/Share/Codex/fde-w02-review-site/dist/w05-option-2.png`, 1222×1287. Compared its Desktop x28–905 and Mobile x935–1194 regions alongside implementation in `output/w05-implementation/desktop-comparison.jpg` and `mobile-comparison.jpg`, followed by final `desktop-handoff-comparison.jpg` and `mobile-handoff-comparison.jpg` with the reference and actual in the same comparison inputs. Original reference and actual three-locale captures were inspected. The reference is an illustrated design board, not pixel-perfect browser evidence.
- Implemented EN/JA/ZH News only: wide forest hero, white title/intro, real brand-mark watermark, large featured article left, latest and archive stacked right, quiet Instagram strip. Mobile stacks in reading order. Approved section label is アップデート情報 / Updates / 更新信息.
- Existing articles, original article imagery, CMS fetching/sorting, fallback links, full article popup, shared menu/footer, language routes and metadata are preserved. No repeated publisher/logo byline is added. Optional article-art removal question had no response at implementation checkpoint; retained original option-two article images. Full original prose is preserved rather than adopting mock abbreviations. Article statements are historical content, not revised commercial terms.
- Existing forest/paper/surface/sans tokens remain authoritative. Scoped `news-renewal` styling uses restrained 12–16px radii, fine borders and low shadows. Genuine `assets/baked-kale-mark.svg` is reused as a decorative white watermark at 6.5% opacity; no newly generated asset, external font, dependency, animation or tracking. Reserved feature/latest aspect ratios retain layout slots; 16/10 feature ratio accommodates existing square leaf artwork, while Mobile latest art uses a compact 3/1 strip.

## Comparison history and repairs

1. [P2] Existing high-specificity hero CSS initially caused white text on a paper background and later a narrow Mobile column. Scoped hero selector specificity and responsive overrides corrected both. Before evidence retained in the session; final captures and computed forest background confirm the fix.
2. [P2] Source/CMS image rules forced a contain frame inconsistent with the selected featured presentation. Scoped cover framing at 16/10 keeps the leaf visible with padding; Mobile latest art is compact. Archive category and right-aligned date now share one row, matching the selected hierarchy.
3. [P2] Existing article dialog allowed keyboard focus into the page. Scoped background inertness, cyclic Tab/Shift+Tab, Escape dismissal and trigger-focus restoration are verified. Other page CMS behavior remains outside the new class scope.
4. [P2] Chinese regeneration initially reverted the new editorial heading to 更新. The locale generator now maps only this News section to 更新信息, preserving the commercial Updates product label elsewhere. All seven Chinese pages pass generation parity.

## Browser and engineering evidence

- Chrome DevTools MCP at EN/JA/ZH 1440, 1024 and 390 CSS px; all nine initial and polished screenshots inspected. No page overflow, broken images, Console error/warning or failed HTTP request in the checked views. Local observed CLS maximum 0.00284, not field performance certification. Final private-package JA 390/1440, EN 1440 and ZH 1024 views were rechecked after the 16/10 image adjustment. JA 320/760/761 boundary probes also have zero document overflow.
- Featured/latest/archive each open the correct full article in all three locales; Escape closes it and restores the trigger, and modal background inertness clears. Tab/Shift+Tab stays in the article. Shared Mobile sheet's eight links are hit-testable above the backdrop; Escape restores menu focus. Private language-picker click goes from JA News to EN News within `/preview/`; other review routes remain private and Contact/Home remain existing public destinations.
- Lighthouse snapshots: JA Desktop/Mobile, ZH Tablet and private EN Mobile each Accessibility, Best Practices, SEO and Agentic Browsing 100, zero failing checks. No Performance audit or full WCAG/physical iPhone/Safari certification is claimed.
- 58 relevant Node tests passed, then 29 News/page-preservation tests rechecked after final source changes. JS syntax, Chinese generation and three sitemap regressions passed. Initial repository/sitemap validation required committed HTML before deriving lastmod; preserved that failure and used the existing commit-derived workflow. A check started before generation completed still saw stale dates; final sequential verification passes. Repository validation and `npm run sitemap -- --check` pass; only the three News lastmods advance to the code commit date, 2026-10-07. This static repository has no conventional build/lint command or new dependency.
- No price/License-condition/content-JSON changes. Canonical, hreflang, robots and head markup remain identical in the source pages; only existing sitemap lastmod dates may advance through the standard workflow. User's original checkout and unrelated output are preserved. FDE push/PR/merge/publication remains deferred until all-page approval.

## Handoff

- Selected image implementation and design-QA skills required source/actual comparison and scoped repairs. Figma was not used: the user's selected image and existing brand assets supply the visual reference.
- W05 implementation is ready for the user's final review; no actionable P0/P1/P2 issue remains in the checked design/interaction scope. Physical iPhone/Safari review is pending with the user.
- FDE code checkpoint is local `e988ff259a0b9a02e80435fc887faf5cb2fccb49`; no FDE push/PR/merge/public release. Separate owner-private review source `a1f1e64a98df72d700ad064f66daf1a5faeb364d` passed all package/gallery checks and was deployed as `appgdep_6ac5786795b88191ab09387186fc4dc9`, status `succeeded`, on 2026-10-07 JST. Native URL: `https://fde-w02-design-review.kale-1999.chatgpt.site`; Japanese implementation `/preview/ja/news.html`. Audience unchanged; no recurring task or deployed-URL fetch. Existing W02–W04 actual previews and previous comparison boards remain available.
- Space renewal, ToDo and project management overview now show original option-two adoption, thin brand watermark, approved section label, three-locale implementation/private preview and final user review pending. W01–W04 approvals, unchecked future IMS video/demo replacements, all-page merge boundary and unrelated release-governance content are preserved.

final result: passed

---

# W04 intuitive visual journey — 2026-10-06

## Approval and reference

- User approved the latest combined visual: third-option sculptural icons with an added magnifier in 01, second-option vertical 01–03 rail and shallow real-code/native-video overlap. Implemented only EN/JA/ZH Goals. Final implementation review remains pending; all-page approval still precedes FDE GitHub push/PR/merge/public release.
- Authoritative board: `/Users/junenature/.codex/generated_images/01a09ff4-cb43-7e40-9219-753898992b07/exec-6380ef15-9a8e-45a9-9023-479bd552db0f.png`, 1024×1536. Desktop region x11–720, Mobile x734–1013. Opened the reference alongside `output/w04-visual-journey/ja-1440-final.jpg` (1440×3132) and `ja-390-recheck.jpg` (780×8320, CSS 390×844, DPR 2). This is an illustrated board, not a pixel-perfect browser capture.

## Fidelity and assets

- Three genuine RGBA artworks, 1536×1024, isolated on transparency: clipboard/box/magnifier → application; application frame with three separated green internal planes and a wrench; application between two dialogue bubbles. They reuse the approved forest/cream sculptural direction, without faux SVG or CSS artwork. Generation brief: match the selected board's materials, shapes and lighting, no text, no external logos, transparent background. Actual code/video remain real HTML/media, not generated imagery.
- Final assets: `assets/goals-understand-work.png`, `assets/goals-open-system.png`, `assets/goals-partner-dialogue.png`. Generation sources respectively:
  - `/Users/junenature/.codex/generated_images/01a11133-89a5-7eb0-a94f-a32902a5e632/exec-b94d300a-15ba-43d6-896b-4eea430500ed.png`
  - `/Users/junenature/.codex/generated_images/01a11133-b7d0-79c3-94e1-7aa0ab7d6823/exec-07245d83-4c99-4fe3-8fc2-bef41830bed7.png`
  - `/Users/junenature/.codex/generated_images/01a11133-e5de-71a1-9670-b6e04de01cc9/exec-f0621d94-8c0b-4865-a476-7cd03bc53137.png`
- CSS rail, dots and numbers are structural chapter markers. Desktop uses illustration beside copy, Mobile places illustration above copy; 03 is artwork-left/copy-right on Desktop. The source/video overlap is 24px horizontally on Desktop/Tablet and 18px vertically on Mobile. Keyboard focus separates the overlap for source reading.
- Preserve forest/white hero, existing type and spacing tokens, full prose, source, 12-second native recordings, transcript, responsibility note, metadata and shared nav/footer. Illustrations duplicate visible explanations, so empty alt avoids redundant narration; chapter numbers are aria-hidden. Reserved image dimensions prevent lazy-load shift. No new dependency, animation, tracking or third-party asset.
- Intentional differences: retain complete original text, native controls and shared navigation rather than mock's condensed text; therefore the live page is longer. The existing Chinese page uses the English native recording, not an invented Chinese capture. Chapter 03 has no CTA.

## Browser comparison and corrections

- Initial Mobile full-page screenshot missed lazy off-screen icons; scrolled through and decoded the actual images before final capture. All three render on the paper surface without opaque backgrounds or clipping.
- Corrected inherited centered chapter-03 heading to left alignment to match the approved board. Rechecked all nine localized viewports.
- One off-screen automated video-play probe was interrupted by the existing visibility pause observer. Retained this failed probe in `browser-evidence.json`; repeated with the video in view, playback advanced normally. No video implementation or source changed.
- Chrome DevTools MCP: EN/JA/ZH at 1440/1024/390 CSS px, plus JA 320/760/761 edges. All screenshots inspected; zero page overflow, loaded artwork, readable copy and correct chapter hierarchy. Mobile checks include DPR2/touch emulation. No Console errors/warnings. Confirmed actual video playback and HTTP 200/206 asset delivery. Local observed CLS maximum 0.00325; no performance/field certification implied.
- Keyboard: shared sheet links hit-test above backdrop; Escape restores menu-button focus. Three language routes preserved. Chapter index lands at approach. Code scrolls with ArrowRight (40px), has a visible orange outline and next Tab reaches VIDEO. Transcript toggles with Enter, retaining all steps. Focused evidence `ja-390-code-focus.jpg`.
- Lighthouse snapshots: JA Desktop/Mobile and EN/ZH Mobile Accessibility, Best Practices, SEO and Agentic Browsing 100; zero failing checks. These exclude Performance and do not establish full WCAG compliance or physical iPhone/Safari acceptance.

## Engineering and handoff

- 55 relevant Node tests pass, including renderer idempotency, existing prose/head/source/video/transcript parity, artwork dimensions/alpha, scoped rail/overlap and W01–W03 preservation. Chinese generation check: all seven pages current.
- Canonical, hreflang, robots, JSON-LD and route inventory unchanged. Existing same-day Goals lastmod remains governed by the standard sitemap workflow. No price or License-condition edits.
- User's original checkout and unrelated output preserved. Source implementation committed locally as `11b6166932c4824db07663a49aa92d1c6300d44e`. Repository validation, same-day sitemap/check and all three sitemap regressions pass; no conventional build/lint exists in this static repository. No actionable P0/P1/P2 issue remains within this revision. Physical iPhone/Safari review remains with the user.
- Private package retested at JA 390, EN 1440 and ZH 1024: all artwork and actual playback loaded, no overflow, Console warning/error or HTTP error. Gallery includes all three language links and latest selected board; source image link corrected to match it. Language routes remain within `/preview/`; unrelated destinations retain public locale links.
- Native Sites workflow pushed only the separate review Site at `449a9cb7ab6d5b3fe2459f3f12fa0624ad20f6c6`, packaged from that exact source. Owner-private deployment `appgdep_6ac4ef79b7c08191baa374b344f13824` returned `succeeded` at `https://fde-w02-design-review.kale-1999.chatgpt.site` on 2026-10-06T12:54:39Z. Japanese implementation: `/preview/ja/goals.html`. Existing owner-only audience preserved; no recurring task added. Initial expired credential and transient index-lock contention were resolved without removing locks or changing user files; checks were retained. No deployed-URL fetch, FDE GitHub push/PR/merge or FDE production release occurred.
- Product Design implementation/QA workflow kept artwork separate from structural HTML/CSS and required comparison against the selected Desktop/Mobile reference. Figma was not used because no Figma file supplied the selected design.
- Space renewal, project overview and unchecked ToDo updated with this combined-design approval, three-locale implementation and final implementation review pending; targeted readback confirms all six changed blocks and table layout preservation. Existing W01/W03 replacement tasks and release-governance content are untouched.

final result: passed

---

# W04 approved Our Goals composition — 2026-10-06

## Scope and visual source

- User approved the combined W04 direction: forest/white hero, option-two chapters 01/02, option-one overlapping code/video, and a new quiet paragraph closure without chapter-03 contact/plan buttons. Implemented English, Japanese and Simplified Chinese. Implementation review remains pending; all-page approval still precedes FDE push/PR/merge/production publication.
- Source: `/Users/junenature/.codex/generated_images/01a09ff4-cb43-7e40-9219-753898992b07/exec-e3f39579-bbf0-46c1-b7e0-c17d016b0231.png` (1024 x 1536). Compared Desktop region x30–725 and Mobile x754–995 with matching browser captures. Opened reference, `ja-1440-polished.jpg` (1440 x 2737) and `ja-390-polished.jpg` (390 x 3489) together. Focused source/video screenshots were also inspected. Evidence is under `output/w04-implementation/`; CSS viewports are 1440 x 1000 and 390 x 844, DPR 1.

## Fidelity and intentional constraints

- Layout: full-width forest hero with white existing headings; two-column 01/02 on Desktop, stacked on Mobile; actual Rust source beside the actual 12-second native-development recording, overlapping 52px on Desktop, 32px on Tablet and 18px vertically on Mobile. Chapter 03 ends with original paragraphs and responsibility note, not new promotional cards or CTA buttons.
- Typography/colors: existing Inter/platform-CJK stack, forest/warm-white/line tokens. Fine rules, restrained shadow and existing shared header/footer are retained. No new dependency, external font, design system or decorative image.
- Existing prose, terms, metadata, JSON-LD, source paths and video assets are retained. Only chapter-03 action links are removed. Corrected the Chinese source panel's translated Rust identifiers so all three locales show the actual code rather than fictitious localized filenames/functions. The Chinese page retains the existing English native recording; there is no Chinese recording asset.
- Intentional deviations: illustrative mock text/UI is not substituted for real material. The complete original video aspect ratio and native controls remain. Mobile overlap is shallower than the illustration to keep all source lines readable; source scroll is local, named and keyboard-focusable, and focus-within separates the overlapped video. Existing longer copy and shared navigation/footer remain. Flat forest uses the existing token instead of introducing a gradient.

## Comparison iterations

1. [P1] Late generic hero CSS initially overrode the green composition. Corrected scoped specificity; all nine final views show white text on forest.
2. [P2] Video caption initially sat over the code panel. Added responsive caption clearance, retaining the visual overlap without obscured prose.
3. [P2] Chapter-03 eyebrow initially inherited fit-content width. Made it block/auto-width so the centered closing heading and label align.
4. [P2] Transcript retained redundant divider rules. Simplified that native disclosure surface while preserving all transcript text and keyboard behavior.
5. Initial screenshots included a transient native-video loading indicator. Final polished captures follow verified playback, then pause; no generated animation or replacement UI was used.

## Browser and engineering evidence

- Chrome DevTools MCP: EN/JA/ZH at 1440/1024/390 CSS px; additional Japanese 320/760/761/1180 boundaries. No page overflow, broken image, Console error/warning or failed HTTP request. Video range responses are normal 206; actual playback advanced in Japanese Desktop/Mobile, English Mobile and Chinese Tablet. All nine views have a playable 12-second recording.
- Keyboard checks: focused source has visible outline and reachable horizontal scroll; next Tab reaches native video controls. Transcript opens/closes with Enter. Shared Mobile menu links are hit-testable above the backdrop; Escape closes and restores focus. Language picker routes to all three localized Goals pages and closes with Escape. Shared links remain intact; chapter 03 has no links.
- Maximum observed local unthrottled CLS is 0.00807 (JA 1024). Lighthouse snapshots for JA Desktop/Mobile and EN/ZH Mobile each score Accessibility, Best Practices, SEO and Agentic Browsing 100, zero failing checks. These are local lab observations, not Performance scores, field certification, comprehensive WCAG verification or physical iPhone/Safari testing.
- 53 relevant Node tests pass, covering W01/W02/W03 preservation and W04 composition/prose/head/video parity. Existing Goals content, Chinese generation, W04 recomposition, JS syntax, repository validation, sitemap check and all three sitemap regression tests pass. Initial validation correctly rejected uncommitted indexed HTML; committed page content before advancing the three Goals lastmod dates under the standard workflow. Static repository has no conventional build/lint script. No dependencies changed.
- Canonical/hreflang, robots, structured data and route inventory are unchanged. Only the three changed Goals lastmod dates are advanced through the existing sitemap workflow. No tracking, purchase, submission, backend or authentication change.

## Handoff boundary

- No actionable P0/P1/P2 issue remains in this W04 implementation scope. Original checkout and unrelated output are preserved. The separate owner-private review package is used for Mac/iPhone review; FDE production remains unchanged. W04 final implementation approval is still pending.
- Packaged preview repeated actual playback and locale routes in JA 390, EN 1440 and ZH 1024 with no overflow, broken images, Console errors or failed HTTP requests. W02/W03/W04 preview-language links remain private; home/news/contact links retain public locale destinations. The 390px review gallery exposes all three implementation links and retains the approved image and original concepts.
- Native Sites workflow pushed only the separate review repository at `cc3e5c868034b9cb1faa6e93b464e253383c781f`, packaged from that exact state. The allowlisted bundle records FDE source `d552d31`. Owner-private deployment `appgdep_6ac4d696750081919a3a267982b8c549` returned `succeeded` at `https://fde-w02-design-review.kale-1999.chatgpt.site`; working Japanese route is `/preview/ja/goals.html`. Existing audience remained owner-only. No deployed-URL fetch was needed after confirmed native deployment, and no FDE GitHub push/PR/merge/public release occurred.
- Space renewal, ToDo and project-management records show W04 design approved on 2026-10-06, three-locale implementation verified, final implementation review pending. W01–W03 approval and the deferred W01/W03 native replacement tasks remain unchanged.

final result: passed

---

# W03 selected Demo switchboard — 2026-10-06

## Scope and visual source

- The user selected the third displayed W03 concept. Implemented the full Demo page in English, Japanese and Simplified Chinese; W01 home and W02 conditions remain unchanged. The user approved the W03 final implementation on 2026-10-06 and requested the next page. All pages must receive user approval before any FDE GitHub PR, merge or public release.
- Visual source: `/Users/junenature/.codex/generated_images/01a09ff4-cb43-7e40-9219-753898992b07/exec-1139ae6d-cdb8-4a09-9b56-60691710f85c.png`, a 1536 x 1024 illustrated Desktop/Mobile board. Desktop region x0–1182 and Mobile region x1214–1505 were compared with matching CSS viewport captures, excluding the surrounding board. This is an illustrative layout reference, not a pixel-perfect browser screenshot.
- Evidence: `output/w03-implementation/{en,ja,zh}-{1440,1024,390}-final.jpg`. Japanese full-page captures are 1440 x 1660 and 390 x 1646, DPR 1. Clean initial states are inventory on Desktop/Tablet and operation on Mobile, with menu/guide closed and original seed stock 326/20/346. Source and both final Japanese captures were opened together; focused form evidence `ja-390-form-final.jpg` was also inspected at readable size.

## Fidelity and constraints

- Layout: continuous forest hero, three inventory/operation/history view buttons, warm-white workbench, Desktop inventory with a pale-sage contextual operation form, and Mobile operation-first layout. Selected-product stock sits below the action; fine rules and the existing shared header/footer provide rhythm. Table scroll is confined to named, keyboard-focusable regions, without reducing mobile text to fit.
- Typography/colors: existing local Inter/platform-CJK stack, forest/warm-white/paper/line tokens and restrained orange stock warning. Native controls use 16px type and at least 48px height; primary actions and view controls retain visible focus. No new design system, dependency, external fonts, animation loop or copied third-party asset was introduced.
- Assets: existing Baked Kale SVG logo and shared menu controls. No new illustration was required. The mock's generated text and commercial claims were not adopted.
- Copy/function: existing headings, simulation notice, workflow/scope notes, platform limitations, footer copy, form labels, destinations, metadata and structured data remain. Long explanations are placed in an accessible native disclosure instead of discarded. Close Demo and Reset remain available. Original operation algorithms, seed products, stock/status rules, search, history, validation and reset are preserved.
- Intentional deviations: immutable existing hero copy is longer than the mock; existing toolbar/Close Demo remains. Scope explanations use one native disclosure rather than new promotional cards. Reset is consistently below the workbench in all views. Original source/destination form labels and the total-stock value are retained. Desktop contextual form remains larger than the illustrative board to accommodate the original copy and usable target sizes.
- W03 is explicitly a disconnected browser simulation, not a finished native IMS build. The user requested that the Demo body be replaced when IMS is complete; this remains an unchecked future task in Space alongside the W01 smooth-operation recording replacement.

## Comparison iterations

1. [P1] Existing late CSS initially overrode the forest toolbar and imposed old spacing/shadows. Scoped the W03 composition at the end of the shared stylesheet; recaptured and compared Desktop/Mobile against the selected board. Close action is legible and the forest hero is continuous.
2. [P2] The new semantic captions were initially visible because the existing stylesheet had no visually-hidden utility. Added a W03-scoped utility, retaining both captions in the accessibility tree without extra visual clutter.
3. [P2] First throttled Japanese Mobile Lighthouse found initial CLS 0.361 from deferred view initialization. Reserved switcher space and applied responsive pre-initialization panel defaults. Re-audit passed all checks; all three Mobile initial-load observations are now CLS 0, with maximum 0.01437 across the nine unthrottled views. This is local lab evidence, not field performance certification.
4. Homepage renderer previously sourced its embedded demo from the full Demo HTML. Added an explicit approved-W01 source path when W03 is present, preventing the independent W03 composition from replacing/removing the W01 widget. All home body/SEO parity tests pass; homepage HTML has no diff.

## Browser and engineering evidence

- Chrome DevTools MCP: three locales at 1440/1024/390 CSS px, plus Japanese 320/760/761/1920 boundaries. All view switches, receive/transfer/count/ship, negative-stock prevention, same-location validation, selected-product stock, newest-first history, reset and search/empty states passed. Native keyboard Arrow/Home navigation and visible focus, shared Mobile menu/Escape, full guide disclosure and local-only simulation behavior were checked.
- No page-level overflow or broken images in any checked view; zero Console errors/warnings and failed network requests in the nine main views. All tables have captions, column scopes and named focusable scroll regions; stable existing field labels and polite status announcements remain.
- Homepage smoke test at 390px confirms the original embedded form still changes stock and has no W03 view controls/overflow. W01/W02 preservation is covered by the 50-test suite.
- Final Lighthouse: Japanese Desktop/Mobile and English/Chinese Mobile have Accessibility, Best Practices, SEO and Agentic Browsing 100, zero failing checks. These audits do not include the Lighthouse Performance category, complete WCAG certification, or physical iPhone/Safari testing.
- 50 relevant Node tests pass; existing redesign, Goals, production-commerce gate, contact routing and three sitemap regressions pass. EN/JA Demo recomposition, Chinese generation, approved home generation, JS syntax and whitespace checks pass. The repository has no conventional build/lint script. No dependencies changed.
- Canonical/hreflang, robots, JSON-LD and route inventory are unchanged. Only the three materially changed Demo lastmod dates advance under the existing commit-derived sitemap procedure. No purchase, tracking, persistence, backend submission or authentication was added.

## Handoff boundary

- Design/implementation QA: no actionable P0/P1/P2 issue remains in W03. Source is saved on the existing local preview branch. No FDE push, PR, merge or production publication is authorized until all pages are approved.
- The separate owner-private review Site includes the working three-locale Demo plus the original three concept boards and approved W02 preview. This is a private design review, not FDE production. All existing public destinations outside W02/W03 remain public links; preview locale switching remains private, and Close Demo returns to the review gallery.
- Packaged preview QA repeated the stock workflow at Japanese 390px, English 1440px and Chinese 1024px with no overflow or Console errors. Three language-picker destinations remain within the private preview, all generated platform-contact links retain their public locale/query/hash, and the actual Close Demo click returns to the gallery with option three selected. The native Sites workflow pushed only its separate review repository at `a063c3c2f5349ec25f07e3f3b40adcaff3680e79`; its allowlisted preview records FDE source `c5d0600`. Owner-private deployment `appgdep_6ac44425aca081919d2cd93f52b78c20` returned `succeeded` at `https://fde-w02-design-review.kale-1999.chatgpt.site`; working Japanese URL is `/preview/ja/demo.html`. Audience was unchanged. No deployed-URL fetch was required after the confirmed native deployment.
- Space renewal, ToDo and project management records now show W01–W03 approved and W04 Our Goals in visual exploration. FDE production remains unpublished. IMS-completion replacement stays unchecked; no recurring schedule was created.
- Physical-device Safari remains to be confirmed by the user. Existing commercial-copy/price alignment between W01 and the unchanged conditions is still a separate pre-release decision; no terms were changed by this design work.

final result: passed

---

# W02 selected product conditions design — 2026-10-06

## Scope and source visual truth

- The user selected option two of the three W02 concepts. Implemented only the English, Japanese and Simplified Chinese product conditions pages. The approved homepage and the other page compositions are unchanged in this continuation.
- Source: `/Users/junenature/.codex/generated_images/01a09ff4-cb43-7e40-9219-753898992b07/exec-bd92ac57-7159-4f37-84e0-70e8e36c6092.png`, a 1024 x 1536 illustrated board with labeled Desktop 1440 and Mobile 390 regions. This is an illustrative composition, not a 1:1 browser capture. Its desktop/mobile regions were compared at the corresponding CSS widths, excluding the surrounding labels/canvas; no pixel-perfect claim is made.
- Implementation: `output/w02-implementation/{en,ja,zh}-{1440,1024,390}-final.jpg`. Japanese full-page captures are 1440 x 2393 and 390 x 2713 pixels, DPR 1, at CSS viewports 1440 x 1000 and 390 x 844. Default state is License Plus, first detail open, menu closed. Source and both final Japanese captures were opened in the same comparison input, alongside English Mobile and Chinese Tablet.
- Focused evidence: `output/w02-implementation/ja-390-table-final.jpg` (346 x 485). Table headings, symbols, prices and row labels were compared with the source table; the main captures also allow readable inspection of the selector, price, art, CTA and typography.

## Fidelity surfaces and intentional constraints

- Typography: existing local Inter/platform-CJK sans stack and existing page text remain authoritative. Large left-aligned heading, selected product/price hierarchy, 16px desktop and 15px mobile table text, and consistent accordion/body rhythm replace the prior document-index layout. Long existing English/Chinese conditions wrap naturally rather than being shortened.
- Rhythm: pale-sage desktop spotlight with large product artwork on the left and selection/price/responsibility/action on the right. Mobile stacks a compact selector, artwork, selected price and action. Fine horizontal rules and one restrained accordion surface follow the selected composition. The selector and price remain static in document flow.
- Colors: reuse forest green, warm white, paper and line tokens, and the existing pale-sage summary surface. No external font, new design system, decorative background, large gradient or dependency was added.
- Assets: reuse the two previously approved update/customization sculptures and brand logo. Their transparent canvases were accounted for in display sizing; assets were not redrawn, raster-edited or replaced by code-native shapes. The selected product artwork follows the existing selected-plan state.
- Copy: prices, responsibility lists, disclaimer, agreement conditions, IDs, CTA destinations, head metadata and JSON-LD are unchanged. Removed only the redundant in-page index; its destination IDs remain. Existing condition headings now use sequential h2 rather than h3 after the layout change. The original caption is visible as the comparison title. The mock's new instructional copy and commercial phrasing were not adopted.
- Intentional deviations: mobile uses a horizontally scrollable native table with a sticky row-label column instead of the mock's very small three-column text. Selecting a product aligns its column into view; both columns remain available by scrolling and in the accessibility tree. Native list bullets remain for the responsibility list. The existing shared header/menu and footer are retained, rather than cloning the mock's header or adding duplicated controls.

## Comparison history and fixes

1. [P2] Initial artwork was undersized and responsibility text too muted. Increased desktop image allocation to 500px and mobile artwork to 260px inside a 210px layout slot; restored ink text. Source and revised Desktop/Mobile captures were compared together.
2. [P2] Initial Mobile table showed License while Plus was selected. Added bounded, W02-only scroll alignment on selection and sticky row headings, keeping text readable. Before: `output/w02-implementation/ja-390-before.jpg`; after: final full-page/table captures.
3. [P2] The sticky header's transparent background allowed a scrolling product heading to overlap the row-label heading. Corrected selector specificity so its surface is opaque. Focused final table capture shows clean separation.
4. [P2] Moving the boundary heading below the details exposed an h1-to-h3 heading jump (initial Lighthouse Accessibility 98). Converted existing detail headings to h2 without changing their wording or appearance. All four repeated Lighthouse audits have zero failing checks.
5. [P2] At the extra 320px edge, the fixed 552px table could leave a product column partly behind the sticky label. The min-width now adapts below 390px. At 320px the 140px label and 136px selected column fit the complete 276px region; at 390px the complete 206px selected column fits beside the label.

## Browser and engineering verification

- Chrome DevTools MCP: all three locales at 1440, 1024 and 390 CSS px, DPR 1. License/Plus switching updates the visible artwork, price and responsibility. No document overflow, broken images, Console errors/warnings or failed HTTP requests in the nine checked views. CTA locale destinations remain correct. Evidence: `output/w02-implementation/browser-evidence.json`.
- Scroll check in all nine views: selector moves with the document and is not sticky. Mobile table contains all three semantic columns, caption, column/row scopes, accessible text for symbols and a named keyboard-focusable scroll region.
- Keyboard: Japanese Mobile License/Plus activated with Enter, native detail summary toggled with Enter. Shared mobile-menu links are hit-testable above the backdrop; Escape closes the sheet and returns focus. Its three language links target the current localized License routes. No actual contact submission or authenticated flow was executed.
- Observed local CLS maximum 0.00105 across the nine unthrottled checks. This is local lab evidence, not field performance certification. Existing reduced-motion CSS remains active by contract; no new looping motion was introduced.
- Final Lighthouse snapshot: Japanese Desktop/Mobile and English/Chinese Mobile each have Accessibility, Best Practices, SEO and Agentic Browsing 100; zero failing checks. Performance was not a Lighthouse category in these audits. Physical iPhone/Safari remains unverified.
- Repository validation, 40 relevant Node tests, three sitemap regressions, Chinese generation check, approved homepage generation check, W02 recomposition check, browser JS syntax and whitespace checks pass. The repository has no conventional build or lint command for this static frontend. No dependency changes.
- The initial validator rejected page-specific asset build keys; the renderer now respects the existing shared `build-version.txt` contract. Before any production release, use the normal repository-wide asset-version procedure. No isolated build-key exception was introduced.
- Sitemap route inventory, canonical/hreflang, robots and JSON-LD remain unchanged. Only the three substantively changed License lastmod dates advance to 2026-10-06 under the existing commit-derived generator.

## Handoff and remaining limits

- Design/implementation QA: no actionable P0/P1/P2 issue remains in this W02 scope. Original checkout and unrelated untracked output were preserved. Code is saved on the existing local preview branch; no GitHub push, PR, merge or FDE production publication was performed.
- With the user's explicit approval, added the interactive EN/JA/ZH implementation to the same owner-private Sites gallery on 2026-10-06. Confirmation URL: `https://fde-w02-design-review.kale-1999.chatgpt.site`; the root links to `/preview/ja/license.html`, `/preview/license.html` and `/preview/zh/license.html`. Original concept boards remain. A separate allowlisted static bundle contains only the three conditions pages, required CSS/JS, five existing public assets, and preview-only navigation handling; the original FDE repository and production site were not published.
- Preview-only alternate links remain inside the private Site; contact/product/news/goals/demo destinations use existing public pages. Local packaged QA verified Japanese 390px, English 1440px and Chinese 1024px: correct plan prices, localized links, no overflow, broken images or Console errors. Source commit `abceb950b045a9cd6bb88141c8b7f757b8e7eeaf` was pushed to the separate Sites repository and packaged by the native workflow. Private deployment `appgdep_6ac439df8d0c8191a8c9a6259dcdbb8b` returned `succeeded` with the URL above. Audience is unchanged and no recurring schedule was added. Temporary local gallery server was stopped after publishing. Physical iPhone/Safari remains unverified.
- Production-content alignment is still a separate pending decision: approved homepage uses JPY and required Updates, while the unchanged conditions retain optional continuation and EN/ZH USD candidates. This design-only change does not resolve or silently alter those terms.

final result: passed

---

# All-page Quiet Form application — 2026-10-05

## Scope and source

- The user confirmed the working second Quiet Form homepage on Mac and requested the same design across all English, Japanese and Simplified Chinese pages.
- Applied the approved home to normal `index.html`, `ja/index.html` and `zh/index.html`, rather than relying on a local route alias. The approved homepage body is shared with the preview renderer; only preview navigation URLs are normalized. Existing inner-page text, conditions, prices, links, scripts and SEO remain unchanged, verified against the baseline (build keys normalized).
- Coverage: seven primary page types in all three locales (21 URLs), plus the existing English customer portal and Japanese private CMS admin (23 URLs). Redirect-only routes, ownership verification and historical review documents were not turned into new pages. No new locale variants of those auxiliary surfaces were created.
- Visual truth: `/Users/junenature/.codex/generated_images/01a09ff4-cb43-7e40-9219-753898992b07/exec-d95ac91a-322a-4653-82e2-4233f173829e.png` (948 x 1660 illustrated Desktop 1440 / Mobile 390 board), with the user-approved interactive preview as the exact implementation reference. The board and normal-page screenshots were opened together. Normal/preview body equivalence tests provide exact structural parity beyond the illustrative board.

## Fidelity and iteration

- Fonts: all 69 checked views use the same Inter/platform-CJK sans stack. Existing code snippets retain a purposeful monospace face. Heading scale, line height and wrapping remain the approved home hierarchy adapted to longer inner-page text.
- Rhythm: existing 1280px frames, 48/32/22px gutters, restrained 10–12px surfaces, fine borders and raised/inset controls are shared. News and Contact retain the user's permitted card treatment; Goals and License retain their editorial/document structure.
- Colors: forest green and warm white remain primary, orange remains a restrained existing accent. No old lab photo, decorative blob, serif display style or new external font dependency was added to the normal home.
- Assets: reuse the approved two product sculptures, brand logo, real IMS operation recording and existing News imagery. No new asset generation, copied third-party artwork or simulated native-application image was required.
- Copy: normal home uses the previously approved three-language copy verbatim. Inner-page copy and commercial facts were preserved. No unsolicited copy rewrite or translated condition change was made.
- [P2] The Mobile License table initially showed the License column while Plus was selected. Updated only the small-screen CSS to show the selected plan's column. Desktop/Tablet retain side-by-side comparison; all nine locale/size switch checks have corresponding existing summary prices. Post-fix evidence: `output/quiet-pages/native-postfix-{en,ja,zh}-license-390.jpg`; reopened and visually inspected the Japanese capture.
- [P2] Lighthouse identified the existing language picker's visible language missing from its accessible name. Added the current language to the existing accessible label, without changing visible wording. Re-audits have zero failing checks.
- Intentional deviations from the static board: functioning demo controls and selected-stock readout, native video controls, existing page-specific copy, and contextual inner-page actions. These are approved/live product constraints, not substituted design concepts.

## Browser evidence

- Chrome DevTools MCP: all 23 URLs at 1440, 1024 and 390 CSS px, height 844, DPR 1 (69 navigations). Zero document overflow, broken images, console errors or failed HTTP requests. Metrics: `output/quiet-pages/native-layout-metrics.json`. Additional EN/JA/zh Home and License checks at 320px also pass.
- Saved fresh normal-page screenshots: `output/quiet-pages/native-*`. Nine home captures cover all locales/sizes; representative inner-page captures cover Desktop and Mobile. Japanese home captures are 1440 x 3656 and 390 x 3187 pixels; they were visually compared with the source's corresponding content regions, not browser/device chrome. Focused checks cover the actual mobile plan header, row labels and prices, form labels/fields, News cards, logo/menu controls, and real Goals media. Illustrative board scale is not treated as pixel-perfect screenshot evidence.
- Menu: all three home locales' mobile-sheet links are hit-testable above the backdrop; Escape closes and restores focus. Language routes resolve to the normal home routes, not `quiet-form.html`.
- Plans: License and Plus selection, corresponding price and static switcher checked in all three locales at all three target sizes; native keyboard Enter additionally tested on Japanese Mobile License.
- Demo: actual form receive in every home locale changes Osaka 20 to 25 and total 346 to 351. No server data, persistence, purchase or external submission is used.
- Goals real recording: 12-second, 900 x 700 video played and sought to three seconds with readyState 4, no media/console error. Loaded-frame capture: `output/quiet-pages/native-ja-goals-playing-390.jpg` (the immediate navigation captures may show a transient loading indicator).
- Lighthouse snapshot post-fix: Japanese home Desktop/Mobile, English/Chinese home Mobile and Japanese License Mobile all have Accessibility, Best Practices, SEO and Agentic Browsing 100; zero failing checks. Results: `output/quiet-pages/native-lighthouse-postfix.json`. These are local automated checks, not complete WCAG certification or physical-device evidence.
- Homepage local CLS observed at EN/JA/zh Desktop/Mobile: maximum 0.00084. This is unthrottled local lab evidence, not field CWV.

## Verification and files

- Repository validation, 30 Quiet Form/preservation tests, existing redesign/Goals/production-commerce gate contracts, three sitemap regression tests, Chinese generation check, normal homepage generation check, JS syntax and diff whitespace checks pass. No conventional build/lint script or new dependency was introduced.
- Normal-home titles, descriptions, canonical/hreflang and Organization/WebSite/WebPage/SoftwareApplication entities are preserved. Removed only homepage FAQPage entities, because the approved home has no visible FAQ section; Contact FAQs and their structured data are untouched. No Offer or purchase capability was added. Sitemap route topology and robots remain unchanged; three home lastmods updated to their substantive commit date.
- Files for this continuation: the three `index.html` files, existing `quiet-form.css`/preview renderer and its three outputs, `quiet-pages.css`, `gallery-ui.js`, `scripts/build_quiet_homepages.mjs`, `scripts/generate_zh_locale.mjs`, `scripts/test_quiet_homepages.mjs`, existing Quiet Form/inner-page/redesign tests, `scripts/validate_repo.py`, `.github/workflows/pr-checks.yml`, sitemap manifest/XML and this report. Prior inner-page implementation remains part of the same worktree.

## Limits and handoff

- Local server now serves normal pages at `http://127.0.0.1:4176/` without `--quiet-form`, in a detached loopback-only process. It remains available on this Mac while that process runs; it is not public hosting and does not survive a Mac restart.
- No push, PR, merge, production deployment, new tracking, backend submission or authentication test was performed. Existing unrelated files and the original checkout were preserved.
- Public-release content alignment remains a separate decision: approved home requires License Updates and displays JPY across locales; the unchanged inner conditions describe optional continuation, and EN/ZH retain their USD price book. Do not publish this branch before resolving those differences. The current request is design-only.
- No actionable P0/P1/P2 visual mismatch remains in the verified design scope. Physical Safari/iPhone and authenticated flows remain unverified.

final result: passed

---

# Preview recovery and selected-design confirmation — 2026-10-05

- The user reconfirmed the second final Quiet Form board. The visual truth remains `/Users/junenature/.codex/generated_images/01a09ff4-cb43-7e40-9219-753898992b07/exec-d95ac91a-322a-4653-82e2-4233f173829e.png`; no different concept was substituted.
- The reported unavailable local preview was reproduced: port 4176 refused connections. Restarted the existing server in a detached process on loopback only, retaining `--quiet-form`. Verified the process was reparented to PID 1 and remained listening after subsequent tool calls. This does not make the preview reachable from an iPhone or survive a Mac restart.
- Browser fetches returned HTTP 200 for all 23 review URLs (three homepages plus the 20 inner pages). Chrome rendered the Japanese homepage at 1440 and 390 CSS pixels, DPR 1; the recovered mobile capture and 948 x 1660 source board were opened together inline. Composition, typography, forest/warm-white palette, real product assets and existing copy remain consistent with the selected second board; the previously approved interactive demo deliberately differs from the static board. Existing disk captures remain `output/quiet-form/ja-1440-v2-final.jpg` and `output/quiet-form/ja-390-v2-final.jpg`; the recovery captures were returned inline, not saved over those files.
- Japanese News, License and Contact were re-opened at 390 pixels: theme loaded, no document overflow, no broken images, shared sans-serif headings. No design/copy changes were necessary for this selected-concept confirmation. No publication, merge, external hosting or backend submission was performed.
- Resolved finding: [P0] stopped local preview; fixed by restarting outside the turn-owned session. Final result: passed for local preview recovery and selected-concept confirmation. Physical-device/iPhone access remains a separate hosting requirement.

# Design QA — Quiet Form remaining-page renewal, 2026-10-05

## Scope and visual reference

- User instruction: unify the remaining pages with the approved homepage; design only, no copy or commercial-policy changes.
- Worktree: `fde-site-quiet-form`, branch `preview/quiet-form-motion`; the original checkout and its unrelated duplicate/untracked files were left intact.
- Approved source: `/Users/junenature/.codex/generated_images/01a09ff4-cb43-7e40-9219-753898992b07/exec-d95ac91a-322a-4653-82e2-4233f173829e.png`, the second Quiet Form board (Desktop 1440 / Mobile 390). It and rendered contact/news captures were inspected together. Differences in copy and page structure are deliberate: this is a shared visual-language implementation, not a clone of the homepage layout.
- Shared source: existing `quiet-form.css`, gallery palette, local Inter font, existing logos, CMS images, real IMS recording, and existing navigation/interaction code. No new raster artwork, dependency, framework, Figma file or generated application image was needed.
- Coverage: 20 existing URLs / 8 page types. License, Demo, Our Goals, News, Contact and Order in English, Japanese and Simplified Chinese; existing English-only Customer Portal and Japanese CMS admin. No new locale or SEO page was created. Removed Decision Guide destinations stay removed.

## Implementation

- `quiet-pages.css` is one scoped extension of existing tokens: forest green, warm white, restrained orange focus, sans-serif hierarchy, consistent 1280px frames, 48/32/22px page gutters, thin rules and subtle raised/inset controls.
- Every targeted HTML document loads that stylesheet last and gains the `quiet-page` body class. Existing copy, IDs, links, prices, conditions, forms, metadata, structured data and script references remain intact.
- News and Contact use restrained raised surfaces, as the user allowed for these page types. Goals retains its real code excerpt and native operation video. Demo retains every existing tool, notice, table and history; no homepage-only hiding rules are applied.
- Product selectors and selected-plan summary are static, not sticky. The mobile comparison scrolls in a named, keyboard-focusable region, with 14px text and a sticky row-heading column. At 390px, the 344px region contains a 560px table; at its right edge, the 112px heading and 224px Plus column both fit without overlap.
- Two minimal display/accessibility repairs: Chinese video poster path now resolves to the same existing asset; the customer logo link has an accessible name matching its existing text. Chinese generator handles `poster` references so regeneration preserves the correction.
- `scripts/dev-server.mjs --quiet-form` is an opt-in local-review alias for the three home routes. It serves the approved preview without changing public `index.html` files or navigation links. Default serving is unchanged. Review command: `npm run dev -- --host 127.0.0.1 --port 4176 --quiet-form`.
- Sitemap route inventory and alternates are unchanged. Repository-required commit-derived lastmod dates are refreshed only for the 15 modified indexed inner pages.

## Iterations

| Priority | Finding | Resolution |
| --- | --- | --- |
| P2 | Old serif typography, archive-paper texture and hard offset shadows conflicted with the approved top. | Shared sans typography, warm-white surfaces, matched spacing and soft elevation; reference and rendered pages inspected together. |
| P2 | Inherited customer hero artwork and mobile mark-only logo remained after the first pass. | Removed decorative pseudo-elements and reused the existing full brand logo at desktop/mobile sizes. |
| P2 | Light demo-bar background inherited white text. | Explicit forest text restores readable contrast. |
| P2 | The initial mobile table showed mostly row labels and only part of License. | Narrower sticky label column lets an entire product column remain readable at either horizontal edge. |
| P2 | Four vertically stacked demo KPIs consumed excess mobile space. | A two-by-two grid retains all four values and readable labels. |
| P2 | Customer logo's CSS-hidden text left an unnamed link. | Added an aria-label using existing brand copy; final Accessibility rose from 95 to 100. |
| P2 | Chinese Goals video poster requested a nonexistent localized asset path. | Corrected the path and generator; poster returns 200, MP4 range returns 206 and existing 900×700 / 12s recording plays and seeks. |

## Browser evidence

- Chrome DevTools MCP, all 20 URLs × 1440 / 1024 / 390 CSS pixels, DPR 1, height 844: 60 full-page screenshots and layout measurements. Additional 320 / 768 / 820 / 1920 checks across all 8 representative page types found no page-level overflow.
- Saved baseline: `output/quiet-pages/before-*.jpg`; final matrix: `final-*.jpg`; later License/Goals fixes: `postfix-*.jpg`. Full-page captures are real browser screenshots. Header, typography, surfaces, tables, forms, mobile stacking and representative locale line breaks were visually inspected.
- All 60 measurements have document scroll width equal to viewport width, no broken img elements and the same heading/control font stack. Measured local CLS spans 0–0.0811. This is local lab evidence, not field performance or iPhone/Safari certification.
- Console/network matrix: no new script errors or failing assets. The sole observed resource failure was the pre-existing Chinese poster; after correction all three locale/width Goals rechecks have no console errors. Expected inner scrolling in data tables and code panes is not page overflow.
- License selection and corresponding existing prices were verified across all three locales and widths. Desktop native click and mobile Enter activation also verified selection. No price was rewritten.
- Each locale's Demo passed receive (20→25 in Osaka), transfer, count, ship, insufficient-stock error with no mutation, no-match search, and reset to 326 / 20 / 346, action count 0.
- Contact required-field validation, confirmation, edit-back and retained input were verified in every locale using disposable local sample text. Turnstile was stubbed only in the browser verification document to avoid external challenge loading; no final Send click or POST was performed.
- Existing mobile sheet links remain hit-testable above the backdrop; Escape closes it and restores visible focus to the menu button. News article opens, scrolls internally, and closes with Escape. Locale navigation remains sourced from unchanged alternate links.
- Admin authentication, uploads, CMS mutations, customer status lookup, orders, payments and real contact delivery were not performed.

## Automated validation

- `node --test scripts/test_quiet_pages.mjs scripts/test_quiet_form_preview.mjs`: 26/26 passed. Preservation test compares the 20 HTML files against baseline `e13457ad75068fa753b3f6dc6705d1aa1de2a61c`, allowing only theme link/body class, corrected poster path and customer logo aria-label. Public home content, robots, translation dictionary, sitemap topology and canonical/hreflang/JSON-LD content are preserved.
- `npm run validate`: passed after matching the existing asset build key and updating required commit-derived lastmods.
- `python3 scripts/generate_sitemap.py --check`: passed; `node scripts/generate_zh_locale.mjs --check`: all seven Chinese pages current.
- `python3 -m unittest discover -s scripts -p 'test_sitemap_lastmod.py'`: 3/3 passed.
- JavaScript syntax and both staged/unstaged diff whitespace checks: passed. This static repository has no separate build or lint script.
- Existing Our Goals content/media, source-led redesign and production pre-release commerce-gate test scripts: 3/3 passed; the commerce test exercises the local worker with synthetic Requests, not external purchases.
- Lighthouse snapshot: Accessibility 100 and Best Practices 100 on all 20 mobile pages. Public-page SEO scores are 100. CMS SEO 83 reflects its unchanged missing description on a noindex administration page.
- Existing unscored Lighthouse warnings remain outside this design-only scope: locale picker accessible label does not contain the current locale text, and Demo's final action column has an empty source header. Scores of 100 are not full WCAG certification; no interaction or visible copy was changed to silence those inherited warnings.

## Changed-file inventory and boundaries

- Page HTML: `{license,demo,goals,news,contact,order}.html` plus each `ja/` and `zh/` counterpart; `customer.html`, `cms-admin.html`.
- Shared UI: `quiet-pages.css`.
- Local preview and verification: `scripts/dev-server.mjs`, `scripts/generate_zh_locale.mjs`, `scripts/test_quiet_pages.mjs`, `design-qa.md`.
- Generated SEO dates: `sitemap-lastmod.json`, `sitemap.xml`.
- Prior approved homepage assets/preview files remain preserved and were not rewritten in this task.
- The earlier homepage preview's commercial copy and release/currency choices are not propagated to existing inner pages in this design-only request. Public rollout still requires content alignment decisions separately.
- No push, PR, merge or deployment was performed. Local 127.0.0.1 preview is available on this Mac only and is not an iPhone-shareable public URL. Physical-device Safari and authenticated/back-end flows remain unverified.

No actionable P0/P1/P2 visual regression remains in the checked design scope.

final result: passed

---

# Design QA — Quiet Form dynamic homepage preview, 2026-10-05

## Scope and visual source

- Local preview only: `quiet-form.html`, `ja/quiet-form.html`, and `zh/quiet-form.html`. The public homepages, license terms, demo engine, canonical URLs, sitemap, robots.txt, and JSON-LD are unchanged. Preview documents explicitly use `noindex,nofollow`.
- Approved source: `/Users/junenature/.codex/generated_images/01a09ff4-cb43-7e40-9219-753898992b07/exec-d95ac91a-322a-4653-82e2-4233f173829e.png` (948 × 1660), the user's second final Quiet Form board, containing Desktop 1440 and Mobile 390 layouts. The source and final rendered Japanese desktop/mobile captures were inspected together; English mobile and Chinese tablet were also visually inspected.
- Final real-browser captures: `output/quiet-form/{ja,en,zh}-{1440,1024,390}-v2-final.jpg`, exact CSS viewport widths at DPR 1, height 844. Additional overflow checks covered 320 and 768px. These are Chrome screenshots, not generated presentation images.
- Two generated transparent product assets faithfully follow the approved board: an ivory inventory sculpture with a green update arrow for License; a larger customizable application sculpture with a wrench for Plus. They were generated as individual cutouts, visually inspected, and optimized to 960 × 960 WebP (about 94KB combined). They do not contain copied Apple artwork, code symbols, text labels, or a generated application screenshot.
- Figma was not needed for this image-selected implementation. Existing gallery tokens, logo, mobile navigation, local font, and the actual public demo engine were reused; no framework or dependency was added.

## Iterations and fidelity

| Priority | Finding | Resolution and evidence |
| --- | --- | --- |
| P1 | A purely decorative demo would imply inventory changes without actually performing them. | Reused `demo-v1.js` and the existing form. The finite sequence chooses a product, selects Osaka, enters five units, and submits the real receive operation. Osaka changes 20 → 25 and total 346 → 351. No second stock model, server connection, persistence, or telemetry was introduced. |
| P2 | Japanese hero text left an isolated final character on narrow screens. | Controlled the two headline lines and mobile sizing; final 390px capture has balanced lines without clipping. |
| P2 | Header language placement and the footer logo's inherited height diverged from the selected board. | Scoped navigation positioning and explicit logo dimensions corrected alignment and removed the blank footer box. |
| P2 | A transparent product image's box extended outside its tablet column. | Bounded image and column dimensions; all nine final locale/width combinations have document scroll width equal to viewport width and no unintended out-of-bounds elements. |
| P2 | Hiding the mobile inventory table also hid its reset button. | Moved the existing reset control into the compact toolbar at mobile widths without replacing its event listeners. Selected-stock totals below the form reflect the actual rendered inventory row. |
| P2 | Automatic motion needed accessible stopping and reduced-motion behavior. | Added pause/replay, stop on manual interaction, offscreen/hidden-tab pausing, and no automatic playback under reduced motion. Explicit reduced-motion playback applies the operation immediately. Keyboard focus is visible; the inherited bottom sheet makes background content inert and restores focus after Escape. |
| P2 | Original sculpture files were disproportionately heavy. | Replaced large PNG delivery with alpha WebP. Local final trace reports LCP 350ms and CLS 0.00; these are unthrottled local lab values, not production or physical-device performance claims. |

- Type, color, and hierarchy: calm forest hero, warm white surfaces, existing Inter/platform locale fonts, restrained raised controls, a centered two-product comparison, and the approved headings and release date.
- Imagery: update-cycle and app-customization sculptures remain the hero and comparison anchors. Plus has a larger silhouette; neither icon uses code brackets.
- Functional departures from the static board are deliberate: explicit play/reset controls, minimum 44px control targets, a searchable desktop inventory table, a readable mobile selected-stock summary, and real success/error states. The compact bottom-sheet menu appears only when opened, rather than being permanently displayed as in the source board's demonstration state.
- Existing navigation and locale destinations remain actual HTML links. Both terms links use the existing comparison anchor rather than inventing an unsupported query-based selection behavior.

## Validation evidence

- Chrome DevTools MCP: Japanese, English, and Simplified Chinese at 1440, 1024, and 390px. Final matrix: zero broken images, zero page overflow, and zero console warnings/errors. Loaded assets returned successfully; the preview introduces no third-party requests or data submissions.
- Actual demo operations: receive, transfer, stock count, shipment, insufficient-stock error (no mutation), reset, and empty search. Receive was additionally checked in every locale/width combination. Motion completion, pause, offscreen stopping, reduced-motion behavior, native Tab focus, and bottom-sheet Escape/focus restoration were checked.
- Lighthouse snapshot audits: Accessibility 100 and Best Practices 100 for Japanese desktop/mobile and English/Chinese mobile. Preview SEO 83 is expected from intentional noindex and omitted preview description; it is not a public-site SEO regression. These checks are not a full WCAG certification.
- Repository validation passed; preview static/semantic/link tests passed 4/4; sitemap lastmod tests passed 3/3; JavaScript syntax checks passed; diff whitespace checks passed. The repository has no separate conventional build or lint script.

## Publication boundary

No actionable P0, P1, or P2 visual/runtime issue remains in the checked preview states. iPhone and other physical devices have not been tested; 390px touch emulation is browser evidence only. This local address is not reachable from the user's iPhone. A shareable preview requires a separate publishing step.

The preview shows the user-approved November 1, 2026 release date and Japanese-yen amounts in all three languages. It includes required License Updates and continued use of the existing version after Updates end. Public commercial pages still have their earlier conditions and international price presentation; before public rollout, those pages and localized currency presentation must be aligned and release authorization confirmed. Passing design QA does not authorize sales or publication.

final result: passed

---

# Design QA — Homepage comparison refinement, 2026-09-24

## Source and rendered comparison

- Source visual truth: the three user-supplied screenshots identifying the workflow band, development-notes sheet, and four-row guide block to remove, together with the current homepage typography, paper texture, forest/orange accents, fine rules, and `section-frame` rhythm.
- Reproducible combined comparison: `docs/design-review/home-comparison-20260924/comparison.html`. It places the production plan surface and the new local comparison surface together, plus Japanese and Simplified Chinese 390 × 844 views.
- Browser checks: Japanese, English, and Simplified Chinese across 320, 360, 375, 390, 428, 768, 820, 1024, 1280, and 1440px-wide viewports. Focused visual captures cover 320px Japanese, 390px Japanese/English, 1024px Simplified Chinese, and 1440px Japanese.

## Findings and iteration history

| Priority | Finding | Fix | Post-fix evidence |
| --- | --- | --- | --- |
| P1 | The workflow band and development-notes sheet repeated ideas already explained elsewhere and separated the product story from the comparison. | Removed both blocks and moved the static HTML comparison directly after the story section, before the plans. | All three locales now follow the same story → comparison → plans sequence. |
| P1 | The starting-point link and the compact four-link product-guide list repeated explanations already available on the plan-terms page. | Removed both homepage link groups while keeping each product card’s plan-terms link. The underlying detail pages remain unchanged. | Story → comparison → plans now reads as one continuous decision path in all three locales. |
| P1 | Long prose, an explanatory symbol legend, and two notes around the table made the comparison slower to scan. | Reduced the block to the heading, short introduction, and comparison table. Each cell retains ○ / △ / × / — plus a short textual label, so assistive technology does not need the decorative symbol to understand it. | Each locale exposes 18 symbol-and-label cells across the same six comparison rows with no legend or surrounding notes. |
| P1 | FDE IMS License Plus deliverables were marked △ solely because the product is still in development, even though those capabilities define the product being offered. | Changed all six License Plus entries to ○ and named the delivered capability directly: interface, internal modification, full source, one-time purchase, customer-managed server, and purchaser-managed updates/security. | Development and purchase availability remain stated in the section introduction and plan area; the table now compares the intended product models rather than release timing. |
| P2 | A four-column table cannot remain readable at 390px without either tiny type or an alternate interaction. | Kept 13px body type, added a keyboard-focusable horizontal region, and made the row-heading column sticky with an opaque paper background. | At 390px the document has zero overflow; the table region is 350px wide with 760px scroll content and reaches the FDE IMS column at `scrollLeft=410`. |
| P2 | The first sticky-column version covered the beginning of the final FDE IMS column at the right edge. | Rebalanced the mobile table to 16% row headings and 28% data columns. | At the right edge the 122px row-heading column and 213px FDE IMS column both fit inside the 350px region without text overlap. |
| P2 | At 768px and 820px the table needed a short horizontal scroll, but its row headings were only sticky below 760px. | Extended sticky row headings through 980px, covering the full range where the 920px table can overflow inside the page frame. Mobile widths retain the narrower 16% / 28% column proportions. | Tablet users can keep each comparison item visible while scrolling to the SaaS and FDE IMS columns; 1024px and wider continue to show the whole table without scrolling. |

## Required fidelity surfaces

- Typography and spacing: reuses the existing serif/sans/mono hierarchy, `section-frame` widths, and section rhythm.
- Color and material: uses existing paper, forest, orange, sage, and rule tokens. The FDE IMS column receives restrained emphasis without a ranking badge.
- Content: the comparison explains differences in ownership, change scope, infrastructure, pricing model, and update/security responsibility without claiming universal superiority. The FDE IMS column marks defined License Plus capabilities with ○; every symbol is paired with a visible text label.
- Responsive behavior: no page-level horizontal overflow in the checked 320–1440px matrix. The table retains 13px text; it scrolls inside its named region at 320–820px, keeps row headings sticky through tablet portrait widths, and fits without scrolling at 1024px and above.
- Accessibility: native `table`, `caption`, `thead`, `tbody`, `th scope="col"`, and `th scope="row"`; the overflow region is named and keyboard focusable.
- Runtime: the checked English mobile state reported zero console warnings or errors. Removed workflow, development-notes, and duplicated-guide selectors were absent from the checked DOM.

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

## 2026-10-07 final approved Quiet Form renewal and A01

The approved W01–W08 compositions are implemented in English, Japanese and Simplified Chinese. A01 combines the selected forest sidebar with the selected article-list/editor workspace. Existing brand artwork, tokens and components are reused. A01 remains Japanese-only; its original authentication, GitHub writes, translation, publishing, staging lock and media handling runtimes are byte-for-byte unchanged. The presentation adapter moves original nodes and delegates article selection through the original select/change handler. No external transmission, persistent storage, tracking or new dependency was added.

### Source comparison and visual corrections

Reference: the approved A01 refined board, `/private/tmp/fde-a01-review-checkout.Indnek/dist/a01-refined.png`. Rendered comparison: `output/final-20261007/a01-comparison.png` plus final native Chrome captures at 1440, 1024 and 390px. The board and actual responsive implementation were opened together. The approved navigation/list/editor architecture, forest/ivory palette, restrained borders and shallow shadows match; existing longer CMS security instructions and original input names intentionally differ from the short concept copy. The source artwork is reused rather than recreated. Public page contact sheets cover eight pages, three locales and all three sizes.

- P2 fixed: shared CSS specificity initially made the sidebar states and textarea inconsistent. Scoped state rules and a 260px editor minimum restore hierarchy.
- P2 fixed: Mobile menu trigger inherited full-width styles and overlapped the brand. Explicit intrinsic width and scoped colors correct it; native dialog and Escape focus restoration pass.
- P2 fixed: low-contrast image-preview placeholder. The existing muted token now passes Lighthouse.
- P2 fixed: article dates and titles were unnecessarily stacked; use a compact date/title grid and an intrinsic-width new-article button.
- P2 fixed during public regression: Mobile Contact shortcut could pick a language alternate on the Contact page. Exclude hreflang links from shortcut discovery; English/Japanese/Chinese local destinations and hit targets pass, with a new regression test.

### Current verification

- Native Chrome DevTools: 24 public routes × 1440/1024/390px = 72 checks. No document overflow, missing images, JavaScript errors or HTTP resource failures. One h1 per route; canonical and four language alternates retained. Maximum observed loading CLS: 0.01824 (lab snapshot, not field certification).
- All nine locale/size License and Plus switch checks pass; prices change with selection and controls scroll away normally. Japanese amounts are 49,800 / 99,800円; English/Chinese original USD candidate amounts remain unchanged.
- Shared Mobile sheet links are hit-testable above the backdrop in all three languages. Escape closes and restores focus. Existing three-language destinations are preserved.
- Contact: native input → review → edit passes without sending an inquiry; FAQ expands. Demo: receiving five units and switching views passes using temporary synthetic data. W08: invalid input, local review and edit pass; no order lookup or external write is performed. Purchasing/order/payment remain disabled.
- A01: original article selection, new article, mocked create/save/translation and FAQ switching pass; no real GitHub/CMS write occurred. Mobile dialog/tab/Escape and final Desktop/Mobile visual inspection pass with no overflow.
- Lighthouse snapshots: A01 Desktop and Mobile Accessibility 100 / Best Practices 100. Private noindex CMS SEO 83 is unchanged in intent (no public description); no SEO expansion is made. Sample public Chinese License Desktop and Japanese/Chinese Customer Mobile score 100 for Accessibility, Best Practices and SEO.
- 91 related Node tests pass, 0 fail/skip; repository validation, Chinese eight-page generation check, sitemap check and three sitemap tests pass. The static repository has no separate build or lint command. Earlier two A01 baseline assertions failed because they prohibited the newly approved presentation markup; narrowed normalization and protected-runtime byte comparisons replace those obsolete assertions, then the full suite passed.
- A failed pre-commit main integration refused to overwrite the staged QA report. No merge was accepted. A transient zero-byte gallery stylesheet was recovered exactly from HEAD; its diff is empty and no tracked source is zero-byte. The original checkout's unrelated duplicate/untracked files remain untouched.

Browser sizes are Chrome emulation, not physical iPhone/Safari acceptance. CMS write verification is isolated mock evidence, not a production article publication. IMS-native release, real commerce, order lookup and the planned smooth IMS footage replacement remain outside this UI renewal.

PR #86's first exact-head CI failed 21 contract assertions after the existing build-sync bot changed only dated JS/CSS query keys. Those tests now normalize only the established `file.js?v=YYYYMMDD-HHMMSS` / CSS equivalent; copy, routes, conditions and runtime behavior remain exact comparisons. A negative normalization test proves unrelated dates, prices, HTML routes and query parameters are not ignored. The failed initial run remains preserved; normal exact-head CI is required again before merge.

The complete local rerun passes all 92 tests without skips after this bounded test correction. Repository validation also passes on the synchronized build.

The build-sync validation also exposed a legacy pre-staging assertion requiring the retired modal-only `data-demo-open` control. The approved W01 uses an inline demo and a normal localized Demo link. The assertion now accepts either the original trigger or the complete approved inline contract (IMS root, demo runtime and Quiet Form class), while still requiring the Japanese relative Demo link. Backend/Turnstile/CMS staging isolation checks remain unchanged.

final result: passed
