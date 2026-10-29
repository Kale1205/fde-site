// Build-time public-copy reconciliation only. This never enables sales or
// changes the native app's supported scope, runtime, or release authority.
export const initialReleaseCopy = {
  en: {
    date: 'Target launch: January 1, 2027',
    scope: 'Planned launch support is Windows only. Supported Windows versions and system requirements will be published before sales open. iOS and iPadOS versions are planned for future support, with no confirmed release date. macOS is not supported. The initial native app targets English and Japanese; Chinese website content does not indicate native Chinese support.',
    restore: 'Restore is not available in the current development build. Purchasing will open only after the customer restore method is completed and verified.',
    nativeTitle: 'Native app: in development',
    nativeScope: 'Planned launch support is Windows only. Supported Windows versions and system requirements will be published before sales open. iOS and iPadOS versions are planned for future support, with no confirmed release date. macOS is not supported. Upgrade, restore and recovery are not available in the current development build.',
    preview: 'This preview uses synthetic sample data in page memory only. Refreshing or resetting the page discards every change. It does not establish completion, security validation or release of the native app.',
  },
  ja: {
    date: '発売目標：2027年1月1日',
    scope: '発売時の対応環境はWindowsのみを予定しています。対応するWindowsのバージョンと動作要件は、販売開始前に提示します。iOS版・iPadOS版は今後対応予定ですが、提供時期は未定です。macOSには対応していません。ネイティブ初回版の画面言語は英語・日本語を対象とし、Webサイトの中国語対応とは別です。',
    restore: '現開発版では復元を提供していません。顧客向け復元方法を完成・検証してから有料販売を開始します。',
    nativeTitle: '開発中のネイティブ版について',
    nativeScope: '発売時の対応環境はWindowsのみを予定しています。対応するWindowsのバージョンと動作要件は、販売開始前に提示します。iOS版・iPadOS版は今後対応予定ですが、提供時期は未定です。macOSには対応していません。現開発版ではアップグレード・復元・リカバリーを提供していません。',
    preview: 'このデモでは合成サンプルデータをページ内メモリだけで使用します。再読み込みまたはリセットですべての変更が消えます。ネイティブ版の完成・セキュリティ検証・正式リリースを示すものではありません。',
  },
  zh: {
    date: '目标发布日期：2027年1月1日',
    scope: '计划在发布时仅支持 Windows。支持的 Windows 版本与系统要求将在开放购买前公布。iOS 与 iPadOS 版本计划在后续提供，发布日期尚未确定。macOS 不受支持。首个原生版本面向英语与日语界面；网站提供中文内容不代表原生应用支持中文。',
    restore: '当前开发版本尚不提供还原功能。只有在面向客户的还原方法完成并通过验证后，才会开始付费销售。',
    nativeTitle: '原生应用仍在开发中',
    nativeScope: '计划在发布时仅支持 Windows。支持的 Windows 版本与系统要求将在开放购买前公布。iOS 与 iPadOS 版本计划在后续提供，发布日期尚未确定。macOS 不受支持。当前开发版本尚不提供升级、还原与恢复功能。',
    preview: '本演示仅在当前页面内存中使用合成示例数据。重新加载或重置页面会清除所有更改，不能据此认定原生应用已完成、通过安全验证或正式发布。',
  },
};

