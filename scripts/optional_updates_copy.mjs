// Approved 2026-10-14 Updates copy only. Never changes prices, URLs, launch
// status, commerce authority, product IDs, or a historical article's original body.
export const optionalUpdatesCopy = {
  ja: {
    label: "当社Updates<br>任意の月額契約",
    tagline: "Updatesで、最新版へ。",
    summary: "Updatesは任意契約です。未契約でも購入時のバージョンを利用でき、有料契約へ自動移行しません。",
    purchaseFact: "当社Updatesは任意の月額契約",
  },
  en: {
    label: "Our Updates<br>Optional monthly subscription",
    tagline: "Stay current with optional Updates.",
    summary: "Updates is optional. You can use the version purchased without a subscription. Paid Updates never starts automatically.",
    purchaseFact: "Optional monthly subscription to our Updates",
  },
  zh: {
    label: "官方 Updates<br>可选月度订阅",
    tagline: "按需订阅 Updates，使用最新版 IMS。",
    summary: "Updates 为可选订阅。未订阅时仍可使用购买时的版本，不会自动转为付费订阅。",
    purchaseFact: "官方 Updates 为可选月度订阅",
  },
};

const acquiredTerms = {
  ja: "Updatesで取得した版の契約終了後の扱いは、最終利用条件で明示します。",
  en: "Terms for using versions obtained through Updates after cancellation will be stated in the final license terms.",
  zh: "通过 Updates 获得的版本在订阅结束后的使用条件，将在最终许可条款中说明。",
};

// Exact, approved replacements also adapt historical fixture inputs. They are
// not a runtime rewrite and cannot hide unrelated copy or behavior regressions.
const replacements = [
  ["当社Updates<br>月額契約必須", optionalUpdatesCopy.ja.label],
  ["Our Updates<br>Monthly subscription required", optionalUpdatesCopy.en.label],
  ["官方 Updates<br>须订阅月度服务", optionalUpdatesCopy.zh.label],
  ["最新版へ、更新し続ける。", optionalUpdatesCopy.ja.tagline],
  ["Keep moving with the latest IMS.", optionalUpdatesCopy.en.tagline],
  ["持续更新，使用最新版 IMS。", optionalUpdatesCopy.zh.tagline],
  ["当社Updatesの月額契約が必須", optionalUpdatesCopy.ja.purchaseFact],
  ["Monthly subscription to our Updates required", optionalUpdatesCopy.en.purchaseFact],
  ["须订阅官方 Updates 月度服务", optionalUpdatesCopy.zh.purchaseFact],
  ["Updates終了後も、既存バージョンは利用できます。", optionalUpdatesCopy.ja.summary],
  ["When Updates ends, you can keep using your existing version.", optionalUpdatesCopy.en.summary],
  ["停止 Updates 后，仍可继续使用已有版本。", optionalUpdatesCopy.zh.summary],
  ["終了後もその時点のバージョンは使い続けられます。",
   "Updatesを契約しない場合も、購入時のバージョンを利用できます。有料契約へ自動移行しません。" + acquiredTerms.ja],
  ["The purchased version remains available if Updates is not continued.",
   "The version purchased remains available without an Updates subscription. Paid Updates never starts automatically. " + acquiredTerms.en],
  ["停止更新后，仍可继续使用已购买的版本。",
   "未订阅 Updates 时，仍可使用购买时的版本，不会自动转为付费订阅。" + acquiredTerms.zh],
  ["The first three months of Updates-equivalent service are included.", "The first three months of Updates are included."],
  ["购买后前三个月包含更新服务。", "购买后前三个月包含 Updates 更新服务。"],
  ["継続しなくても、その時点のバージョンを期限なく利用できます。",
   "Updatesを契約しない場合も、購入時のバージョンを期限なく利用できます。" + acquiredTerms.ja],
  ["購入済みLicenseと、その時点までに取得したバージョンの永続利用権は残ります。",
   "購入済みLicenseの社内利用権は残り、購入時のバージョンを利用できます。" + acquiredTerms.ja],
  ["Updatesを終了しても、購入済みLicenseとその時点までに取得したバージョンの永続利用権は残ります。",
   "Updatesを終了しても、購入済みLicenseの社内利用権は残り、購入時のバージョンを利用できます。" + acquiredTerms.ja],
  ["ソースコードなしの購入済みLicenseは、引き続き社内で利用できます。",
   "ソースコードなしの購入済みLicenseは、購入時のバージョンを引き続き社内で利用できます。" + acquiredTerms.ja],
  ["The customer may keep using the current version perpetually without continuing.",
   "Customers can keep using the version purchased without continuing Updates. " + acquiredTerms.en],
  ["The purchased License and the perpetual right to use the version obtained up to that point remain valid.",
   "The purchased License remains valid for internal use of the version purchased. " + acquiredTerms.en],
  ["Ending Updates does not remove the purchased License or the perpetual right to use the version obtained up to that point.",
   "Ending Updates does not remove the purchased License or internal use of the version purchased. " + acquiredTerms.en],
  ["The purchased perpetual License remains valid, so the customer may continue using the License version internally without source code.",
   "The purchased perpetual License remains valid for internal use of the version purchased, without source code. " + acquiredTerms.en],
  ['<tr><th scope="row">Security management</th><td>FDE</td>', '<tr><th scope="row">Security management</th><td>FDE during Updates</td>'],
  ['<tr><th scope="row">セキュリティ対応の管理</th><td>当社</td>', '<tr><th scope="row">セキュリティ対応の管理</th><td>当社（Updates契約期間中）</td>'],
  ['<tr><th scope="row">安全管理</th><td>FDE</td>', '<tr><th scope="row">安全管理</th><td>FDE（Updates 订阅期内）</td>'],
  ["3か月含む<br>以降は追加オプション", "3か月含む<br>以降は任意オプション"],
];

