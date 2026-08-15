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
import { and, asc, desc, eq, isNotNull, isNull, lt, lte, or, type SQL, sql } from 'drizzle-orm';

import { auditEvents } from '../schema/core/security';
import { documents } from '../schema/docs-cms/schema';
import { aiJobs } from '../schema/hearing-intake/schema';
import { mutationCreateIdempotency } from '../schema/mutation-safety/schema';
import { isTransactionalAdapter } from '../src/adapter';
import { EntityNotFoundError, RepositoryError } from '../src/errors';
import type { RepositoryContext } from '../src/types';
import { prepareAuditAppendOn } from './audit';
import { canonicalJson, sha256Hex } from './bytes';
import { guardedWrite } from './conflict';
import type { CoreAdapter, CoreDb } from './db';
import type { AiJobRow, QueueWriteback } from './hearing-intake-queue';
import { claimNextJob, completeJob, failJob } from './hearing-intake-queue';
import {
  buildMutationWireResponse,
  cleanupExpiredMutationIdempotency,
  type IdempotentCreateResult,
  type MutationIdempotencyInput,
  type MutationWireResponseBuilder,
  mutationIdempotencyScope,
  parseMutationWireResponse,
  prepareMutationIdempotency,
} from './mutation-safety';
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
  readonly entityRevision: number;
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
  readonly publishAt: number | null;
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
  readonly publishAt?: number | null;
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
  readonly publishAt?: number | null;
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

export interface PublishedDueDocument {
  readonly id: string;
  readonly tenantId: string;
}

export interface PublishDueDocumentsResult {
  readonly publishedCount: number;
  readonly hasMore: boolean;
  /** 呼び出し側が tenant 単位の append-only 監査を記録するための最小情報。 */
  readonly publishedDocuments: readonly PublishedDueDocument[];
}

export interface DocumentCreateAuditInput {
  readonly actorType: 'user' | 'publisher_token' | 'system';
  readonly actorId: string;
  readonly summary: Readonly<Record<string, unknown>>;
}

export interface DocsCmsRepository {
  listDocuments(context: RepositoryContext, input: ListDocumentsInput): Promise<DocumentPage>;
  getDocument(context: RepositoryContext, id: string): Promise<DocumentRow | null>;
  createDocument(context: RepositoryContext, input: CreateDocumentInput): Promise<DocumentRow>;
  createDocumentIdempotent(
    context: RepositoryContext,
    input: CreateDocumentInput,
    idempotency: MutationIdempotencyInput,
    buildResponse: MutationWireResponseBuilder<DocumentRow>,
    audit: DocumentCreateAuditInput,
  ): Promise<IdempotentCreateResult<DocumentRow, 'document'>>;
  updateDocument(context: RepositoryContext, id: string, input: UpdateDocumentInput): Promise<DocumentRow>;
  updateDocumentCas(
    context: RepositoryContext,
    id: string,
    input: UpdateDocumentInput,
    expectedEntityRevision: number,
  ): Promise<
    | { readonly outcome: 'updated'; readonly document: DocumentRow }
    | { readonly outcome: 'conflict'; readonly current: DocumentRow | null }
  >;
  /** 日次 cron 用。予約日時と ID の安定順で、上限付き・再実行安全に公開する。 */
  publishDueDocuments(now: number, limit?: number): Promise<PublishDueDocumentsResult>;
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
const DEFAULT_PUBLISH_DUE_LIMIT = 100;
const MAX_PUBLISH_DUE_LIMIT = 100;

function assertFuturePublishAt(publishAt: number | null | undefined, now: number): void {
  if (publishAt === undefined || publishAt === null) return;
  if (!Number.isSafeInteger(publishAt) || publishAt <= now) {
    throw new RepositoryError('invalid-context', 'publishAt は現在より未来の epoch ms である必要があります');
  }
}

function assertDocumentCreateAuditActor(
  context: RepositoryContext,
  input: CreateDocumentInput,
  audit: DocumentCreateAuditInput,
): void {
  if (
    context.actorId === undefined ||
    context.actorId.trim().length === 0 ||
    context.actorId !== input.actorId ||
    context.actorId !== audit.actorId
  ) {
    throw new RepositoryError(
      'invalid-context',
      '冪等 document create は context、input、audit で同一の actorId が必要です',
    );
  }
}

function normalizePublishDueLimit(limit: number | undefined): number {
  const normalized = limit ?? DEFAULT_PUBLISH_DUE_LIMIT;
  if (!Number.isSafeInteger(normalized) || normalized < 1 || normalized > MAX_PUBLISH_DUE_LIMIT) {
    throw new RepositoryError(
      'invalid-context',
      `予約公開の limit は 1 以上 ${MAX_PUBLISH_DUE_LIMIT} 以下の整数である必要があります`,
    );
  }
  return normalized;
}

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
          publishAt: null,
          externalContentHash: null,
          externalRevision: sql<number>`CASE WHEN ${documents.externalRevision} IS NULL THEN NULL ELSE ${documents.externalRevision} + 1 END`,
          entityRevision: sql<number>`${documents.entityRevision} + 1`,
        };
      },
      buildWhere: (context, job) => and(eq(documents.tenantId, context.tenantId), eq(documents.id, job.refId)) as SQL,
      conflictMessage: 'AI job の ref_id と現在の document が一致しません',
    },
    // dead 化しても document 自体は draft のまま残す (再試行/手動編集の余地を残す) — 書き戻しは不要
    onDead: null,
  };
}

