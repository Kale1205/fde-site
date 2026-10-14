// Build-time public-copy reconciliation only. This never enables sales or
// changes the native app's supported scope, runtime, or release authority.
export const initialReleaseCopy = {
  en: {
    date: 'Target launch: November 1, 2026',
    scope: 'The initial native release targets one Apple M2-or-later Mac, with Host and Client on that same Mac. Supported models and macOS versions will be confirmed after device testing and must meet each model’s minimum OS requirement. Multiple-Mac LAN support is planned for a later update, with no confirmed date. The initial native app targets English and Japanese; Chinese website content does not indicate native Chinese support.',
    restore: 'Restore is not available in the current development build. Purchasing will open only after the customer restore method is completed and verified.',
    nativeTitle: 'Native app: in development',
    nativeScope: 'The initial native release targets one Apple M2-or-later Mac, with Host and Client on that same Mac. Supported models and macOS versions will be confirmed after device testing and must meet each model’s minimum OS requirement. Multiple-Mac LAN support is planned for a later update, with no confirmed date. Upgrade, restore and recovery are not available in the current development build.',
    preview: 'This preview uses synthetic sample data in page memory only. Refreshing or resetting the page discards every change. It does not establish completion, security validation or release of the native app.',
  },
  ja: {
    date: '発売目標：2026年11月1日',
    scope: '初回のネイティブ版は、Apple M2以降の1台のMac上でHostとClientを利用する構成を対象とします。対応機種とmacOSは、各機種の最低OS要件を満たしたうえで実機検証後に確定します。複数MacのLAN接続は後続アップデートで対応予定ですが、時期は未定です。ネイティブ初回版の画面言語は英語・日本語を対象とし、Webサイトの中国語対応とは別です。',
    restore: '現開発版では復元を提供していません。顧客向け復元方法を完成・検証してから有料販売を開始します。',
    nativeTitle: '開発中のネイティブ版について',
    nativeScope: '初回のネイティブ版は、Apple M2以降の1台のMac上でHostとClientを利用する構成を対象とします。対応機種とmacOSは、各機種の最低OS要件を満たしたうえで実機検証後に確定します。複数MacのLAN接続は後続アップデートで対応予定ですが、時期は未定です。現開発版ではアップグレード・復元・リカバリーを提供していません。',
    preview: 'このデモでは合成サンプルデータをページ内メモリだけで使用します。再読み込みまたはリセットですべての変更が消えます。ネイティブ版の完成・セキュリティ検証・正式リリースを示すものではありません。',
  },
  zh: {
    date: '目标发布日期：2026年11月1日',
    scope: '首个原生版本面向配备 Apple M2 或更新芯片的单台 Mac，Host 与 Client 在同一台 Mac 上运行。支持的机型与 macOS 版本将在实机测试后确认，且须满足各机型的最低系统要求。多台 Mac 的局域网连接计划通过后续更新提供，时间尚未确定。首个原生版本面向英语与日语界面；网站提供中文内容不代表原生应用支持中文。',
    restore: '当前开发版本尚不提供还原功能。只有在面向客户的还原方法完成并通过验证后，才会开始付费销售。',
    nativeTitle: '原生应用仍在开发中',
    nativeScope: '首个原生版本面向配备 Apple M2 或更新芯片的单台 Mac，Host 与 Client 在同一台 Mac 上运行。支持的机型与 macOS 版本将在实机测试后确认，且须满足各机型的最低系统要求。多台 Mac 的局域网连接计划通过后续更新提供，时间尚未确定。当前开发版本尚不提供升级、还原与恢复功能。',
    preview: '本演示仅在当前页面内存中使用合成示例数据。重新加载或重置页面会清除所有更改，不能据此认定原生应用已完成、通过安全验证或正式发布。',
  },
};

const demoBefore = {
  en: {
    nativeTitle: 'Only available in the real product',
    nativeScope: 'Server authority, sign-in and roles, signed Local/LAN communication, audit controls, CSV import/export, and encrypted backup/restore.',
    preview: 'This preview uses synthetic sample data in page memory only. Refreshing or resetting the page discards every change.',
  },
  ja: {
    nativeTitle: '実製品だけに含まれること',
    nativeScope: 'サーバーによる確定、ログイン・権限、署名付きLocal/LAN通信、監査制御、CSV入出力、暗号化バックアップ・復元',
    preview: 'このデモでは合成サンプルデータをページ内メモリだけで使用します。再読み込みまたはリセットですべての変更が消えます。',
  },
  zh: {
    nativeTitle: '仅供实际产品使用',
    nativeScope: '服务器权限,登录和角色,签名本地/局域网通信,审计控制,CSV进出口,加密备份/备份.',
    preview: '此预览仅在页面内存中使用合成样本数据. 刷新或重置页面会丢弃每个更改 。',
  },
};
const datesBefore = {en:'Releases November 1, 2026', ja:'2026年11月1日リリース', zh:'2026年11月1日发布'};