const previousReleaseCopy = {
  en: {
    date: 'Target launch: November 1, 2026',
    scope: 'The initial native release targets one Apple M2-or-later Mac, with Host and Client on that same Mac. Supported models and macOS versions will be confirmed after device testing and must meet each model’s minimum OS requirement. Multiple-Mac LAN support is planned for a later update, with no confirmed date. The initial native app targets English and Japanese; Chinese website content does not indicate native Chinese support.',
    nativeScope: 'The initial native release targets one Apple M2-or-later Mac, with Host and Client on that same Mac. Supported models and macOS versions will be confirmed after device testing and must meet each model’s minimum OS requirement. Multiple-Mac LAN support is planned for a later update, with no confirmed date. Upgrade, restore and recovery are not available in the current development build.',
  },
  ja: {
    date: '発売目標：2026年11月1日',
    scope: '初回のネイティブ版は、Apple M2以降の1台のMac上でHostとClientを利用する構成を対象とします。対応機種とmacOSは、各機種の最低OS要件を満たしたうえで実機検証後に確定します。複数MacのLAN接続は後続アップデートで対応予定ですが、時期は未定です。ネイティブ初回版の画面言語は英語・日本語を対象とし、Webサイトの中国語対応とは別です。',
    nativeScope: '初回のネイティブ版は、Apple M2以降の1台のMac上でHostとClientを利用する構成を対象とします。対応機種とmacOSは、各機種の最低OS要件を満たしたうえで実機検証後に確定します。複数MacのLAN接続は後続アップデートで対応予定ですが、時期は未定です。現開発版ではアップグレード・復元・リカバリーを提供していません。',
  },
  zh: {
    date: '目标发布日期：2026年11月1日',
    scope: '首个原生版本面向配备 Apple M2 或更新芯片的单台 Mac，Host 与 Client 在同一台 Mac 上运行。支持的机型与 macOS 版本将在实机测试后确认，且须满足各机型的最低系统要求。多台 Mac 的局域网连接计划通过后续更新提供，时间尚未确定。首个原生版本面向英语与日语界面；网站提供中文内容不代表原生应用支持中文。',
    nativeScope: '首个原生版本面向配备 Apple M2 或更新芯片的单台 Mac，Host 与 Client 在同一台 Mac 上运行。支持的机型与 macOS 版本将在实机测试后确认，且须满足各机型的最低系统要求。多台 Mac 的局域网连接计划通过后续更新提供，时间尚未确定。当前开发版本尚不提供升级、还原与恢复功能。',
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

// Clarify three existing answers only; IDs, questions, keywords and prices stay
// untouched while all public locales receive the same platform facts.
export const initialScopeFaqAnswers = {
  'license-devices': {
    ja: 'LicenseとLicense Plusは購入した1法人の内部業務向けです。発売時の対応環境はWindowsのみを予定しています。対応するWindowsのバージョンと動作要件は販売開始前に提示します。iOS版・iPadOS版は今後対応予定ですが、提供時期は未定です。macOSには対応していません。ライセンス上の端末数は正式EULAで定め、接続・同期の技術的な対応範囲とは区別します。',
    en: 'License and License Plus are for the purchasing legal entity’s internal business use. Planned launch support is Windows only. Supported Windows versions and system requirements will be published before sales open. iOS and iPadOS versions are planned for future support, with no confirmed release date. macOS is not supported. Device permissions will be defined in the final EULA and are separate from technical connection and synchronization support.',
    'zh-CN': 'License 和 License Plus 用于购买法人的内部业务。计划在发布时仅支持 Windows。支持的 Windows 版本与系统要求将在开放购买前公布。iOS 与 iPadOS 版本计划在后续提供，发布日期尚未确定。macOS 不受支持。许可允许的设备数量将在最终 EULA 中规定，与连接及同步的技术支持范围分开说明。',
  },
  'license-branches': {
    ja: '購入法人内での社内利用を予定しています。発売時の対応環境はWindowsのみを予定しています。複数のWindows端末間や拠点間の接続・同期は、発売時の対応範囲として確定していません。対応環境内で複数倉庫・Location情報を管理することと、複数端末を接続・同期することは別の範囲です。最終的な対応環境・利用条件は販売開始前に提示します。iOS版・iPadOS版の提供時期は未定で、macOSには対応していません。別法人での利用は原則として別途購入が必要です。',
    en: 'Internal use by the purchasing legal entity is planned. Planned launch support is Windows only. Connections or synchronization across multiple Windows devices or sites are not confirmed launch scope. Managing warehouse or location records within a supported environment is separate from connecting and synchronizing multiple devices. Final supported environments and license terms will be presented before sales open. iOS and iPadOS versions have no confirmed release date, and macOS is not supported. Separate legal entities generally require separate purchases.',
    'zh-CN': '计划允许购买法人内部使用。计划在发布时仅支持 Windows。多台 Windows 设备之间或跨地点的连接与同步尚未确定为发布范围。在受支持的环境中管理多个仓库或 Location 信息，与连接和同步多台设备是不同的范围。最终支持环境和使用条件会在销售前公布。iOS 与 iPadOS 版本的发布日期尚未确定，macOS 不受支持。不同法人原则上需要分别购买。',
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
        if (typeof item.answer[locale] !== 'string') continue;
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
      if (previousReleaseCopy.en[key]) delete data[previousReleaseCopy.en[key]];
      data[initialReleaseCopy.en[key]] = initialReleaseCopy.zh[key];
    }
    delete data[previousReleaseCopy.en.scope];
    data[initialReleaseCopy.en.scope] = initialReleaseCopy.zh.scope;
    data[initialReleaseCopy.en.restore] = initialReleaseCopy.zh.restore;
    return JSON.stringify(data, null, 2) + '\n';
  }
  if (!/^(?:(?:ja|zh)\/)?(?:index|quiet-form|license|order|demo)\.html$/.test(file)) return source;
  const locale = file.startsWith('ja/') ? 'ja' : file.startsWith('zh/') ? 'zh' : 'en';
  const copy = initialReleaseCopy[locale];
  let html = source
    .replaceAll(datesBefore[locale], copy.date)
    .replaceAll(previousReleaseCopy[locale].date, copy.date)
    .replaceAll(previousReleaseCopy[locale].scope, copy.scope)
    .replaceAll(previousReleaseCopy[locale].nativeScope, copy.nativeScope);
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
