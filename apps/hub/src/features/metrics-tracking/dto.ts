/**
 * metrics-tracking の永続行 ⇄ wire DTO 変換 (sys-metrics-tracking-p05 / B3 / I10)。
 *
 * 何を: repository が扱う epoch ミリ秒と、契約 (`@harness-hub/schemas`) が扱う `YYYY-MM-DD` /
 *       ISO 日時の相互変換、および summary / rollups 応答の組み立てを担う。
 * なぜ: 「日付の解釈」を route・service・cron の 3 箇所で書くと、境界が 1 日ずれても
 *       どこがずれたのか追えなくなる。日付の意味づけはこのファイルだけが持つ。
 *
 * 期間の基準タイムゾーン (JST 固定) とその変換そのものは `date-jst.ts` が持つ。
 * 画面側も同じ変換を使うため、`@harness-hub/db` へ依存しない純関数として分けてある。
 * 既存の import 経路を変えないよう、日付ユーティリティはここから再輸出する。
 */
import type { MetricsRollupRow, MetricsSummary } from '@harness-hub/db';
import {
  type MetricsDate,
  type MetricsRollupItem,
  type MetricsRollupsResponse,
  type MetricsSummaryResponse,
  metricsRollupItemSchema,
  metricsRollupsResponseSchema,
  metricsSummaryResponseSchema,
} from '@harness-hub/schemas';

import { DAY_MS, epochMsToJstDate, jstDateToEpochMs } from './date-jst.js';

export { DAY_MS, epochMsToJstDate, jstDateToEpochMs, WEEK_MS } from './date-jst.js';

/**
 * 部門未設定の実行をまとめる dimension key。
 *
 * `metrics_rollups.dimension_key` は NOT NULL かつ契約側が `identifierSchema` (先頭は英数字) を
 * 要求するため、null をそのまま入れられない。実在する部門 ID とぶつかる可能性は残るが、
 * 部門 ID は ULID 由来で 26 桁のため実質衝突しない。
 */
export const DEPARTMENT_UNASSIGNED_KEY = 'unassigned';

/** 部門未設定を画面に出すときの表示名。 */
const DEPARTMENT_UNASSIGNED_LABEL = '部門未設定';

/**
 * `from`/`to` (いずれも当日を含む) を repository の半開区間 [start, end) へ写す。
 * 利用者が指定する期間は「両端を含む」のが自然な読み方なので、`to` の翌日 0:00 を上限にする。
 */
export function toHalfOpenRange(from: MetricsDate, to: MetricsDate): { readonly start: number; readonly end: number } {
  return { start: jstDateToEpochMs(from), end: jstDateToEpochMs(to) + DAY_MS };
}

/** 分 → 時間。表示単位の換算はここ 1 箇所でだけ行う (画面側で 60 を書かせない)。 */
function minutesToHours(minutes: number): number {
  return minutes / 60;
}

/**
 * repository の集計結果を S09/S16 の応答へ写す。
 *
 * `harnessName` / `departmentName` に ID をそのまま入れているのは、ハーネス名・部門名の
 * マスタ表が現時点のスキーマに存在しないため (`metrics_events` は ID しか持たない)。
 * 契約は表示名を要求するので、解決できない間は ID を表示名として扱う。
 * 名称解決は catalog / user-org-admin 側にマスタが入った時点で差し替える。
 */
export function toSummaryResponse(
  summary: MetricsSummary,
  period: { readonly from: MetricsDate; readonly to: MetricsDate },
): MetricsSummaryResponse {
  return metricsSummaryResponseSchema.parse({
    period: { from: period.from, to: period.to },
    kpi: {
      totalRunCount: summary.kpi.runCount,
      savedHours: minutesToHours(summary.kpi.savedMinutes),
      savedAmountJpy: summary.kpi.savedAmount,
      harnessCount: summary.harnessRanking.length,
    },
    trend: summary.trend.map((point) => ({
      periodStart: epochMsToJstDate(point.periodStart),
      runCount: point.runCount,
      savedHours: minutesToHours(point.savedMinutes),
      savedAmountJpy: point.savedAmount,
    })),
    ranking: summary.harnessRanking.map((entry) => ({
      harnessId: entry.key,
      harnessName: entry.key,
      runCount: entry.runCount,
      savedHours: minutesToHours(entry.savedMinutes),
      savedAmountJpy: entry.savedAmount,
    })),
    departments: summary.departmentBreakdown.map((entry) => {
      const unassigned = entry.key === DEPARTMENT_UNASSIGNED_KEY;
      return {
        departmentId: unassigned ? null : entry.key,
        departmentName: unassigned ? DEPARTMENT_UNASSIGNED_LABEL : entry.key,
        runCount: entry.runCount,
        savedHours: minutesToHours(entry.savedMinutes),
        savedAmountJpy: entry.savedAmount,
      };
    }),
  });
}

/**
 * rollup 行を wire 形へ写す。読取専用なので変換は一方向だけで足りる。
 * 値の妥当性 (負値・不正な日付) は schema の parse に委ね、ここでは形だけを合わせる。
 */
export function toRollupItem(row: MetricsRollupRow): MetricsRollupItem {
  return metricsRollupItemSchema.parse({
    period: row.period,
    periodStart: epochMsToJstDate(row.periodStart),
    dim: row.dimension,
    dimKey: row.dimensionKey,
    runCount: row.runCount,
    savedMinutes: row.savedMinutes,
    savedAmountJpy: row.savedAmount,
    computedAt: new Date(row.computedAt).toISOString(),
  });
}

export function toRollupsResponse(rows: readonly MetricsRollupRow[]): MetricsRollupsResponse {
  return metricsRollupsResponseSchema.parse({ items: rows.map(toRollupItem) });
}
