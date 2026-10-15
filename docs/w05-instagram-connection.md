# W05 Instagram connection boundary

The approved design uses Instagram captions from `@kale1999_` (Creator) and
`@bakedkale` (Business). Both account types were confirmed by the owner, who has
not created a Meta developer app yet. Each account needs its own authorization.
LinkedIn personal-post integration is explicitly out of scope; its app icon is
only a link to LinkedIn's official entry point, not an invented personal profile.

## What is implemented

- Three-language bookshelf, circular navigation and article-reading dialog.
- Public profile links: `https://www.instagram.com/kale1999_/` and
  `https://www.instagram.com/bakedkale/`. Tracking parameters
  in the supplied QR URL are not needed for the destination.
- A same-origin, caption-only public feed contract in `content/instagram-feed.json`.
- A fixed twelve-bubble ring, random selection of real registered posts, pause,
  reduced-motion, offscreen/hidden-tab/dialog suspension, and readable text for
  assistive technology. No post iframe, SDK, polling, analytics or tracking.
- Explicit disconnected state. There are **no actual posts in the shipped file**.

## Still required before automatic ingestion

Reference: Meta's official [Instagram API with Instagram Login documentation](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/)
and [Meta-maintained API collection](https://www.postman.com/meta/instagram/folder/1z5vxzu/instagram-api-with-instagram-login).
Re-check the current dashboard and docs during connection; no permissions have
been granted or verified by this UI implementation.

1. The owner creates/configures a Meta app for Instagram API with Instagram Login.
2. The owner authorizes each account through Meta's normal login flow.
   Request only the read access needed for profile/media/captions; do not request
   publishing, DM or comment-management authority for this display feature.
3. Check actual access level, any review requirements and permitted off-platform
   display/storage conditions in the app dashboard and current Meta documentation.
4. Implement the authorized server-side ingestion and token-refresh path in a
   separately reviewed change. No OAuth callback, access-token storage, scheduled
   importer or new Cloudflare service has been created by this UI change.
5. Keep app secrets/tokens in server-side secret storage, never Git, static JSON,
   browser code, PR text or chat. Update/delete cached captions when a post is
   removed, permission is revoked or the applicable retention policy requires it.

## Public feed contract

`schemaVersion: 1`, `accounts` listing canonical profile URLs, usernames and each
account's connection status, and top-level `connectionStatus: "connected"`
identify an authorized caption snapshot. Only posts whose own account is marked
connected are accepted; one account's authorization cannot enable the other.
`updatedAt` records the successful sync time. Each post contains:

- `id`: Instagram media ID (string, max 128 characters).
- `author`: `kale1999_` or `bakedkale`, matching a connected account above.
- `source`: `instagram` (no LinkedIn, fabricated or AI-written post text).
- `caption`: actual published caption, max 2,200 characters.
- `publishedAt`: ISO timestamp.
- `permalink`: HTTPS `www.instagram.com/p/.../` or `/reel/.../` URL.
- `lang`: optional original-language code; do not silently translate quotations.

The browser accepts at most 24 posts and reuses six nodes per lane. Visible text
is never replaced mid-flight; recycled text changes only outside the viewport.
Each bubble displays its actual source username. Profile links remain available
even before API connection; captions are not invented or read from the QR URL.
The full captions remain available to assistive technology. Caption excerpts do
not authorize republishing third-party material or override Meta's terms.

## Asset provenance

Book surfaces were generated with the built-in ImageGen from the selected closed
and open W05 mockups. Prompts requested blank forest/ivory orthographic covers
(4:5), and a blank ivory two-page spread with thin forest binding (16:9), no text,
logos or artwork, genuine alpha, subtle paper/leather texture and clean edges.
Generated originals are preserved outside Git; optimized WebP files are used.
Existing IMS artwork and CMS lead imagery are reused without altering article data.

App icons are the actual Instagram and LinkedIn application artwork returned by
Apple's public lookup for app IDs `389801252` and `288429040` on 2026-10-15,
downloaded from Apple's `is1-ssl.mzstatic.com` artwork URLs and resized to 128px.
They retain the respective owners' trademarks. Interface arrow/X icons use the
existing Phosphor icon set and its bundled MIT license.
