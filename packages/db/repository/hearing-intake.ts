/**
 * Hearing intake の tenant-scoped repository と共通 AI queue の最初の adapter。
 *
 * 全メソッドが RepositoryContext を要求し、hearing_sheets / ai_jobs の検索条件へ
 * tenant_id を必ず注入する。claim/complete/fail は transaction 内の CAS で状態を進める。
 */
import { and, count, desc, eq, inArray, lt, lte, or, type SQL, sql } from 'drizzle-orm';

import { users } from '../schema/core/identity';
import { DEFAULT_TENANT_COEFFICIENT_VALUES } from '../schema/hearing-intake/coefficient-defaults';
import {
  aiJobs,
  displayCodeCounters,
  type HEARING_SHEET_STATUSES,
  hearingSheets,
  tenantCoefficients,
} from '../schema/hearing-intake/schema';
import { mutationCreateIdempotency } from '../schema/mutation-safety/schema';
import { isTransactionalAdapter } from '../src/adapter';
import { EntityNotFoundError, RepositoryError } from '../src/errors';
import type { RepositoryContext } from '../src/types';
import { canonicalJson } from './bytes';
import { guardedWrite } from './conflict';
import type { CoreAdapter, CoreDb } from './db';
import {
  createHearingQueueRepository,
  type HearingQueueRepository,
  type HearingQueueStatus,
} from './hearing-intake-queue';
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

export type HearingSheetStatus = (typeof HEARING_SHEET_STATUSES)[number];
export type { AiJobRow, HearingQueueStatus } from './hearing-intake-queue';

export interface TenantCoefficientRow {
  readonly tenantId: string;
  readonly annualHours: number;
  readonly minutesPerRun: number;
  readonly sheetReductionRate: number;
  readonly updatedBy: string;
}

/** `tenant_coefficients` owner が公開する部分更新 input。値域検証は consumer の zod schema が担う。 */
export interface UpdateTenantCoefficientsInput {
  readonly annualHours?: number;
  readonly minutesPerRun?: number;
  readonly sheetReductionRate?: number;
}

export interface HearingSheetRow {
  readonly id: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly code: string;
  readonly title: string;
  readonly applicantUserId: string;
  readonly applicantName: string;
  /** JIT provisioning 直後は `applicantName` が空文字なので、表示名の代替として一緒に読む。 */
  readonly applicantEmail: string;
  readonly department: string | null;
  readonly status: HearingSheetStatus;
  readonly formJson: string;
  readonly estimateJson: string;
  readonly aiJobId: string | null;
  readonly generatedDocIdsJson: string | null;
  readonly buildId: string | null;
  readonly entityRevision: number;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly aiJobStatus: HearingQueueStatus | null;
  readonly aiJobResultJson: string | null;
}

export interface CreateHearingSheetInput {
  readonly workspaceId: string;
  readonly title: string;
  readonly applicantUserId: string;
  readonly formJson: string;
  readonly estimateJson: string;
  /** transaction 内で発行した sheet id / code から queue payload を構築する。 */
  readonly buildPayloadJson: (sheetId: string, code: string) => string;
}

export interface ListHearingSheetsInput {
  readonly workspaceId?: string;
  readonly applicantUserId?: string;
  readonly status?: HearingSheetStatus;
  /**
   * 複数の状態をまとめて 1 つの区分として扱うときに使う (例: 受付・生成中・レビュー待ちを「対応中」)。
   *
   * `status` と別に持たせるのは、単一指定と束ね指定が**別の問いだから**。
   * 単一指定を配列に統合すると、呼び出し側が「1 件だけの配列」と「区分」を書き分けられなくなる。
   * 両方渡された場合は AND (どちらも満たす行) になる。
   */
  readonly statuses?: readonly HearingSheetStatus[];
  readonly department?: string;
  readonly query?: string;
  readonly cursor?: string;
  readonly limit: number;
}

