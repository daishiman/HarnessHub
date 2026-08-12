/**
 * Studio S15/B7: Document CMS の repository。
 *
 * documents は workspace_id を持たない (ADR §3.1)。common スコープの可視性は
 * resource.tenantId を doc の所有テナントへすり替えず、query 側の
 * `or(scope='common', tenant_id=context.tenantId)` だけで担保する (DOCS-TEN-101/102 の対象)。
 * 見えない行は単に返らないので、handler 側は null を 404 として扱えばよい (DOCS-TEN-103)。
 *
 * AI 下書きキュー (kind=doc_draft) は hearing-intake-queue.ts の汎用 claim/complete/fail を
 * 再利用し、CAS/lease の実装を複製しない (AD-4)。
 */
import { and, desc, eq, lt, or, type SQL, sql } from 'drizzle-orm';

import { documents } from '../schema/docs-cms/schema';
import { aiJobs } from '../schema/hearing-intake/schema';
import { isTransactionalAdapter } from '../src/adapter';
import { EntityNotFoundError, RepositoryError } from '../src/errors';
import type { RepositoryContext } from '../src/types';
import { canonicalJson, sha256Hex } from './bytes';
import { guardedWrite } from './conflict';
import type { CoreAdapter, CoreDb } from './db';
import type { AiJobRow, QueueWriteback } from './hearing-intake-queue';
import { claimNextJob, completeJob, failJob } from './hearing-intake-queue';
import { containsTermInAny } from './search';
import { serverNow } from './time';
import { newUlid } from './ulid';

export type DocumentScope = 'common' | 'tenant';
export type DocumentStatus = 'draft' | 'published';
export type DocumentFieldSource = 'auto' | 'manual';

export interface DocumentRow {
  readonly id: string;
  readonly tenantId: string;
  readonly scope: DocumentScope;
  readonly title: string;
  readonly bodyMarkdown: string;
  readonly status: DocumentStatus;
  readonly externalSource: string | null;
  readonly externalDocumentId: string | null;
  readonly externalContentHash: string | null;
  readonly externalRevision: number | null;
  readonly createdBy: string;
  readonly updatedBy: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly category: string | null;
  readonly tags: string | null;
  readonly thumbnailUrl: string | null;
  readonly thumbnailSource: DocumentFieldSource;
  readonly excerpt: string | null;
  readonly excerptSource: DocumentFieldSource;
  readonly assetSummary: string | null;
}

export interface ExternalDocumentRow extends DocumentRow {
  readonly externalSource: string;
  readonly externalDocumentId: string;
  readonly externalRevision: number;
}

export type ExternalDocumentSyncOutcome = 'created' | 'updated' | 'unchanged';

export interface SyncExternalDocumentInput {
  readonly source: string;
  readonly externalDocumentId: string;
  readonly title: string;
  readonly bodyMarkdown: string;
  /** #707と同じ本文解析器が算出したauto派生値。manual値はrepositoryが保持する。 */
  readonly autoThumbnailUrl: string | null;
  readonly autoExcerpt: string | null;
  readonly assetSummary: string;
  readonly actorId: string;
  readonly expectedRevision?: number;
}

export interface ExternalDocumentSyncResult {
  readonly outcome: ExternalDocumentSyncOutcome;
  readonly document: ExternalDocumentRow;
}

export class ExternalDocumentPreconditionError extends RepositoryError {
  readonly reason: 'required' | 'stale' | 'missing';
  readonly current: ExternalDocumentRow | null;

  constructor(reason: 'required' | 'stale' | 'missing', current: ExternalDocumentRow | null) {
    super(
      'conflict',
      reason === 'required'
        ? 'If-Match が必要です'
        : reason === 'missing'
          ? 'If-Match の対象ドキュメントが存在しません'
          : 'If-Match が現在のrevisionと一致しません',
    );
    this.name = 'ExternalDocumentPreconditionError';
    this.reason = reason;
    this.current = current;
  }
}