// Clarify three existing answers only; IDs, questions, keywords, prices and the
// Chinese FAQ expansion (a separate task) remain untouched.
export const initialScopeFaqAnswers = {
  'license-devices': {
    ja: 'LicenseとLicense Plusは購入した1法人の内部業務向けです。初回のネイティブ版は、Apple M2以降の同一Mac上でHostとClientを利用する構成を対象とします。対応機種とmacOSは実機検証後に確定し、各機種の最低OS要件を満たす必要があります。複数MacのLAN接続は初回の範囲外で、後続アップデートの時期は未定です。ライセンス上の端末数などは正式EULAで定め、接続・同期の技術的な対応範囲とは区別します。',
    en: 'License and License Plus are for the purchasing legal entity’s internal business use. The initial native release targets an Apple M2-or-later Mac, with Host and Client on that same Mac. Supported models and macOS versions will be confirmed after device testing and must meet each model’s minimum OS requirement. Multiple-Mac LAN access is outside the initial release; the later update has no confirmed date. Device permissions will be defined in the final EULA and are separate from technical connection and synchronization support.',
  },
  'license-branches': {
    ja: '購入法人内での社内利用を予定しています。初回はHostとClientを同一Macで利用する構成です。複数MacのLAN接続・同期や拠点間接続は初回の提供範囲に含めず、後続アップデートの時期は未定です。複数倉庫・Location情報を1台のMacで管理することと、複数端末の接続・同期は別の範囲です。最終的な対応環境・利用条件は販売開始前に提示します。別法人での利用は原則として別途購入が必要です。',
    en: 'Internal use by the purchasing legal entity is planned. The first release uses Host and Client on the same Mac. Multiple-Mac LAN access, synchronization and cross-site connections are outside the initial release; no date is confirmed for the later update. Managing warehouse or location records on one Mac is separate from connecting and synchronizing multiple devices. Final supported environments and license terms will be presented before sales open. Separate legal entities generally require separate purchases.',
  },
  'license-backup': {
    ja: 'はい。購入した法人が社内利用を続けるために必要なバックアップは作成できます。第三者への配布を目的とした複製はできません。この利用条件は、アプリの復元機能が提供済みという意味ではありません。現開発版では復元・リカバリーを提供していません。顧客向け復元方法を完成・検証してから有料販売を開始します。',
    en: 'Yes. Backups necessary to support the purchasing entity’s internal use are planned to be permitted. Copies made for third-party distribution are not permitted. This permission does not mean an app restore function is already available. Restore and recovery are not available in the current development build. Paid sales will begin only after the customer restore method is completed and verified.',
  },
};

const scopeMarkup = locale => `<br><span data-initial-release-scope>${initialReleaseCopy[locale].scope}</span><br><span data-restore-release-gate>${initialReleaseCopy[locale].restore}</span>`;

export function applyApprovedInitialReleaseScope(file, source) {
  if (file === 'content/faq-content.json') {
    const data = JSON.parse(source);
    for (const item of data.faq) {
      const answers = initialScopeFaqAnswers[item.id];
      if (answers) for (const [locale,answer] of Object.entries(answers)) {
        const previous=JSON.stringify(item.answer[locale]);
        const next=JSON.stringify(answer);
        if (previous===next) continue;
        if (source.split(previous).length!==2) throw new Error(`Non-unique FAQ answer: ${item.id}/${locale}`);
        source=source.replace(previous,next);
      }
    }
    return source;
  }
  if (file === 'content/zh-translations.json') {
    const data = JSON.parse(source);
    for (const key of ['nativeTitle','nativeScope','preview']) {
      delete data[demoBefore.en[key]];
      data[initialReleaseCopy.en[key]] = initialReleaseCopy.zh[key];
    }
    data[initialReleaseCopy.en.scope] = initialReleaseCopy.zh.scope;
    data[initialReleaseCopy.en.restore] = initialReleaseCopy.zh.restore;
    return JSON.stringify(data, null, 2) + '\n';
  }
  if (!/^(?:(?:ja|zh)\/)?(?:index|quiet-form|license|order|demo)\.html$/.test(file)) return source;
  const locale = file.startsWith('ja/') ? 'ja' : file.startsWith('zh/') ? 'zh' : 'en';
  const copy = initialReleaseCopy[locale];
  let html = source.replaceAll(datesBefore[locale], copy.date);
  for (const key of ['nativeTitle','nativeScope','preview']) {
    // Match the entire text node so repeated migrations cannot append notes.
    html = html.replaceAll(`>${demoBefore[locale][key]}<`, `>${copy[key]}<`);
  }
  if (!html.includes('data-initial-release-scope')) {
    if (file.endsWith('license.html')) {
      html = html.replace(/(<p class="license-note"[^>]*>[\s\S]*?)(<\/p>)/, `$1${scopeMarkup(locale)}$2`);
    } else if (file.endsWith('order.html')) {
      html = html.replace(/(<aside class="order-notice"[\s\S]*?<p>[^<]*)(<\/p>)/, `$1${scopeMarkup(locale)}$2`);
    }
  }
  return html;
}
