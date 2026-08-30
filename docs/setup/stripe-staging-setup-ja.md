# 2商品 Stripe Sandbox / Cloudflare staging 設定計画（Checkout実行禁止）

現在の商品構成はLicenseとLicense Plusの2商品です。UpdatesはLicense専用の任意Add-onであり、単独商品ではありません。コード上のallowlistは2商品へ更新済みですが、Price IDの本設定やCheckoutの有効化はまだ行いません。

公開サイトの基準は次のとおりです。

| 商品 | 日本語サイト | 英語サイト | 備考 |
|---|---:|---:|---|
| License | 49,800円・買い切り | $349候補・one-time | 購入後3か月のUpdates相当を含む |
| License Plus | 99,800円・買い切り | $699候補・one-time | Full source、社内改変権、技術資料、Customer Server / Self-hosted運用を予定。Updates特典なし |

License購入後3か月が終了しても、その時点のVersionは永続利用できます。Updates Add-onは4〜6か月目が月額4,900円（$31候補）、7か月目以降が月額9,800円（$62候補）で、明示的な申込みが必要です。有料契約へ自動移行しません。License Plusは別商品で、差額UpgradeとUpdates Add-onの対象外です。USDは未承認候補で、最終価格ではありません。

Stripe設定では、2商品のPrice ID、日英それぞれの固定通貨、サーバー側allowlist、EULA、Webhook、解約、fulfillment境界を一体で再検証する必要があります。Updates Add-onは購入日による対象期間と継続権利の実装・レビューが終わるまでCheckoutへ追加しません。上記候補価格をStripeへ登録せず、Sandbox検証が完了するまでCheckout、本番決済、納品、顧客ポータルは無効のままです。

## 先に守ること

- `STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`STAGING_CHECKOUT_SETUP_KEY` の値は、GitHub、Slack、ドキュメント、スクリーンショットへ貼らない。
- Stripe画面が **Sandbox** であることを確認する。Live modeのキーやPriceを使わない。
- Cloudflareでは、秘密値は `Secret`、Price IDとURLは通常の `Text` として登録する。
- 本番Worker `kales-fde-contact` には今回の値を登録しない。

## 1. Stripe Sandboxを選ぶ

1. Stripe Dashboardへログインする。
2. Sandboxを新規作成するか、Baked Kaleのstaging専用Sandboxを開く。
3. 以後、画面上でSandbox名が表示されていることを毎回確認する。

## 2. ProductとPrice（設定前レビュー用）

次の値を基準にします。USDは未承認候補のため、最終承認前にPriceを作成しないでください。

| Stripe Product | Price種別 | 通貨 | 金額 | Cloudflare変数名 |
|---|---:|---:|---:|---|
| FDE IMS License | One time | USD | 349.00候補 | `STRIPE_PRICE_LICENSE_USD` |
| FDE IMS License | One time | JPY | 49,800 | `STRIPE_PRICE_LICENSE_JPY` |
| FDE IMS License Plus | One time | USD | 699.00候補 | `STRIPE_PRICE_LICENSE_PLUS_USD` |
| FDE IMS License Plus | One time | JPY | 99,800 | `STRIPE_PRICE_LICENSE_PLUS_JPY` |

Updates Add-on用Priceはまだ作成せず、旧`STRIPE_PRICE_UPDATES_*`を再利用しません。

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

## 5. Price IDと戻り先URL（設定前レビュー用）

次の変数をstaging Workerが参照します。レビューとSandbox検証前にCheckoutを有効化しないでください。

| Variable name | Value |
|---|---|
| `STRIPE_PRICE_LICENSE_USD` | 手順2のUSD 349.00候補の `price_...` |
| `STRIPE_PRICE_LICENSE_JPY` | 手順2のJPY 49,800の `price_...` |
| `STRIPE_PRICE_LICENSE_PLUS_USD` | 手順2のUSD 699.00候補の `price_...` |
| `STRIPE_PRICE_LICENSE_PLUS_JPY` | 手順2のJPY 99,800の `price_...` |
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

現在の2商品構成でも、Cloudflareの `STAGING_CHECKOUT_ENABLED` を `true` に変更しないでください。stagingデプロイとhealth checkは `false` を必須条件として扱います。

2商品のPrice ID、EULA、サーバー側allowlist、Webhook、解約、fulfillment境界、日英固定通貨のレビューが完了した後、新しいSandbox QA手順を作成します。Updates Add-onは購入日と権利判定の設計が完了するまで対象外です。それまではCheckout疎通確認を再開しません。

## トラブル時に共有してよい情報

共有してよいものは、health response、HTTP status、`CHECKOUT_...` / `STRIPE_...` のエラーコード、StripeのRequest ID、Price IDである。APIキー、Webhook signing secret、操作キーは共有しない。