export interface CreateDocumentInput {
  readonly scope: DocumentScope;
  readonly title: string;
  readonly bodyMarkdown: string;
  readonly actorId: string;
  readonly category?: string | null;
  readonly tags?: string | null;
  readonly thumbnailUrl?: string | null;
  readonly thumbnailSource?: DocumentFieldSource;
  readonly excerpt?: string | null;
  readonly excerptSource?: DocumentFieldSource;
  readonly assetSummary?: string | null;
}

export interface UpdateDocumentInput {
  readonly title?: string;
  readonly bodyMarkdown?: string;
  readonly status?: DocumentStatus;
  readonly actorId: string;
  readonly category?: string | null;
  readonly tags?: string | null;
  readonly thumbnailUrl?: string | null;
  readonly thumbnailSource?: DocumentFieldSource;
  readonly excerpt?: string | null;
  readonly excerptSource?: DocumentFieldSource;
  readonly assetSummary?: string | null;
}

export interface ListDocumentsInput {
  readonly scope?: DocumentScope;
  readonly status?: DocumentStatus;
  /** タイトルに含まれる語での絞り込み。対象を title だけにする理由は契約側 (documentListQuerySchema) に記載。 */
  readonly query?: string;
  readonly category?: string;
  /** tags JSON 配列の要素に対する完全一致。 */
  readonly tag?: string;
  readonly cursor?: string;
  readonly limit: number;
}

export interface DocumentPage {
  readonly items: readonly DocumentRow[];
  readonly nextCursor: string | null;
}

export interface DocsCmsRepository {
  listDocuments(context: RepositoryContext, input: ListDocumentsInput): Promise<DocumentPage>;
  getDocument(context: RepositoryContext, id: string): Promise<DocumentRow | null>;
  createDocument(context: RepositoryContext, input: CreateDocumentInput): Promise<DocumentRow>;
  updateDocument(context: RepositoryContext, id: string, input: UpdateDocumentInput): Promise<DocumentRow>;
  getExternalDocument(
    context: RepositoryContext,
    source: string,
    externalDocumentId: string,
  ): Promise<ExternalDocumentRow | null>;
  syncExternalDocument(
    context: RepositoryContext,
    input: SyncExternalDocumentInput,
  ): Promise<ExternalDocumentSyncResult>;
  claimNextDocDraftJob(
    context: RepositoryContext,
    tokenId: string,
    leaseMilliseconds?: number,
  ): Promise<AiJobRow | null>;
  completeDocDraftJob(context: RepositoryContext, id: string, tokenId: string, resultJson: string): Promise<AiJobRow>;
  failDocDraftJob(context: RepositoryContext, id: string, tokenId: string, error: string): Promise<AiJobRow>;
  enqueueDocDraft(
    context: RepositoryContext,
    documentId: string,
    workspaceId: string,
    payloadJson: string,
  ): Promise<void>;
}

/** ADR §3.1 の可視性述語そのもの。resource.tenantId を書き換えず、この OR 条件だけで境界を作る。 */
function visibilityCondition(context: RepositoryContext) {
  return or(eq(documents.scope, 'common'), eq(documents.tenantId, context.tenantId));
}

function transactional(adapter: CoreAdapter) {
  if (!isTransactionalAdapter(adapter)) {
    throw new RepositoryError('invalid-context', 'docs-cms の書き込みには transaction 対応 adapter が必要です');
  }
  return adapter;
}

const DOC_DRAFT_EXPECT = { kind: 'doc_draft' as const, refType: 'document' };

