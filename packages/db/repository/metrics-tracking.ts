/**
 * feat-metrics-tracking の tenant-scoped repository (I10 / B2 / B3 / SEC5)。
 *
 * 経路は 3 本しかない。
 *
 *   - **ingest** (`ingestEvent`): `POST /api/v1/metrics/events` が受けた 1 実行を記録する。
 *     受理するのは `run_count` だけで、`occurred_at` はサーバ時刻を採る (クライアント申告時刻を
 *     保存しない / qa-032・SEC5)。`idempotencyKey` で冪等に振る舞い、重複計上しない。
 *   - **cron** (`listEventsForPeriod` / `upsertRollups`): Workers cron が期間で events を読み、
 *     `packages/estimation` の純関数で換算した結果を rollup へ書き戻す。unique 制約キーでの
 *     upsert なので、同じ期間を何度回しても行は増えず値が上書きされるだけ。
 *   - **読取** (`listRollups` / `summarize`): S09/S16 ダッシュボードの供給元。
 *     受入条件どおり **rollup からのみ**返し、events から直接は算出しない。
 *
 * **認可判定はここでは行わない。** `dimension='user'` (S17 個別集計) を admin 限定にする判定も、
 * 短命 Bearer token の検証も route 層 (`apps/hub/src/features/metrics-tracking/`) の責務である。
 * この層が保証するのは D4 row-level scope — 全ての WHERE に `tenant_id = context.tenantId` を
 * 注入し、`context.workspaceId` が指定されていればそれも重ねる — ところまで。
 *
 * 時刻は全て epoch ミリ秒 (`serverNow()` と schema に揃える)。
 */
import { and, asc, eq, gte, lt, lte, type SQL } from 'drizzle-orm';

import {
  type METRICS_ROLLUP_DIMENSIONS,
  type METRICS_ROLLUP_PERIODS,
  metricsEvents,
  metricsRollups,
} from '../schema/metrics-tracking/schema';
import { RepositoryError } from '../src/errors';
import type { RepositoryContext } from '../src/types';
import { canonicalJson, sha256Hex } from './bytes';
import { guardedWrite } from './conflict';
import type { CoreAdapter } from './db';
import { serverNow } from './time';
import { newUlid } from './ulid';

export type MetricsEventRow = typeof metricsEvents.$inferSelect;
export type MetricsRollupRow = typeof metricsRollups.$inferSelect;
export type MetricsRollupPeriod = (typeof METRICS_ROLLUP_PERIODS)[number];
export type MetricsRollupDimension = (typeof METRICS_ROLLUP_DIMENSIONS)[number];

/** CLI の正当な再送を覆いつつ、誤った key の使い回しを固定化しない保持期間。 */
export const METRICS_INGEST_IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

/** 同一 scope・有効期間内の key が、異なる request payload に再利用された。HTTP では 422 相当。 */
export class MetricsIdempotencyKeyReuseError extends RepositoryError {
  readonly idempotencyKey: string;

  constructor(idempotencyKey: string) {
    super('invalid-context', '同じ Idempotency-Key を異なる metrics payload に再利用できません');
    this.name = 'MetricsIdempotencyKeyReuseError';
    this.idempotencyKey = idempotencyKey;
  }
}

/**
 * ingest 入力。**`occurredAt` を受け取らない**のが仕様の一部で、
 * 呼び出し側が実行時刻を申告する余地を型で塞いでいる (SEC5)。
 */
export interface IngestMetricsEventInput {
  readonly workspaceId: string;
  readonly harnessId: string;
  readonly runCount: number;
  readonly idempotencyKey: string;
}

export interface IngestMetricsEventResult {
  readonly row: MetricsEventRow;
  /** 既存の冪等キーに当たったため新規計上しなかった場合 true。route は 200 を返せばよい。 */
  readonly deduplicated: boolean;
}

export interface ListEventsForPeriodInput {
  /** 集計期間 [periodStart, periodEnd) (epoch ms)。半開区間。 */
  readonly periodStart: number;
  readonly periodEnd: number;
}

