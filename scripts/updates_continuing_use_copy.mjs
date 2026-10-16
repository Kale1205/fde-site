// Approved Updates continuing-use policy. Historical copy migrations stay unchanged.
// Only the three License Updates regions and four FAQ answers are in scope.
export const continuingUseCopy = Object.freeze({
  ja: Object.freeze({
    milestones: '購入後最初の6か月（無料の3か月と半額の3か月）は、継続利用権を得るための期間に算入しません。その後、Updates契約を中断なく連続6か月継続するごとに、各到達時点の版について契約終了後も継続利用する権利を取得します。途切れず継続した場合の到達時点は、購入後12か月、18か月、24か月…です。',
    endVersion: '契約終了時点の最新版へ、自動的に継続利用権が更新されることはありません。',
    afterEnd: '契約終了後に利用できるのは、購入時の版と、これらの到達時点で継続利用権を取得した版です。',
    noNewRights: '途中で契約を終了し、その期間で新たな継続利用権を取得していない場合、終了後に利用できるのは購入時の版と、それまでに継続利用権を取得した版のみです。',
    resubscription: '購入後6か月以降に契約を終了し、再契約した場合は、再契約から新たに連続6か月継続するごとに、その到達時点の版の継続利用権を取得します。以前の契約期間とは合算せず、それまでに取得した継続利用権は保持されます。',
  }),
  en: Object.freeze({
    milestones: 'The first six months after purchase (three free months and three months at half price) are excluded from the period used to earn continuing-use rights. After that, every six consecutive months of an uninterrupted Updates subscription earns the right to continue using the version at that milestone after the subscription ends. With no interruption, the milestones are 12, 18, 24 months after purchase, and so on.',
    endVersion: 'This continuing-use right does not automatically extend to the latest version at the end of the subscription.',
    afterEnd: 'After the subscription ends, you can use the version purchased and the versions for which you obtained continuing-use rights at these milestones.',
    noNewRights: 'If the subscription ends before you earn new continuing-use rights for that period, you can then use only the version purchased and versions for which you previously earned continuing-use rights.',
    resubscription: 'If you end the subscription at or after the six-month point following purchase and then subscribe again, you earn continuing-use rights for the version at each new milestone of six consecutive months from resubscribing. Time from previous subscriptions is not added. You retain the continuing-use rights you previously earned.',
  }),
  zh: Object.freeze({
    milestones: '购买后最初6个月（免费3个月及半价3个月）不计入取得持续使用权所需的期间。此后，每连续订阅 Updates 满6个月且不中断，即取得该节点版本在订阅结束后的持续使用权。若始终连续订阅，各节点为购买后12个月、18个月、24个月……。',
    endVersion: '这项持续使用权不会自动延伸至订阅结束时的最新版本。',
    afterEnd: '订阅结束后，可以使用购买时的版本，以及在这些节点已取得持续使用权的版本。',
    noNewRights: '如果中途结束订阅，且在该期间尚未取得新的持续使用权，结束后只能使用购买时的版本，以及此前已取得持续使用权的版本。',
    resubscription: '购买满6个月时或之后结束订阅并重新订阅的，从重新订阅起每连续满6个月，即取得该节点版本的持续使用权。不与此前的订阅期间合并计算，此前已取得的持续使用权予以保留。',
  }),
});

const locales = ['ja', 'en', 'zh-CN'];
const copyLocale = locale => locale === 'zh-CN' ? 'zh' : locale;
const joinCopy = (locale, parts) => parts.join(locale === 'ja' ? '' : ' ');
const policyText = locale => joinCopy(locale, Object.values(continuingUseCopy[copyLocale(locale)]));
const previousPendingTerms = {
  ja: 'Updatesで取得した版の契約終了後の扱いは、最終利用条件で明示します。',
  en: 'Terms for using versions obtained through Updates after cancellation will be stated in the final license terms.',
  'zh-CN': '通过 Updates 获取的版本在订阅结束后的使用条件，将在最终许可条款中说明。',
};