function docDraftWriteback(): QueueWriteback {
  return {
    onComplete: {
      table: documents,
      buildSet: (job, now) => {
        const parsed = JSON.parse(job.resultJson ?? '{}') as { body_markdown?: string };
        return {
          bodyMarkdown: parsed.body_markdown ?? '',
          updatedAt: now,
          updatedBy: 'ai-worker',
          externalContentHash: null,
          externalRevision: sql<number>`CASE WHEN ${documents.externalRevision} IS NULL THEN NULL ELSE ${documents.externalRevision} + 1 END`,
        };
      },
      buildWhere: (context, job) => and(eq(documents.tenantId, context.tenantId), eq(documents.id, job.refId)) as SQL,
      conflictMessage: 'AI job の ref_id と現在の document が一致しません',
    },
    // dead 化しても document 自体は draft のまま残す (再試行/手動編集の余地を残す) — 書き戻しは不要
    onDead: null,
  };
}

export function createDocsCmsRepository(adapter: CoreAdapter): DocsCmsRepository {
  return {
    async listDocuments(context, input) {
      const predicates = [visibilityCondition(context)];
      if (input.scope !== undefined) predicates.push(eq(documents.scope, input.scope));
      if (input.status !== undefined) predicates.push(eq(documents.status, input.status));
      if (input.query !== undefined) {
        const search = containsTermInAny(input.query, [documents.title]);
        if (search !== undefined) predicates.push(search);
      }
      if (input.category !== undefined) predicates.push(eq(documents.category, input.category));
      if (input.tag !== undefined) {
        // LIKE では `API` が `GraphAPI` にも当たる。json_valid を先に置いて既存の壊れた値は
        // fail-closed で非一致とし、json_each の配列要素単位で完全一致させる。
        predicates.push(
          sql`EXISTS (
            SELECT 1 FROM json_each(
              CASE WHEN json_valid(${documents.tags}) THEN ${documents.tags} ELSE '[]' END
            ) AS tag_item
            WHERE tag_item.value = ${input.tag}
          )`,
        );
      }
      // ULID primary key is monotonic, so it is a stable cursor even when a document's
      // updated_at changes while the user is paging.  Ordering by updated_at here would
      // make the ID cursor repeat or skip rows after an edit.
      if (input.cursor !== undefined) predicates.push(lt(documents.id, input.cursor));

      const rows = await adapter.client
        .select()
        .from(documents)
        .where(and(...predicates))
        .orderBy(desc(documents.id))
        .limit(input.limit + 1);
      const items = rows as DocumentRow[];
      const hasMore = items.length > input.limit;
      const page = hasMore ? items.slice(0, input.limit) : items;
      return { items: page, nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null };
    },

    async getDocument(context, id) {
      const rows = await adapter.client
        .select()
        .from(documents)
        .where(and(visibilityCondition(context), eq(documents.id, id)))
        .limit(1);
      const row = rows[0] as DocumentRow | undefined;
      // 他テナントの tenant スコープ doc は visibilityCondition が絞り込むので、ここは単純に 404 相当の null
      if (row === undefined) return null;
      return row;
    },

    async createDocument(context, input) {
      return guardedWrite(adapter, () =>
        transactional(adapter).transaction(async (tx) => {
          const db = tx.client as CoreDb;
          const now = serverNow();
          const id = newUlid(now);
          const base = {
            id,
            tenantId: context.tenantId,
            scope: input.scope,
            title: input.title,
            bodyMarkdown: input.bodyMarkdown,
            status: 'draft' as const,
            externalSource: null,
            externalDocumentId: null,
            externalContentHash: null,
            externalRevision: null,
            createdBy: input.actorId,
            updatedBy: input.actorId,
            createdAt: now,
            updatedAt: now,
            category: input.category ?? null,
            tags: input.tags ?? null,
            thumbnailUrl: input.thumbnailUrl ?? null,
            thumbnailSource: input.thumbnailSource ?? 'auto',
            excerpt: input.excerpt ?? null,
            excerptSource: input.excerptSource ?? 'auto',
            assetSummary: input.assetSummary ?? null,
          } satisfies DocumentRow;
          await db.insert(documents).values(base);
          return base;
        }),
      );
    },

    async updateDocument(context, id, input) {
      return guardedWrite(adapter, () =>
        transactional(adapter).transaction(async (tx) => {
          const db = tx.client as CoreDb;
          const now = serverNow();
          const existingRows = await db
            .select()
            .from(documents)
            .where(and(visibilityCondition(context), eq(documents.id, id)))
            .limit(1);
          const existing = existingRows[0] as DocumentRow | undefined;
          if (existing === undefined) throw new EntityNotFoundError('documents', id);
          const patch: Partial<typeof documents.$inferInsert> = { updatedAt: now, updatedBy: input.actorId };
          if (input.title !== undefined) patch.title = input.title;
          if (input.bodyMarkdown !== undefined) patch.bodyMarkdown = input.bodyMarkdown;
          if (input.status !== undefined) patch.status = input.status;
          if (input.category !== undefined) patch.category = input.category;
          if (input.tags !== undefined) patch.tags = input.tags;
          if (input.thumbnailUrl !== undefined) patch.thumbnailUrl = input.thumbnailUrl;
          if (input.thumbnailSource !== undefined) patch.thumbnailSource = input.thumbnailSource;
          if (input.excerpt !== undefined) patch.excerpt = input.excerpt;
          if (input.excerptSource !== undefined) patch.excerptSource = input.excerptSource;
          if (input.assetSummary !== undefined) patch.assetSummary = input.assetSummary;
          if (
            existing.externalSource !== null &&
            (input.title !== undefined || input.bodyMarkdown !== undefined || input.status !== undefined)
          ) {
            if (existing.externalRevision === null) {
              throw new RepositoryError('invalid-context', '外部同期文書のrevisionがありません');
            }
            patch.externalContentHash = null;
            patch.externalRevision = existing.externalRevision + 1;
          }

          const writeCondition =
            existing.externalRevision === null
              ? and(visibilityCondition(context), eq(documents.id, id))
              : and(
                  visibilityCondition(context),
                  eq(documents.id, id),
                  eq(documents.externalRevision, existing.externalRevision),
                );
          const updated = await db.update(documents).set(patch).where(writeCondition).returning();
          const row = updated[0] as DocumentRow | undefined;
          if (row === undefined) throw new RepositoryError('conflict', 'ドキュメントが同時に更新されました');
          return row;
        }),
      );
    },

    async getExternalDocument(context, source, externalDocumentId) {
      const rows = await adapter.client
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.tenantId, context.tenantId),
            eq(documents.externalSource, source),
            eq(documents.externalDocumentId, externalDocumentId),
          ),
        )
        .limit(1);
      return (rows[0] as ExternalDocumentRow | undefined) ?? null;
    },

    async syncExternalDocument(context, input) {
      const contentHash = await sha256Hex(canonicalJson({ title: input.title, body_markdown: input.bodyMarkdown }));
      return guardedWrite(adapter, () =>
        transactional(adapter).transaction(async (tx) => {
          const db = tx.client as CoreDb;
          const now = serverNow();
          const existingRows = await db
            .select()
            .from(documents)
            .where(
              and(
                eq(documents.tenantId, context.tenantId),
                eq(documents.externalSource, input.source),
                eq(documents.externalDocumentId, input.externalDocumentId),
              ),
            )
            .limit(1);
          let existing = existingRows[0] as ExternalDocumentRow | undefined;

          if (existing === undefined) {
            if (input.expectedRevision !== undefined) {
              throw new ExternalDocumentPreconditionError('missing', null);
            }
            const id = newUlid(now);
            const inserted = await db
              .insert(documents)
              .values({
                id,
                tenantId: context.tenantId,
                scope: 'tenant',
                title: input.title,
                bodyMarkdown: input.bodyMarkdown,
                status: 'draft',
                externalSource: input.source,
                externalDocumentId: input.externalDocumentId,
                externalContentHash: contentHash,
                externalRevision: 1,
                thumbnailUrl: input.autoThumbnailUrl,
                thumbnailSource: 'auto',
                excerpt: input.autoExcerpt,
                excerptSource: 'auto',
                assetSummary: input.assetSummary,
                createdBy: input.actorId,
                updatedBy: input.actorId,
                createdAt: now,
                updatedAt: now,
              })
              .onConflictDoNothing()
              .returning();
            const created = inserted[0] as ExternalDocumentRow | undefined;
            if (created !== undefined) return { outcome: 'created', document: created };

            const racedRows = await db
              .select()
              .from(documents)
              .where(
                and(
                  eq(documents.tenantId, context.tenantId),
                  eq(documents.externalSource, input.source),
                  eq(documents.externalDocumentId, input.externalDocumentId),
                ),
              )
              .limit(1);
            existing = racedRows[0] as ExternalDocumentRow | undefined;
            if (existing === undefined) throw new RepositoryError('conflict', '外部文書の作成競合を解決できません');
          }

          if (existing.externalContentHash === contentHash) {
            return { outcome: 'unchanged', document: existing };
          }
          if (input.expectedRevision === undefined) {
            throw new ExternalDocumentPreconditionError('required', existing);
          }
          if (input.expectedRevision !== existing.externalRevision) {
            throw new ExternalDocumentPreconditionError('stale', existing);
          }

          const updatedRows = await db
            .update(documents)
            .set({
              title: input.title,
              bodyMarkdown: input.bodyMarkdown,
              status: 'draft',
              externalContentHash: contentHash,
              externalRevision: existing.externalRevision + 1,
              ...(existing.thumbnailSource === 'auto'
                ? { thumbnailUrl: input.autoThumbnailUrl, thumbnailSource: 'auto' as const }
                : {}),
              ...(existing.excerptSource === 'auto'
                ? { excerpt: input.autoExcerpt, excerptSource: 'auto' as const }
                : {}),
              assetSummary: input.assetSummary,
              updatedBy: input.actorId,
              updatedAt: now,
            })
            .where(
              and(
                eq(documents.tenantId, context.tenantId),
                eq(documents.id, existing.id),
                eq(documents.externalRevision, existing.externalRevision),
              ),
            )
            .returning();
          const updated = updatedRows[0] as ExternalDocumentRow | undefined;
          if (updated === undefined) {
            const currentRows = await db
              .select()
              .from(documents)
              .where(and(eq(documents.tenantId, context.tenantId), eq(documents.id, existing.id)))
              .limit(1);
            const current = currentRows[0] as ExternalDocumentRow | undefined;
            if (current === undefined) throw new EntityNotFoundError('documents', existing.id);
            throw new ExternalDocumentPreconditionError('stale', current);
          }
          return { outcome: 'updated', document: updated };
        }),
      );
    },

    claimNextDocDraftJob(context, tokenId, leaseMilliseconds) {
      return claimNextJob(adapter, context, 'doc_draft', tokenId, leaseMilliseconds);
    },

    completeDocDraftJob(context, id, tokenId, resultJson) {
      return completeJob(adapter, context, id, tokenId, resultJson, DOC_DRAFT_EXPECT, docDraftWriteback());
    },

    failDocDraftJob(context, id, tokenId, error) {
      return failJob(adapter, context, id, tokenId, error, DOC_DRAFT_EXPECT, docDraftWriteback());
    },

    async enqueueDocDraft(context, documentId, workspaceId, payloadJson) {
      await guardedWrite(adapter, () =>
        transactional(adapter).transaction(async (tx) => {
          const db = tx.client as CoreDb;
          const now = serverNow();
          await db.insert(aiJobs).values({
            id: newUlid(now),
            tenantId: context.tenantId,
            workspaceId,
            kind: 'doc_draft',
            status: 'queued',
            payloadJson,
            resultJson: null,
            error: null,
            attempt: 0,
            maxAttempts: 3,
            leaseExpiresAt: null,
            claimedByTokenId: null,
            refType: 'document',
            refId: documentId,
            createdAt: now,
            updatedAt: now,
          });
        }),
      );
    },
  };
}