/**
 * 状態タブに出す件数。
 *
 * **status 絞り込みと cursor を外した集合**から数える。cursor を残すと「このページの件数」に、
 * status を残すと選択中のタブ以外が常に 0 になる。tenant/workspace/申請者の可視条件だけは外さない
 * — 外すと権限の無い行が件数に混ざる。
 *
 * `active` は受付・生成中・レビュー待ちの合計 (まだ手が離れていないもの)、`unknown` は
 * どの既知状態にも当てはまらない行で、個別区分へは混ぜない。
 */
export interface HearingSheetStatusCounts {
  readonly all: number;
  readonly active: number;
  readonly completed: number;
  readonly unknown: number;
}

export interface HearingSheetPage {
  readonly items: readonly HearingSheetRow[];
  readonly nextCursor: string | null;
  readonly statusCounts: HearingSheetStatusCounts;
}

export interface HearingIntakeRepository extends HearingQueueRepository {
  getCoefficients(context: RepositoryContext): Promise<TenantCoefficientRow>;
  updateCoefficients(context: RepositoryContext, input: UpdateTenantCoefficientsInput): Promise<TenantCoefficientRow>;
  createSheetAndEnqueue(context: RepositoryContext, input: CreateHearingSheetInput): Promise<HearingSheetRow>;
  createSheetAndEnqueueIdempotent(
    context: RepositoryContext,
    input: CreateHearingSheetInput,
    idempotency: MutationIdempotencyInput,
    buildResponse: MutationWireResponseBuilder<HearingSheetRow>,
  ): Promise<IdempotentCreateResult<HearingSheetRow, 'sheet'>>;
  listSheets(context: RepositoryContext, input: ListHearingSheetsInput): Promise<HearingSheetPage>;
  findSheet(context: RepositoryContext, id: string): Promise<HearingSheetRow | null>;
  /**
   * ホーム集約向け「要対応件数」。`status:'review'`(見積確認待ち) または
   * `ai_job_status:'failed'/'dead'`(生成失敗) のいずれかに該当する件数を返す。
   */
  countActionable(context: RepositoryContext, workspaceId?: string, applicantUserId?: string): Promise<number>;
  /** 着地画面向け「最近の動き」。指定した本人の直近更新 N 件だけを返す。 */
  listRecentUpdated(
    context: RepositoryContext,
    limit: number,
    workspaceId: string | undefined,
    applicantUserId: string,
  ): Promise<readonly HearingSheetRow[]>;
  updateSheetStatus(
    context: RepositoryContext,
    id: string,
    status: Extract<HearingSheetStatus, 'review' | 'completed'>,
  ): Promise<HearingSheetRow>;
  updateSheetStatusCas(
    context: RepositoryContext,
    id: string,
    status: Extract<HearingSheetStatus, 'review' | 'completed'>,
    expectedEntityRevision: number,
  ): Promise<
    | { readonly outcome: 'updated'; readonly sheet: HearingSheetRow }
    | { readonly outcome: 'conflict'; readonly current: HearingSheetRow | null }
  >;
  regenerate(context: RepositoryContext, id: string): Promise<HearingSheetRow>;
}

// 未登録テナントの試算に使う行。数値はテーブル定義の default と同じ出所から取る
// (別々に書くと、片方だけ直したときに「保存前と保存後で試算が変わる」壊れ方をする)
const DEFAULT_COEFFICIENTS: TenantCoefficientRow = {
  tenantId: '',
  ...DEFAULT_TENANT_COEFFICIENT_VALUES,
  updatedBy: 'system-default',
};

const MAX_COUNTER_RETRIES = 5;

function transactional(adapter: CoreAdapter) {
  if (!isTransactionalAdapter(adapter)) {
    throw new RepositoryError('invalid-context', 'hearing intake の書き込みには transaction 対応 adapter が必要です');
  }
  return adapter;
}