const previousFaqAnswers = {
  'updates-term': {
    ja: 'Updatesを終了すると、FDEによる新しい更新の提供は止まります。購入済みLicenseの社内利用権は残り、購入時のバージョンを利用できます。Updatesで取得した版の契約終了後の扱いは、最終利用条件で明示します。',
    en: 'When Updates ends, FDE stops providing new updates. The purchased License remains valid for internal use of the version purchased. Terms for using versions obtained through Updates after cancellation will be stated in the final license terms.',
    'zh-CN': 'Updates 结束后，FDE 将停止提供新的更新。购买的 License 仍允许内部使用购买时的版本。通过 Updates 获取的版本在订阅结束后的使用条件，将在最终许可条款中说明。',
  },
  'license-updates-entitlement': {
    ja: 'Licenseには購入後3か月のUpdatesが含まれます。4〜6か月目は月額4,900円、7か月目以降は月額9,800円で、希望する場合だけ継続できます。Updatesを契約しない場合も、購入時のバージョンを期限なく利用できます。Updatesで取得した版の契約終了後の扱いは、最終利用条件で明示します。有料契約へ自動移行することはありません。',
    en: 'License includes the first three months of Updates. Optional continuation is a $31/month USD candidate for months 4–6 and a $62/month USD candidate from month 7. Customers can keep using the version purchased without continuing Updates. Terms for using versions obtained through Updates after cancellation will be stated in the final license terms. Updates never starts automatically, and all USD figures are unapproved candidates pending final international pricing.',
    'zh-CN': 'License 包含购买后前三个月的 Updates。之后可自愿继续订阅：第 4–6 个月的美元候选价格为每月 31 美元，第 7 个月起为每月 62 美元。不继续订阅 Updates，也可以使用购买时的版本。通过 Updates 获取的版本在订阅结束后的使用条件，将在最终许可条款中说明。Updates 不会自动开始收费，所有美元金额均为等待最终国际定价的未批准候选价格。',
  },
  'cancel-updates-after-license': {
    ja: 'Updatesの利用権とFDEによる継続更新は契約期間の終了時に停止します。ソースコードなしの購入済みLicenseは、購入時のバージョンを引き続き社内で利用できます。Updatesで取得した版の契約終了後の扱いは、最終利用条件で明示します。その後の更新・セキュリティ管理は購入者側の責任です。',
    en: 'Updates access and FDE-managed ongoing updates end when the subscription term ends. The purchased perpetual License remains valid for internal use of the version purchased, without source code. Terms for using versions obtained through Updates after cancellation will be stated in the final license terms. Updates and security are then customer-managed.',
    'zh-CN': '订阅结束时，Updates 使用权和 FDE 的持续更新服务停止。不含源代码的已购永久 License 仍允许在内部使用购买时的版本。通过 Updates 获取的版本在订阅结束后的使用条件，将在最终许可条款中说明。之后由购买方负责更新与安全。',
  },
  'cancel-updates-only': {
    ja: 'いいえ。UpdatesはLicense専用の追加オプションで、単独では購入できません。License Plusも対象外です。Updatesを終了しても、購入済みLicenseの社内利用権は残り、購入時のバージョンを利用できます。Updatesで取得した版の契約終了後の扱いは、最終利用条件で明示します。',
    en: 'No. Updates is a License-only add-on and cannot be purchased on its own. License Plus is not eligible. Ending Updates does not remove the purchased License or internal use of the version purchased. Terms for using versions obtained through Updates after cancellation will be stated in the final license terms.',
    'zh-CN': '不可以。Updates 是 License 专用附加服务，不能单独购买，也不适用于 License Plus。结束 Updates 不会取消已购 License 的内部使用权，仍可使用购买时的版本。通过 Updates 获取的版本在订阅结束后的使用条件，将在最终许可条款中说明。',
  },
};
const serviceEndCorrections = {
  ja: ['Updatesの利用権とFDEによる継続更新は契約期間の終了時に停止します。', 'Updates契約が終了すると、FDEによる新しい更新の提供は終了します。'],
  en: ['Updates access and FDE-managed ongoing updates end when the subscription term ends.', 'When the Updates subscription ends, FDE stops providing new updates.'],
  'zh-CN': ['订阅结束时，Updates 使用权和 FDE 的持续更新服务停止。', 'Updates 订阅结束后，FDE 将停止提供新的更新。'],
};
const withoutPendingTerms = (text, locale) => text.replace(previousPendingTerms[locale], '').replace(/ {2,}/g, ' ').trim();

export const continuingUseFaqAnswers = Object.freeze(Object.fromEntries(
  Object.entries(previousFaqAnswers).map(([id, answers]) => [id, Object.freeze(Object.fromEntries(
    locales.map(locale => {
      let prefix = withoutPendingTerms(answers[locale], locale);
      if (id === 'cancel-updates-after-license') prefix = prefix.replace(...serviceEndCorrections[locale]);
      return [locale, joinCopy(locale, [prefix, policyText(locale)])];
    }),
  ))]),
));

