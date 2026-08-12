/**
 * metrics-tracking のアプリケーションサービス (sys-metrics-tracking-p05 / B2 / B3 / I10)。
 *
 * 何を: ingest (回数の記録)・summary/rollups の読取・rollup の再集計を提供する。
 * なぜ: route は「認可と HTTP 変換」だけを担い、集計の意味づけ (期間の切り方・次元の作り方・
 *       金額換算をどこで行うか) はこの層に閉じる。route に分散すると SEC5 の
 *       「金額はサーバ側だけ」が配線ではなく規律で守られる状態になってしまう。
 *
 * 認可はここでは判定しない (`withAuthz` が唯一の入口)。ただし `dim=user` のような
 * 「認可が絡む次元」は route が判定した結果を受けて呼ばれる前提で、この層は素直に集計する。
 */
import type { MetricsEventRow, MetricsTrackingRepository, RepositoryContext, UpsertRollupInput } from '@harness-hub/db';
import {
  aggregateMetricsRollup,
  type MetricsAggregationEvent,
  type MetricsCoefficients,
} from '@harness-hub/estimation';
// period/dimension の値域は `@harness-hub/db` が意図的に公開していない (zod 単一ソースとの二重定義を避けるため)。
// 語彙は契約側 (`@harness-hub/schemas`) から取る。
import {
  METRICS_RANKING_LIMIT,
  type MetricsEventIngestRequest,
  type MetricsEventIngestResponse,
  type MetricsRollupDimension,
  type MetricsRollupPeriod,
  type MetricsRollupsQuery,
  type MetricsRollupsResponse,
  type MetricsSummaryQuery,
  type MetricsSummaryResponse,
  metricsEventIngestResponseSchema,
} from '@harness-hub/schemas';

import { DEPARTMENT_UNASSIGNED_KEY, toHalfOpenRange, toRollupsResponse, toSummaryResponse } from './dto.js';

/** rollup を作る次元。`tenant` は KPI・推移の供給元で、残り 3 つは内訳。 */
const ROLLUP_DIMENSIONS: readonly MetricsRollupDimension[] = ['tenant', 'harness', 'department', 'user'];

export interface IngestEventInput {
  readonly context: RepositoryContext;
  readonly workspaceId: string;
  readonly idempotencyKey: string;
  readonly request: MetricsEventIngestRequest;
}

export interface SummaryInput {
  readonly context: RepositoryContext;
  readonly query: MetricsSummaryQuery;
  /** 既定は確定済みの週次 rollup。日次の速報を見たい画面だけ 'daily' を渡す。 */
  readonly period?: MetricsRollupPeriod | undefined;
}

export interface RollupsInput {
  readonly context: RepositoryContext;
  readonly query: MetricsRollupsQuery;
}

export interface RebuildRollupsInput {
  readonly context: RepositoryContext;
  readonly period: MetricsRollupPeriod;
  /** 集計期間 [periodStart, periodEnd) (epoch ミリ秒)。 */
  readonly periodStart: number;
  readonly periodEnd: number;
  readonly coefficients: MetricsCoefficients;
}

export interface RebuildRollupsResult {
  readonly eventCount: number;
  readonly rollupCount: number;
}

export interface MetricsTrackingService {
  ingestEvent(input: IngestEventInput): Promise<MetricsEventIngestResponse>;
  getSummary(input: SummaryInput): Promise<MetricsSummaryResponse>;
  listRollups(input: RollupsInput): Promise<MetricsRollupsResponse>;
  rebuildRollups(input: RebuildRollupsInput): Promise<RebuildRollupsResult>;
}

/**
 * event 行から dimension key を取り出す。
 * `user` は実行者が匿名の場合があるので null を返し、呼び出し側が集計対象から外す
 * (匿名ぶんを 1 つのキーへまとめると「誰か 1 人が大量実行した」ように見えてしまう)。
 */
function dimensionKeyOf(dimension: MetricsRollupDimension, row: MetricsEventRow): string | null {
  switch (dimension) {
    case 'tenant':
      return row.tenantId;
    case 'harness':
      return row.harnessId;
    case 'department':
      return row.departmentId ?? DEPARTMENT_UNASSIGNED_KEY;
    case 'user':
      return row.actorUserId;
    default: {
      const exhaustive: never = dimension;
      throw new Error(`未知の集計次元です: ${String(exhaustive)}`);
    }
  }
}

