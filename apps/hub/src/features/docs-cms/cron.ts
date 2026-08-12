/**
 * cron registry へ差し込む「予約公開」ジョブの結線。
 *
 * 何を: publish_at が到来した draft を bounded batch で published へ昇格する。
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
import type { DocsCmsRepository } from '@harness-hub/db';
import { authRuntime } from '../../lib/authz/index.js';
import type { CronJob, CronJobContext } from '../../worker/cron.js';
import { docsCmsRuntime } from './runtime.js';

export const DOCS_SCHEDULED_PUBLISH_BATCH_LIMIT = 100;

export interface DocsScheduledPublishJobOptions {
  /** テストで実 DB を開かず repository port だけを差し替える。 */
  readonly resolveRepository?: () => Pick<DocsCmsRepository, 'publishDueDocuments'>;
  readonly batchLimit?: number;
  /** Workers Logs が field を索引化できるよう、文字列化せず object のまま渡す。 */
  readonly log?: (entry: Readonly<Record<string, unknown>>) => void;
  readonly errorLog?: (entry: Readonly<Record<string, unknown>>) => void;
  readonly recordAudit?: (
    document: { readonly id: string; readonly tenantId: string },
    context: CronJobContext,
  ) => Promise<void>;
}

function stringEnvironment(env: CronJobContext['env']): Record<string, string | undefined> {
  const source: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === 'string') source[key] = value;
  }
  return source;
}

export function createDocsScheduledPublishJob(options: DocsScheduledPublishJobOptions = {}): CronJob {
  const batchLimit = options.batchLimit ?? DOCS_SCHEDULED_PUBLISH_BATCH_LIMIT;
  if (!Number.isSafeInteger(batchLimit) || batchLimit < 1 || batchLimit > DOCS_SCHEDULED_PUBLISH_BATCH_LIMIT) {
    throw new Error(`docs scheduled publish batchLimit must be between 1 and ${DOCS_SCHEDULED_PUBLISH_BATCH_LIMIT}`);
  }
  return {
    id: 'docs-scheduled-publish',
    async run(context: CronJobContext) {
      const source = stringEnvironment(context.env);
      const repository = options.resolveRepository?.() ?? docsCmsRuntime(source).repository;
      const result = await repository.publishDueDocuments(context.scheduledAt.getTime(), batchLimit);
      const saturated = result.hasMore || result.publishedCount >= batchLimit;
      const recordAudit =
        options.recordAudit ??
        (async (document: { readonly id: string; readonly tenantId: string }, cronContext: CronJobContext) => {
          await authRuntime(source).authz.audit.record({
            actorSubject: 'system',
            tenantId: document.tenantId,
            workspaceId: null,
            action: 'docs.scheduled_publish',
            resourceType: 'document',
            resourceId: document.id,
            metadata: { credential: 'system', run_key: cronContext.runKey },
          });
        });
      let auditedCount = 0;
      let auditFailedCount = 0;
      const auditErrorClasses = new Set<string>();
      // audit_events の hash chain はテナント単位で連結されるため、並列 append せず順番に記録する。
      // 1件の失敗で残りを打ち切ると、既に公開済みの別文書まで監査不能になるため全件を試行する。
      for (const document of result.publishedDocuments) {
        try {
          await recordAudit(document, context);
          auditedCount += 1;
        } catch (error) {
          auditFailedCount += 1;
          auditErrorClasses.add(error instanceof Error ? error.name : 'UnknownError');
        }
      }
      if (auditFailedCount > 0) {
        (options.errorLog ?? console.error)({
          event: 'docs_scheduled_publish_audit_failed',
          published_count: result.publishedCount,
          audited_count: auditedCount,
          audit_failed_count: auditFailedCount,
          batch_limit: batchLimit,
          has_more: result.hasMore,
          saturated,
          run_key: context.runKey,
          error_classes: [...auditErrorClasses],
        });
      }
      const entry = {
        event: 'docs_scheduled_publish',
        status: auditFailedCount > 0 ? 'audit_failed' : saturated ? 'saturated' : 'completed',
        published_count: result.publishedCount,
        audited_count: auditedCount,
        audit_failed_count: auditFailedCount,
        batch_limit: batchLimit,
        has_more: result.hasMore,
        saturated,
        run_key: context.runKey,
        scheduled_at: context.scheduledAt.toISOString(),
      } as const;
      (options.log ?? console.log)(entry);
      if (auditFailedCount > 0) {
        // 元例外の message は接続文字列等を含み得るため dispatcher へ渡さない。
        throw new Error('scheduled publish audit failed');
      }
    },
  };
}
