/**
 * MT-CRON-*: Workers cron の rollup ジョブ (日次の事前集計 / 週次の確定)。
 *
 * 検証の主眼は 3 つ。
 *   1. 期間窓が JST 境界で切られること。cron の起動時刻は JST 基準で決まっているので、
 *      ここが UTC 基準だと毎回 9 時間ぶんずれた集計が確定してしまう。
 *   2. 金額換算がサーバ側の係数から行われ、rollup へ確定値として書かれること (SEC5)。
 *   3. 再実行しても行が増えないこと (冪等)。cron は同じ論理時刻で再送されうる。
 *
 * repository は実 DB を使う。冪等性を担保しているのが `metrics_rollups` の
 * unique 制約 + `ON CONFLICT DO UPDATE` なので、偽物では検証にならない。
 */
import type { RepositoryContext, TenantCoefficientRow, TenantRow } from '@harness-hub/db';
import { createRepositoryContext } from '@harness-hub/db';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { TENANT_A, TENANT_B, WORKSPACE_A1 } from '../../../tests/auth-tenancy/support/in-memory-ports.js';
import { DEFAULT_STANDARD_ANNUAL_SALARY_JPY } from '../../features/metrics-tracking/coefficients.js';
import { jstDateToEpochMs } from '../../features/metrics-tracking/date-jst.js';
import {
  createMetricsRollupJob,
  dailyWindow,
  type MetricsRollupJobDeps,
  runMetricsRollup,
  weeklyWindow,
} from '../../features/metrics-tracking/rollup-job.js';
import { createMetricsDbHarness, type MetricsDbHarness } from './support/real-db.js';

/** 1 日 (ミリ秒)。読取範囲を窓より少し広げるために使う。 */
const DAY = 24 * 60 * 60 * 1000;

const COEFFICIENTS: TenantCoefficientRow = {
  tenantId: TENANT_A,
  annualHours: 2000,
  minutesPerRun: 15,
  sheetReductionRate: 0.35,
  updatedBy: 'seed',
} as TenantCoefficientRow;

function tenant(id: string, status: TenantRow['status'] = 'active'): TenantRow {
  return { id, status } as TenantRow;
}

let db: MetricsDbHarness;

beforeEach(async () => {
  db = await createMetricsDbHarness();
});

afterEach(() => {
  db.close();
});

function depsFor(tenants: readonly TenantRow[]): MetricsRollupJobDeps {
  return {
    repository: db.repository,
    tenants: { list: async () => tenants },
    coefficients: coefficientSource(COEFFICIENTS),
  };
}

/** 係数は read-only consume。テストでも「読むだけ」の形を保つ。 */
function coefficientSource(row: TenantCoefficientRow): MetricsRollupJobDeps['coefficients'] {
  return { getCoefficients: async (_context: RepositoryContext) => row };
}

describe('MT-CRON: 集計期間の窓', () => {
  it('MT-CRON-001: 日次は起動時刻 (JST 0:00) の直前 1 日を切り出す', () => {
    // 2026-07-07 00:00 JST に起動 → [7/6 0:00, 7/7 0:00)
    const window = dailyWindow(new Date(jstDateToEpochMs('2026-07-07')));

    expect(window.start).toBe(jstDateToEpochMs('2026-07-06'));
    expect(window.end).toBe(jstDateToEpochMs('2026-07-07'));
  });

  it('MT-CRON-002: 週次は起動週の直前 1 週 (JST 月曜 0:00 境界) を切り出す', () => {
    // 2026-07-13 は月曜。09:00 JST に起動 → [7/6 0:00, 7/13 0:00)
    const window = weeklyWindow(new Date(jstDateToEpochMs('2026-07-13') + 9 * 60 * 60 * 1000));

    expect(window.start).toBe(jstDateToEpochMs('2026-07-06'));
    expect(window.end).toBe(jstDateToEpochMs('2026-07-13'));
  });

  it('MT-CRON-003: 境界は JST。JST の日付が変わる直前 (UTC では前日) でも同じ窓になる', () => {
    // 2026-07-06 23:59 JST = 2026-07-06 14:59 UTC。UTC 基準で丸めると 7/6 が窓から外れる
    const window = dailyWindow(new Date(jstDateToEpochMs('2026-07-07') - 60_000));

    expect(window.start).toBe(jstDateToEpochMs('2026-07-05'));
    expect(window.end).toBe(jstDateToEpochMs('2026-07-06'));
  });
});

