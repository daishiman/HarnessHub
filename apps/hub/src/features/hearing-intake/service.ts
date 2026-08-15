import type { HearingIntakeRepository, HearingSheetRow, RepositoryContext } from '@harness-hub/db';
import {
  type CreateSheetRequest,
  type CreateSheetResponse,
  createHearingSheetFormSnapshot,
  createSheetResponseSchema,
  decodeStoredHearingSheetFormSnapshot,
  type HearingSheetStatus,
  type SheetDetail,
  type SheetListQuery,
  type SheetListResponse,
  sheetDetailSchema,
  sheetListResponseSchema,
} from '@harness-hub/schemas';

import { resolveAccountDisplayName } from '../../lib/auth/display-name.js';
import { buildSheetGenerationPayload, parseGenerationResult } from './ai-job-adapter/index.js';
import { estimateHearingSheet } from './estimation-adapter/index.js';

/**
 * 申請者の表示名。`users.name` は NOT NULL だが JIT provisioning が空文字で作るため
 * (`lib/auth/db-ports.ts` の `createFromOidc`)、そのまま返すと応答 schema の
 * `shortText` (min(1)) に落ちて一覧・詳細が 500 になる。画面ヘッダーと同じ
 * 氏名 → メールの順で解決し、どちらも空なら識別子を出して応答自体は必ず成立させる。
 */
function applicantOf(row: HearingSheetRow) {
  return {
    id: row.applicantUserId,
    name: resolveAccountDisplayName({ name: row.applicantName, email: row.applicantEmail }) ?? row.applicantUserId,
  };
}

/**
 * 状態タブの件数。repository の戻り値から型を引き出す。
 *
 * ここで型を書き起こすと、集計の区分 (active に何を含めるか) が repository と
 * 二重定義になり、片方だけ増えたときに気付けない。
 */
export type HearingSheetStatusCounts = Awaited<ReturnType<HearingIntakeRepository['listSheets']>>['statusCounts'];

/**
 * 一覧応答に件数を足した形。
 *
 * `sheetListResponseSchema` は schemas パッケージが持つ契約で、`.parse()` は
 * 契約に無いキーを落とす。件数は落とされた後にここで足す (契約側を触らずに済ませる)。
 */
export type SheetListResponseWithCounts = SheetListResponse & {
  readonly status_counts: HearingSheetStatusCounts;
};

/**
 * 画面のタブ区分と、そこに属する保存済み状態の対応。
 *
 * この 1 箇所だけが区分の定義。件数集計 (repository 側) と絞り込み (ここ) が
 * 別の規則を持つと、「対応中 5 件」と出たタブを押して 3 件しか出ない、が起きる。
 */
const STATUS_GROUP_MEMBERS = {
  active: ['received', 'generating', 'review'],
  completed: ['completed'],
} as const satisfies Readonly<Record<'active' | 'completed', readonly HearingSheetStatus[]>>;

export interface ReceiptNotificationPort {
  notifyReceipt(input: {
    readonly tenantId: string;
    readonly userId: string;
    readonly sheetId: string;
    readonly code: string;
  }): Promise<void>;
}

interface CreateWireResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

export interface HearingIntakeService {
  createSheet(input: {
    readonly context: RepositoryContext;
    readonly workspaceId: string;
    readonly applicantUserId: string;
    readonly request: CreateSheetRequest;
  }): Promise<CreateSheetResponse>;
  createSheetIdempotent(input: {
    readonly context: RepositoryContext;
    readonly workspaceId: string;
    readonly applicantUserId: string;
    readonly request: CreateSheetRequest;
    readonly idempotency: { readonly key: string; readonly payloadHash: string };
    readonly buildResponse: (response: CreateSheetResponse, expiresAt: number) => CreateWireResponse;
  }): Promise<
    | {
        readonly outcome: 'created' | 'replayed';
        readonly expiresAt: number;
        readonly wireResponse: CreateWireResponse;
      }
    | { readonly outcome: 'conflict'; readonly expiresAt: number }
  >;
  listSheets(input: {
    readonly context: RepositoryContext;
    readonly workspaceId?: string;
    readonly applicantUserId: string;
    readonly readAll: boolean;
    readonly query: SheetListQuery;
    /**
     * 複数の状態を 1 つの区分として絞り込む。`query.status` (単一状態) とは別の問い。
     * 画面のタブは「対応中」「完了」という区分で、個々の状態名では表せない。
     */
    readonly statusGroup?: 'active' | 'completed';
  }): Promise<SheetListResponseWithCounts>;
  getSheet(input: { readonly context: RepositoryContext; readonly id: string }): Promise<SheetDetail | null>;
  updateSheetStatus(input: {
    readonly context: RepositoryContext;
    readonly id: string;
    readonly status: HearingSheetStatus;
  }): Promise<SheetDetail>;
  updateSheetStatusCas(input: {
    readonly context: RepositoryContext;
    readonly id: string;
    readonly status: HearingSheetStatus;
    readonly expectedRevision: number;
  }): Promise<
    | { readonly outcome: 'updated'; readonly detail: SheetDetail }
    | { readonly outcome: 'conflict'; readonly current: SheetDetail | null }
  >;
  regenerate(input: { readonly context: RepositoryContext; readonly id: string }): Promise<SheetDetail>;
  /**
   * ホーム集約向け。要対応件数(review + 生成失敗)と直近更新 N 件を 1 度に返す。
   * home-dashboard/service.ts が権限確認後に呼ぶ内部集約用で、公開 API route は持たない。
   */
  getActionableSummary(input: {
    readonly context: RepositoryContext;
    readonly workspaceId?: string;
    readonly actorUserId: string;
    readonly readAllActionable: boolean;
    readonly recentLimit: number;
  }): Promise<HearingActionableSummary>;
}

