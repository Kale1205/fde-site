# Stripe Sandbox / Cloudflare staging 設定手順（P2-6）

この手順は `kales-fde-contact-staging` Worker 専用です。実売上は発生しません。公開サイトの購入ボタンと本番決済は、別途リリース承認されるまで無効のままです。

## 先に守ること

- `STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`STAGING_CHECKOUT_SETUP_KEY` の値は、GitHub、Slack、ドキュメント、スクリーンショットへ貼らない。
- Stripe画面が **Sandbox** であることを確認する。Live modeのキーやPriceを使わない。
- Cloudflareでは、秘密値は `Secret`、Price IDとURLは通常の `Text` として登録する。
- 本番Worker `kales-fde-contact` には今回の値を登録しない。

## 1. Stripe Sandboxを選ぶ

1. Stripe Dashboardへログインする。
2. Sandboxを新規作成するか、Baked Kaleのstaging専用Sandboxを開く。
3. 以後、画面上でSandbox名が表示されていることを毎回確認する。

## 2. ProductとPriceを作る

Stripeの `Product catalog` で次の2商品、合計4つのPriceを作成する。Price作成後に表示される `price_...` をメモする。これは公開識別子でありSecretではないが、stagingとproductionを混ぜないこと。

| Stripe Product | Price種別 | 通貨 | 金額 | Cloudflare変数名 |
|---|---:|---:|---:|---|
| FDE IMS License | One time | USD | 313.00 | `STRIPE_PRICE_LICENSE_USD` |
| FDE IMS License | One time | JPY | 49,800 | `STRIPE_PRICE_LICENSE_JPY` |
| FDE IMS Updates | Recurring / Monthly | USD | 62.00 | `STRIPE_PRICE_UPDATES_USD` |
| FDE IMS Updates | Recurring / Monthly | JPY | 9,800 | `STRIPE_PRICE_UPDATES_JPY` |

最初の1年間だけ月額4,900円にするルールは、商用ルールを再確認するまでStripeへ作成しない。

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

## 5. Price IDと戻り先URLをCloudflareへ登録する

Cloudflareの `kales-fde-contact-staging` → `Settings` → `Variables and Secrets` で、次をすべてType `Text` として追加する。

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

## 8. Sandbox Checkoutを有効化するタイミング

EULAの版と同意日時をstaging注文へ保存する次工程が完了し、テスト担当者が疎通確認する直前にだけ、Cloudflareの `STAGING_CHECKOUT_ENABLED` を `true` へ変更してDeployする。

このスイッチをtrueにしても、Stripe Sandbox Sessionしか受理せず、公開サイトに購入ボタンは出ず、本番決済も有効にならない。疎通確認後、継続利用しない場合は `false` に戻す。

## トラブル時に共有してよい情報

共有してよいものは、health response、HTTP status、`CHECKOUT_...` / `STRIPE_...` のエラーコード、StripeのRequest ID、Price IDである。APIキー、Webhook signing secret、操作キーは共有しない。