export const updatesNewsNotes = {
  ja: "2026年10月14日補足：この記事は2026年8月19日時点の案内です。現在の方針ではUpdatesはLicense専用の任意契約で、最初の3か月を含み、有料契約へ自動移行しません。Updatesを契約しない場合も、購入時のバージョンを利用できます。" + acquiredTerms.ja,
  en: "October 14, 2026 update: This article records the policy described on August 19, 2026. Under the current policy, Updates is an optional License-only subscription, includes the first three months, and never starts paid billing automatically. Customers can use the version purchased without subscribing to Updates. " + acquiredTerms.en,
  "zh-CN": "2026年10月14日补充：本文记录的是2026年8月19日的说明。现行政策中，Updates 是 License 专属的可选订阅，包含最初三个月，不会自动开始付费。未订阅 Updates 时，仍可使用购买时的版本。" + acquiredTerms.zh,
};

export function applyApprovedOptionalUpdates(file, source) {
  let output = source;
  for (const [old, next] of replacements) output = output.replaceAll(old, next);
  if (file === "content/zh-translations.json" && !output.includes('"FDE during Updates":')) {
    output = output.replace('"FDE": "FDE",', '"FDE": "FDE",\n  "FDE during Updates": "FDE（Updates 订阅期内）",');
  }
  if (file === "content/site-content.json") {
    const data = JSON.parse(output);
    const article = data.news.find(item => item.id === "ims-license-updates-policy-20260819");
    if (!article) throw Error("Expected historical Updates article is missing");
    for (const [locale, note] of Object.entries(updatesNewsNotes)) {
      const original = article.body[locale];
      if (typeof original !== "string") throw Error("Expected historical news locale is missing: " + locale);
      if (!original.startsWith(note + "\n\n")) {
        const historical = original.endsWith("\n\n" + note)
          ? original.slice(0, -(note.length + 2)) : original;
        output = output.replace(JSON.stringify(original), JSON.stringify(note + "\n\n" + historical));
      }
    }
  }
  return output;
}