export interface HearingActionableSummary {
  readonly actionableCount: number;
  readonly recentItems: readonly ReturnType<typeof toListItem>[];
}

const noNotification: ReceiptNotificationPort = {
  notifyReceipt: async () => undefined,
};

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

function logMalformedStoredRow(operation: 'listSheets' | 'getActionableSummary', error: unknown): void {
  console.error('[hearing-intake] malformed stored row skipped', {
    correlationId: crypto.randomUUID(),
    operation,
    errorName: error instanceof Error ? error.name : 'UnknownError',
  });
}

function toListItem(row: HearingSheetRow) {
  const form = decodeStoredHearingSheetFormSnapshot(parseJson(row.formJson));
  return {
    id: row.id,
    revision: row.entityRevision,
    code: row.code,
    status: row.status,
    title: row.title,
    domain: form.domain,
    department: row.department,
    people: form.people,
    hours: form.hours,
    applicant: applicantOf(row),
    updated_at: row.updatedAt,
  };
}

function toDetail(row: HearingSheetRow): SheetDetail {
  const result = parseGenerationResult(row.aiJobResultJson);
  const form = decodeStoredHearingSheetFormSnapshot(parseJson(row.formJson));
  return sheetDetailSchema.parse({
    id: row.id,
    revision: row.entityRevision,
    code: row.code,
    status: row.status,
    title: row.title,
    applicant: applicantOf(row),
    department: row.department,
    form_snapshot: form,
    estimate_snapshot: parseJson(row.estimateJson),
    generated_sections: result?.generated_sections ?? null,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    ai_job_status: row.aiJobStatus,
    build_ref: row.buildId,
    publish_request_ref: null,
    can_manage: false,
  });
}

