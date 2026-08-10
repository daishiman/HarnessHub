/**
 * feat-metrics-tracking の wire 契約 (B2/B3)。
 *
 * SEC5 の中核: ingest でクライアントから受理してよいのは「回数」だけである。
 * 削減時間・削減額・時給・分/回といった量的な値は、たとえクライアントが算出できても受け取らない。
 * これらは全てサーバが `tenant_coefficients` と `packages/estimation` の純関数から算出し、
 * 応答 DTO (rollup / summary) にだけ「算出済みの数値」として現れる。
 * 「送らせない」ことを型と `.strict()` で構造的に保証するのがこのファイルの責務であり、
 * route handler 側の実装忘れに依存させない。
 */
import { z } from 'zod';
import { identifierSchema, isoDateTimeSchema } from '../src/primitives.js';

/**
 * 1 リクエストで受理する実行回数の上限。
 * ingest は 1 実行 1 リクエストが基本で、まとめ送りでも常識的な範囲に収まる。
 * 桁を誤った申告 (あるいは水増し) をここで機械的に落とす。
 */
const MAX_RUN_COUNT = 1_000;

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * 実在する日付かを検査する。
 * `Date.parse` は 2026-02-30 を 3/2 へ繰り上げて受理してしまうため、往復するかを自前で確かめる
 * (`src/primitives.ts` の `isRealIsoDateTime` と同じ考え方の、日付のみ版)。
 */
function isRealIsoDate(value: string): boolean {
  const matched = ISO_DATE_PATTERN.exec(value);
  if (!matched) return false;

  const [, year, month, day] = matched;
  const [y, mo, d] = [Number(year), Number(month), Number(day)];
  const utc = new Date(Date.UTC(y, mo - 1, d));
  return utc.getUTCFullYear() === y && utc.getUTCMonth() === mo - 1 && utc.getUTCDate() === d;
}

/**
 * 集計期間の境界に使う日付 (`YYYY-MM-DD`)。
 * rollup の粒度が日以上なので、時刻・タイムゾーンを持ち込まずに範囲を表す。
 */
export const metricsDateSchema = z
  .string()
  .regex(ISO_DATE_PATTERN, 'YYYY-MM-DD 形式の日付ではありません')
  .refine(isRealIsoDate, '存在しない日付です');
export type MetricsDate = z.output<typeof metricsDateSchema>;

/**
 * POST /api/v1/metrics/events の body (B2)。
 *
 * 意図的に受け取らないもの (SEC5):
 * - `occurredAt` / `timestamp` — 発生時刻はサーバ受信時刻 (`server_received_at`) を採用する。
 *   クライアント時計を信じると、締め済み期間への遡及投入で rollup を書き換えられる。
 * - `savedMinutes` / `savedHours` / `savedAmountJpy` — 削減時間・削減額はサーバ算出のみ。
 * - `hourlyRate` / `annualSalary` / `minutesPerRun` / `reductionRate` — 係数は `tenant_coefficients`
 *   が単一ソースで、クライアント申告の係数は使わない (SEC4 の salary 逆算対策も兼ねる)。
 * - `actorUserId` / `departmentId` — 主体は認証済み principal、部門は信頼できるサーバ側解決結果だけを使う。
 *
 * `.strict()` によりこれらを含む body は未知キーとして parse 段階で失敗する。
 * 冪等性は `Idempotency-Key` ヘッダで担保するため body には持たせない。
 */
export const metricsEventIngestRequestSchema = z
  .object({
    /** 実行されたハーネス。 */
    harnessId: identifierSchema,
    /** 実行回数。1 リクエストにまとめる場合のみ 2 以上になる。 */
    runCount: z.number().int().min(1).max(MAX_RUN_COUNT),
  })
  .strict();
export type MetricsEventIngestRequest = z.output<typeof metricsEventIngestRequestSchema>;

/**
 * ingest の応答。
 * 同一 `Idempotency-Key` の再送は新規計上せず、既存 event の応答を再生して `deduplicated: true` を返す
 * (207 は使わず、重複でも 200 で既存応答を返す — backend-spec §4.9)。
 */
export const metricsEventIngestResponseSchema = z
  .object({
    eventId: identifierSchema,
    deduplicated: z.boolean(),
  })
  .strict();
export type MetricsEventIngestResponse = z.output<typeof metricsEventIngestResponseSchema>;

/** rollup の期間粒度。日次で事前集計し、週次で確定する (B3 の Workers cron)。 */
export const metricsRollupPeriodSchema = z.enum(['daily', 'weekly']);
export type MetricsRollupPeriod = z.output<typeof metricsRollupPeriodSchema>;

/**
 * rollup の集計次元。
 * `user` は個人別の金額が見えるため admin 限定 (SEC4: 金額から年収を逆算されるのを防ぐ)。
 * 認可判定そのものは route 側が行う。契約層は「そういう次元が存在する」ことだけを表す。
 */
export const metricsRollupDimensionSchema = z.enum(['tenant', 'harness', 'department', 'user']);
export type MetricsRollupDimension = z.output<typeof metricsRollupDimensionSchema>;

/** 期間の下限・上限。`from` は `to` 以下でなければならない。 */
const periodRange = {
  from: metricsDateSchema,
  to: metricsDateSchema,
} as const;

