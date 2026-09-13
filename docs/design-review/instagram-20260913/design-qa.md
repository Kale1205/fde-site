# Instagram introduction layout fix — 2026-09-13

final result: passed

## Evidence and cause

1. Production EN News at 1363 × 936: failed. The photo occupied 963.67px and the text grid track collapsed to 0px in a 1200px card. The account name clipped and the description wrapped almost word by word. See before.jpg. The user supplied a screenshot of the same issue.
2. Fixed EN News at the same viewport: passed. The image is bounded to 104 × 104px, text receives 859.67px and the card is 210px high. See after-en.jpg. Colors, account, photo, description and destination remain unchanged.
3. EN/JA at 390 × 844 CSS px: passed. One-column layout, 80px photo, 28px handle, visible CTA and full-width description. Both card clientWidth and scrollWidth are 331px. See mobile-en-ja.jpg; the focus outline is visible in the JA frame. Screenshot outputs are 1348 × 926 desktop and 1363 × 936 for the paired responsive harness.

The root cause was an auto-sized first grid column with no sizing rule for CMS-uploaded photos. Fixed the first desktop column and constrained the image with object-fit:cover. The mark-only fallback retains its bounded size. Narrow layouts stack photo, copy and CTA. Handle wrapping prevents unusually long CMS values from overflowing.

Repository validation and git diff --check passed. This is a scoped CSS correction; no CMS data, external account settings or application runtime changed. Physical-device testing and a full accessibility audit were not performed.