export function createHearingIntakeService(
  repository: HearingIntakeRepository,
  notifications: ReceiptNotificationPort = noNotification,
): HearingIntakeService {
  return {
    async createSheet(input) {
      const coefficients = await repository.getCoefficients(input.context);
      const estimate = estimateHearingSheet(input.request, coefficients);
      const form = createHearingSheetFormSnapshot(input.request);
      const row = await repository.createSheetAndEnqueue(input.context, {
        workspaceId: input.workspaceId,
        title: form.taskName,
        applicantUserId: input.applicantUserId,
        formJson: JSON.stringify(form),
        estimateJson: JSON.stringify(estimate),
        buildPayloadJson: (sheetId, sheetCode) =>
          JSON.stringify(buildSheetGenerationPayload({ sheetId, sheetCode, form, estimate })),
      });
      try {
        await notifications.notifyReceipt({
          tenantId: input.context.tenantId,
          userId: input.applicantUserId,
          sheetId: row.id,
          code: row.code,
        });
      } catch {
        // 通知は transaction 外の補助経路。失敗しても提出は成功のまま返す (AD-5)。
      }
      return createSheetResponseSchema.parse({
        id: row.id,
        revision: row.entityRevision,
        code: row.code,
        status: row.status,
      });
    },

    async createSheetIdempotent(input) {
      const coefficients = await repository.getCoefficients(input.context);
      const estimate = estimateHearingSheet(input.request, coefficients);
      const form = createHearingSheetFormSnapshot(input.request);
      const result = await repository.createSheetAndEnqueueIdempotent(
        input.context,
        {
          workspaceId: input.workspaceId,
          title: form.taskName,
          applicantUserId: input.applicantUserId,
          formJson: JSON.stringify(form),
          estimateJson: JSON.stringify(estimate),
          buildPayloadJson: (sheetId: string, sheetCode: string) =>
            JSON.stringify(buildSheetGenerationPayload({ sheetId, sheetCode, form, estimate })),
        },
        input.idempotency,
        (sheet, expiresAt) =>
          input.buildResponse(
            createSheetResponseSchema.parse({
              id: sheet.id,
              revision: sheet.entityRevision,
              code: sheet.code,
              status: sheet.status,
            }),
            expiresAt,
          ),
      );
      if (result.outcome === 'conflict') return result;
      if (result.outcome === 'created') {
        try {
          await notifications.notifyReceipt({
            tenantId: input.context.tenantId,
            userId: input.applicantUserId,
            sheetId: result.sheet.id,
            code: result.sheet.code,
          });
        } catch {
          // 通知は受付 transaction 外の補助経路。失敗は作成結果を取り消さない。
        }
      }
      return {
        outcome: result.outcome,
        expiresAt: result.expiresAt,
        wireResponse: result.wireResponse,
      };
    },

    async listSheets(input) {
      const page = await repository.listSheets(input.context, {
        ...(input.workspaceId === undefined ? {} : { workspaceId: input.workspaceId }),
        ...(input.readAll ? {} : { applicantUserId: input.applicantUserId }),
        ...(input.query.status === undefined ? {} : { status: input.query.status }),
        ...(input.statusGroup === undefined ? {} : { statuses: STATUS_GROUP_MEMBERS[input.statusGroup] }),
        ...(input.query.department === undefined ? {} : { department: input.query.department }),
        ...(input.query.q === undefined ? {} : { query: input.query.q }),
        ...(input.query.cursor === undefined ? {} : { cursor: input.query.cursor }),
        limit: input.query.limit,
      });
      // 実測 (2026-08-13): 一覧の 1 行でも decode/検証に失敗すると `.map(toListItem)` の例外が
      // ページ全体を巻き込み、GET /api/v1/sheets が丸ごと 500 になっていた (旧データの form_json が
      // 現行スキーマの union のどれとも一致しないケースなど)。1 行の不整合で他の正常な行まで
      // 見えなくなるのは利用者にとって過大な副作用なので、不整合行はログへ残して一覧からは除く。
      const items: ReturnType<typeof toListItem>[] = [];
      for (const row of page.items) {
        try {
          items.push(toListItem(row));
        } catch (error) {
          logMalformedStoredRow('listSheets', error);
        }
      }
      return {
        ...sheetListResponseSchema.parse({
          items,
          next_cursor: page.nextCursor,
        }),
        status_counts: page.statusCounts,
      };
    },

    async getSheet(input) {
      const row = await repository.findSheet(input.context, input.id);
      return row === null ? null : toDetail(row);
    },

    async updateSheetStatus(input) {
      if (input.status !== 'review' && input.status !== 'completed') {
        throw new Error('管理者が手動変更できる状態は review または completed だけです');
      }
      const row = await repository.updateSheetStatus(input.context, input.id, input.status);
      return toDetail(row);
    },

    async updateSheetStatusCas(input) {
      if (input.status !== 'review' && input.status !== 'completed') {
        throw new Error('管理者が手動変更できる状態は review または completed だけです');
      }
      const result = await repository.updateSheetStatusCas(
        input.context,
        input.id,
        input.status,
        input.expectedRevision,
      );
      return result.outcome === 'updated'
        ? { outcome: 'updated' as const, detail: toDetail(result.sheet) }
        : { outcome: 'conflict' as const, current: result.current === null ? null : toDetail(result.current) };
    },

    async regenerate(input) {
      return toDetail(await repository.regenerate(input.context, input.id));
    },

    async getActionableSummary(input) {
      const [actionableCount, recentRows] = await Promise.all([
        repository.countActionable(
          input.context,
          input.workspaceId,
          input.readAllActionable ? undefined : input.actorUserId,
        ),
        repository.listRecentUpdated(input.context, input.recentLimit, input.workspaceId, input.actorUserId),
      ]);
      // listSheets と同じ理由 (行 152 のコメント参照): 1 行の decode 失敗でホーム全体を落とさない。
      const recentItems: ReturnType<typeof toListItem>[] = [];
      for (const row of recentRows) {
        try {
          recentItems.push(toListItem(row));
        } catch (error) {
          logMalformedStoredRow('getActionableSummary', error);
        }
      }
      return { actionableCount, recentItems };
    },
  };
}