describe('MT-CRON: rollup の確定', () => {
  const WINDOW = { start: jstDateToEpochMs('2026-07-06'), end: jstDateToEpochMs('2026-07-13') };

  async function seedEvents(count: number): Promise<void> {
    const context = createRepositoryContext({ tenantId: TENANT_A, workspaceId: WORKSPACE_A1, actorId: 'seeder' });
    for (let index = 0; index < count; index += 1) {
      await db.repository.ingestEvent(context, {
        workspaceId: WORKSPACE_A1,
        harnessId: 'harness-alpha',
        runCount: 1,
        idempotencyKey: `seed-${index}`,
      });
    }
  }

  /** ingest は現在時刻で記録されるので、窓は「現在を含む」形にして読む。 */
  function windowCoveringNow(): { readonly start: number; readonly end: number } {
    return { start: Date.now() - 60_000, end: Date.now() + 60_000 };
  }

  it('MT-CRON-004: events からサーバ側係数で換算した rollup が全次元ぶん確定する', async () => {
    await seedEvents(4);

    const result = await runMetricsRollup(depsFor([tenant(TENANT_A)]), {
      period: 'weekly',
      window: windowCoveringNow(),
      standardAnnualSalary: DEFAULT_STANDARD_ANNUAL_SALARY_JPY,
    });

    expect(result.failedTenantIds).toEqual([]);
    // tenant / harness / department / user の 4 次元 × 各 1 キー
    expect(result.rollupCount).toBe(4);

    const context = createRepositoryContext({ tenantId: TENANT_A, workspaceId: WORKSPACE_A1, actorId: 'reader' });
    const rows = await db.repository.listRollups(context, {
      period: 'weekly',
      dimension: 'tenant',
      periodStart: windowCoveringNow().start - DAY,
      periodEnd: windowCoveringNow().end + DAY,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.runCount).toBe(4);
    // 4 回 × 15 分 × 削減率 0.35 = 21 分
    expect(rows[0]?.savedMinutes).toBeCloseTo(21, 6);
    // 年収 600 万 / 年間 2000 時間 = 時給 3000 円。21 分 = 0.35 時間 → 1050 円
    expect(rows[0]?.savedAmount).toBeCloseTo(1050, 6);
  });

  it('MT-CRON-005: 同じ期間で再実行しても rollup 行は増えない (冪等)', async () => {
    await seedEvents(2);
    const options = {
      period: 'weekly' as const,
      window: windowCoveringNow(),
      standardAnnualSalary: DEFAULT_STANDARD_ANNUAL_SALARY_JPY,
    };

    await runMetricsRollup(depsFor([tenant(TENANT_A)]), options);
    await runMetricsRollup(depsFor([tenant(TENANT_A)]), options);

    const context = createRepositoryContext({ tenantId: TENANT_A, workspaceId: WORKSPACE_A1, actorId: 'reader' });
    const rows = await db.repository.listRollups(context, {
      period: 'weekly',
      dimension: 'harness',
      periodStart: options.window.start - DAY,
      periodEnd: options.window.end + DAY,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.runCount).toBe(2);
  });

  it('MT-CRON-006: 停止中テナントは集計対象から外れる', async () => {
    const result = await runMetricsRollup(depsFor([tenant(TENANT_B, 'suspended')]), {
      period: 'weekly',
      window: WINDOW,
      standardAnnualSalary: DEFAULT_STANDARD_ANNUAL_SALARY_JPY,
    });

    expect(result.tenantCount).toBe(0);
  });

  it('MT-CRON-007: テナント単位の失敗は他テナントを止めず、ID だけを持ち帰る', async () => {
    const deps: MetricsRollupJobDeps = {
      repository: db.repository,
      tenants: { list: async () => [tenant(TENANT_A), tenant(TENANT_B)] },
      coefficients: {
        getCoefficients: async (context) => {
          if (context.tenantId === TENANT_B) throw new Error('係数が未設定です');
          return COEFFICIENTS;
        },
      },
    };

    const result = await runMetricsRollup(deps, {
      period: 'weekly',
      window: WINDOW,
      standardAnnualSalary: DEFAULT_STANDARD_ANNUAL_SALARY_JPY,
    });

    expect(result.failedTenantIds).toEqual([TENANT_B]);
    expect(result.tenantCount).toBe(2);
  });

  it('MT-CRON-008: 失敗テナントがあれば CronJob は例外にする (heartbeat を飛ばさせない)', async () => {
    const job = createMetricsRollupJob({
      period: 'weekly',
      window: () => WINDOW,
      resolveDeps: () => ({
        repository: db.repository,
        tenants: { list: async () => [tenant(TENANT_A)] },
        coefficients: {
          getCoefficients: async () => {
            throw new Error('係数が未設定です');
          },
        },
      }),
    });

    expect(job.id).toBe('metrics-rollup-weekly');
    await expect(
      job.run({ scheduledAt: new Date(WINDOW.end), cron: '0 0 * * 1', runKey: 'k', env: {} }),
    ).rejects.toThrow(/metrics rollup に失敗したテナント/);
  });
});

describe('MT-CRON: cron registry への結線', () => {
  it('MT-CRON-009: 日次と週次のジョブが所定の cron 式へ登録されている', async () => {
    // ここで module を読み込めること自体が検証項目。DEFAULT_CRON_REGISTRY は
    // import 時に評価されるので、runtime を即時解決していると環境変数が無い場所で落ちる。
    const { DAILY_CRON, DEFAULT_CRON_REGISTRY, WEEKLY_CRON } = await import('../../worker/cron.js');

    expect(DEFAULT_CRON_REGISTRY[DAILY_CRON]?.map((job) => job.id)).toContain('metrics-rollup-daily');
    expect(DEFAULT_CRON_REGISTRY[WEEKLY_CRON]?.map((job) => job.id)).toContain('metrics-rollup-weekly');
  });
});
