/**
 * Hearing intake の tenant-scoped repository と共通 AI queue の最初の adapter。
 *
 * 全メソッドが RepositoryContext を要求し、hearing_sheets / ai_jobs の検索条件へ
 * tenant_id を必ず注入する。claim/complete/fail は transaction 内の CAS で状態を進める。
 */
import { and, desc, eq, lt, type SQL } from 'drizzle-orm';

import { users } from '../schema/core/identity';
import { DEFAULT_TENANT_COEFFICIENT_VALUES } from '../schema/hearing-intake/coefficient-defaults';
import {
  aiJobs,
  displayCodeCounters,
  type HEARING_SHEET_STATUSES,
  hearingSheets,
  tenantCoefficients,
} from '../schema/hearing-intake/schema';
import { isTransactionalAdapter } from '../src/adapter';
import { EntityNotFoundError, RepositoryError } from '../src/errors';
import type { RepositoryContext } from '../src/types';
import { guardedWrite } from './conflict';
import type { CoreAdapter, CoreDb } from './db';
import {
  createHearingQueueRepository,
  type HearingQueueRepository,
  type HearingQueueStatus,
} from './hearing-intake-queue';
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
  readonly department?: string;
  readonly query?: string;
  readonly cursor?: string;
  readonly limit: number;
}

export interface HearingSheetPage {
  readonly items: readonly HearingSheetRow[];
  readonly nextCursor: string | null;
}

export interface HearingIntakeRepository extends HearingQueueRepository {
  getCoefficients(context: RepositoryContext): Promise<TenantCoefficientRow>;
  updateCoefficients(context: RepositoryContext, input: UpdateTenantCoefficientsInput): Promise<TenantCoefficientRow>;
  createSheetAndEnqueue(context: RepositoryContext, input: CreateHearingSheetInput): Promise<HearingSheetRow>;
  listSheets(context: RepositoryContext, input: ListHearingSheetsInput): Promise<HearingSheetPage>;
  findSheet(context: RepositoryContext, id: string): Promise<HearingSheetRow | null>;
  updateSheetStatus(
    context: RepositoryContext,
    id: string,
    status: Extract<HearingSheetStatus, 'review' | 'completed'>,
  ): Promise<HearingSheetRow>;
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

    async listSheets(context, input) {
      const predicates: SQL[] = [eq(hearingSheets.tenantId, context.tenantId)];
      if (context.workspaceId !== undefined) predicates.push(eq(hearingSheets.workspaceId, context.workspaceId));
      if (input.workspaceId !== undefined) predicates.push(eq(hearingSheets.workspaceId, input.workspaceId));
      if (input.applicantUserId !== undefined) {
        predicates.push(eq(hearingSheets.applicantUserId, input.applicantUserId));
      }
      if (input.status !== undefined) predicates.push(eq(hearingSheets.status, input.status));
      if (input.department !== undefined) predicates.push(eq(hearingSheets.department, input.department));
      if (input.cursor !== undefined) predicates.push(lt(hearingSheets.id, input.cursor));
      if (input.query !== undefined) {
        // 検索対象は HS コード・業務名・回答内容 (formJson)。パターン組立ては
        // repository/search.ts に一本化してある — 直に `%...%` を書くと利用者の
        // 入力に含まれる `%` `_` がワイルドカードとして働いてしまう。
        const search = containsTermInAny(input.query, [
          hearingSheets.code,
          hearingSheets.title,
          hearingSheets.formJson,
        ]);
        if (search !== undefined) predicates.push(search);
      }

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
      return {
        items,
        nextCursor: hasNext ? (items.at(-1)?.id ?? null) : null,
      };
    },

    async findSheet(context, id) {
      return findSheetOn(adapter.client, context, id);
    },

    async updateSheetStatus(context, id, status) {
      return guardedWrite(adapter, async () => {
        const predicates: SQL[] = [eq(hearingSheets.tenantId, context.tenantId), eq(hearingSheets.id, id)];
        if (context.workspaceId !== undefined) predicates.push(eq(hearingSheets.workspaceId, context.workspaceId));
        const rows = await adapter.client
          .update(hearingSheets)
          .set({ status, updatedAt: serverNow() })
          .where(and(...predicates))
          .returning({ id: hearingSheets.id });
        if (rows[0] === undefined) throw new EntityNotFoundError('hearing_sheets', id);
        const updated = await findSheetOn(adapter.client, context, id);
        if (updated === null) throw new EntityNotFoundError('hearing_sheets', id);
        return updated;
      });
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
          await db
            .update(hearingSheets)
            .set({ aiJobId: job.id, status: 'generating', updatedAt: now })
            .where(
              and(
                eq(hearingSheets.tenantId, context.tenantId),
                eq(hearingSheets.workspaceId, sheet.workspaceId),
                eq(hearingSheets.id, sheet.id),
              ),
            );
          const updated = await findSheetOn(db, context, sheet.id);
          if (updated === null) throw new EntityNotFoundError('hearing_sheets', sheet.id);
          return updated;
        }),
      );
    },
  };
}
