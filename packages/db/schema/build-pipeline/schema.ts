/**
 * Studio 拡張: `build_stage_events` テーブル (docs/backend-spec.md §2.3 / §3.8 / D4)。
 *
 * Build の 7 工程遷移を **追記のみ** で残す履歴表。`builds.stage` が現在値の正本で、この表は
 * 「いつ・誰が・どこからどこへ・なぜ」を保持する。SEC6 の `build.stage_change` 監査 event
 * (hash chain 付き `audit_events`) とは別物で、こちらは工程履歴の業務的な表示・分析用である。
 * 監査 event の append は route 層が `AuditRepo` に対して行う。
 *
 * 工程の値域 (`BUILD_STAGES`) は `../builds/schema` の単一定義を import する。ここで再定義すると
 * builds.stage と本表の to_stage が別の値域を持ちうる状態になり、状態機械が 2 つに割れる。
 */
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { BUILD_STAGES } from '../builds/schema';

export const buildStageEvents = sqliteTable(
  'build_stage_events',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    workspaceId: text('workspace_id').notNull(),
    buildId: text('build_id').notNull(),
    // 初期記録 (Build 作成時の初期工程) だけ null。遷移の記録では常に値が入る。
    fromStage: text('from_stage', { enum: BUILD_STAGES }),
    toStage: text('to_stage', { enum: BUILD_STAGES }).notNull(),
    actorUserId: text('actor_user_id').notNull(),
    reason: text('reason'),
    // 工程が動いたサーバ時刻 (epoch ミリ秒)。クライアント申告時刻は保存しない (qa-032 / SEC5)。
    occurredAt: integer('occurred_at').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    // 詳細画面の履歴表示 (1 build の時系列)。
    index('build_stage_events_tenant_build_occurred_idx').on(t.tenantId, t.buildId, t.occurredAt),
    // ボード / workspace 単位の活動一覧。
    index('build_stage_events_tenant_workspace_occurred_idx').on(t.tenantId, t.workspaceId, t.occurredAt),
  ],
);
