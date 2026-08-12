/**
 * cron registry へ差し込む「予約公開」ジョブの結線。
 *
 * 何を: publish_at が過去になった draft を published へ一括昇格する。
 * なぜ: `worker/cron.ts` は dispatch の骨格だけを持ち、業務ロジックも DB 結線も知らない契約
 *       (同ファイル冒頭のコメント)。依存の解決はこの feature 側に置く (metrics-tracking/cron.ts と同型)。
 *
 * cron trigger は増やさない (infrastructure-spec §5: Cloudflare Free の cron trigger 上限は
 * アカウント単位で共有される)。既存の日次 cron (DAILY_CRON) のジョブ列へ 5 番目として追加するだけで、
 * 新しい trigger は 1 本も増えない (AD-5 と同じ考え方)。
 *
 * 実行間隔は日次 cron に相乗りするため、予約時刻から実際の公開までに
 * 最大 24 時間程度のずれが生じうる (MVP の割り切り。分単位の即時公開が要る場合は別途 cron trigger の
 * 増設が要り、上記の account 全体の残枠を先に確認すること)。
 */
import type { CronJob, CronJobContext } from '../../worker/cron.js';
import { docsCmsRuntime } from './runtime.js';

export function createDocsScheduledPublishJob(): CronJob {
  return {
    id: 'docs-scheduled-publish',
    async run(context: CronJobContext) {
      const runtime = docsCmsRuntime();
      const publishedCount = await runtime.repository.publishScheduledDocuments(context.scheduledAt.getTime());
      if (publishedCount > 0) {
        console.log(
          JSON.stringify({
            event: 'docs_scheduled_publish',
            published_count: publishedCount,
            run_key: context.runKey,
          }),
        );
      }
    },
  };
}