const licenseRegions = {
  'license.html': {
    locale: 'en', heading: 'License Updates',
    previous: 'Months 1–3 are included. Optional continuation requires explicit opt-in at the $31/month USD candidate price for months 4–6 and $62/month from month 7. The version purchased remains available without an Updates subscription. Paid Updates never starts automatically. Terms for using versions obtained through Updates after cancellation will be stated in the final license terms.',
  },
  'ja/license.html': {
    locale: 'ja', heading: 'LicenseのUpdates',
    previous: '購入後3か月は追加費用なしです。4〜6か月目は月額4,900円、7か月目以降は月額9,800円で、希望する場合だけ継続できます。Updatesを契約しない場合も、購入時のバージョンを利用できます。有料契約へ自動移行しません。Updatesで取得した版の契約終了後の扱いは、最終利用条件で明示します。',
  },
  'zh/license.html': {
    locale: 'zh-CN', heading: 'License 更新服务',
    previous: '第 1–3 个月包含更新。若明确选择继续，第 4–6 个月的候选价格为每月 31 美元，第 7 个月起为每月 62 美元。未订阅 Updates 时，仍可使用购买时的版本，不会自动转为付费订阅。通过 Updates 获得的版本在订阅结束后的使用条件，将在最终许可条款中说明。',
  },
};
const escapeHtml = text => text.replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
const scopedFaqIds = {
  'content/faq-content.json': ['updates-term'],
  'content/faq-policy-additions.json': ['license-updates-entitlement', 'cancel-updates-after-license', 'cancel-updates-only'],
};
const nextLicenseRegion = ({locale, heading, previous}) => {
  const copy = continuingUseCopy[copyLocale(locale)];
  // The License page's older Chinese copy uses 获得 rather than 获取.
  const priorPending = locale === 'zh-CN' ? previousPendingTerms[locale].replace('获取', '获得') : previousPendingTerms[locale];
  const paragraphs = [
    previous.replace(priorPending, '').trim(),
    copy.milestones,
    joinCopy(locale, [copy.endVersion, copy.afterEnd]),
    joinCopy(locale, [copy.noNewRights, copy.resubscription]),
  ];
  return `<div><h2>${heading}</h2>${paragraphs.map(text => `<p>${escapeHtml(text)}</p>`).join('')}</div>`;
};

export function applyApprovedContinuingUsePolicy(file, source) {
  const region = licenseRegions[file];
  if (region) {
    const {heading, previous} = region;
    const oldRegion = `<div><h2>${heading}</h2><p>${previous}</p></div>`;
    const nextRegion = nextLicenseRegion(region);
    const reviewedInputs = [oldRegion, nextRegion];
    if (file === 'zh/license.html') {
      // The Chinese generator translates known headings before this scoped copy
      // step. Accept only this exact reviewed English body, never arbitrary text.
      reviewedInputs.push(nextLicenseRegion({...licenseRegions['license.html'], heading}));
    }
    const matches = reviewedInputs.flatMap(input => Array(source.split(input).length - 1).fill(input));
    if (matches.length !== 1) throw Error(`Continuing-use policy: expected one reviewed Updates region in ${file}`);
    return matches[0] === nextRegion ? source : source.replace(matches[0], nextRegion);
  }
  const ids = scopedFaqIds[file];
  if (!ids) return source;
  const data = JSON.parse(source);
  if (!Array.isArray(data.faq)) throw Error(`Continuing-use policy: invalid FAQ source ${file}`);
  let changed = false;
  for (const id of ids) {
    const records = data.faq.filter(item => item.id === id);
    if (records.length !== 1) throw Error(`Continuing-use policy: expected one FAQ ${id}`);
    const record = records[0];
    for (const locale of locales) {
      const previous = previousFaqAnswers[id][locale], next = continuingUseFaqAnswers[id][locale];
      if (record.answer?.[locale] === next) continue;
      if (record.answer?.[locale] !== previous) throw Error(`Continuing-use policy: unreviewed FAQ answer ${id}/${locale}`);
      record.answer[locale] = next;
      changed = true;
    }
  }
  return changed ? JSON.stringify(data, null, 2) + '\n' : source;
}
