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
    // ブログ的運用に必要な 4 項目 (HarnessHub docs-cms 追加要望)。
    // 既存行に対しては全て NULL のまま読める後方互換のため、いずれも nullable で足す
    // (NOT NULL 制約を追加すると既存行の migration で default 埋めが要り、意味の無い値を捏造することになる)。
    category: text('category'),
    // タグは配列だが sqlite に配列型は無いので JSON 文字列で持つ (`["a","b"]`)。
    // 検索・絞り込みは `containsTermInAny` と同じ LIKE ベースの部分一致に留め、専用テーブルは作らない。
    tagsJson: text('tags_json'),
    eyecatchImageUrl: text('eyecatch_image_url'),
    // 予約公開の実行予定時刻 (epoch ms)。cron (cron.ts の daily job) が publishAt <= now の
    // draft を published へ昇格させる。日次実行なので最大 ~24h の粒度になる (残課題)。
    publishAt: integer('publish_at'),
  },
  (t) => [
    index('documents_tenant_scope_updated_idx').on(t.tenantId, t.scope, t.updatedAt),
    index('documents_scope_updated_idx').on(t.scope, t.updatedAt),
    index('documents_publish_at_idx').on(t.status, t.publishAt),
  ],
);