function asSheetRow(row: {
  readonly sheet: typeof hearingSheets.$inferSelect;
  readonly applicantName: string;
  readonly applicantEmail: string;
  readonly aiJobStatus: HearingQueueStatus | null;
  readonly aiJobResultJson: string | null;
}): HearingSheetRow {
  return {
    ...row.sheet,
    applicantName: row.applicantName,
    applicantEmail: row.applicantEmail,
    aiJobStatus: row.aiJobStatus,
    aiJobResultJson: row.aiJobResultJson,
  };
}

async function findSheetOn(db: CoreDb, context: RepositoryContext, id: string): Promise<HearingSheetRow | null> {
  const predicates: SQL[] = [eq(hearingSheets.tenantId, context.tenantId), eq(hearingSheets.id, id)];
  if (context.workspaceId !== undefined) predicates.push(eq(hearingSheets.workspaceId, context.workspaceId));
  const rows = await db
    .select({
      sheet: hearingSheets,
      applicantName: users.name,
      applicantEmail: users.email,
      aiJobStatus: aiJobs.status,
      aiJobResultJson: aiJobs.resultJson,
    })
    .from(hearingSheets)
    .innerJoin(users, and(eq(users.tenantId, hearingSheets.tenantId), eq(users.id, hearingSheets.applicantUserId)))
    .leftJoin(
      aiJobs,
      and(
        eq(aiJobs.tenantId, hearingSheets.tenantId),
        eq(aiJobs.workspaceId, hearingSheets.workspaceId),
        eq(aiJobs.id, hearingSheets.aiJobId),
      ),
    )
    .where(and(...predicates))
    .limit(1);
  const row = rows[0];
  return row === undefined ? null : asSheetRow(row);
}

async function issueReceiptNumber(db: CoreDb, tenantId: string): Promise<string> {
  for (let retry = 0; retry < MAX_COUNTER_RETRIES; retry += 1) {
    const currentRows = await db
      .select({ nextValue: displayCodeCounters.nextValue })
      .from(displayCodeCounters)
      .where(and(eq(displayCodeCounters.tenantId, tenantId), eq(displayCodeCounters.kind, 'HS')))
      .limit(1);
    const current = currentRows[0];

    if (current === undefined) {
      const inserted = await db
        .insert(displayCodeCounters)
        .values({ tenantId, kind: 'HS', nextValue: 2 })
        .onConflictDoNothing()
        .returning({ tenantId: displayCodeCounters.tenantId });
      if (inserted.length > 0) return 'HS-0001';
      continue;
    }

    const updated = await db
      .update(displayCodeCounters)
      .set({ nextValue: current.nextValue + 1 })
      .where(
        and(
          eq(displayCodeCounters.tenantId, tenantId),
          eq(displayCodeCounters.kind, 'HS'),
          eq(displayCodeCounters.nextValue, current.nextValue),
        ),
      )
      .returning({ nextValue: displayCodeCounters.nextValue });
    if (updated.length > 0) return `HS-${String(current.nextValue).padStart(4, '0')}`;
  }
  throw new RepositoryError('conflict', '受付番号の採番が競合しました。もう一度送信してください');
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
    kind: 'sheet_generation' as const,
    status: 'queued' as const,
    payloadJson: input.payloadJson,
    resultJson: null,
    error: null,
    attempt: 0,
    maxAttempts: 3,
    leaseExpiresAt: null,
    claimedByTokenId: null,
    refType: 'hearing_sheet',
    refId: input.refId,
    createdAt: input.now,
    updatedAt: input.now,
  };
}