/** GET /api/v1/metrics/summary (S09 ダッシュボード)。 */
export const metricsSummaryQuerySchema = z
  .object({
    ...periodRange,
    /** 指定するとそのハーネスに絞り込む (S16 のハーネス別表示)。 */
    harnessId: identifierSchema.optional(),
  })
  .strict()
  .refine((query) => query.from <= query.to, {
    message: 'from は to 以前の日付である必要があります',
    path: ['from'],
  });
export type MetricsSummaryQuery = z.output<typeof metricsSummaryQuerySchema>;

/**
 * KPI カード。金額・時間はいずれもサーバが rollup から算出した確定値で、
 * クライアントはこれを表示するだけで再計算しない。
 */
export const metricsSummaryKpiSchema = z
  .object({
    /** 総実行回数。 */
    totalRunCount: z.number().int().nonnegative(),
    /** 削減時間 (時間)。 */
    savedHours: z.number().nonnegative(),
    /** 削減額 (円)。 */
    savedAmountJpy: z.number().nonnegative(),
    /** 集計対象となったハーネス数。 */
    harnessCount: z.number().int().nonnegative(),
  })
  .strict();
export type MetricsSummaryKpi = z.output<typeof metricsSummaryKpiSchema>;

/** 推移グラフの 1 点。`periodStart` はその期間の開始日。 */
export const metricsSummaryTrendPointSchema = z
  .object({
    periodStart: metricsDateSchema,
    runCount: z.number().int().nonnegative(),
    savedHours: z.number().nonnegative(),
    savedAmountJpy: z.number().nonnegative(),
  })
  .strict();
export type MetricsSummaryTrendPoint = z.output<typeof metricsSummaryTrendPointSchema>;

/** ハーネス別ランキングの 1 行。 */
export const metricsSummaryRankingItemSchema = z
  .object({
    harnessId: identifierSchema,
    harnessName: z.string().trim().min(1).max(200),
    runCount: z.number().int().nonnegative(),
    savedHours: z.number().nonnegative(),
    savedAmountJpy: z.number().nonnegative(),
  })
  .strict();
export type MetricsSummaryRankingItem = z.output<typeof metricsSummaryRankingItemSchema>;

/** 部門別内訳の 1 行。部門未設定の実行をまとめるため `departmentId` は null を許す。 */
export const metricsSummaryDepartmentItemSchema = z
  .object({
    departmentId: identifierSchema.nullable(),
    departmentName: z.string().trim().min(1).max(200),
    runCount: z.number().int().nonnegative(),
    savedHours: z.number().nonnegative(),
    savedAmountJpy: z.number().nonnegative(),
  })
  .strict();
export type MetricsSummaryDepartmentItem = z.output<typeof metricsSummaryDepartmentItemSchema>;

export const metricsSummaryResponseSchema = z
  .object({
    period: z.object(periodRange).strict(),
    kpi: metricsSummaryKpiSchema,
    trend: z.array(metricsSummaryTrendPointSchema),
    ranking: z.array(metricsSummaryRankingItemSchema),
    departments: z.array(metricsSummaryDepartmentItemSchema),
  })
  .strict();
export type MetricsSummaryResponse = z.output<typeof metricsSummaryResponseSchema>;

/**
 * GET /api/v1/metrics/rollups。
 * `dim=user` は admin 限定 (SEC4)。契約としては値域を許すだけで、拒否は route 側の認可が行う。
 */
export const metricsRollupsQuerySchema = z
  .object({
    period: metricsRollupPeriodSchema,
    dim: metricsRollupDimensionSchema,
    ...periodRange,
    harnessId: identifierSchema.optional(),
  })
  .strict()
  .refine((query) => query.from <= query.to, {
    message: 'from は to 以前の日付である必要があります',
    path: ['from'],
  });
export type MetricsRollupsQuery = z.output<typeof metricsRollupsQuerySchema>;

/**
 * rollup 1 行。`metrics_rollups` テーブルの wire 形。
 * `savedMinutes` / `savedAmountJpy` は cron がサーバ側で算出して確定させた値である。
 */
export const metricsRollupItemSchema = z
  .object({
    period: metricsRollupPeriodSchema,
    periodStart: metricsDateSchema,
    dim: metricsRollupDimensionSchema,
    /** 次元の値 (tenant なら tenant_id、harness なら harness_id、など)。 */
    dimKey: identifierSchema,
    runCount: z.number().int().nonnegative(),
    savedMinutes: z.number().nonnegative(),
    savedAmountJpy: z.number().nonnegative(),
    /** 集計が確定した時刻。再集計されると更新される。 */
    computedAt: isoDateTimeSchema,
  })
  .strict();
export type MetricsRollupItem = z.output<typeof metricsRollupItemSchema>;

/**
 * rollup 行の配列。
 * 期間と次元で件数が上限付きに収まるため cursor ページングは使わず、
 * 他の応答と形を揃えるためだけに `items` で包む。
 */
export const metricsRollupsResponseSchema = z
  .object({
    items: z.array(metricsRollupItemSchema),
  })
  .strict();
export type MetricsRollupsResponse = z.output<typeof metricsRollupsResponseSchema>;
