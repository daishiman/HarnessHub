/**
 * cron registry へ差し込む metrics rollup ジョブの結線 (sys-metrics-tracking-p05 / B3)。
 *
 * 何を: 日次 (前日ぶんの事前集計) と週次 (前週ぶんの確定) の 2 ジョブを本番 runtime へ繋ぐ。
 * なぜ: `worker/cron.ts` は dispatch の骨格だけを持ち、業務ロジックも DB 結線も知らない契約
 *       (同ファイル冒頭のコメント)。依存の解決はこの feature 側に置く。
 *
 * `resolveDeps` を関数で渡すのが要点。`worker/cron.ts` は module 読み込み時に
 * `DEFAULT_CRON_REGISTRY` を評価するため、ここで runtime を即時解決すると
 * 環境変数が未設定のビルド環境で worker の import 自体が落ちる。
 */

import type { CronJob } from '../../worker/cron.js';
import { createMetricsRollupJob, dailyWindow, weeklyWindow } from './rollup-job.js';
import { metricsTrackingRuntime } from './runtime.js';

export interface MetricsRollupCronJobs {
  readonly daily: CronJob;
  readonly weekly: CronJob;
}

export function createMetricsRollupCronJobs(): MetricsRollupCronJobs {
  const resolveDeps = () => {
    const runtime = metricsTrackingRuntime();
    return { repository: runtime.repository, coefficients: runtime.coefficients, tenants: runtime.tenants };
  };

  return {
    daily: createMetricsRollupJob({ period: 'daily', resolveDeps, window: dailyWindow }),
    weekly: createMetricsRollupJob({ period: 'weekly', resolveDeps, window: weeklyWindow }),
  };
}