export function createHearingIntakeRepository(adapter: CoreAdapter): HearingIntakeRepository {
  return {
    ...createHearingQueueRepository(adapter),
    async getCoefficients(context) {
      const rows = await adapter.client
        .select()
        .from(tenantCoefficients)
        .where(eq(tenantCoefficients.tenantId, context.tenantId))
        .limit(1);
      return (rows[0] as TenantCoefficientRow | undefined) ?? { ...DEFAULT_COEFFICIENTS, tenantId: context.tenantId };
    },

    async updateCoefficients(context, input) {
      if (Object.keys(input).length === 0) return this.getCoefficients(context);
      const actorId = context.actorId;
      if (actorId === undefined) {
        throw new RepositoryError('invalid-context', '係数更新には操作主体 (actorId) が必要です');
      }

      const patch = {
        ...(input.annualHours !== undefined && { annualHours: input.annualHours }),
        ...(input.minutesPerRun !== undefined && { minutesPerRun: input.minutesPerRun }),
        ...(input.sheetReductionRate !== undefined && { sheetReductionRate: input.sheetReductionRate }),
        updatedBy: actorId,
      };
      const rows = await guardedWrite(adapter, () =>
        adapter.client
          .insert(tenantCoefficients)
          .values({
            tenantId: context.tenantId,
            annualHours: input.annualHours ?? DEFAULT_COEFFICIENTS.annualHours,
            minutesPerRun: input.minutesPerRun ?? DEFAULT_COEFFICIENTS.minutesPerRun,
            sheetReductionRate: input.sheetReductionRate ?? DEFAULT_COEFFICIENTS.sheetReductionRate,
            updatedBy: actorId,
          })
          .onConflictDoUpdate({ target: tenantCoefficients.tenantId, set: patch })
          .returning(),
      );
      return rows[0] as TenantCoefficientRow;
    },

    async createSheetAndEnqueue(context, input) {
      if (context.workspaceId !== undefined && context.workspaceId !== input.workspaceId) {
        throw new RepositoryError('invalid-context', 'context と作成対象の workspaceId が一致しません');
      }
      return guardedWrite(adapter, () =>
        transactional(adapter).transaction(async (tx) => {
          const db = tx.client as CoreDb;
          const now = serverNow();
          const code = await issueReceiptNumber(db, context.tenantId);
          const id = newUlid(now);

          const applicantRows = await db
            .select({ department: users.department })
            .from(users)
            .where(and(eq(users.tenantId, context.tenantId), eq(users.id, input.applicantUserId)))
            .limit(1);
          if (applicantRows[0] === undefined) {
            throw new EntityNotFoundError('users', input.applicantUserId);
          }

          await db.insert(hearingSheets).values({
            id,
            tenantId: context.tenantId,
            workspaceId: input.workspaceId,
            code,
            title: input.title,
            applicantUserId: input.applicantUserId,
            department: applicantRows[0].department,
            status: 'received',
            formJson: input.formJson,
            estimateJson: input.estimateJson,
            aiJobId: null,
            generatedDocIdsJson: null,
            buildId: null,
            entityRevision: 1,
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
            .update(hearingSheets)
            .set({ aiJobId: job.id, status: 'generating', updatedAt: now })
            .where(and(eq(hearingSheets.tenantId, context.tenantId), eq(hearingSheets.id, id)));

          const created = await findSheetOn(db, context, id);
          if (created === null) throw new EntityNotFoundError('hearing_sheets', id);
          return created;
        }),
      );
    },

    async createSheetAndEnqueueIdempotent(context, input, idempotencyInput, buildResponse) {
      if (context.workspaceId === undefined || context.workspaceId !== input.workspaceId) {
        throw new RepositoryError(
          'invalid-context',
          '冪等作成では context と作成対象の workspaceId が必須かつ一致する必要があります',
        );
      }
      const idempotency = prepareMutationIdempotency(context, 'sheets', idempotencyInput);
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
            if (existing === undefined) throw new RepositoryError('conflict', '冪等作成 claim の競合を解決できません');
            if (existing.payloadHash !== idempotency.payloadHash) {
              return { outcome: 'conflict' as const, expiresAt: existing.expiresAt };
            }
            return {
              outcome: 'replayed' as const,
              expiresAt: existing.expiresAt,
              wireResponse: parseMutationWireResponse(existing),
            };
          }

          const code = await issueReceiptNumber(db, context.tenantId);
          const applicantRows = await db
            .select({ department: users.department })
            .from(users)
            .where(and(eq(users.tenantId, context.tenantId), eq(users.id, input.applicantUserId)))
            .limit(1);
          if (applicantRows[0] === undefined) throw new EntityNotFoundError('users', input.applicantUserId);

          await db.insert(hearingSheets).values({
            id,
            tenantId: context.tenantId,
            workspaceId: input.workspaceId,
            code,
            title: input.title,
            applicantUserId: input.applicantUserId,
            department: applicantRows[0].department,
            status: 'received',
            formJson: input.formJson,
            estimateJson: input.estimateJson,
            aiJobId: null,
            generatedDocIdsJson: null,
            buildId: null,
            entityRevision: 1,
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
            .update(hearingSheets)
            .set({ aiJobId: job.id, status: 'generating', updatedAt: now })
            .where(
              and(
                eq(hearingSheets.tenantId, context.tenantId),
                eq(hearingSheets.workspaceId, input.workspaceId),
                eq(hearingSheets.id, id),
              ),
            );

          const sheet = await findSheetOn(db, context, id);
          if (sheet === null) throw new EntityNotFoundError('hearing_sheets', id);
          const wireResponse = buildMutationWireResponse(buildResponse, sheet, idempotency.expiresAt);
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
          return {
            outcome: 'created' as const,
            sheet,
            expiresAt: idempotency.expiresAt,
            wireResponse,
          };
        }),
      );
    },

    async listSheets(context, input) {
      // status と cursor を含まない述語。件数集計はこちらを使う (ページ内の件数にしないため)。
      const scopePredicates: SQL[] = [eq(hearingSheets.tenantId, context.tenantId)];
      if (context.workspaceId !== undefined) scopePredicates.push(eq(hearingSheets.workspaceId, context.workspaceId));
      if (input.workspaceId !== undefined) scopePredicates.push(eq(hearingSheets.workspaceId, input.workspaceId));
      if (input.applicantUserId !== undefined) {
        scopePredicates.push(eq(hearingSheets.applicantUserId, input.applicantUserId));
      }
      if (input.department !== undefined) scopePredicates.push(eq(hearingSheets.department, input.department));
      if (input.query !== undefined) {
        // 検索対象は HS コード・業務名・回答内容 (formJson)。パターン組立ては
        // repository/search.ts に一本化してある — 直に `%...%` を書くと利用者の
        // 入力に含まれる `%` `_` がワイルドカードとして働いてしまう。
        const search = containsTermInAny(input.query, [
          hearingSheets.code,
          hearingSheets.title,
          hearingSheets.formJson,
        ]);
        if (search !== undefined) scopePredicates.push(search);
      }
      const predicates: SQL[] = [...scopePredicates];
      if (input.status !== undefined) predicates.push(eq(hearingSheets.status, input.status));
      if (input.statuses !== undefined && input.statuses.length > 0) {
        predicates.push(inArray(hearingSheets.status, [...input.statuses]));
      }
      if (input.cursor !== undefined) predicates.push(lt(hearingSheets.id, input.cursor));

      const rows = await adapter.client
        .select({
          sheet: hearingSheets,
          applicantName: users.name,
          applicantEmail: users.email,
          aiJobStatus: aiJobs.status,
          aiJobResultJson: aiJobs.resultJson,
        })
        .from(hearingSheets)
        .innerJoin(users, and(eq(users.tenantId, hearingSheets.tenantId), eq(users.id, hearingSheets.applicantUserId)))
        .leftJoin(aiJobs, and(eq(aiJobs.tenantId, hearingSheets.tenantId), eq(aiJobs.id, hearingSheets.aiJobId)))
        .where(and(...predicates))
        .orderBy(desc(hearingSheets.id))
        .limit(input.limit + 1);
      const hasNext = rows.length > input.limit;
      const items = rows.slice(0, input.limit).map(asSheetRow);

      // 件数は「可視条件を通した後・cursor を当てる前」の集合から数える (受入条件 6)。
      // status 述語も外すので、選択中の区分以外の件数もそのまま出る。
      const countRows = (await adapter.client
        .select({ status: hearingSheets.status, value: count() })
        .from(hearingSheets)
        .where(and(...scopePredicates))
        .groupBy(hearingSheets.status)) as readonly { status: string | null; value: number }[];
      const statusCounts = countRows.reduce(
        (accumulator, row) => {
          const value = Number(row.value);
          accumulator.all += value;
          // まだ手が離れていないものを 1 つの区分にまとめる。完了だけが終端で、
          // それ以外の既知状態は利用者から見ると「対応中」で括れる
          if (row.status === 'received' || row.status === 'generating' || row.status === 'review') {
            accumulator.active += value;
          } else if (row.status === 'completed') {
            accumulator.completed += value;
          } else {
            // 読めない状態は active/completed のどちらにも寄せない。寄せると
            // 「対応中が 1 件多い」という静かな取り違えになる (受入条件 5)
            accumulator.unknown += value;
          }
          return accumulator;
        },
        { all: 0, active: 0, completed: 0, unknown: 0 },
      );

      return {
        items,
        nextCursor: hasNext ? (items.at(-1)?.id ?? null) : null,
        statusCounts,
      };
    },

    async findSheet(context, id) {
      return findSheetOn(adapter.client, context, id);
    },

    async countActionable(context, workspaceId, applicantUserId) {
      const predicates: SQL[] = [eq(hearingSheets.tenantId, context.tenantId)];
      if (context.workspaceId !== undefined) predicates.push(eq(hearingSheets.workspaceId, context.workspaceId));
      if (workspaceId !== undefined) predicates.push(eq(hearingSheets.workspaceId, workspaceId));
      if (applicantUserId !== undefined) predicates.push(eq(hearingSheets.applicantUserId, applicantUserId));
      predicates.push(or(eq(hearingSheets.status, 'review'), inArray(aiJobs.status, ['failed', 'dead'])) as SQL);

      const rows = await adapter.client
        .select({ value: count() })
        .from(hearingSheets)
        .leftJoin(aiJobs, and(eq(aiJobs.tenantId, hearingSheets.tenantId), eq(aiJobs.id, hearingSheets.aiJobId)))
        .where(and(...predicates));
      return rows[0]?.value ?? 0;
    },

    async listRecentUpdated(context, limit, workspaceId, applicantUserId) {
      const predicates: SQL[] = [eq(hearingSheets.tenantId, context.tenantId)];
      if (context.workspaceId !== undefined) predicates.push(eq(hearingSheets.workspaceId, context.workspaceId));
      if (workspaceId !== undefined) predicates.push(eq(hearingSheets.workspaceId, workspaceId));
      predicates.push(eq(hearingSheets.applicantUserId, applicantUserId));

      const rows = await adapter.client
        .select({
          sheet: hearingSheets,
          applicantName: users.name,
          applicantEmail: users.email,
          aiJobStatus: aiJobs.status,
          aiJobResultJson: aiJobs.resultJson,
        })
        .from(hearingSheets)
        .innerJoin(users, and(eq(users.tenantId, hearingSheets.tenantId), eq(users.id, hearingSheets.applicantUserId)))
        .leftJoin(aiJobs, and(eq(aiJobs.tenantId, hearingSheets.tenantId), eq(aiJobs.id, hearingSheets.aiJobId)))
        .where(and(...predicates))
        .orderBy(desc(hearingSheets.updatedAt))
        .limit(limit);
      return rows.map(asSheetRow);
    },

    async updateSheetStatus(context, id, status) {
      return guardedWrite(adapter, async () => {
        const predicates: SQL[] = [eq(hearingSheets.tenantId, context.tenantId), eq(hearingSheets.id, id)];
        if (context.workspaceId !== undefined) predicates.push(eq(hearingSheets.workspaceId, context.workspaceId));
        const rows = await adapter.client
          .update(hearingSheets)
          .set({
            status,
            updatedAt: serverNow(),
            entityRevision: sql<number>`${hearingSheets.entityRevision} + 1`,
          })
          .where(and(...predicates))
          .returning({ id: hearingSheets.id });
        if (rows[0] === undefined) throw new EntityNotFoundError('hearing_sheets', id);
        const updated = await findSheetOn(adapter.client, context, id);
        if (updated === null) throw new EntityNotFoundError('hearing_sheets', id);
        return updated;
      });
    },

    async updateSheetStatusCas(context, id, status, expectedEntityRevision) {
      if (context.workspaceId === undefined) {
        throw new RepositoryError('invalid-context', 'sheet CAS には workspaceId が必要です');
      }
      if (!Number.isSafeInteger(expectedEntityRevision) || expectedEntityRevision < 1) {
        throw new RepositoryError('invalid-context', 'expectedEntityRevision は正の整数である必要があります');
      }
      return guardedWrite(adapter, () =>
        transactional(adapter).transaction(async (tx) => {
          const db = tx.client as CoreDb;
          const rows = await db
            .update(hearingSheets)
            .set({
              status,
              updatedAt: serverNow(),
              entityRevision: sql<number>`${hearingSheets.entityRevision} + 1`,
            })
            .where(
              and(
                eq(hearingSheets.tenantId, context.tenantId),
                eq(hearingSheets.workspaceId, context.workspaceId as string),
                eq(hearingSheets.id, id),
                eq(hearingSheets.entityRevision, expectedEntityRevision),
              ),
            )
            .returning({ id: hearingSheets.id });
          if (rows[0] !== undefined) {
            const sheet = await findSheetOn(db, context, id);
            if (sheet === null) return { outcome: 'conflict' as const, current: null };
            return { outcome: 'updated' as const, sheet };
          }
          return { outcome: 'conflict' as const, current: await findSheetOn(db, context, id) };
        }),
      );
    },

    async regenerate(context, id) {
      return guardedWrite(adapter, () =>
        transactional(adapter).transaction(async (tx) => {
          const db = tx.client as CoreDb;
          const sheet = await findSheetOn(db, context, id);
          if (sheet === null) throw new EntityNotFoundError('hearing_sheets', id);
          const now = serverNow();
          const payload = {
            sheet_id: sheet.id,
            sheet_code: sheet.code,
            form: JSON.parse(sheet.formJson) as unknown,
            estimate: (() => {
              const estimate = JSON.parse(sheet.estimateJson) as {
                savedHoursPerYear: number;
                savedAmountPerYear: number;
              };
              return {
                savedHoursPerYear: estimate.savedHoursPerYear,
                savedAmountPerYear: estimate.savedAmountPerYear,
              };
            })(),
          };
          const job = enqueueValues({
            tenantId: context.tenantId,
            workspaceId: sheet.workspaceId,
            refId: sheet.id,
            payloadJson: JSON.stringify(payload),
            now,
          });
          await db.insert(aiJobs).values(job);
          const updatedSheet = await db
            .update(hearingSheets)
            .set({
              aiJobId: job.id,
              status: 'generating',
              updatedAt: now,
              entityRevision: sheet.entityRevision + 1,
            })
            .where(
              and(
                eq(hearingSheets.tenantId, context.tenantId),
                eq(hearingSheets.workspaceId, sheet.workspaceId),
                eq(hearingSheets.id, sheet.id),
                eq(hearingSheets.entityRevision, sheet.entityRevision),
              ),
            )
            .returning({ id: hearingSheets.id });
          if (updatedSheet.length === 0)
            throw new RepositoryError('conflict', 'hearing sheet の再生成 CAS に失敗しました');
          const updated = await findSheetOn(db, context, sheet.id);
          if (updated === null) throw new EntityNotFoundError('hearing_sheets', sheet.id);
          return updated;
        }),
      );
    },
  };
}
