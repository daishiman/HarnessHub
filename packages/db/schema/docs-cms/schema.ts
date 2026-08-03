/**
 * Studio S15/B7: Document CMS。
 *
 * ADR §3.1 により workspace_id を持たない (tenant 全体 or common 単位のドキュメント)。
 * common スコープの可視性は tenant_id を書き換えず、repository query 層の
 * OR 条件 (scope='common' OR tenant_id=context.tenantId) だけで担保する。
 */
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const DOCUMENT_SCOPES = ['common', 'tenant'] as const;
export const DOCUMENT_STATUSES = ['draft', 'published'] as const;

export const documents = sqliteTable(
  'documents',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    scope: text('scope', { enum: DOCUMENT_SCOPES }).notNull(),
    title: text('title').notNull(),
    bodyMarkdown: text('body_markdown').notNull(),
    status: text('status', { enum: DOCUMENT_STATUSES }).notNull().default('draft'),
    createdBy: text('created_by').notNull(),
    updatedBy: text('updated_by').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    index('documents_tenant_scope_updated_idx').on(t.tenantId, t.scope, t.updatedAt),
    index('documents_scope_updated_idx').on(t.scope, t.updatedAt),
  ],
);
