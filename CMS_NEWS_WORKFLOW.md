# News CMS: local draft → review → pending batch → publication request

## Where content is saved

- **下書き保存** saves text in Japanese, English and Simplified Chinese, metadata and an optional image Blob in this browser's IndexedDB. It makes no GitHub or translation request. Credentials are excluded from stored/exported drafts.
- Drafts are per browser/origin. They do not sync between Mac/iPhone, private browsing, preview hosting and production. Clearing site data or browser eviction can remove them. Use **現在の下書きをバックアップ** for important work; keep the JSON file private. A backup contains text and an optional base64 image, not credentials.
- Older CMS inputs that were never saved are not automatically imported. Copy any unfinished text and retain the original image before reloading an old editing session.
- This is browser-local storage, not an encrypted server vault. Use a trusted device/browser; other code on the same origin can access its storage.

## Editing and review

1. Create/edit a draft and save locally. Existing English/Chinese values are retained; editing Japanese does not regenerate them.
2. Paste or edit Japanese, English and Chinese manually. News does not call a translation endpoint. Changing Japanese preserves the English/Chinese text and displays a reminder to review it. The shared translation hook, key and Worker routes remain available to FAQ; their existing 7,000 UTF-16-code-unit limit is separate from News's 20,000-code-unit body input limit.
3. Preview Japanese, English, Chinese and the shared article/card image, then check the review checkbox. Changes invalidate the confirmation. All three title/body pairs are required for a news publication request.
4. Choose **公開待ちに追加**. This saves a reviewed copy locally, without GitHub authentication or transmission. In **公開待ち**, review all queued articles in Japanese, English and Chinese and confirm the batch. Connect the existing GitHub token and explicitly request publication to create one PR for the batch. A separate confirmation warns that all queued drafts/images will become visible in the **public GitHub branch and PR**. This does not publish the production site immediately.

The pending list shows the item count and individual edit/remove controls. Removing an item keeps its original local draft. Editing a draft does not silently change the queued copy: review and add it again to replace the same article's pending edit. Mixing an edit and deletion for the same article is rejected. Any queued-content change invalidates batch confirmation. Multiple deletions may leave zero public articles.

## GitHub and authority

- Target repository: `Kale1205/fde-site` only. Never send credentials to any other host; the token is session-memory only.
- Existing `Contents: write` is used for Git blobs/tree/commit/ref. Automated PR creation also requires `Pull requests: write`. The CMS never requests or changes scopes. If PR creation returns 403 after a branch is saved, the UI provides a comparison link so the owner can create the PR in GitHub using their existing account. If Contents write is unavailable, stop and ask the administrator; do not expand privileges automatically.
- All queued articles, optional images, all three static News HTML pages and corresponding sitemap dates are combined in one commit. A dedicated `cms/news-batch-<batch-id>-<fingerprint>` branch points to the complete tree. There is no Contents PUT to `main`, image-only commit to `main`, force push or merge/approval API. Shared-media changes and previously started single-article requests retain their existing single-request recovery workflow.
- Existing branch protection and required `validate` are unchanged. The owner reviews the article PR after checks pass and merges in GitHub. CMS never self-approves or enables auto-merge.
- Exact-head validation status, owner approval, merge and Pages deployment are distinct. “Pages公開処理成功” is the deployment workflow's result, not a guarantee that every CDN/physical device already displays it.

## Retry and conflict behavior

- A separate IndexedDB database stores pending batches without migrating or deleting the original draft database. Before remote writes, the batch journal freezes the reviewed manuscripts, images, base revision and fingerprint. Later draft edits are excluded from that request. Stable IDs and the journal reuse one branch/PR across clicks, reloads, timeouts and retries; retry the **same batch**. Git object writes and the request's commit identity are stable.
- All request state must save locally before remote mutation. A crash before local persistence stops the request. Blobs may exist after interruption, but no branch references a partial tree.
- Main CMS JSON changes since editing, incompatible base revisions, another tab's saved revision, foreign branch changes or changes to a frozen request stop without overwrite. Back up local inputs, compare with current published content and resolve deliberately. A known closed/merged PR is returned rather than recreated.
- An already-requested draft cannot join another batch. An unresolved batch also reserves its existing article IDs; the status refresh releases those article reservations only after verifying the matching PR is closed or merged. The original draft ID remains associated with its historical request.
- The existing build-key synchronization bot may advance the request branch only with verified cache-key-only changes. Other branch changes are rejected.
- 401/403/409/rate-limit/network/storage failures have Japanese next-action text. PR links and refreshable check/publication status remain available. Local storage failure leaves inputs on screen and offers a backup. This is not a claim of permanent retention after browser data deletion.

## Scope and verification

- News uses local pending batches; shared media and historical single requests retain their recovery path. The separate FAQ workflow/backend, commercial terms, main protection and token scopes are unchanged.
- No actual unpublished user news is a test fixture. Browser QA uses an isolated context, synthetic credentials/content and a fetch stub that intercepts external API writes.
- `node --test scripts/test_cms_news_workflow.mjs scripts/test_cms_news_batch_workflow.mjs scripts/test_cms_news_batch_safety.mjs scripts/test_cms_news_batch_ui.mjs scripts/test_cms_navigation.mjs` covers storage, manual language input, batch review, immutable snapshots, article/image/locale preservation, conflicts, permissions and recovery from ambiguous responses. Shared-hook failure coverage does not invoke an external translation service.
- `CMS_GIT_INTEGRATION=1 node --test scripts/test_cms_news_workflow.mjs` additionally rehearses a synthetic news change in a disposable **local** clone, runs sitemap/HTML/locale generation and all Node tests, then removes only that generated test directory. It creates no remote branch/PR and publishes nothing.
