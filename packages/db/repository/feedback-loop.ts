/**
 * feedback-loop の tenant-scoped repository (ADR §1)。
 *
 * hearing-intake.ts と同じ構造: 全メソッドが RepositoryContext を要求し tenant_id (と指定時は
 * workspace_id) を WHERE 句へ強制注入する (D4)。code 採番は display_code_counters kind='FR' を使う。
 */
import { and, desc, eq, lt, type SQL } from 'drizzle-orm';
import { userSettings, users } from '../schema/core/identity';
import { type FEEDBACK_STATUSES, feedbacks } from '../schema/feedback-loop/schema';
import { aiJobs, displayCodeCounters } from '../schema/hearing-intake/schema';
import { isTransactionalAdapter } from '../src/adapter';
import { EntityNotFoundError, RepositoryError } from '../src/errors';
import type { RepositoryContext } from '../src/types';
import { guardedWrite } from './conflict';
import type { CoreAdapter, CoreDb } from './db';
import { createFeedbackQueueRepository, type FeedbackQueueRepository } from './feedback-loop-queue';
import { serverNow } from './time';
import { newUlid } from './ulid';

export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];
export type { AiJobRow, HearingQueueStatus } from './hearing-intake-queue';

export type FeedbackRow = typeof feedbacks.$inferSelect;

export interface CreateFeedbackInput {
  readonly workspaceId: string;
  readonly projectId: string;
  readonly type: FeedbackRow['type'];
  readonly priority: FeedbackRow['priority'];
  readonly source: FeedbackRow['source'];
  readonly body: string;
  readonly createdBy: string;
  /** transaction 内で発行した feedback id / code から queue payload を構築する。 */
  readonly buildPayloadJson: (feedbackId: string, code: string) => string;
}

export interface ListFeedbacksInput {
  readonly workspaceId?: string;
  readonly status?: FeedbackStatus;
  readonly type?: FeedbackRow['type'];
  readonly projectId?: string;
  readonly cursor?: string;
  readonly limit: number;
}

export interface FeedbackPage {
  readonly items: readonly FeedbackRow[];
  readonly nextCursor: string | null;
}

export interface FeedbackRepository extends FeedbackQueueRepository {
  createAndEnqueue(context: RepositoryContext, input: CreateFeedbackInput): Promise<FeedbackRow>;
  listFeedbacks(context: RepositoryContext, input: ListFeedbacksInput): Promise<FeedbackPage>;
  findFeedback(context: RepositoryContext, id: string): Promise<FeedbackRow | null>;
  updateFeedbackStatus(context: RepositoryContext, id: string, status: FeedbackStatus): Promise<FeedbackRow>;
  /**
   * resolved 通知の email channel 判定に使う既存 `user_settings.notify_feedback` の読み取り専用参照
   * (D6/B8/SEC9)。行が無い場合は列の default (true) を返す。
   */
  getNotifyFeedbackPreference(context: RepositoryContext, userId: string): Promise<boolean>;
}

const MAX_COUNTER_RETRIES = 5;

function transactional(adapter: CoreAdapter) {
  if (!isTransactionalAdapter(adapter)) {
    throw new RepositoryError('invalid-context', 'feedback-loop の書き込みには transaction 対応 adapter が必要です');
  }
  return adapter;
}

async function findFeedbackOn(db: CoreDb, context: RepositoryContext, id: string): Promise<FeedbackRow | null> {
  const predicates: SQL[] = [eq(feedbacks.tenantId, context.tenantId), eq(feedbacks.id, id)];
  if (context.workspaceId !== undefined) predicates.push(eq(feedbacks.workspaceId, context.workspaceId));
  const rows = await db
    .select()
    .from(feedbacks)
    .where(and(...predicates))
    .limit(1);
  return (rows[0] as FeedbackRow | undefined) ?? null;
}

async function issueFeedbackCode(db: CoreDb, tenantId: string): Promise<string> {
  for (let retry = 0; retry < MAX_COUNTER_RETRIES; retry += 1) {
    const currentRows = await db
      .select({ nextValue: displayCodeCounters.nextValue })
      .from(displayCodeCounters)
      .where(and(eq(displayCodeCounters.tenantId, tenantId), eq(displayCodeCounters.kind, 'FR')))
      .limit(1);
    const current = currentRows[0];

    if (current === undefined) {
      const inserted = await db
        .insert(displayCodeCounters)
        .values({ tenantId, kind: 'FR', nextValue: 2 })
        .onConflictDoNothing()
        .returning({ tenantId: displayCodeCounters.tenantId });
      if (inserted.length > 0) return 'FR-0001';
      continue;
    }

    const updated = await db
      .update(displayCodeCounters)
      .set({ nextValue: current.nextValue + 1 })
      .where(
        and(
          eq(displayCodeCounters.tenantId, tenantId),
          eq(displayCodeCounters.kind, 'FR'),
          eq(displayCodeCounters.nextValue, current.nextValue),
        ),
      )
      .returning({ nextValue: displayCodeCounters.nextValue });
    if (updated.length > 0) return `FR-${String(current.nextValue).padStart(4, '0')}`;
  }
  throw new RepositoryError('conflict', 'FR コードの採番が競合しました。もう一度送信してください');
}

