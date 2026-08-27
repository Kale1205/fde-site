# P2-7 EULA同意保存 → Stripe Sandbox Checkout → Webhook確認

この手順は `kales-fde-contact-staging` Worker専用です。公開サイトの購入ボタン、本番Stripe決済、自動納品、実メール送信は有効化しません。

## P2-7で確認するもの

1. staging専用のテスト注文を作成する。
2. `FDE-IMS-STAGING-EULA-2026-08-27` へのテスト同意をKVへ保存する。
3. 保存時刻はブラウザ入力ではなくWorkerのサーバー時刻で記録する。
4. 同意イベントをappend-only audit logへ保存する。
5. EULA同意済み注文だけStripe Sandbox Checkout Sessionを作成できることを確認する。
6. Sandbox支払い後、署名検証済みWebhookで注文が `payment_confirmed` へ遷移することを確認する。

このEULA版はstagingテスト専用であり、正式な商用EULAではありません。

## テスト画面

P2-7がstagingへデプロイされた後、次をブラウザで開く。

`https://kales-fde-contact-staging.reyouinjune.workers.dev/__staging/p2-7`

この画面はstaging Workerからのみ配信され、production Workerには含めない。

## 操作キー

画面の「Staging Checkout操作キー」には、Cloudflare Secret `STAGING_CHECKOUT_SETUP_KEY` に登録済みの値を入力する。

- Slackへ貼らない。
- GitHubへ貼らない。
- URLやクエリ文字列へ入れない。
- このQA画面はlocalStorage / sessionStorageへ操作キーを保存しない。

## Checkout有効化

EULA保存機能のデプロイとhealth確認が終わってから、Cloudflareのstaging Workerで `STAGING_CHECKOUT_ENABLED` を `true` に変更してDeployする。

`true` にしても次の制御は維持される。

- Stripe Sandbox Session (`livemode=false`) のみ許可。
- 公開サイトに購入ボタンを追加しない。
- production WorkerのStripe決済を有効化しない。
- Webhook支払い確認と納品処理を分離する。

## QA画面の操作順

1. 操作キーを入力する。
2. 最初の確認では `FDE IMS License` / `JPY` を選ぶ。
3. 「テスト注文を作成」を押す。
4. License / EULA概要を確認する。
5. stagingテスト同意のチェックを入れる。
6. 「EULA同意を保存」を押す。
7. 「Sandbox Checkoutを作成」を押す。
8. 表示された「Stripe Sandbox Checkoutを開く」を別タブで開く。
9. StripeのSandboxテストカードで支払いを完了する。
10. QA画面へ戻り「注文状態を確認」を押す。
11. `webhookConfirmed: true` および `orderStatus: payment_confirmed` を確認する。

## healthで確認する項目

`https://kales-fde-contact-staging.reyouinjune.workers.dev/__staging/health`

P2-7デプロイ後は少なくとも次を確認する。

```json
{
  "p2": {
    "stripeWebhookConfigured": true,
    "stripeCheckoutConfigured": true,
    "eulaAcceptanceBoundaryEnabled": true,
    "eulaVersion": "FDE-IMS-STAGING-EULA-2026-08-27",
    "p27QaEnabled": true,
    "livePaymentsEnabled": false
  }
}
```

Checkout疎通前は `stripeCheckoutActivationEnabled=false` のままでよい。実際にSandbox Checkoutを試す直前だけ `true` にする。

## 完了条件

- EULA版とWorker生成の同意日時が注文レコードへ保存される。
- `eula_accepted` audit eventが保存される。
- EULA未同意ではCheckoutが拒否される。
- Checkout Sessionが `cs_test_...` で作られる。
- Stripe Webhookが署名検証される。
- 注文が `awaiting_payment → payment_confirmed` へ遷移する。
- `livePaymentsEnabled=false` を維持する。
