// Narrow Japanese IMS search presentation. The preview, price
// books, other languages, release notice and commerce/availability are not edited.
const titleBefore='IMS 在庫管理ソフト | Baked Kale FDE';
const titleAfter='IMS｜小規模事業者向け・買い切りの在庫管理ソフト | Baked Kale';
const summaryBefore='自社で使うシステムを、自社で育てていく。Baked Kale FDEの開発中の在庫管理ソフトIMS。ソースコード付きLicense PlusとLicense、予定価格、デモを確認できます。';
const summaryAfter='IMSは小規模事業者向けに開発中の買い切り型在庫管理ソフトです。初回はWindows向けを予定。在庫一覧・検索、入出庫記録、在庫不足の確認、2つのライセンスとブラウザデモを紹介します。';
const schemaBefore='Baked Kale FDEが、紙・Excel・既存システムからの見直しを考える小規模企業向けに開発している在庫管理ソフトです。';
const heroBefore='<h1 id="hero-title"><span>自社開発は、</span><span>ゼロからじゃなくていい。</span></h1><p class="quiet-lead">在庫管理システムIMS（Inventory Management System）とソースコードを、自社の業務に合う仕組みの出発点に。</p>';
const heroAfter='<h1 id="hero-title"><span>小規模事業者向け、</span><span>買い切りの在庫管理ソフトIMS</span></h1><p class="quiet-lead">IMS（Inventory Management System）は、紙やExcelでの在庫管理を見直したい小規模事業者向けです。在庫一覧・検索、入庫・出庫記録、在庫不足の確認をひとつにまとめた、開発中のソフトです。初回はWindows向けを予定しています。</p><p class="quiet-lead">自社開発は、 ゼロからじゃなくていい。</p>';
const faq=`<section class="section-frame" id="ims-faq" aria-labelledby="ims-faq-title">
<h2 id="ims-faq-title">IMSのよくある質問</h2>
<dl>
<dt><strong>IMSはどんな事業者向けですか？</strong></dt><dd>紙やExcelなどで管理している在庫を見直したい、小規模事業者向けです。在庫一覧・検索、入庫・出庫の記録、在庫不足の確認をひとつのソフトにまとめる予定です。</dd>
<dt><strong>どの端末で使えますか？</strong></dt><dd>初回はWindows向けのインストール型アプリを予定しています。対応するWindowsのバージョンと動作要件は、販売開始前にご案内します。</dd>
<dt><strong>買い切りと毎月のUpdatesはどう違いますか？</strong></dt><dd>LicenseとLicense Plusは買い切りです。LicenseのUpdatesは最初の3か月込みで、以降は任意です。License Plusにはソースコードが含まれ、更新・管理は購入者が行います。詳しくは<a href="license.html">ライセンスと利用条件</a>をご確認ください。</dd>
<dt><strong>今すぐ購入や試用はできますか？</strong></dt><dd>正式版は開発中で、購入受付はありません。<a href="demo.html">ブラウザデモ</a>では、保存されないサンプルデータで基本操作を確認できます。正式版と接続するものではありません。</dd>
</dl></section>`;
export function withJapaneseImsSearchPresentation(file,source){
 if(file!=='ja/index.html'||!source.includes('<html lang="ja">'))return source;
 let result=source.replaceAll(titleBefore,titleAfter).replaceAll(summaryBefore,summaryAfter).replaceAll(schemaBefore,summaryAfter).replace(heroBefore,heroAfter);
 if(!result.includes('id="ims-faq"')&&result.includes(heroAfter))result=result.replace('</main>',faq+'\n</main>');
 return result;
}
