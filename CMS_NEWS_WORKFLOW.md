# News CMS: private draft → review → publication request

## Where content is saved

- **下書き保存** saves text in Japanese, English and Simplified Chinese, metadata and an optional image Blob in this browser's IndexedDB. It makes no GitHub or translation request. Credentials are excluded from stored/exported drafts.
- Drafts are per browser/origin. They do not sync between Mac/iPhone, private browsing, preview hosting and production. Clearing site data or browser eviction can remove them. Use **現在の下書きをバックアップ** for important work; keep the JSON file private. A backup contains text and an optional base64 image, not credentials.
- Older CMS inputs that were never saved are not automatically imported. Copy any unfinished text and retain the original image before reloading an old editing session.
- This is browser-local storage, not an encrypted server vault. Use a trusted device/browser; other code on the same origin can access its storage.

## Editing and review

1. Create/edit a draft and save locally. Existing English/Chinese values are retained; editing Japanese does not regenerate them.
2. **英語の空欄を翻訳** explicitly calls the existing translation endpoint with the existing fulfillment key. It fills only empty English fields. English can also be edited manually. Chinese is entered/reviewed manually; no new translation API, authentication or Worker change is introduced. Failure leaves every current field intact.
3. Preview Japanese, English, Chinese and the shared article/card image, then check the review checkbox. Changes invalidate the confirmation. All three title/body pairs are required for a news publication request.
4. Connect the existing GitHub token, then choose **公開依頼（PR）**. A separate confirmation warns that the draft/image will become visible in the **public GitHub branch and PR**. This is not a private-draft save and does not publish the production site immediately.

## GitHub and authority

- Target repository: `Kale1205/fde-site` only. Never send credentials to any other host; the token is session-memory only.
- Existing `Contents: write` is used for Git blobs/tree/commit/ref. Automated PR creation also requires `Pull requests: write`. The CMS never requests or changes scopes. If PR creation returns 403 after a branch is saved, the UI provides a comparison link so the owner can create the PR in GitHub using their existing account. If Contents write is unavailable, stop and ask the administrator; do not expand privileges automatically.
- Articles, optional image, all three static News HTML pages and corresponding sitemap dates are combined in one commit. A dedicated `cms/news-<draft-id>-<fingerprint>` branch is created pointing to the entire tree. There is no Contents PUT to `main`, no image-only commit to `main`, no force push and no merge/approval API.
- Existing branch protection and required `validate` are unchanged. The owner reviews the article PR after checks pass and merges in GitHub. CMS never self-approves or enables auto-merge.
- Exact-head validation status, owner approval, merge and Pages deployment are distinct. “Pages公開処理成功” is the deployment workflow's result, not a guarantee that every CDN/physical device already displays it.

## Retry and conflict behavior

- The stable draft ID and persisted request journal reuse one article ID/branch/PR across clicks, reloads, timeouts and retries. Git object writes are content-addressed; the commit date/identity are stable for that request.
- All draft state must save locally before remote mutation. A crash before local persistence stops the request. Blobs may exist after interruption, but no branch references a partial tree. Retry the **same draft**.
- Main CMS JSON changes since editing, another editor/tab's draft revision, foreign branch changes, or changes to an already-requested draft stop without overwrite. Back up local inputs, compare with current published content and resolve deliberately. A known closed/merged PR is returned rather than recreated.
- The existing build-key synchronization bot may advance the request branch only with verified cache-key-only changes. Other branch changes are rejected.
- 401/403/409/rate-limit/network/storage failures have Japanese next-action text. PR links and refreshable check/publication status remain available. Local storage failure leaves inputs on screen and offers a backup. This is not a claim of permanent retention after browser data deletion.

## Scope and verification

- News and its shared media use this workflow. The separate FAQ runtime/backend, commercial terms, main protection and token scopes are unchanged. FAQ's older direct-write flow is not fixed by this change.
- No actual unpublished user news is a test fixture. Browser QA uses an isolated context, synthetic token/translation key and a fetch stub that intercepts external API writes.
- `node --test scripts/test_cms_news_workflow.mjs` covers article-only, image replacement, all locales, partial/ambiguous requests, retry, main/branch conflicts, missing permissions, storage failure, translation failure and status distinctions.
- `CMS_GIT_INTEGRATION=1 node --test scripts/test_cms_news_workflow.mjs` additionally rehearses a synthetic news change in a disposable **local** clone, runs sitemap/HTML/locale generation and all Node tests, then removes only that generated test directory. It creates no remote branch/PR and publishes nothing.
