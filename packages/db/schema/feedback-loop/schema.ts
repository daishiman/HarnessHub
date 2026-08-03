/**
 * Studio 拡張: feat-feedback-loop の `feedbacks` テーブル (ADR §1)。
 *
 * `ai_jobs` / `display_code_counters` は hearing-intake が定義した共通 pull queue / 採番表を
 * そのまま再利用する (kind='feedback_response' / DISPLAY_CODE_KINDS='FR' は既に登録済み)。
 * このファイルでは feedback-loop 固有の `feedbacks` 表だけを定義する。
 */
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const FEEDBACK_TYPES = ['improvement', 'review', 'bug'] as const;
export const FEEDBACK_PRIORITIES = ['high', 'medium', 'low'] as const;
export const FEEDBACK_SOURCES = ['harness', 'manual'] as const;
export const FEEDBACK_STATUSES = ['open', 'in_progress', 'resolved'] as const;

export const feedbacks = sqliteTable(
  'feedbacks',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    workspaceId: text('workspace_id').notNull(),
    code: text('code').notNull(),
    projectId: text('project_id').notNull(),
    type: text('type', { enum: FEEDBACK_TYPES }).notNull(),
    priority: text('priority', { enum: FEEDBACK_PRIORITIES }).notNull(),
    source: text('source', { enum: FEEDBACK_SOURCES }).notNull(),
    body: text('body').notNull(),
    status: text('status', { enum: FEEDBACK_STATUSES }).notNull(),
    aiResponse: text('ai_response'),
    aiJobId: text('ai_job_id'),
    createdBy: text('created_by').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    uniqueIndex('feedbacks_tenant_code_uq').on(t.tenantId, t.code),
    index('feedbacks_tenant_workspace_status_updated_idx').on(t.tenantId, t.workspaceId, t.status, t.updatedAt),
    index('feedbacks_tenant_project_updated_idx').on(t.tenantId, t.projectId, t.updatedAt),
  ],
);
