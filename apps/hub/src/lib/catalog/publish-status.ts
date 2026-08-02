/**
 * PublishRequest の状態値 → 状態チップ語彙の写像。
 *
 * **この写像を 1 箇所に閉じることが本 module の存在理由**。
 * `publishRequestStateSchema` (backend の 9 状態) と `statusVocabulary.publish`
 * (UI の表示語彙) は値域が一致していない。`statusVocabulary` は未登録値で例外を投げるため、
 * 写像を挟まずに backend の値を `StatusChip` へ渡すと `validating` / `ready` を受けた瞬間に画面が落ちる。
 *
 * 同種の写像 (`packages/inspection` の verdict → publish verdict) も
 * 「apps/hub の 1 module だけが持つ」規約になっている (publish-pipeline primitives.ts のコメント参照)。
 */
import type { PublishRequestState } from '@harness-hub/schemas';
import type { StatusValue } from '@harness-hub/ui';

/**
 * backend 状態 → 表示語彙。
 *
 * - `validating` → `inspecting`: 語が違うだけで同じ「検査中」。
 * - `ready` → `approved`: 検査を通過し公開実行を待つ状態。Stage 1 には承認キューが無いため、
 *   利用者から見た意味が最も近いのは「承認済み」になる。
 */
const PUBLISH_STATE_TO_CHIP: Record<PublishRequestState, StatusValue<'publish'>> = {
  draft: 'draft',
  validating: 'inspecting',
  needs_fix: 'needs_fix',
  ready: 'approved',
  approval_pending: 'approval_pending',
  approved: 'approved',
  publishing: 'publishing',
  failed: 'failed',
  published: 'published',
};

/** 状態チップへ渡す値を得る。未知値でも例外にせず `draft` へ落とす (表示のために画面を落とさない)。 */
export function publishStatusChipValue(status: PublishRequestState): StatusValue<'publish'> {
  return PUBLISH_STATE_TO_CHIP[status] ?? 'draft';
}
