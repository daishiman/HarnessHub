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
export const DOCUMENT_FIELD_SOURCES = ['auto', 'manual'] as const;

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
    // 分類・カード表示用のメタデータ (feat: docs-cms-rich-editing)。
    // 全カラム nullable/安全な default にして既存行に影響を与えない。
    category: text('category'),
    /** JSON 配列文字列。例 `["設計","API"]`。 */
    tags: text('tags'),
    thumbnailUrl: text('thumbnail_url'),
    thumbnailSource: text('thumbnail_source', { enum: DOCUMENT_FIELD_SOURCES }).notNull().default('auto'),
    excerpt: text('excerpt'),
    excerptSource: text('excerpt_source', { enum: DOCUMENT_FIELD_SOURCES }).notNull().default('auto'),
    /** JSON。例 `{"imageCount":2,"hasTable":true,"hasCode":false}`。常にサーバ側で自動算出する。 */
    assetSummary: text('asset_summary'),
  },
  (t) => [
    index('documents_tenant_scope_updated_idx').on(t.tenantId, t.scope, t.updatedAt),
    index('documents_scope_updated_idx').on(t.scope, t.updatedAt),
  ],
);
