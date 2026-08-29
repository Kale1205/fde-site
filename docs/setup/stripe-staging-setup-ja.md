# 旧2プラン Stripe Sandbox / Cloudflare staging 参照記録（実行禁止）

この文書が記録していた2プラン用設定は、現在の3プラン構成と一致しません。以下の既存Worker、Price ID、テストデータは移行時の参照専用です。現在の設定手順として実行しないでください。

公開サイトの基準は次のとおりです。

| プラン | 日本語サイト | 英語サイト | 備考 |
|---|---:|---:|---|
| License | 49,800円・買い切り | $349候補・one-time | 購入後3か月のUpdates相当を含む |
| License Plus | 99,800円・買い切り | $699候補・one-time | Full source、社内改変権、技術資料、Customer Server / Self-hosted運用を予定。Updates特典なし |
| Updates | 月額12,000円 | $79/month候補 | 契約中の機能・Security・互換性Update・Bug Fix。永続利用権なし |

License購入後3か月が終了しても、その時点のVersionは永続利用できます。Updatesを続ける場合は通常の月額12,000円（英語版は$79候補）へ別途申し込みが必要で、有料契約へ自動移行しません。LicenseからPlusへのUpgradeは差額50,000円（英語版は$350候補）案です。USDは未承認候補で、最終価格ではありません。

3プラン対応のStripe移行では、License Plusの追加、Updates価格の変更、License購入者向け3か月特典、日英それぞれの固定通貨、サーバー側allowlist、EULA、Webhook、解約、fulfillment境界を一体で再検証する必要があります。上記候補価格をStripeへ登録してはいけません。移行とSandbox検証が完了するまで、Checkout、本番決済、納品、顧客ポータルは無効のままです。

## 先に守ること

- `STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`STAGING_CHECKOUT_SETUP_KEY` の値は、GitHub、Slack、ドキュメント、スクリーンショットへ貼らない。
- Stripe画面が **Sandbox** であることを確認する。Live modeのキーやPriceを使わない。
- Cloudflareでは、秘密値は `Secret`、Price IDとURLは通常の `Text` として登録する。
- 本番Worker `kales-fde-contact` には今回の値を登録しない。

## 1. Stripe Sandboxを選ぶ

1. Stripe Dashboardへログインする。
2. Sandboxを新規作成するか、Baked Kaleのstaging専用Sandboxを開く。
3. 以後、画面上でSandbox名が表示されていることを毎回確認する。

## 2. 旧ProductとPrice（参照専用）

次の表は、旧2プランのSandbox検証で使った値です。現在の3プラン用Priceとして作成・再利用しないでください。

| Stripe Product | Price種別 | 通貨 | 金額 | Cloudflare変数名 |
|---|---:|---:|---:|---|
| FDE IMS License | One time | USD | 313.00 | `STRIPE_PRICE_LICENSE_USD` |
| FDE IMS License | One time | JPY | 49,800 | `STRIPE_PRICE_LICENSE_JPY` |
| FDE IMS Updates（旧） | Recurring / Monthly | USD | 62.00 | `STRIPE_PRICE_UPDATES_USD` |
| FDE IMS Updates（旧） | Recurring / Monthly | JPY | 9,800 | `STRIPE_PRICE_UPDATES_JPY` |

この旧Updates価格と旧割引ルールは廃止済みです。

## 3. Stripe APIキーを作る

1. Sandbox内の `Developers` → `API keys` を開く。
2. 新規用途ではRestricted API keyを選び、名前を `Baked Kale FDE staging Checkout` などにする。
3. Checkout Sessionを作成できる最小権限（Checkout SessionsのWrite）を付ける。Products/PricesのAPI読取は現在のWorkerでは使わない。
4. 表示されたSandboxのRestricted keyを一度だけコピーする。
5. Cloudflare Dashboard → `Workers & Pages` → `kales-fde-contact-staging` → `Settings` → `Variables and Secrets` → `Add` を開く。
6. Typeを `Secret` にし、Variable nameを `STRIPE_SECRET_KEY`、Valueにコピーしたキーを入れ、Deployする。

Restricted keyでStripe側から権限不足が返る場合は、Live keyへ切り替えず、StripeのSandboxで当該キーのCheckout Sessions権限を再確認する。

## 4. Checkout操作キーを作る

これはStripeから取得する値ではない。ステージング用のCheckout Session作成APIを、担当者以外が呼べないようにするためのランダムな鍵である。

macOS / Linuxのターミナルでは次を実行する。

```bash
openssl rand -base64 32
```

出力をパスワードマネージャーへ保存し、Cloudflareの同じ画面で次のSecretとして登録する。

- Variable name: `STAGING_CHECKOUT_SETUP_KEY`
- Type: `Secret`
- Value: 生成したランダム値

この値はCheckoutの手動疎通確認時だけ `X-FDE-Staging-Checkout-Key` ヘッダーへ入れる。

## 5. 旧Price IDと戻り先URL（参照専用）

次の変数は旧2プランWorkerが参照する値です。3プラン移行前に追加・更新してCheckoutを有効化しないでください。

| Variable name | Value |
|---|---|
| `STRIPE_PRICE_LICENSE_USD` | 手順2のUSD 313.00の `price_...` |
| `STRIPE_PRICE_LICENSE_JPY` | 手順2のJPY 49,800の `price_...` |
| `STRIPE_PRICE_UPDATES_USD` | 手順2のUSD 62.00/monthの `price_...` |
| `STRIPE_PRICE_UPDATES_JPY` | 手順2のJPY 9,800/monthの `price_...` |
| `STAGING_CHECKOUT_SUCCESS_URL` | `https://kales-fde-staging.pages.dev/fde-site/order.html?checkout=success` |
| `STAGING_CHECKOUT_CANCEL_URL` | `https://kales-fde-staging.pages.dev/fde-site/order.html?checkout=cancelled` |
| `STAGING_CHECKOUT_ENABLED` | 最初は `false` |

