// Cloudflare Worker のエントリ。opennextjs-cloudflare が生成する fetch handler を包み、
// cron 用の scheduled handler を同一 Worker から併せて export する (ADR §4 / infrastructure-spec §5)。
// ここには業務ロジックを置かない。dispatch 実体は src/worker/cron.ts。
import openNextWorker from '../.open-next/worker.js';
import { type CronEnv, createInMemoryCronRunLedger, dispatchScheduled } from './worker/cron.js';

// OpenNext が生成する Durable Object 実装。Worker の export から落ちると起動時に解決できなくなるため素通しする
export { BucketCachePurge, DOQueueHandler, DOShardedTagCache } from '../.open-next/worker.js';

/** isolate 内での cron 二重起動を抑える。isolate をまたぐ重複防止は永続 ledger (feat-domain-model-db) の責務 */
const runLedger = createInMemoryCronRunLedger();

interface ScheduledEventLike {
  readonly cron: string;
  readonly scheduledTime: number;
}

interface ExecutionContextLike {
  waitUntil(promise: Promise<unknown>): void;
}

export default {
  fetch(request: Request, env: unknown, ctx: unknown): Promise<Response> {
    return openNextWorker.fetch(request, env, ctx);
  },

  async scheduled(event: ScheduledEventLike, env: CronEnv, ctx: ExecutionContextLike): Promise<void> {
    const result = await dispatchScheduled({
      cron: event.cron,
      scheduledAt: new Date(event.scheduledTime),
      env,
      ledger: runLedger,
    });

    // 失敗したジョブは後続を止めないかわりに必ずログへ残す (observability logs が唯一の追跡経路)
    const failed = result.jobs.filter((job) => job.status === 'failed');
    if (failed.length > 0) {
      console.error('[cron] 失敗したジョブがあります', { cron: result.cron, runKey: result.runKey, failed });
    }
    // ctx は waitUntil を持つが、dispatch は await 済みなので追加の延命は不要。
    // 将来ジョブが非同期の後処理を持つ場合にここで waitUntil する
    void ctx;
  },
};