/** cron が書き戻す rollup 1 行ぶん。`id`/`createdAt`/`updatedAt` はこの層が発行する。 */
export interface UpsertRollupInput {
  readonly workspaceId: string;
  readonly period: MetricsRollupPeriod;
  readonly dimension: MetricsRollupDimension;
  readonly dimensionKey: string;
  readonly periodStart: number;
  readonly periodEnd: number;
  readonly runCount: number;
  readonly savedMinutes: number;
  readonly savedAmount: number;
}

export interface ListRollupsInput {
  readonly period: MetricsRollupPeriod;
  readonly dimension: MetricsRollupDimension;
  /** 読取範囲 [periodStart, periodEnd) (epoch ms)。period_start がこの範囲に入る行を返す。 */
  readonly periodStart: number;
  readonly periodEnd: number;
  readonly dimensionKey?: string;
}

export interface SummarizeInput {
  /** 読取範囲 [from, to) (epoch ms)。 */
  readonly from: number;
  readonly to: number;
  /** 指定すると S16 相当 (単一ハーネスの KPI/推移) になる。 */
  readonly harnessId?: string;
  /** 既定は確定済みの週次 rollup。日次の速報を見たい場合のみ 'daily'。 */
  readonly period?: MetricsRollupPeriod;
  /**
   * ハーネス別ランキングとして返す件数の上限。省略すると全件。
   *
   * 画面が使うのは上位数件だけなので、切るのは受け取り側ではなくここが正しい。
   * 切ったあとの配列からは母集団を数えられなくなるため、`harnessRankingTotals` を併せて返す。
   */
  readonly rankingLimit?: number;
}

/** 集計値の共通形。3 指標は常に同じ組で動く (回数 → 分 → 金額の換算連鎖のため)。 */
export interface MetricsTotals {
  readonly runCount: number;
  readonly savedMinutes: number;
  readonly savedAmount: number;
}

export interface MetricsTrendPoint extends MetricsTotals {
  readonly periodStart: number;
  readonly periodEnd: number;
}

export interface MetricsBreakdownEntry extends MetricsTotals {
  /** `dimension` に対応するキー (harness_id / department_id)。 */
  readonly key: string;
}

/** ランキングの母集団の数え上げ。切り出しの前に数える。 */
export interface MetricsRankingTotals {
  /** 期間内に集計対象となったハーネスの総数 */
  readonly total: number;
  /** うち期間内に 1 回以上実行されたもの */
  readonly active: number;
}

export interface MetricsSummary {
  /** 実際に読んだ rollup の粒度 (入力の `period` をそのまま返す)。 */
  readonly period: MetricsRollupPeriod;
  /** KPI カード。`harnessId` 指定時はそのハーネスぶんの合計。 */
  readonly kpi: MetricsTotals;
  /** 推移グラフ。period_start の昇順。 */
  readonly trend: readonly MetricsTrendPoint[];
  /**
   * ハーネス別ランキング。**削減額の降順** (同額なら回数 → キーで安定化)。
   * `rankingLimit` を指定した場合は上位そこまで。
   *
   * 部門別と並び順が違うのは、この配列が「削減額の大きいツール」として表示されるため。
   * 表示の見出しと並び順が食い違うと、読み手は「なぜこの順なのか」を読み取れない。
   */
  readonly harnessRanking: readonly MetricsBreakdownEntry[];
  /**
   * ランキングの母集団。`harnessRanking` は切り出し後なので、そこからは数えられない。
   * 稼働率 (使われている割合) と KPI のハーネス数がこの値に依存する。
   */
  readonly harnessRankingTotals: MetricsRankingTotals;
  /** 部門別集計 (S09)。同上の順序。 */
  readonly departmentBreakdown: readonly MetricsBreakdownEntry[];
}