function enqueueValues(input: {
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly refId: string;
  readonly payloadJson: string;
  readonly now: number;
}) {
  return {
    id: newUlid(input.now),
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    kind: 'feedback_response' as const,
    status: 'queued' as const,
    payloadJson: input.payloadJson,
    resultJson: null,
    error: null,
    attempt: 0,
    maxAttempts: 3,
    leaseExpiresAt: null,
    claimedByTokenId: null,
    refType: 'feedback',
    refId: input.refId,
    createdAt: input.now,
    updatedAt: input.now,
  };
}

export function createFeedbackRepository(adapter: CoreAdapter): FeedbackRepository {
  const {
    claimNextFeedbackResponseJob,
    findFeedbackResponseJob,
    completeFeedbackResponseJob,
    failFeedbackResponseJob,
  } = createFeedbackQueueRepository(adapter);

  return {
    claimNextFeedbackResponseJob,
    findFeedbackResponseJob,
    completeFeedbackResponseJob,
    failFeedbackResponseJob,

    async createAndEnqueue(context, input) {
      if (context.workspaceId !== undefined && context.workspaceId !== input.workspaceId) {
        throw new RepositoryError('invalid-context', 'context と作成対象の workspaceId が一致しません');
      }
      return guardedWrite(adapter, () =>
        transactional(adapter).transaction(async (tx) => {
          const db = tx.client as CoreDb;
          const now = serverNow();
          const code = await issueFeedbackCode(db, context.tenantId);
          const id = newUlid(now);

          await db.insert(feedbacks).values({
            id,
            tenantId: context.tenantId,
            workspaceId: input.workspaceId,
            code,
            projectId: input.projectId,
            type: input.type,
            priority: input.priority,
            source: input.source,
            body: input.body,
            status: 'open',
            aiResponse: null,
            aiJobId: null,
            createdBy: input.createdBy,
            createdAt: now,
            updatedAt: now,
          });

          const job = enqueueValues({
            tenantId: context.tenantId,
            workspaceId: input.workspaceId,
            refId: id,
            payloadJson: input.buildPayloadJson(id, code),
            now,
          });
          await db.insert(aiJobs).values(job);
          await db
            .update(feedbacks)
            .set({ aiJobId: job.id, updatedAt: now })
            .where(and(eq(feedbacks.tenantId, context.tenantId), eq(feedbacks.id, id)));

          const created = await findFeedbackOn(db, context, id);
          if (created === null) throw new EntityNotFoundError('feedbacks', id);
          return created;
        }),
      );
    },

    async listFeedbacks(context, input) {
      const predicates: SQL[] = [eq(feedbacks.tenantId, context.tenantId)];
      if (context.workspaceId !== undefined) predicates.push(eq(feedbacks.workspaceId, context.workspaceId));
      if (input.workspaceId !== undefined) predicates.push(eq(feedbacks.workspaceId, input.workspaceId));
      if (input.status !== undefined) predicates.push(eq(feedbacks.status, input.status));
      if (input.type !== undefined) predicates.push(eq(feedbacks.type, input.type));
      if (input.projectId !== undefined) predicates.push(eq(feedbacks.projectId, input.projectId));
      if (input.cursor !== undefined) predicates.push(lt(feedbacks.id, input.cursor));

      const rows = await adapter.client
        .select()
        .from(feedbacks)
        .where(and(...predicates))
        .orderBy(desc(feedbacks.id))
        .limit(input.limit + 1);
      const hasNext = rows.length > input.limit;
      const items = (rows as FeedbackRow[]).slice(0, input.limit);
      return {
        items,
        nextCursor: hasNext ? (items.at(-1)?.id ?? null) : null,
      };
    },

    async findFeedback(context, id) {
      return findFeedbackOn(adapter.client, context, id);
    },

    async updateFeedbackStatus(context, id, status) {
      return guardedWrite(adapter, async () => {
        const predicates: SQL[] = [eq(feedbacks.tenantId, context.tenantId), eq(feedbacks.id, id)];
        if (context.workspaceId !== undefined) predicates.push(eq(feedbacks.workspaceId, context.workspaceId));
        const rows = await adapter.client
          .update(feedbacks)
          .set({ status, updatedAt: serverNow() })
          .where(and(...predicates))
          .returning({ id: feedbacks.id });
        if (rows[0] === undefined) throw new EntityNotFoundError('feedbacks', id);
        const updated = await findFeedbackOn(adapter.client, context, id);
        if (updated === null) throw new EntityNotFoundError('feedbacks', id);
        return updated;
      });
    },

    async getNotifyFeedbackPreference(context, userId) {
      // user_settings は tenant_id を持たない (PK=user_id) ため、users を経由して
      // context.tenantId 所属の user か確認したうえで参照する (D4: tenant 混入の防止)。
      const rows = await adapter.client
        .select({ notifyFeedback: userSettings.notifyFeedback })
        .from(users)
        .innerJoin(userSettings, eq(userSettings.userId, users.id))
        .where(and(eq(users.tenantId, context.tenantId), eq(users.id, userId)))
        .limit(1);
      return rows[0]?.notifyFeedback ?? true;
    },
  };
}
