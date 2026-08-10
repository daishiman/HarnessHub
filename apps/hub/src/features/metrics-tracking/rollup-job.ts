/**
 * Workers cron の rollup ジョブ (sys-metrics-tracking-p05 / B3)。
 *
 * 何を: 日次 (前日ぶんの事前集計) と週次 (前週ぶんの確定) の 2 ジョブを組み立てる。
 * なぜ: S09/S16 は受入条件により **rollup 由来のデータでのみ**描画する。
 *       画面表示のたびに events を集計すると、閲覧のたびに金額換算が走り、
 *       「いつ確定した値なのか」が画面ごとにぶれる。確定はこのジョブだけが行う。
 *
 * 期間の切り方 (`dto.ts` と同じく JST 基準):
 *   - 日次: 起動時刻 (JST 0:00) の直前 1 日 = [前日 0:00, 当日 0:00)
 *   - 週次: 起動時刻 (JST 月曜 9:00) が属する週の直前 1 週 = [前週月曜 0:00, 今週月曜 0:00)
 *
 * 再実行しても安全 (冪等)。repository の `upsertRollups` が一意キーで upsert するため、
 * 同じ期間を何度回しても行は増えず、値が上書きされるだけになる。
 */
import type { MetricsTrackingRepository, RepositoryContext, TenantCoefficientRow, TenantRow } from '@harness-hub/db';
import { createRepositoryContext } from '@harness-hub/db';
import type { MetricsRollupPeriod } from '@harness-hub/schemas';

import type { CronJob, CronJobContext } from '../../worker/cron.js';
import { readStandardAnnualSalary, resolveMetricsCoefficients } from './coefficients.js';
import { DAY_MS, WEEK_MS } from './dto.js';
import { createMetricsTrackingService } from './service.js';

/** JST の UTC 差 (ミリ秒)。`dto.ts` と同じ理由で JST 固定。 */
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** rollup の書き手を監査上識別するための actor。人間の操作と区別できるようにする。 */
const CRON_ACTOR_ID = 'system-metrics-rollup';

/** 集計期間 [start, end) (epoch ミリ秒)。 */
export interface RollupWindow {
  readonly start: number;
  readonly end: number;
}

/** `scheduledAt` の直前 1 日 (JST 0:00 境界)。 */
export function dailyWindow(scheduledAt: Date): RollupWindow {
  const end = floorToJstMidnight(scheduledAt.getTime());
  return { start: end - DAY_MS, end };
}

/** `scheduledAt` が属する JST 週の直前 1 週 (月曜 0:00 境界)。 */
export function weeklyWindow(scheduledAt: Date): RollupWindow {
  const end = floorToJstMonday(scheduledAt.getTime());
  return { start: end - WEEK_MS, end };
}

/** epoch ミリ秒を、それ以下で最大の JST 0:00 へ丸める。 */
function floorToJstMidnight(epochMs: number): number {
  const jst = epochMs + JST_OFFSET_MS;
  return jst - (((jst % DAY_MS) + DAY_MS) % DAY_MS) - JST_OFFSET_MS;
}

/** epoch ミリ秒を、それ以下で最大の JST 月曜 0:00 へ丸める。 */
function floorToJstMonday(epochMs: number): number {
  const midnight = floorToJstMidnight(epochMs);
  // getUTCDay() は日曜=0。月曜起点にするため 0 を 6 日戻し扱いへ写す。
  const weekday = new Date(midnight + JST_OFFSET_MS).getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;
  return midnight - daysSinceMonday * DAY_MS;
}

/**
 * テナント一覧の取得口。`TenantsRepo` 全体ではなく `list` だけを要求するのは、
 * このジョブがテナントを作成・更新する能力を持たないことを型で示すため。
 */
export interface MetricsTenantDirectory {
  list(): Promise<readonly TenantRow[]>;
}

/**
 * `tenant_coefficients` の read-only consume 経路 (owner は feat-user-org-admin)。
 * 更新メソッドを含めないことで、本 feature から書き込めないことを型で担保する。
 */
export interface MetricsCoefficientSource {
  getCoefficients(context: RepositoryContext): Promise<TenantCoefficientRow>;
}

/** rollup ジョブが必要とする依存。cron 実行時まで解決を遅らせるため関数で受け取る。 */
export interface MetricsRollupJobDeps {
  readonly repository: MetricsTrackingRepository;
  readonly coefficients: MetricsCoefficientSource;
  readonly tenants: MetricsTenantDirectory;
}

export interface MetricsRollupJobOptions {
  readonly period: MetricsRollupPeriod;
  /** cron 実行時に依存を解決する。route/worker の import 時に環境変数へ触れさせないため。 */
  readonly resolveDeps: () => MetricsRollupJobDeps | Promise<MetricsRollupJobDeps>;
  readonly window: (scheduledAt: Date) => RollupWindow;
}

/** 停止・凍結テナントを集計対象から外す。過去ぶんの再集計で復活させないため。 */
function isAggregatable(tenant: TenantRow): boolean {
  return tenant.status === 'active';
}

/**
 * rollup ジョブ本体。テナント単位で events を読み、サーバ側係数で換算して rollup へ書き戻す。
 *
 * 1 テナントの失敗で全テナントを落とさない。cron 全体を失敗にすると heartbeat が飛ばず
 * 「cron が完走しなかった」と外形監視に見えるが、原因テナントの特定は別途ログが要る。
 * ここでは失敗テナント数を戻り値へ載せ、1 件でもあれば例外にして dispatch 側へ伝える。
 */
export async function runMetricsRollup(
  deps: MetricsRollupJobDeps,
  options: {
    readonly period: MetricsRollupPeriod;
    readonly window: RollupWindow;
    readonly standardAnnualSalary: number;
  },
): Promise<{
  readonly tenantCount: number;
  readonly rollupCount: number;
  readonly failedTenantIds: readonly string[];
}> {
  const service = createMetricsTrackingService(deps.repository);

  const tenants = (await deps.tenants.list()).filter(isAggregatable);
  const failedTenantIds: string[] = [];
  let rollupCount = 0;

  for (const tenant of tenants) {
    const context = createRepositoryContext({ tenantId: tenant.id, actorId: CRON_ACTOR_ID });
    try {
      const coefficientRow = await deps.coefficients.getCoefficients(context);
      const result = await service.rebuildRollups({
        context,
        period: options.period,
        periodStart: options.window.start,
        periodEnd: options.window.end,
        coefficients: resolveMetricsCoefficients(coefficientRow, options.standardAnnualSalary),
      });
      rollupCount += result.rollupCount;
    } catch {
      // 例外 message にはテナント固有の値が混ざりうるので、外へ出すのは ID だけにする。
      failedTenantIds.push(tenant.id);
    }
  }

  return { tenantCount: tenants.length, rollupCount, failedTenantIds };
}

/** cron registry へ登録する `CronJob` を作る。 */
export function createMetricsRollupJob(options: MetricsRollupJobOptions): CronJob {
  return {
    id: `metrics-rollup-${options.period}`,
    async run(context: CronJobContext) {
      const deps = await options.resolveDeps();
      const result = await runMetricsRollup(deps, {
        period: options.period,
        window: options.window(context.scheduledAt),
        standardAnnualSalary: readStandardAnnualSalary(context.env as Record<string, string | undefined>),
      });
      if (result.failedTenantIds.length > 0) {
        throw new Error(`metrics rollup に失敗したテナントがあります: ${result.failedTenantIds.join(',')}`);
      }
    },
  };
}
