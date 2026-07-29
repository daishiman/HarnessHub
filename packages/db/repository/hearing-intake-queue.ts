/**
 * Hearing intake が最初に利用する共通 AI queue の repository。
 *
 * claim/complete/fail は tenant_id と workspace_id の両方を CAS 条件へ含め、
 * 同一 tenant 内の別 workspace にあるジョブを取得・更新できないようにする。
 */
import { and, asc, eq, lte, or, type SQL } from 'drizzle-orm';

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

export function createHearingQueueRepository(adapter: CoreAdapter): HearingQueueRepository {
  return {
    async claimNextSheetGenerationJob(context, tokenId, leaseMilliseconds = DEFAULT_LEASE_MS) {
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
                eq(aiJobs.kind, 'sheet_generation'),
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
    },

    async findJob(context, id) {
      const rows = await adapter.client
        .select()
        .from(aiJobs)
        .where(and(...scopedPredicates(context), eq(aiJobs.id, id)))
        .limit(1);
      return (rows[0] as AiJobRow | undefined) ?? null;
    },

    async completeSheetGenerationJob(context, id, tokenId, resultJson) {
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
            job.kind !== 'sheet_generation' ||
            job.status !== 'processing' ||
            job.claimedByTokenId !== tokenId ||
            job.refType !== 'hearing_sheet'
          ) {
            throw new RepositoryError('conflict', 'claim した token だけが処理中の sheet_generation を完了できます');
          }
          const now = serverNow();
          const completed = await db
            .update(aiJobs)
            .set({ status: 'completed', resultJson, error: null, leaseExpiresAt: null, updatedAt: now })
            .where(
              and(...scope, eq(aiJobs.id, id), eq(aiJobs.status, 'processing'), eq(aiJobs.claimedByTokenId, tokenId)),
            )
            .returning();
          if (completed[0] === undefined) throw new RepositoryError('conflict', 'AI job の完了 CAS に失敗しました');

          const sheetUpdated = await db
            .update(hearingSheets)
            .set({ status: 'review', updatedAt: now })
            .where(
              and(
                eq(hearingSheets.tenantId, context.tenantId),
                eq(hearingSheets.workspaceId, job.workspaceId),
                eq(hearingSheets.id, job.refId),
                eq(hearingSheets.aiJobId, job.id),
              ),
            )
            .returning({ id: hearingSheets.id });
          if (sheetUpdated[0] === undefined) {
            throw new RepositoryError('conflict', 'AI job の ref_id と現在の hearing sheet が一致しません');
          }
          return completed[0] as AiJobRow;
        }),
      );
    },

    async failSheetGenerationJob(context, id, tokenId, error) {
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
            job.kind !== 'sheet_generation' ||
            job.status !== 'processing' ||
            job.claimedByTokenId !== tokenId ||
            job.refType !== 'hearing_sheet'
          ) {
            throw new RepositoryError('conflict', 'claim した token だけが処理中の sheet_generation を失敗にできます');
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
            .where(
              and(...scope, eq(aiJobs.id, id), eq(aiJobs.status, 'processing'), eq(aiJobs.claimedByTokenId, tokenId)),
            )
            .returning();
          if (updated[0] === undefined) throw new RepositoryError('conflict', 'AI job の失敗 CAS に失敗しました');

          if (dead) {
            const sheetUpdated = await db
              .update(hearingSheets)
              .set({ status: 'received', updatedAt: now })
              .where(
                and(
                  eq(hearingSheets.tenantId, context.tenantId),
                  eq(hearingSheets.workspaceId, job.workspaceId),
                  eq(hearingSheets.id, job.refId),
                  eq(hearingSheets.aiJobId, job.id),
                ),
              )
              .returning({ id: hearingSheets.id });
            if (sheetUpdated[0] === undefined) {
              throw new RepositoryError('conflict', 'AI job の ref_id と現在の hearing sheet が一致しません');
            }
          }
          return updated[0] as AiJobRow;
        }),
      );
    },
  };
}
