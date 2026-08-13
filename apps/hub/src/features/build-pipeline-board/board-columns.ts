/**
 * S13 ボード列の**表示側だけ**の写像 (SYS-BUILD-PIPELINE-BOARD-P05 / docs/frontend-spec.md S13)。
 *
 * **なぜ dto.ts から切り出すか。**
 * `dto.ts` は wire 契約を守るため zod schema (`buildBoardColumnSchema` 等) を実行時に使う。
 * ところがボードの列組みは client component (`build-board.tsx`) でも必要で、そこから `dto.ts` を
 * 読むと zod と全 contract schema が初期 chunk へ載る。実測で `/builds` の First Load JS が
 * 131.6 KiB となり、`check:client-bundle` の予算 120 KiB を超えた。
 *
 * そこで「zod を要る層 (server)」と「要らない層 (表示)」を分ける。本 file は
 * **値としての import を @harness-hub/schemas から持たない** (型は `import type` で消える)。
 * 検証は境界 (API 応答を組む `dto.ts`) で 1 度やれば足り、同じ形を client で再検証する必要はない。
 *
 * 工程の並び (`stageOrder`) を引数で受けるのも同じ理由で、`BUILD_STAGE_ORDER` は zod と同居している。
 * 正本は @harness-hub/schemas 側のままにし、client へは server component が props で配る。
 */
import type { BuildBoardColumn, BuildListItem, BuildStage, BuildType } from '@harness-hub/schemas';

/** カードの副題に出す種別名。wire は英字 id なので、表示語彙はここで与える。 */
export const BUILD_TYPE_LABELS: Readonly<Record<BuildType, string>> = {
  hearing: 'ヒアリング',
  improvement: '改善要望',
  review: 'レビュー',
  bug: '不具合',
};

/** リスクが高いものほど先に読ませる並び順。同じリスクどうしは元の順 (更新順) を保つ。 */
const RISK_WEIGHT: Readonly<Record<BuildListItem['risk'], number>> = { blocked: 0, warn: 1, none: 2 };

/**
 * 一覧 (`BuildListItem[]`) を S13 のボード列へ詰め直す。
 * 空の工程も列として残す — 残さないと workspace ごとに列位置がずれ、
 * 「design 列だと思って押したら test だった」という誤操作が起きる。
 *
 * 列内の並びは risk 優先 (blocked → warn → none)。停止中の案件は列の下の方に
 * 埋もれると気付かれず放置されるため、列を開いた瞬間に一番上へ来るようにする。
 */
export function toBoardColumnsView(
  items: readonly BuildListItem[],
  stageOrder: readonly BuildStage[],
): readonly BuildBoardColumn[] {
  return stageOrder.map((stage) => ({
    stage,
    cards: items
      .filter((item) => item.stage === stage)
      .map((item) => ({ id: item.id, title: item.title, meta: BUILD_TYPE_LABELS[item.type], risk: item.risk }))
      .sort((a, b) => RISK_WEIGHT[a.risk ?? 'none'] - RISK_WEIGHT[b.risk ?? 'none']),
  }));
}
