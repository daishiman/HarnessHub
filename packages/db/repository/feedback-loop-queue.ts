/**
 * feedback-loop が利用する共通 AI queue (`ai_jobs`, kind='feedback_response') の repository。
 *
 * hearing-intake-queue.ts と同じ CAS パターンを踏襲する。差分は 2 点:
 *   - claim/complete/fail の対象を kind='feedback_response' / ref_type='feedback' に固定する。
 *   - complete は `feedbacks.status` を進めない。書き戻すのは ai_response と ai_job_id だけで、
 *     status は workspace-admin の人手確認 (PATCH /api/v1/feedback/:id) を経て進む (SEC8-103)。
 *   - fail は再 enqueue (または dead-letter) するだけで `feedbacks` 側には一切触れない (SEC8-104)。
 */
import { and, asc, eq, lte, or, type SQL } from 'drizzle-orm';

import { builds } from '../schema/builds/schema';
import { feedbacks } from '../schema/feedback-loop/schema';
import { aiJobs } from '../schema/hearing-intake/schema';
import { isTransactionalAdapter } from '../src/adapter';
import { EntityNotFoundError, RepositoryError } from '../src/errors';
import type { RepositoryContext } from '../src/types';
import { guardedWrite } from './conflict';
import type { CoreAdapter, CoreDb } from './db';
// AiJobRow / HearingQueueStatus は hearing-intake-queue が定義する共通 ai_jobs 行の型をそのまま使う。
// kind の値域は 3 種共通 (sheet_generation|feedback_response|doc_draft) であり、
// feedback-loop 用に型を複製すると ai_jobs の単一ソース性が崩れる。
import type { AiJobRow } from './hearing-intake-queue';
import { serverNow } from './time';
import { newUlid } from './ulid';

export type { AiJobRow, HearingQueueStatus } from './hearing-intake-queue';

export interface FeedbackQueueRepository {
  claimNextFeedbackResponseJob(
    context: RepositoryContext,
    tokenId: string,
    leaseMilliseconds?: number,
  ): Promise<AiJobRow | null>;
  findFeedbackResponseJob(context: RepositoryContext, id: string): Promise<AiJobRow | null>;
  completeFeedbackResponseJob(
    context: RepositoryContext,
    id: string,
    tokenId: string,
    resultJson: string,
    aiResponse: string,
  ): Promise<AiJobRow>;
  failFeedbackResponseJob(context: RepositoryContext, id: string, tokenId: string, error: string): Promise<AiJobRow>;
}

const DEFAULT_LEASE_MS = 10 * 60 * 1_000;

function transactional(adapter: CoreAdapter) {
  if (!isTransactionalAdapter(adapter)) {
    throw new RepositoryError('invalid-context', 'feedback queue の書き込みには transaction 対応 adapter が必要です');
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

/**
 * feedback_response 完了 transaction 専用の Build 作成。
 *
 * この repository が transaction 境界を所有するため、別 repository の guardedWrite をネストせず
 * 同じ DB handle で冪等に作成する。`feedback_id` の一意制約に競合した場合は既存行を取得する。
 */
async function findOrCreateFeedbackBuildOn(
  db: CoreDb,
  context: RepositoryContext,
  feedback: Pick<typeof feedbacks.$inferSelect, 'id' | 'workspaceId' | 'type'>,
): Promise<void> {
  if (context.workspaceId !== undefined && context.workspaceId !== feedback.workspaceId) {
    throw new RepositoryError('invalid-context', 'context と feedback の workspaceId が一致しません');
  }
  const now = serverNow();
  const inserted = await db
    .insert(builds)
    .values({
      id: newUlid(now),
      tenantId: context.tenantId,
      workspaceId: feedback.workspaceId,
      type: feedback.type,
      stage: feedback.type === 'bug' ? 'test' : 'design',
      sheetId: null,
      feedbackId: feedback.id,
      publishRequestId: null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .returning({ id: builds.id });
  if (inserted[0] !== undefined) return;

  const existing = await db
    .select({ id: builds.id })
    .from(builds)
    .where(and(eq(builds.tenantId, context.tenantId), eq(builds.feedbackId, feedback.id)))
    .limit(1);
  if (existing[0] === undefined) {
    throw new RepositoryError('conflict', 'builds 行の冪等作成に失敗しました (feedback_id の再取得に失敗)');
  }
}

export function createFeedbackQueueRepository(adapter: CoreAdapter): FeedbackQueueRepository {
  return {
    async claimNextFeedbackResponseJob(context, tokenId, leaseMilliseconds = DEFAULT_LEASE_MS) {
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
                eq(aiJobs.kind, 'feedback_response'),
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

    async findFeedbackResponseJob(context, id) {
      const rows = await adapter.client
        .select()
        .from(aiJobs)
        .where(and(...scopedPredicates(context), eq(aiJobs.id, id)))
        .limit(1);
      return (rows[0] as AiJobRow | undefined) ?? null;
    },

    async completeFeedbackResponseJob(context, id, tokenId, resultJson, aiResponse) {
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
            job.kind !== 'feedback_response' ||
            job.status !== 'processing' ||
            job.claimedByTokenId !== tokenId ||
            job.refType !== 'feedback'
          ) {
            throw new RepositoryError('conflict', 'claim した token だけが処理中の feedback_response を完了できます');
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

          // SEC8-103: status には触れない。ai_response / ai_job_id だけを書き戻す。
          const feedbackUpdated = await db
            .update(feedbacks)
            .set({ aiResponse, aiJobId: job.id, updatedAt: now })
            .where(
              and(
                eq(feedbacks.tenantId, context.tenantId),
                eq(feedbacks.workspaceId, job.workspaceId),
                eq(feedbacks.id, job.refId),
                eq(feedbacks.aiJobId, job.id),
              ),
            )
            .returning();
          const feedback = feedbackUpdated[0];
          if (feedback === undefined) {
            throw new RepositoryError('conflict', 'AI job の ref_id と現在の feedback が一致しません');
          }
          // P10 再設計: job の complete、AI 応答の書戻し、Build の冪等作成を 1 transaction にする。
          // Build 作成に失敗した場合も job を completed に残さず、AI worker が安全に再試行できる。
          await findOrCreateFeedbackBuildOn(db, context, feedback);
          return completed[0] as AiJobRow;
        }),
      );
    },

    async failFeedbackResponseJob(context, id, tokenId, error) {
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
            job.kind !== 'feedback_response' ||
            job.status !== 'processing' ||
            job.claimedByTokenId !== tokenId ||
            job.refType !== 'feedback'
          ) {
            throw new RepositoryError('conflict', 'claim した token だけが処理中の feedback_response を失敗にできます');
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

          // SEC8-104: dead 化しても feedbacks.status には一切触れない (人手確認前提のため自動で退行させない)。
          return updated[0] as AiJobRow;
        }),
      );
    },
  };
}
