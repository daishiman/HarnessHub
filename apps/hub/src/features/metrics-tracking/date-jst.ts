/**
 * 集計期間で使う JST 固定の日付演算 (sys-metrics-tracking-p05 / I10)。
 *
 * 何を: `YYYY-MM-DD` (JST) と epoch ミリ秒の相互変換、および日・週の長さの定数。
 * なぜ: 同じ変換を dto (サーバ側の応答組み立て)・cron の期間窓・画面の既定期間の 3 箇所が使う。
 *       `dto.ts` に置いたままだと画面 (client component) が `@harness-hub/db` 依存の module を
 *       引き込むことになるため、依存を持たない純関数だけをこのファイルへ切り出してある。
 *
 * 基準タイムゾーンは **JST 固定**。cron の起動時刻が JST 基準 (`DAILY_CRON` = JST 0:00) で
 * 決められており、境界を UTC にすると日次バッチが JST の 2 日ぶんを跨いで見てしまう。
 * 日本国内提供のみのため夏時間は考慮しない。
 */
import type { MetricsDate } from '@harness-hub/schemas';

/** JST の UTC からの差 (ミリ秒)。 */
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 1 日 (ミリ秒)。JST は夏時間を持たないので日の長さは常に一定。 */
export const DAY_MS = 24 * 60 * 60 * 1000;

/** 1 週間 (ミリ秒)。週次 rollup の期間長。 */
export const WEEK_MS = 7 * DAY_MS;

/** `YYYY-MM-DD` (JST) を、その日の 0:00 JST に相当する epoch ミリ秒へ変換する。 */
export function jstDateToEpochMs(date: MetricsDate): number {
  return Date.parse(`${date}T00:00:00Z`) - JST_OFFSET_MS;
}

/** epoch ミリ秒を JST の `YYYY-MM-DD` へ変換する。 */
export function epochMsToJstDate(epochMs: number): MetricsDate {
  return new Date(epochMs + JST_OFFSET_MS).toISOString().slice(0, 10) as MetricsDate;
}
