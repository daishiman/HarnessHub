/**
 * Hearing intake が最初に利用する共通 AI queue の repository。
 *
 * claim/complete/fail は tenant_id と workspace_id の両方を CAS 条件へ含め、
 * 同一 tenant 内の別 workspace にあるジョブを取得・更新できないようにする。
 */
import { and, asc, eq, lte, or, type SQL } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';

import { type AI_JOB_STATUSES, aiJobs, hearingSheets } from '../schema/hearing-intake/schema';
import { isTransactionalAdapter } from '../src/adapter';
import { EntityNotFoundError, RepositoryError } from '../src/errors';
import type { RepositoryContext } from '../src/types';
import { guardedWrite } from './conflict';
import type { CoreAdapter, CoreDb } from './db';
import { serverNow } from './time';

export type HearingQueueStatus = (typeof AI_JOB_STATUSES)[number];

export interface AiJobRow {
  readonly id: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly kind: 'sheet_generation' | 'feedback_response' | 'doc_draft';
  readonly status: HearingQueueStatus;
  readonly payloadJson: string;
  readonly resultJson: string | null;
  readonly error: string | null;
  readonly attempt: number;
  readonly maxAttempts: number;
  readonly leaseExpiresAt: number | null;
  readonly claimedByTokenId: string | null;
  readonly refType: string;
  readonly refId: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface HearingQueueRepository {
  claimNextSheetGenerationJob(
    context: RepositoryContext,
    tokenId: string,
    leaseMilliseconds?: number,
  ): Promise<AiJobRow | null>;
  findJob(context: RepositoryContext, id: string): Promise<AiJobRow | null>;
  completeSheetGenerationJob(
    context: RepositoryContext,
    id: string,
    tokenId: string,
    resultJson: string,
  ): Promise<AiJobRow>;
  failSheetGenerationJob(context: RepositoryContext, id: string, tokenId: string, error: string): Promise<AiJobRow>;
}

const DEFAULT_LEASE_MS = 10 * 60 * 1_000;

/**
 * D5 汎化: ai_jobs は kind を問わず 1 テーブル・1 CAS 実装を共有する (AD-4)。
 * kind 固有の差分は「完了/dead 化した瞬間に ref 先テーブルへ何を書き戻すか」だけなので、
 * その差分だけを writeback として feature 側 (docs-cms 等) から注入し、
 * claim/CAS/lease の本体ロジックはここ 1 箇所に留める。
 *
 * writeback は「実行するコールバック」ではなく「何を書くかの宣言」として渡す
 * (table + 純粋な set/where ビルダー)。実際の `tx.update(...)` 呼び出しは completeJob/failJob
 * 自身の guardedWrite スコープ内で行う — db-write-gate-001 (packages/db/scripts/check-db-write-gate.mjs)
 * は write 呼び出しが字面上 guardedWrite の内側にあることを要求し、コールバック越しの間接呼び出しは
 * 検出できないため、feature 側にコールバックとして書かせない設計にしている。
 */
export interface QueueWriteSpec {
  readonly table: SQLiteTable;
  buildSet(job: AiJobRow, now: number): Record<string, unknown>;
  buildWhere(context: RepositoryContext, job: AiJobRow): SQL;
  readonly conflictMessage: string;
}

export interface QueueWriteback {
  readonly onComplete: QueueWriteSpec | null;
  readonly onDead: QueueWriteSpec | null;
}

export async function claimNextJob(
  adapter: CoreAdapter,
  context: RepositoryContext,
  kind: AiJobRow['kind'],
  tokenId: string,
  leaseMilliseconds: number = DEFAULT_LEASE_MS,
): Promise<AiJobRow | null> {
  const workspaceId = requiredWorkspace(context);
  return guardedWrite(adapter, () =>
    transactional(adapter).transaction(async (tx) => {
      const db = tx.client as CoreDb;
      const now = serverNow();
      const claimable = or(
        eq(aiJobs.status, 'queued'),
        and(eq(aiJobs.status, 'processing'), lte(aiJobs.leaseExpiresAt, now)),
      );
      const rows = await db
        .select()
        .from(aiJobs)
        .where(
          and(
            eq(aiJobs.tenantId, context.tenantId),
            eq(aiJobs.workspaceId, workspaceId),
            eq(aiJobs.kind, kind),
            claimable,
          ),
        )
        .orderBy(asc(aiJobs.createdAt))
        .limit(1);
      const job = rows[0] as AiJobRow | undefined;
      if (job === undefined) return null;

      const updated = await db
        .update(aiJobs)
        .set({
          status: 'processing',
          claimedByTokenId: tokenId,
          leaseExpiresAt: now + leaseMilliseconds,
          updatedAt: now,
        })
        .where(
          and(
            eq(aiJobs.tenantId, context.tenantId),
            eq(aiJobs.workspaceId, workspaceId),
            eq(aiJobs.id, job.id),
            claimable,
          ),
        )
        .returning();
      return (updated[0] as AiJobRow | undefined) ?? null;
    }),
  );
}

export async function findJob(adapter: CoreAdapter, context: RepositoryContext, id: string): Promise<AiJobRow | null> {
  const rows = await adapter.client
    .select()
    .from(aiJobs)
    .where(and(...scopedPredicates(context), eq(aiJobs.id, id)))
    .limit(1);
  return (rows[0] as AiJobRow | undefined) ?? null;
}

export async function completeJob(
  adapter: CoreAdapter,
  context: RepositoryContext,
  id: string,
  tokenId: string,
  resultJson: string,
  expected: { readonly kind: AiJobRow['kind']; readonly refType: string },
  writeback: QueueWriteback,
): Promise<AiJobRow> {
  return guardedWrite(adapter, () =>
    transactional(adapter).transaction(async (tx) => {
      const db = tx.client as CoreDb;
      const scope = scopedPredicates(context);
      const jobs = await db
        .select()
        .from(aiJobs)
        .where(and(...scope, eq(aiJobs.id, id)))
        .limit(1);
      const job = jobs[0] as AiJobRow | undefined;
      if (job === undefined) throw new EntityNotFoundError('ai_jobs', id);
      if (
        job.kind !== expected.kind ||
        job.status !== 'processing' ||
        job.claimedByTokenId !== tokenId ||
        job.refType !== expected.refType
      ) {
        throw new RepositoryError('conflict', `claim した token だけが処理中の ${expected.kind} を完了できます`);
      }
      const now = serverNow();
      const completed = await db
        .update(aiJobs)
        .set({ status: 'completed', resultJson, error: null, leaseExpiresAt: null, updatedAt: now })
        .where(and(...scope, eq(aiJobs.id, id), eq(aiJobs.status, 'processing'), eq(aiJobs.claimedByTokenId, tokenId)))
        .returning();
      if (completed[0] === undefined) throw new RepositoryError('conflict', 'AI job の完了 CAS に失敗しました');
      const completedJob = completed[0] as AiJobRow;

      if (writeback.onComplete !== null) {
        const spec = writeback.onComplete;
        const wrote = await db
          .update(spec.table)
          .set(spec.buildSet(completedJob, now))
          .where(spec.buildWhere(context, completedJob))
          .returning();
        if (wrote.length === 0) throw new RepositoryError('conflict', spec.conflictMessage);
      }
      return completedJob;
    }),
  );
}

export async function failJob(
  adapter: CoreAdapter,
  context: RepositoryContext,
  id: string,
  tokenId: string,
  error: string,
  expected: { readonly kind: AiJobRow['kind']; readonly refType: string },
  writeback: QueueWriteback,
): Promise<AiJobRow> {
  return guardedWrite(adapter, () =>
    transactional(adapter).transaction(async (tx) => {
      const db = tx.client as CoreDb;
      const scope = scopedPredicates(context);
      const jobs = await db
        .select()
        .from(aiJobs)
        .where(and(...scope, eq(aiJobs.id, id)))
        .limit(1);
      const job = jobs[0] as AiJobRow | undefined;
      if (
        job === undefined ||
        job.kind !== expected.kind ||
        job.status !== 'processing' ||
        job.claimedByTokenId !== tokenId ||
        job.refType !== expected.refType
      ) {
        throw new RepositoryError('conflict', `claim した token だけが処理中の ${expected.kind} を失敗にできます`);
      }
      const attempt = job.attempt + 1;
      const dead = attempt >= job.maxAttempts;
      const now = serverNow();
      const updated = await db
        .update(aiJobs)
        .set({
          status: dead ? 'dead' : 'queued',
          attempt,
          error,
          leaseExpiresAt: null,
          claimedByTokenId: null,
          updatedAt: now,
        })
        .where(and(...scope, eq(aiJobs.id, id), eq(aiJobs.status, 'processing'), eq(aiJobs.claimedByTokenId, tokenId)))
        .returning();
      if (updated[0] === undefined) throw new RepositoryError('conflict', 'AI job の失敗 CAS に失敗しました');
      const updatedJob = updated[0] as AiJobRow;

      if (dead && writeback.onDead !== null) {
        const spec = writeback.onDead;
        const wrote = await db
          .update(spec.table)
          .set(spec.buildSet(updatedJob, now))
          .where(spec.buildWhere(context, updatedJob))
          .returning();
        if (wrote.length === 0) throw new RepositoryError('conflict', spec.conflictMessage);
      }
      return updatedJob;
    }),
  );
}

function transactional(adapter: CoreAdapter) {
  if (!isTransactionalAdapter(adapter)) {
    throw new RepositoryError('invalid-context', 'AI queue の書き込みには transaction 対応 adapter が必要です');
  }
  return adapter;
}

function scopedPredicates(context: RepositoryContext): SQL[] {
  const predicates: SQL[] = [eq(aiJobs.tenantId, context.tenantId)];
  if (context.workspaceId !== undefined) predicates.push(eq(aiJobs.workspaceId, context.workspaceId));
  return predicates;
}

function requiredWorkspace(context: RepositoryContext): string {
  if (context.workspaceId === undefined) {
    throw new RepositoryError('invalid-context', 'AI job の claim には workspaceId が必要です');
  }
  return context.workspaceId;
}

const SHEET_GENERATION_EXPECT = { kind: 'sheet_generation' as const, refType: 'hearing_sheet' };

export function createHearingQueueRepository(adapter: CoreAdapter): HearingQueueRepository {
  return {
    claimNextSheetGenerationJob(context, tokenId, leaseMilliseconds = DEFAULT_LEASE_MS) {
      return claimNextJob(adapter, context, 'sheet_generation', tokenId, leaseMilliseconds);
    },
    findJob(context, id) {
      return findJob(adapter, context, id);
    },
    async completeSheetGenerationJob(context, id, tokenId, resultJson) {
      return completeJob(adapter, context, id, tokenId, resultJson, SHEET_GENERATION_EXPECT, {
        onComplete: {
          table: hearingSheets,
          buildSet: (_job, now) => ({ status: 'review', updatedAt: now }),
          buildWhere: (context, job) =>
            and(
              eq(hearingSheets.tenantId, context.tenantId),
              eq(hearingSheets.workspaceId, job.workspaceId),
              eq(hearingSheets.id, job.refId),
              eq(hearingSheets.aiJobId, job.id),
            ) as SQL,
          conflictMessage: 'AI job の ref_id と現在の hearing sheet が一致しません',
        },
        onDead: null,
      });
    },
    async failSheetGenerationJob(context, id, tokenId, error) {
      return failJob(adapter, context, id, tokenId, error, SHEET_GENERATION_EXPECT, {
        onComplete: null,
        onDead: {
          table: hearingSheets,
          buildSet: (_job, now) => ({ status: 'received', updatedAt: now }),
          buildWhere: (context, job) =>
            and(
              eq(hearingSheets.tenantId, context.tenantId),
              eq(hearingSheets.workspaceId, job.workspaceId),
              eq(hearingSheets.id, job.refId),
              eq(hearingSheets.aiJobId, job.id),
            ) as SQL,
          conflictMessage: 'AI job の ref_id と現在の hearing sheet が一致しません',
        },
      });
    },
  };
}