function newDocumentRow(context: RepositoryContext, input: CreateDocumentInput, id: string, now: number): DocumentRow {
  return {
    id,
    tenantId: context.tenantId,
    scope: input.scope,
    title: input.title,
    bodyMarkdown: input.bodyMarkdown,
    status: 'draft',
    externalSource: null,
    externalDocumentId: null,
    externalContentHash: null,
    externalRevision: null,
    entityRevision: 1,
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
    publishAt: input.publishAt ?? null,
  };
}

function documentUpdatePatch(existing: DocumentRow, input: UpdateDocumentInput, now: number) {
  const patch: Partial<typeof documents.$inferInsert> = {
    updatedAt: now,
    updatedBy: input.actorId,
    entityRevision: existing.entityRevision + 1,
  };
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
  const titleChanged = input.title !== undefined && input.title !== existing.title;
  const bodyChanged = input.bodyMarkdown !== undefined && input.bodyMarkdown !== existing.bodyMarkdown;

  if (input.status !== undefined) {
    patch.publishAt = null;
  } else if (input.publishAt !== undefined) {
    patch.publishAt = input.publishAt;
    if (input.publishAt !== null) patch.status = 'draft';
  } else if (titleChanged || bodyChanged) {
    patch.publishAt = null;
  }

  const nextStatus = patch.status ?? existing.status;
  const nextPublishAt = patch.publishAt === undefined ? existing.publishAt : patch.publishAt;
  if (
    existing.externalSource !== null &&
    (titleChanged || bodyChanged || nextStatus !== existing.status || nextPublishAt !== existing.publishAt)
  ) {
    if (existing.externalRevision === null) {
      throw new RepositoryError('invalid-context', '外部同期文書のrevisionがありません');
    }
    patch.externalContentHash = null;
    patch.externalRevision = existing.externalRevision + 1;
  }
  return patch;
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
          assertFuturePublishAt(input.publishAt, now);
          const id = newUlid(now);
          const base = newDocumentRow(context, input, id, now);
          await db.insert(documents).values(base);
          return base;
        }),
      );
    },

    async createDocumentIdempotent(context, input, idempotencyInput, buildResponse, audit) {
      assertDocumentCreateAuditActor(context, input, audit);
      const idempotency = prepareMutationIdempotency(context, 'documents', idempotencyInput);
      return guardedWrite(adapter, () =>
        transactional(adapter).transaction(async (tx) => {
          const db = tx.client as CoreDb;
          const scope = mutationIdempotencyScope(idempotency);
          await cleanupExpiredMutationIdempotency(db, idempotency.now, (where) =>
            db.delete(mutationCreateIdempotency).where(where),
          );
          await db
            .delete(mutationCreateIdempotency)
            .where(and(scope, lte(mutationCreateIdempotency.expiresAt, idempotency.now)));

          const now = serverNow();
          const id = newUlid(now);
          const claimed = await db
            .insert(mutationCreateIdempotency)
            .values({
              tenantId: idempotency.tenantId,
              workspaceId: idempotency.workspaceId,
              resource: idempotency.resource,
              operation: idempotency.operation,
              key: idempotency.key,
              payloadHash: idempotency.payloadHash,
              resourceId: id,
              responseStatus: null,
              responseHeadersJson: null,
              responseBody: null,
              expiresAt: idempotency.expiresAt,
              createdAt: idempotency.now,
            })
            .onConflictDoNothing()
            .returning({ key: mutationCreateIdempotency.key });

          if (claimed.length === 0) {
            const existingRows = await db.select().from(mutationCreateIdempotency).where(scope).limit(1);
            const existing = existingRows[0];
            if (existing === undefined) {
              throw new RepositoryError('conflict', '冪等作成 claim の競合を解決できません');
            }
            if (existing.payloadHash !== idempotency.payloadHash) {
              return { outcome: 'conflict' as const, expiresAt: existing.expiresAt };
            }
            return {
              outcome: 'replayed' as const,
              expiresAt: existing.expiresAt,
              wireResponse: parseMutationWireResponse(existing),
            };
          }

          // replay は初回作成時の判定をそのまま再生する。24h 内に publishAt が
          // 過去になっても再検証で拒否せず、新規作成の勝者だけをここで検証する。
          assertFuturePublishAt(input.publishAt, now);
          const document = newDocumentRow(context, input, id, now);
          await db.insert(documents).values(document);
          const wireResponse = buildMutationWireResponse(buildResponse, document, idempotency.expiresAt);
          const ledgerRows = await db
            .update(mutationCreateIdempotency)
            .set({
              responseStatus: wireResponse.status,
              responseHeadersJson: canonicalJson(wireResponse.headers),
              responseBody: wireResponse.body,
            })
            .where(scope)
            .returning({ key: mutationCreateIdempotency.key });
          if (ledgerRows.length !== 1) throw new RepositoryError('conflict', '冪等作成結果を保存できません');
          const auditValues = await prepareAuditAppendOn(db, context, {
            workspaceId: idempotency.workspaceId,
            actorType: audit.actorType,
            actorId: audit.actorId,
            action: 'docs.create',
            entityType: 'document',
            entityId: document.id,
            summary: audit.summary,
          });
          await db.insert(auditEvents).values(auditValues);
          return {
            outcome: 'created' as const,
            document,
            expiresAt: idempotency.expiresAt,
            wireResponse,
          };
        }),
      );
    },

    async updateDocument(context, id, input) {
      return guardedWrite(adapter, () =>
        transactional(adapter).transaction(async (tx) => {
          const db = tx.client as CoreDb;
          const now = serverNow();
          assertFuturePublishAt(input.publishAt, now);
          if (input.status === 'published' && input.publishAt != null) {
            throw new RepositoryError('invalid-context', 'published と未来の publishAt は同時に指定できません');
          }
          const existingRows = await db
            .select()
            .from(documents)
            .where(and(visibilityCondition(context), eq(documents.id, id)))
            .limit(1);
          const existing = existingRows[0] as DocumentRow | undefined;
          if (existing === undefined) throw new EntityNotFoundError('documents', id);
          const patch = documentUpdatePatch(existing, input, now);
          const writeCondition = and(
            visibilityCondition(context),
            eq(documents.id, id),
            eq(documents.entityRevision, existing.entityRevision),
          );
          const updated = await db.update(documents).set(patch).where(writeCondition).returning();
          const row = updated[0] as DocumentRow | undefined;
          if (row === undefined) throw new RepositoryError('conflict', 'ドキュメントが同時に更新されました');
          return row;
        }),
      );
    },

    async updateDocumentCas(context, id, input, expectedEntityRevision) {
      if (!Number.isSafeInteger(expectedEntityRevision) || expectedEntityRevision < 1) {
        throw new RepositoryError('invalid-context', 'expectedEntityRevision は正の整数である必要があります');
      }
      return guardedWrite(adapter, () =>
        transactional(adapter).transaction(async (tx) => {
          const db = tx.client as CoreDb;
          const now = serverNow();
          assertFuturePublishAt(input.publishAt, now);
          if (input.status === 'published' && input.publishAt != null) {
            throw new RepositoryError('invalid-context', 'published と未来の publishAt は同時に指定できません');
          }
          const existingRows = await db
            .select()
            .from(documents)
            .where(and(visibilityCondition(context), eq(documents.id, id)))
            .limit(1);
          const existing = existingRows[0] as DocumentRow | undefined;
          if (existing === undefined) return { outcome: 'conflict' as const, current: null };
          const patch = documentUpdatePatch(existing, input, now);
          const updatedRows = await db
            .update(documents)
            .set(patch)
            .where(
              and(
                visibilityCondition(context),
                eq(documents.id, id),
                eq(documents.entityRevision, expectedEntityRevision),
              ),
            )
            .returning();
          const document = updatedRows[0] as DocumentRow | undefined;
          if (document !== undefined) return { outcome: 'updated' as const, document };

          const currentRows = await db
            .select()
            .from(documents)
            .where(and(visibilityCondition(context), eq(documents.id, id)))
            .limit(1);
          return { outcome: 'conflict' as const, current: (currentRows[0] as DocumentRow | undefined) ?? null };
        }),
      );
    },

    async publishDueDocuments(now, requestedLimit) {
      if (!Number.isSafeInteger(now) || now < 0) {
        throw new RepositoryError('invalid-context', '予約公開の now は非負の epoch ms である必要があります');
      }
      const limit = normalizePublishDueLimit(requestedLimit);
      return guardedWrite(adapter, () =>
        transactional(adapter).transaction(async (tx) => {
          const db = tx.client as CoreDb;
          const candidates = await db
            .select({
              id: documents.id,
              tenantId: documents.tenantId,
              publishAt: documents.publishAt,
              externalRevision: documents.externalRevision,
              entityRevision: documents.entityRevision,
            })
            .from(documents)
            .where(and(eq(documents.status, 'draft'), isNotNull(documents.publishAt), lte(documents.publishAt, now)))
            .orderBy(asc(documents.publishAt), asc(documents.id))
            .limit(limit + 1);

          const batch = candidates.slice(0, limit);
          const publishedDocuments: PublishedDueDocument[] = [];
          for (const candidate of batch) {
            if (candidate.publishAt === null) continue;
            const revisionCondition =
              candidate.externalRevision === null
                ? isNull(documents.externalRevision)
                : eq(documents.externalRevision, candidate.externalRevision);
            const updated = await db
              .update(documents)
              .set({
                status: 'published',
                publishAt: null,
                updatedAt: now,
                updatedBy: 'scheduled-publish-cron',
                externalContentHash: null,
                externalRevision: sql<number>`CASE WHEN ${documents.externalRevision} IS NULL THEN NULL ELSE ${documents.externalRevision} + 1 END`,
                entityRevision: sql<number>`${documents.entityRevision} + 1`,
              })
              .where(
                and(
                  eq(documents.id, candidate.id),
                  eq(documents.tenantId, candidate.tenantId),
                  eq(documents.status, 'draft'),
                  eq(documents.publishAt, candidate.publishAt),
                  lte(documents.publishAt, now),
                  revisionCondition,
                  eq(documents.entityRevision, candidate.entityRevision),
                ),
              )
              .returning({ id: documents.id, tenantId: documents.tenantId });
            const row = updated[0];
            if (row !== undefined) publishedDocuments.push(row);
          }

          return {
            publishedCount: publishedDocuments.length,
            // CAS miss は次の反復で再評価する。不要でも高々 1 回余分に空 batch を実行するだけで安全。
            hasMore: candidates.length > limit || publishedDocuments.length < batch.length,
            publishedDocuments,
          };
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
                entityRevision: 1,
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
              publishAt: null,
              externalContentHash: contentHash,
              externalRevision: existing.externalRevision + 1,
              entityRevision: existing.entityRevision + 1,
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
                eq(documents.entityRevision, existing.entityRevision),
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
