/**
 * Studio 拡張: `builds` テーブル (ADR §7 P10 差し戻しによる再設計 / §12)。
 *
 * `docs/backend-spec-api-state.md` §5.3 が定める Build 7 工程状態機械のうち、本 task が実装するのは
 * 「AiJob(`feedback_response`) 完了時に feedback_id 一意で行を冪等作成する」最小範囲だけである。
 * CRUD API (`GET/POST /api/v1/builds` 等)・7 工程遷移 UI・`hearing-intake` (`sheet_generation`) 側の
 * Build 化はスコープ外のまま (`sheet_id` は列だけ確保し、この task では書き込まない)。
 */
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const BUILD_TYPES = ['hearing', 'improvement', 'review', 'bug'] as const;
export const BUILD_STAGES = ['hearing', 'requirements', 'design', 'build', 'test', 'review', 'publish'] as const;

export const builds = sqliteTable(
  'builds',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    workspaceId: text('workspace_id').notNull(),
    type: text('type', { enum: BUILD_TYPES }).notNull(),
    stage: text('stage', { enum: BUILD_STAGES }).notNull(),
    // 将来の hearing-intake 接続用に列だけ確保する。本 task では書き込まない (ADR §7)。
    sheetId: text('sheet_id'),
    // feedback-loop からの冪等作成キー。一意制約で二重作成を DB 側でも防ぐ。
    feedbackId: text('feedback_id'),
    publishRequestId: text('publish_request_id'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    uniqueIndex('builds_feedback_id_uq').on(t.feedbackId),
    index('builds_tenant_workspace_stage_updated_idx').on(t.tenantId, t.workspaceId, t.stage, t.updatedAt),
  ],
);
