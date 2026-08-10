/**
 * 状態確認 URL の組み立て。ウィザード本体 (投入直後の history 書換) と、遅延読込する
 * 結果表示 (再開リンク) の**両方**が使うため独立モジュールに置く (HarnessHub-5vlq)。
 *
 * 結果表示側に置いたままだと、本体が結果表示を静的 import することになり
 * `next/dynamic` による分割が無効化される。逆に本体へ置くと結果表示から本体への
 * 逆流 import が生まれる。どちらにも属さない小片としてここに切り出すのが素直。
 */
import type { PublishJourneyScope } from '../../lib/publish-journey/index.js';

export function publishStatusHref(scope: PublishJourneyScope, requestId: string): string {
  const query = new URLSearchParams({
    tenant: scope.tenantId,
    workspace: scope.workspaceId,
    publish: requestId,
  });
  return `/catalog/publish?${query.toString()}`;
}