export interface MetricsTrackingRepository {
  ingestEvent(context: RepositoryContext, input: IngestMetricsEventInput): Promise<IngestMetricsEventResult>;
  listEventsForPeriod(context: RepositoryContext, input: ListEventsForPeriodInput): Promise<readonly MetricsEventRow[]>;
  upsertRollups(context: RepositoryContext, rows: readonly UpsertRollupInput[]): Promise<void>;
  listRollups(context: RepositoryContext, input: ListRollupsInput): Promise<readonly MetricsRollupRow[]>;
  summarize(context: RepositoryContext, input: SummarizeInput): Promise<MetricsSummary>;
}

/** D4: tenant 条件は必ず入れ、context に workspace が絞られていればそれも重ねる。 */
function eventScope(context: RepositoryContext): SQL[] {
  const predicates: SQL[] = [eq(metricsEvents.tenantId, context.tenantId)];
  if (context.workspaceId !== undefined) predicates.push(eq(metricsEvents.workspaceId, context.workspaceId));
  return predicates;
}

function rollupScope(context: RepositoryContext): SQL[] {
  const predicates: SQL[] = [eq(metricsRollups.tenantId, context.tenantId)];
  if (context.workspaceId !== undefined) predicates.push(eq(metricsRollups.workspaceId, context.workspaceId));
  return predicates;
}

function assertHalfOpenRange(start: number, end: number): void {
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
    throw new RepositoryError('invalid-context', `集計期間が不正です (periodStart=${start}, periodEnd=${end})`);
  }
}

function addTotals(base: MetricsTotals | undefined, row: MetricsRollupRow): MetricsTotals {
  return {
    runCount: (base?.runCount ?? 0) + row.runCount,
    savedMinutes: (base?.savedMinutes ?? 0) + row.savedMinutes,
    savedAmount: (base?.savedAmount ?? 0) + row.savedAmount,
  };
}

/**
 * 合計は SQL の SUM ではなく JS で畳み込む。rollup は事前集計済みで行数が小さく、
 * libSQL / D1 双方で同じ結果になることを優先する (dialect 差を集計式へ持ち込まない)。
 */
function foldByKey(rows: readonly MetricsRollupRow[]): MetricsBreakdownEntry[] {
  const totals = new Map<string, MetricsTotals>();
  for (const row of rows) {
    totals.set(row.dimensionKey, addTotals(totals.get(row.dimensionKey), row));
  }
  return [...totals.entries()]
    .map(([key, value]) => ({ key, ...value }))
    .sort(
      (left, right) =>
        right.runCount - left.runCount ||
        right.savedMinutes - left.savedMinutes ||
        left.key.localeCompare(right.key, 'en'),
    );
}

function foldTrend(rows: readonly MetricsRollupRow[]): MetricsTrendPoint[] {
  const points = new Map<number, MetricsTrendPoint>();
  for (const row of rows) {
    const current = points.get(row.periodStart);
    points.set(row.periodStart, {
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      ...addTotals(current, row),
    });
  }
  return [...points.values()].sort((left, right) => left.periodStart - right.periodStart);
}

function foldTotals(rows: readonly MetricsRollupRow[]): MetricsTotals {
  return rows.reduce<MetricsTotals>((accumulator, row) => addTotals(accumulator, row), {
    runCount: 0,
    savedMinutes: 0,
    savedAmount: 0,
  });
}

