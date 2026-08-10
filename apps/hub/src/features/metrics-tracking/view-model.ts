/**
 * S09 ダッシュボード / S16 使用状況画面の表示ロジック (sys-metrics-tracking-p05 / I10)。
 *
 * 何を: 既定表示期間の決定・数値の表示整形・チャート部品への入力組み立てを純関数で持つ。
 * なぜ: 画面部品 (`'use client'`) は fetch と描画に専念させ、「どう見せるか」の判断を
 *       DOM なしで検証できるようにするため。同じ整形規則を S09 と S16 が共有する。
 *
 * ここは **算出をしない**。削減時間・削減額はいずれもサーバが rollup から確定させた値であり、
 * この層は受け取った数値を並べ替え・書式化するだけに留める (SEC5: 金額換算をクライアントに置かない)。
 */
import type {
  MetricsDate,
  MetricsSummaryDepartmentItem,
  MetricsSummaryRankingItem,
  MetricsSummaryResponse,
  MetricsSummaryTrendPoint,
} from '@harness-hub/schemas';
import type { ChartDatum, ChartSeries } from '@harness-hub/ui';

import { DAY_MS, epochMsToJstDate } from './date-jst.js';

/** 期間の下限・上限 (両端を含む)。API の `from`/`to` にそのまま渡せる形。 */
export interface MetricsDateRange {
  readonly from: MetricsDate;
  readonly to: MetricsDate;
}

/** S09 の既定表示期間 (当日を含む直近 30 日)。 */
export const DEFAULT_SUMMARY_RANGE_DAYS = 30;

/** S16 の既定表示期間 (当日を含む直近 12 週)。週次の傾向を読むには 30 日では点が足りない。 */
export const DEFAULT_USAGE_RANGE_DAYS = 84;

/** ランキング表とドーナツに出す上限件数。全件出すと読み取れなくなるため上位のみ。 */
export const RANKING_DISPLAY_LIMIT = 10;

/**
 * 当日 (JST) を末尾とする直近 `days` 日の期間を返す。
 * 当日を含めるため下限は `days - 1` 日前になる。`now` を引数で受けるのはテストで時刻を固定するため。
 */
export function recentRange(now: Date, days: number): MetricsDateRange {
  const to = epochMsToJstDate(now.getTime());
  const from = epochMsToJstDate(now.getTime() - (days - 1) * DAY_MS);
  return { from, to };
}

/** summary API のクエリ文字列。`harnessId` は指定されたときだけ載せる (S16 のハーネス絞り込み)。 */
export function buildSummaryQuery(range: MetricsDateRange, harnessId?: string): string {
  const query = new URLSearchParams({ from: range.from, to: range.to });
  if (harnessId !== undefined && harnessId !== '') query.set('harnessId', harnessId);
  return query.toString();
}

/** 実行回数。桁区切りだけ入れる。 */
export function formatRunCount(value: number): string {
  return value.toLocaleString('ja-JP');
}

/**
 * 削減時間。小数第 1 位まで。
 * 「12.3 時間」程度の粒度が意思決定には十分で、それ以上の桁は集計誤差を実態より精密に見せてしまう。
 */
export function formatHours(value: number): string {
  return value.toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** 削減額。円未満は表示しない (係数由来の端数を実額のように見せない)。 */
export function formatJpy(value: number): string {
  return Math.round(value).toLocaleString('ja-JP');
}

/** `YYYY-MM-DD` を軸ラベル用の `M/D` へ。日付が並ぶ軸で年は冗長になる。 */
export function formatAxisDate(date: MetricsDate): string {
  const [, month, day] = date.split('-');
  return `${Number(month)}/${Number(day)}`;
}

/**
 * 推移グラフの系列。実行回数と削減時間を 1 枚に重ねる。
 * 金額を同じ軸に載せないのは、桁が 4〜5 桁違って回数側の線が潰れるため (金額は KPI カードで見る)。
 */
export function toTrendSeries(trend: readonly MetricsSummaryTrendPoint[]): readonly ChartSeries[] {
  return [
    {
      name: '実行回数',
      points: trend.map((point) => ({ label: formatAxisDate(point.periodStart), value: point.runCount })),
    },
    {
      name: '削減時間 (時間)',
      points: trend.map((point) => ({ label: formatAxisDate(point.periodStart), value: point.savedHours })),
    },
  ];
}

/** 削減額の多い順に上位を返す。サーバの並び順に依存させず、画面が見せたい軸で並べ替える。 */
export function topRanking(
  ranking: readonly MetricsSummaryRankingItem[],
  limit: number = RANKING_DISPLAY_LIMIT,
): readonly MetricsSummaryRankingItem[] {
  return [...ranking].sort((a, b) => b.savedAmountJpy - a.savedAmountJpy).slice(0, limit);
}

/** ハーネス別の棒グラフ入力 (削減額)。 */
export function toRankingChartData(ranking: readonly MetricsSummaryRankingItem[]): readonly ChartDatum[] {
  return topRanking(ranking).map((entry) => ({ label: entry.harnessName, value: entry.savedAmountJpy }));
}

/** 部門別のドーナツ入力 (削減額)。 */
export function toDepartmentChartData(departments: readonly MetricsSummaryDepartmentItem[]): readonly ChartDatum[] {
  return departments.map((entry) => ({ label: entry.departmentName, value: entry.savedAmountJpy }));
}

/**
 * 「使われているか」を 1 つの割合で表す指標。
 * 集計対象ハーネスのうち、期間内に 1 回以上実行されたものの比率。
 * ハーネスが 0 件のときは 0 を返す (母数 0 を 100% と読ませない)。
 */
export function activeHarnessRatio(summary: MetricsSummaryResponse): number {
  const total = summary.ranking.length;
  if (total === 0) return 0;
  return summary.ranking.filter((entry) => entry.runCount > 0).length / total;
}

/** 割合を整数 % 表記へ。 */
export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}`;
}