/**
 * 1 workspace ぶんの event を全次元へ畳み込む。
 *
 * 金額換算はここで `aggregateMetricsRollup` (= `packages/estimation` の純関数) を呼ぶ 1 回だけ。
 * 回数を先に合算してから換算するのは、行ごとに換算して足すと丸め誤差が行数ぶん積み上がるため
 * (この性質は estimation 側の docblock が担保している)。
 */
function buildWorkspaceRollups(
  workspaceId: string,
  rows: readonly MetricsEventRow[],
  input: Pick<RebuildRollupsInput, 'period' | 'periodStart' | 'periodEnd' | 'coefficients'>,
): readonly UpsertRollupInput[] {
  return ROLLUP_DIMENSIONS.flatMap((dimension) => {
    const events: MetricsAggregationEvent[] = [];
    for (const row of rows) {
      const dimKey = dimensionKeyOf(dimension, row);
      if (dimKey === null) continue;
      events.push({ dimKey, runCount: row.runCount });
    }

    return aggregateMetricsRollup(events, input.coefficients).map((aggregated) => ({
      workspaceId,
      period: input.period,
      dimension,
      dimensionKey: aggregated.dimKey,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      runCount: aggregated.runCount,
      savedMinutes: aggregated.savedMinutes,
      savedAmount: aggregated.savedAmount,
    }));
  });
}

export function createMetricsTrackingService(repository: MetricsTrackingRepository): MetricsTrackingService {
  return {
    async ingestEvent(input) {
      const result = await repository.ingestEvent(input.context, {
        workspaceId: input.workspaceId,
        harnessId: input.request.harnessId,
        runCount: input.request.runCount,
        idempotencyKey: input.idempotencyKey,
        // 時刻・主体・部門は repository が認証済み context とサーバ側情報だけから確定する。
        // client request から渡す口を型として持たせない (SEC5)。
      });
      return metricsEventIngestResponseSchema.parse({
        eventId: result.row.id,
        deduplicated: result.deduplicated,
      });
    },

    async getSummary(input) {
      const { start, end } = toHalfOpenRange(input.query.from, input.query.to);
      const summary = await repository.summarize(input.context, {
        from: start,
        to: end,
        // 件数の正本は契約側 (METRICS_RANKING_LIMIT)。画面は返ってきた順にそのまま描く
        rankingLimit: METRICS_RANKING_LIMIT,
        ...(input.query.harnessId === undefined ? {} : { harnessId: input.query.harnessId }),
        ...(input.period === undefined ? {} : { period: input.period }),
      });
      return toSummaryResponse(summary, { from: input.query.from, to: input.query.to });
    },

    async listRollups(input) {
      const { start, end } = toHalfOpenRange(input.query.from, input.query.to);
      const rows = await repository.listRollups(input.context, {
        period: input.query.period,
        dimension: input.query.dim,
        periodStart: start,
        periodEnd: end,
        ...(input.query.harnessId === undefined ? {} : { dimensionKey: input.query.harnessId }),
      });
      return toRollupsResponse(rows);
    },

    async rebuildRollups(input) {
      const events = await repository.listEventsForPeriod(input.context, {
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
      });
      if (events.length === 0) return { eventCount: 0, rollupCount: 0 };

      // workspace ごとに分けるのは rollup の一意キーに workspace_id が含まれるため。
      // まとめて集計すると別 workspace の実行が 1 行に混ざり、workspace 単位の内訳が失われる。
      const byWorkspace = new Map<string, MetricsEventRow[]>();
      for (const row of events) {
        const bucket = byWorkspace.get(row.workspaceId);
        if (bucket === undefined) byWorkspace.set(row.workspaceId, [row]);
        else bucket.push(row);
      }

      const rollups = [...byWorkspace].flatMap(([workspaceId, rows]) =>
        buildWorkspaceRollups(workspaceId, rows, input),
      );
      await repository.upsertRollups(input.context, rollups);
      return { eventCount: events.length, rollupCount: rollups.length };
    },
  };
}
