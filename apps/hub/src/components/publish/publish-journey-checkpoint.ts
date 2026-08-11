/**
 * PublishWizard が選択中の ZIP に結び付ける checkpoint を同期生成する。
 *
 * HTTP adapter と同じ大きな module から生成関数を遅延 import すると、ZIP 変更から
 * import 完了まで旧 checkpoint が選択中のまま残る。ここは type-only import 以外の
 * 依存を持たない葉 module にして、change event の中で archive と鍵を同時に差し替える。
 */
import type { PublishJourneyCheckpoint } from '../../lib/publish-journey/ports.js';

export function createPublishWizardCheckpoint(requestId: string | null = null): PublishJourneyCheckpoint {
  return {
    requestId,
    requestKey: crypto.randomUUID(),
    resetKey: crypto.randomUUID(),
    packageKey: crypto.randomUUID(),
    submitKey: crypto.randomUUID(),
  };
}
