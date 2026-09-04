# FDE IMS SEO・AI検索マップ

更新日: 2026-09-04

## 公開検索の基準点

2026年9月4日の公開検索調査では、対象とした日本語・英語の一般検索語について、取得できた上位結果内にBaked Kale FDEのサイトは確認できなかった。日本語トップページはインデックスを確認できた。英語トップページは今回の検索結果内では確認できなかったが、検索結果への未表示だけでは未インデックスと断定しない。

## 検索意図と正規ページ

| 検索意図 | 日本語の対象語 | 英語の対象語 | 日本語URL | 英語URL |
|---|---|---|---|---|
| ブランド・製品 | Baked Kale FDE、FDE IMS、FDE IMS 在庫管理 | Baked Kale FDE、FDE IMS、FDE IMS inventory software | `/ja/` | `/` |
| 買い切り | 買い切り 在庫管理ソフト | one-time purchase inventory software | `/ja/one-time-purchase-inventory-software.html` | `/one-time-purchase-inventory-software.html` |
| ソースコード | ソースコード付き 在庫管理システム | inventory software with source code | `/ja/inventory-software-with-source-code.html` | `/inventory-software-with-source-code.html` |
| 自社運用 | 自社サーバー運用 在庫管理ソフト | self-hosted inventory management software | `/ja/self-hosted-inventory-management-software.html` | `/self-hosted-inventory-management-software.html` |
| 小規模企業 | 小規模企業向け 在庫管理ソフト | small business inventory management software | `/ja/small-business-inventory-management-software.html` | `/small-business-inventory-management-software.html` |

「複数倉庫 在庫管理」は対応範囲が未確定のため、対象ページを割り当てない。対応済み、提供予定、特定構成で利用可能と読める訴求も行わない。既存FAQでは未確定であることだけを説明する。

## クロール・言語設定

- すべての正規ページは初期HTMLにtitle、description、H1、本文、通常の内部リンクを含める。
- 各日英ページは自己canonicalとし、日本語を英語へcanonical統合しない。
- `en`、`ja`、`x-default`を日英で相互参照する。`x-default`は英語版を指す。
- `sitemap.xml`には日英の正規URLだけを含め、プレビューURLやCloudflare Worker URLは含めない。
- 対象ページに`noindex`を置かない。購入・管理画面など既存の非公開対象は従来のnoindexを維持する。
- Contactの主要FAQとNewsの主要記事は、JavaScriptが実行されない場合にも静的フォールバックを表示する。

## robots.txtの制約

GitHub Pagesのプロジェクトサイトに置いた `/fde-site/robots.txt` は、ホスト直下の `https://kale1205.github.io/robots.txt` ではないため、robots.txt標準上のホスト全体ルールとしては扱われない。ホスト直下が404である現在は、robots.txtによる全体ブロックはない。`https://kale1205.github.io/fde-site/sitemap.xml`をSearch ConsoleとBing Webmaster Toolsへ直接送信する。

## 構造化データ方針

- 提供者: `Organization` = `Baked Kale FDE`（`alternateName` = `Baked Kale`）
- 製品: `SoftwareApplication` = `FDE IMS`
- 商品条件を説明するページ: `Product`または`SoftwareApplication`との複合型
- ページ: `WebPage`、表示FAQがあるページは`FAQPage`
- 階層: 表示パンくずと一致する`BreadcrumbList`
- 開発状態: `creativeWorkStatus`と表示本文の両方で開発中を明示

Checkout、決済、納品、Installer配布を停止している間は、`Offer`、`availability`、`downloadUrl`、`installUrl`を追加しない。実在しないレビューや評価も追加しない。このためSoftwareApplicationやProductがGoogleの販売系リッチリザルト要件を満たさないことは、現在の正しい状態として許容する。

## Search Console / Bing送信手順

本番マージとGitHub Pages公開成功後に実施する。

1. `https://kale1205.github.io/fde-site/sitemap.xml`が200で返ることを確認する。
2. Google Search Consoleの対象プロパティで、上記sitemap URLを送信する。
3. URL検査で英語トップ、英語4ページ、日本語4ページを確認し、必要なページだけインデックス登録をリクエストする。
4. Bing Webmaster Toolsでも同じsitemap URLを送信する。
5. canonical、Google選択canonical、最終クロール日、検出経路を記録する。
6. 検索反映は保証せず、数日から数週間の再取得期間を置いて同じ検索語を再調査する。

## 公開前チェック

- 日英8ページのtitle、description、H1が言語内で重複していない
- canonical、hreflang、OG URL、sitemap URLが一致している
- JSON-LDが構文エラーなく、表示FAQと質問・回答が一致している
- 商品数、価格、Updates条件、開発中表記がトップ、License、専用ページ、FAQで一致している
- 複数倉庫、顧客、導入実績、レビュー、認証を事実以上に記載していない
- 360px相当とデスクトップ幅で横スクロール、文字切れ、リンク操作の問題がない
- 既存CIと本番機能停止テストがすべて成功する

