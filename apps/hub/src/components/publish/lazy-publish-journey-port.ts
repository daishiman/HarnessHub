/**
 * 既定の HTTP port を**最初に呼ばれた時点で**読み込む薄い委譲 (HarnessHub-vwxc)。
 *
 * `httpPublishJourneyPort` は fetch 境界 (作成・投入・状態取得の 3 経路と再開判定) を
 * 持つため相応の大きさがあるが、画面を開いた直後には 1 行も実行されない。
 * それでも既定 prop として静的 import すると `/catalog/publish` の First Load JS に載る。
 * この route は G13 予算の残余が repo 内で最も薄いので、実行が必要になる瞬間まで遅らせる。
 *
 * 委譲にして port の差し替え口 (`PublishWizardProps.port`) を変えないのが要点で、
 * テストや将来の別 adapter は従来どおり prop で注入できる。
 */
import type { PublishJourneyPort } from '../../lib/publish-journey/index.js';

const loadModule = () => import('../../lib/publish-journey/index.js');

/**
 * 各メソッドの引数・戻り値は `PublishJourneyPort` から導出する。
 * ここで型を書き写すと、port 契約が変わったときに委譲側だけ古いまま通ってしまう。
 */
export const lazyHttpPublishJourneyPort: PublishJourneyPort = {
  createProject: async (...args: Parameters<PublishJourneyPort['createProject']>) =>
    (await loadModule()).httpPublishJourneyPort.createProject(...args),
  submitPackage: async (...args: Parameters<PublishJourneyPort['submitPackage']>) =>
    (await loadModule()).httpPublishJourneyPort.submitPackage(...args),
  getRequest: async (...args: Parameters<PublishJourneyPort['getRequest']>) =>
    (await loadModule()).httpPublishJourneyPort.getRequest(...args),
};