export function createMetricsTrackingRepository(adapter: CoreAdapter): MetricsTrackingRepository {
  async function findByIdempotencyKey(
    context: RepositoryContext,
    workspaceId: string,
    idempotencyKey: string,
  ): Promise<MetricsEventRow | undefined> {
    const rows = await adapter.client
      .select()
      .from(metricsEvents)
      .where(
        and(
          eq(metricsEvents.tenantId, context.tenantId),
          eq(metricsEvents.workspaceId, workspaceId),
          eq(metricsEvents.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    return rows[0] as MetricsEventRow | undefined;
  }

  async function selectRollups(
    context: RepositoryContext,
    input: ListRollupsInput,
  ): Promise<readonly MetricsRollupRow[]> {
    assertHalfOpenRange(input.periodStart, input.periodEnd);
    const predicates = [
      ...rollupScope(context),
      eq(metricsRollups.period, input.period),
      eq(metricsRollups.dimension, input.dimension),
      gte(metricsRollups.periodStart, input.periodStart),
      lt(metricsRollups.periodStart, input.periodEnd),
    ];
    if (input.dimensionKey !== undefined) predicates.push(eq(metricsRollups.dimensionKey, input.dimensionKey));

    const rows = await adapter.client
      .select()
      .from(metricsRollups)
      .where(and(...predicates))
      .orderBy(asc(metricsRollups.periodStart), asc(metricsRollups.dimensionKey));
    return rows as MetricsRollupRow[];
  }

  return {
    async ingestEvent(context, input) {
      if (input.idempotencyKey.trim().length === 0) {
        throw new RepositoryError('invalid-context', 'idempotencyKey は空にできません');
      }
      if (!Number.isInteger(input.runCount) || input.runCount <= 0) {
        throw new RepositoryError('invalid-context', `runCount は正の整数である必要があります (${input.runCount})`);
      }
      if (context.workspaceId !== undefined && context.workspaceId !== input.workspaceId) {
        throw new RepositoryError('invalid-context', 'context と入力の workspaceId が一致しません');
      }
      const actorUserId = context.actorId;
      if (actorUserId === undefined) {
        throw new RepositoryError('invalid-context', 'metrics ingest には認証済み操作主体 (actorId) が必要です');
      }

      const requestDigest = await sha256Hex(canonicalJson({ harnessId: input.harnessId, runCount: input.runCount }));

      return guardedWrite(adapter, async () => {
        // サーバ時刻を採る唯一の場所。入力には occurredAt が存在しないので上書きされ得ない (SEC5)。
        const now = serverNow();
        const scope = and(
          eq(metricsEvents.tenantId, context.tenantId),
          eq(metricsEvents.workspaceId, input.workspaceId),
          eq(metricsEvents.idempotencyKey, input.idempotencyKey),
        );

        // 期限切れ claim だけを外す。event 本体は保持し、UNIQUE が null 同士を競合させない性質で
        // 同じ key を新しい event に再利用できるようにする。
        await adapter.client
          .update(metricsEvents)
          .set({ idempotencyKey: null })
          .where(and(scope, lte(metricsEvents.idempotencyExpiresAt, now)));

        const inserted = await adapter.client
          .insert(metricsEvents)
          .values({
            id: newUlid(now),
            tenantId: context.tenantId,
            workspaceId: input.workspaceId,
            harnessId: input.harnessId,
            // client body ではなく、認可境界が作った RepositoryContext だけを信頼する。
            actorUserId,
            // 信頼できる既存の server-side 部門解決経路が無いため、現時点では未設定に固定する。
            departmentId: null,
            runCount: input.runCount,
            occurredAt: now,
            idempotencyKey: input.idempotencyKey,
            requestDigest,
            idempotencyExpiresAt: now + METRICS_INGEST_IDEMPOTENCY_TTL_MS,
            createdAt: now,
          })
          .onConflictDoNothing()
          .returning();
        const createdRow = inserted[0] as MetricsEventRow | undefined;
        if (createdRow !== undefined) return { row: createdRow, deduplicated: false };

        // 一意制約 (tenant_id, workspace_id, idempotency_key) に競合した = 同 scope に既存 claim がある。
        const existing = await findByIdempotencyKey(context, input.workspaceId, input.idempotencyKey);
        if (existing === undefined) {
          throw new RepositoryError('conflict', 'metrics_events の冪等 ingest に失敗しました (既存行を再取得できず)');
        }
        if (existing.requestDigest !== requestDigest) {
          throw new MetricsIdempotencyKeyReuseError(input.idempotencyKey);
        }
        return { row: existing, deduplicated: true };
      });
    },

    async listEventsForPeriod(context, input) {
      assertHalfOpenRange(input.periodStart, input.periodEnd);
      const rows = await adapter.client
        .select()
        .from(metricsEvents)
        .where(
          and(
            ...eventScope(context),
            gte(metricsEvents.occurredAt, input.periodStart),
            lt(metricsEvents.occurredAt, input.periodEnd),
          ),
        )
        .orderBy(asc(metricsEvents.occurredAt), asc(metricsEvents.id));
      return rows as MetricsEventRow[];
    },

    async upsertRollups(context, rows) {
      if (rows.length === 0) return;
      for (const row of rows) {
        assertHalfOpenRange(row.periodStart, row.periodEnd);
        if (context.workspaceId !== undefined && context.workspaceId !== row.workspaceId) {
          throw new RepositoryError('invalid-context', 'context と rollup 行の workspaceId が一致しません');
        }
      }

      // guardedWrite は再入禁止なので、行ごとではなくループ全体を 1 回だけ包む。
      await guardedWrite(adapter, async () => {
        const now = serverNow();
        for (const row of rows) {
          await adapter.client
            .insert(metricsRollups)
            .values({
              id: newUlid(now),
              tenantId: context.tenantId,
              workspaceId: row.workspaceId,
              period: row.period,
              dimension: row.dimension,
              dimensionKey: row.dimensionKey,
              periodStart: row.periodStart,
              periodEnd: row.periodEnd,
              runCount: row.runCount,
              savedMinutes: row.savedMinutes,
              savedAmount: row.savedAmount,
              computedAt: now,
              createdAt: now,
              updatedAt: now,
            })
            // unique 制約キーでの upsert。cron を同じ期間で再実行しても行は増えず、値だけが直る。
            .onConflictDoUpdate({
              target: [
                metricsRollups.tenantId,
                metricsRollups.workspaceId,
                metricsRollups.period,
                metricsRollups.dimension,
                metricsRollups.dimensionKey,
                metricsRollups.periodStart,
              ],
              set: {
                periodEnd: row.periodEnd,
                runCount: row.runCount,
                savedMinutes: row.savedMinutes,
                savedAmount: row.savedAmount,
                computedAt: now,
                updatedAt: now,
              },
            });
        }
      });
    },

    listRollups(context, input) {
      return selectRollups(context, input);
    },

    async summarize(context, input) {
      assertHalfOpenRange(input.from, input.to);
      const period = input.period ?? 'weekly';
      const range = { period, periodStart: input.from, periodEnd: input.to } as const;

      // KPI/推移は harnessId 指定の有無で読む次元を切り替える (S09 = tenant 全体 / S16 = 単一ハーネス)。
      const headline =
        input.harnessId === undefined
          ? await selectRollups(context, { ...range, dimension: 'tenant' })
          : await selectRollups(context, { ...range, dimension: 'harness', dimensionKey: input.harnessId });

      const harnessRows = await selectRollups(context, { ...range, dimension: 'harness' });
      const departmentRows = await selectRollups(context, { ...range, dimension: 'department' });

      // 母集団は切り出しの前に数える。切ったあとの配列を数えると
      // 「上位 5 件中 5 件が稼働 = 100%」のように、常に良く見える値になってしまう。
      const allHarnesses = foldByKey(harnessRows);
      const harnessRankingTotals = {
        total: allHarnesses.length,
        active: allHarnesses.filter((entry) => entry.runCount > 0).length,
      };
      // ランキングは harnessId 指定時も全ハーネスを対象にする (S16 で「自分の順位」を出すため)。
      const ranked = [...allHarnesses].sort(
        (left, right) =>
          right.savedAmount - left.savedAmount ||
          right.runCount - left.runCount ||
          left.key.localeCompare(right.key, 'en'),
      );

      return {
        period,
        kpi: foldTotals(headline),
        trend: foldTrend(headline),
        harnessRanking: input.rankingLimit === undefined ? ranked : ranked.slice(0, input.rankingLimit),
        harnessRankingTotals,
        departmentBreakdown: foldByKey(departmentRows),
      };
    },
  };
}
