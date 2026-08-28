# 旧2プラン P2-7 Sandbox QA記録（実行禁止）

この文書は、旧2プランの `kales-fde-contact-staging` Workerで実施したQAの記録です。現在の3プラン、価格、権利条件とは一致しないため、再実行しないでください。`STAGING_CHECKOUT_ENABLED` は `false` のまま維持します。

3プラン対応後にQAを再開する場合は、License Plus、日英の固定通貨、License購入者向けUpdates特典、通常Updates価格、EULA、Webhook、解約、fulfillment境界を更新した新しい手順を別途レビューします。公開サイトの購入ボタン、本番Stripe決済、自動納品、実メール送信は引き続き有効化しません。

## P2-7で確認したもの（履歴）

1. staging専用のテスト注文を作成する。
2. `FDE-IMS-STAGING-EULA-2026-08-27` へのテスト同意をKVへ保存する。
3. 保存時刻はブラウザ入力ではなくWorkerのサーバー時刻で記録する。
4. 同意イベントをappend-only audit logへ保存する。
5. EULA同意済み注文だけStripe Sandbox Checkout Sessionを作成できることを確認する。
6. Sandbox支払い後、署名検証済みWebhookで注文が `payment_confirmed` へ遷移することを確認する。

このEULA版はstagingテスト専用であり、正式な商用EULAではありません。

## 旧テスト画面（現在は使用しない）

旧QAでは、P2-7をstagingへデプロイした後に次の画面を使用しました。現在は開かず、操作しないでください。

`https://kales-fde-contact-staging.reyouinjune.workers.dev/__staging/p2-7`

この画面はstaging Workerからのみ配信され、production Workerには含めない。

## 操作キー

画面の「Staging Checkout操作キー」には、Cloudflare Secret `STAGING_CHECKOUT_SETUP_KEY` に登録済みの値を入力する。

- Slackへ貼らない。
- GitHubへ貼らない。
- URLやクエリ文字列へ入れない。
- このQA画面はlocalStorage / sessionStorageへ操作キーを保存しない。

## Checkout有効化は禁止

`STAGING_CHECKOUT_ENABLED` を `true` に変更しないでください。stagingデプロイとhealth checkは `false` を必須条件として扱います。

旧QAで確認していた次の制御は、3プラン移行後の新しいQAでも維持します。

- Stripe Sandbox Session (`livemode=false`) のみ許可。
- 公開サイトに購入ボタンを追加しない。
- production WorkerのStripe決済を有効化しない。
- Webhook支払い確認と納品処理を分離する。

## 旧QA画面の操作順（履歴・再実行しない）

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

`stripeCheckoutActivationEnabled=false` を必須とします。3プラン移行と新しいQA手順の承認が完了するまで、例外はありません。

## 旧QAの完了条件（履歴）

- EULA版とWorker生成の同意日時が注文レコードへ保存される。
- `eula_accepted` audit eventが保存される。
- EULA未同意ではCheckoutが拒否される。
- Checkout Sessionが `cs_test_...` で作られる。
- Stripe Webhookが署名検証される。
- 注文が `awaiting_payment → payment_confirmed` へ遷移する。
- `livePaymentsEnabled=false` を維持する。
