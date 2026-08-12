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

export interface ReceiptNotificationPort {
  notifyReceipt(input: {
    readonly tenantId: string;
    readonly userId: string;
    readonly sheetId: string;
    readonly code: string;
  }): Promise<void>;
}

export interface HearingIntakeService {
  createSheet(input: {
    readonly context: RepositoryContext;
    readonly workspaceId: string;
    readonly applicantUserId: string;
    readonly request: CreateSheetRequest;
  }): Promise<CreateSheetResponse>;
  listSheets(input: {
    readonly context: RepositoryContext;
    readonly workspaceId?: string;
    readonly applicantUserId: string;
    readonly readAll: boolean;
    readonly query: SheetListQuery;
  }): Promise<SheetListResponse>;
  getSheet(input: { readonly context: RepositoryContext; readonly id: string }): Promise<SheetDetail | null>;
  updateSheetStatus(input: {
    readonly context: RepositoryContext;
    readonly id: string;
    readonly status: HearingSheetStatus;
  }): Promise<SheetDetail>;
  regenerate(input: { readonly context: RepositoryContext; readonly id: string }): Promise<SheetDetail>;
}

const noNotification: ReceiptNotificationPort = {
  notifyReceipt: async () => undefined,
};

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

function toListItem(row: HearingSheetRow) {
  const form = decodeStoredHearingSheetFormSnapshot(parseJson(row.formJson));
  return {
    id: row.id,
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
      return createSheetResponseSchema.parse({ id: row.id, code: row.code, status: row.status });
    },

    async listSheets(input) {
      const page = await repository.listSheets(input.context, {
        ...(input.workspaceId === undefined ? {} : { workspaceId: input.workspaceId }),
        ...(input.readAll ? {} : { applicantUserId: input.applicantUserId }),
        ...(input.query.status === undefined ? {} : { status: input.query.status }),
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
          console.error('[hearing-intake] listSheets: skip malformed row', { sheetId: row.id, error });
        }
      }
      return sheetListResponseSchema.parse({
        items,
        next_cursor: page.nextCursor,
      });
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

    async regenerate(input) {
      return toDetail(await repository.regenerate(input.context, input.id));
    },
  };
}
