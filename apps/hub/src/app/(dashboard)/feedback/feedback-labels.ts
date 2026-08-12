/**
 * 改善要望フィードバックの表示ラベル対応表。
 *
 * これまで一覧・詳細が API の値 (`improvement` / `high` / `harness` など) を
 * そのまま画面へ出していた。英語の識別子は利用者にとって意味が読み取れないうえ、
 * 絞り込みの選択肢だけが日本語だったため「改善要望」で絞った結果に `improvement` が
 * 並ぶという不整合になっていた。表示側の言葉をここ 1 箇所に集める。
 *
 * 型だけを import しているのは、`@harness-hub/schemas` の値を client component から
 * import すると zod が初回ダウンロードへ載るため (G13 予算 120KiB)。
 */
import type { FeedbackPriority, FeedbackSource, FeedbackType } from '@harness-hub/schemas';

export const feedbackTypeLabels: Readonly<Record<FeedbackType, string>> = {
  improvement: '改善要望',
  review: 'レビュー依頼',
  bug: '不具合報告',
};

export const feedbackPriorityLabels: Readonly<Record<FeedbackPriority, string>> = {
  high: '高',
  medium: '中',
  low: '低',
};

/** 受付経路。「どこから届いた声か」が分かる言い方にする。 */
export const feedbackSourceLabels: Readonly<Record<FeedbackSource, string>> = {
  harness: '業務ツールから送信',
  manual: 'この画面から報告',
};
