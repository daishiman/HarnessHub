// 日次 export cron ジョブ (qa-019 / P12 interface stub)。
// 正本の日次 export は GitHub Actions backup.yml (Turso dump → gzip → R2) — infrastructure-spec §5/§10。
// 本ジョブは Workers 側の補完経路 (Actions 停止時の手動起動・drill 用) として、
// feat-hub-foundation の CronJob 契約 (apps/hub/src/worker/cron.ts) と構造互換の形で提供する。
// packages → apps の依存逆転を避けるため、契約は構造型で写している。

import { exportControlPlane } from '../backup/export';
import type { R2BucketLike } from '../registry/index';
import type { CoreAdapter } from '../repository/db';

/** feat-hub-foundation CronJobContext との構造互換 (必要な射影のみ)。 */
export interface CronJobContextLike {
  readonly scheduledAt: Date;
  readonly runKey: string;
}

export interface CronJobLike {
  readonly id: string;
  run(context: CronJobContextLike): Promise<void>;
}

export interface DailyExportDeps {
  readonly adapter: CoreAdapter;
  readonly backupsBucket: R2BucketLike;
}

/** R2 保存 key: db-export/<YYYY>/<YYYY-MM-DD>.jsonl (infrastructure-spec §3 の prefix 規約に整合)。 */
export function dailyExportKey(scheduledAt: Date): string {
  const iso = scheduledAt.toISOString().slice(0, 10);
  return `db-export/${iso.slice(0, 4)}/${iso}.jsonl`;
}

export function createDailyExportJob(deps: DailyExportDeps): CronJobLike {
  return {
    id: 'db.export-daily',
    async run(context) {
      const artifact = await exportControlPlane(deps.adapter);
      await deps.backupsBucket.put(dailyExportKey(context.scheduledAt), new TextEncoder().encode(artifact));
    },
  };
}