追加後にDeployする。コード側は上記staging Pagesホスト以外の戻り先を拒否する。

## 6. Webhook endpointと署名Secretを作る

P2-6がstagingへ反映された後に実施する。

1. Stripe Sandboxの `Workbench` → `Webhooks` を開く。
2. `Create event destination` を選ぶ。
3. Sourceは `Your account`、送信先はWebhook endpointを選ぶ。
4. Endpoint URLに次を入力する。

   `https://kales-fde-contact-staging.reyouinjune.workers.dev/__staging/stripe/webhook`

5. 次の3イベントだけを選ぶ。
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `invoice.paid`
6. Endpointを作成し、`Signing secret` のRevealを押して `whsec_...` をコピーする。
7. Cloudflareの同じWorkerへType `Secret`、Variable name `STRIPE_WEBHOOK_SECRET` として登録し、Deployする。

`STRIPE_WEBHOOK_SECRET` はAPIキーではない。Webhook endpointごとに発行される署名検証専用の値である。

## 7. 設定状態だけを確認する

ブラウザで次を開く。

`https://kales-fde-contact-staging.reyouinjune.workers.dev/__staging/health`

次が確認できれば、値そのものを表示せずに構成済みと判定できる。

```json
{
  "p2": {
    "stripeWebhookConfigured": true,
    "stripeCheckoutBoundaryEnabled": true,
    "stripeCheckoutConfigured": true,
    "stripeCheckoutActivationEnabled": false,
    "livePaymentsEnabled": false
  }
}
```

`stripeCheckoutConfigured` が `false` の場合は、手順3〜5の8項目のどれかが未登録である。Secretの値はhealth responseには表示されない。

## 8. Sandbox Checkoutは無効のまま維持する

現在の旧2プラン構成では、Cloudflareの `STAGING_CHECKOUT_ENABLED` を `true` に変更しないでください。stagingデプロイとhealth checkは `false` を必須条件として扱います。

3プラン対応、EULA、サーバー側allowlist、Webhook、解約、fulfillment境界、日英固定通貨の移行とレビューが完了した後、新しいSandbox QA手順を作成します。それまではCheckout疎通確認を再開しません。

## トラブル時に共有してよい情報

共有してよいものは、health response、HTTP status、`CHECKOUT_...` / `STRIPE_...` のエラーコード、StripeのRequest ID、Price IDである。APIキー、Webhook signing secret、操作キーは共有しない。
