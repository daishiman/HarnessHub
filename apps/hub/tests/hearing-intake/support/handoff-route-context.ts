/**
 * screenshots / handoff-tokens / 公開 `/api/hearing/{token}` route テストの共通 fixture。
 *
 * `tenant-data/support/route-context.ts` と同じ方針: 認可判定 (`withAuthz`/`decide`) は
 * 本物の実装を通し、`hearingIntakeRuntime`/`hearingShareRuntime` の port だけを
 * in-memory 実装へ差し替える。差し替えの登録 (`vi.mock`) 自体は各 *.test.ts が
 * (hoisting の都合上) 自分で呼ぶ — ここは fixture の組み立てだけを提供する。
 */
import type {
  HearingScreenshotRow,
  HearingScreenshotsRepo,
  HearingShareTokenRow,
  HearingShareTokensRepo,
  HearingSheetRow,
  TenantDataRepo,
} from '@harness-hub/db';

import type { AuditLogger } from '../../../src/shared/audit/index.js';
import { TENANT_A, TENANT_B, WORKSPACE_A1 } from '../../auth-tenancy/support/in-memory-ports.js';
import {
  ADMIN_ID,
  ALLOWED_ORIGIN,
  OWNER_ID,
  STRANGER_ID,
  sessionCookieFor,
  testUser,
} from '../../auth-tenancy/support/token-route-runtime.js';

export { ADMIN_ID, OWNER_ID, STRANGER_ID, sessionCookieFor, TENANT_A, TENANT_B, testUser, WORKSPACE_A1 };

export const CANONICAL_ORIGIN = ALLOWED_ORIGIN;

/** 1x1 PNG。route test でも magic bytes 検査を本物の画像 envelope で通す。 */
export const PNG_IMAGE_BYTES = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 4, 0, 0, 0, 181, 28, 12, 2,
  0, 0, 0, 11, 73, 68, 65, 84, 120, 218, 99, 100, 248, 15, 0, 1, 5, 1, 1, 39, 24, 227, 102, 0, 0, 0, 0, 73, 69, 78, 68,
  174, 66, 96, 130,
]);

const BASE_FORM_SNAPSHOT_JSON = JSON.stringify({
  taskName: '請求書処理',
  company: '株式会社サンプル',
  applicant: '山田',
  domain: '経理',
  issue: '転記が多く手作業のミスが多発している',
  tools: 'Excel / 会計システム',
  hours: 40,
  people: 5,
  features: 'OCR による自動仕訳',
  output: 'CSV 出力と承認フロー',
  priority: 'high',
  usagePurpose: 'system_development',
  expertise: 'novice',
  role: 'employee',
  context: 'business',
  motivation: 'efficiency',
  sharingIntent: 'small_group',
  constraintTags: ['time', 'budget'],
  shareTarget: 'チーム内の経理担当',
  knowledgeAssets: ['経理マニュアル v3'],
  requestPatterns: [],
  integrationTools: [],
  existingDataSources: [],
  referenceUrls: [],
});

const BASE_ESTIMATE_JSON = JSON.stringify({
  savedMinutesPerYear: 50_400,
  savedHoursPerYear: 840,
  savedAmountPerYear: 2_520_000,
});

export function buildSheetRow(overrides: Partial<HearingSheetRow> = {}): HearingSheetRow {
  return {
    id: 'sheet-1',
    tenantId: TENANT_A,
    workspaceId: WORKSPACE_A1,
    code: 'HS-0001',
    title: '請求書処理の自動化',
    applicantUserId: OWNER_ID,
    applicantName: '山田',
    applicantEmail: 'yamada@example.com',
    department: null,
    status: 'review',
    formJson: BASE_FORM_SNAPSHOT_JSON,
    estimateJson: BASE_ESTIMATE_JSON,
    aiJobId: null,
    generatedDocIdsJson: null,
    buildId: null,
    createdAt: 1_000,
    updatedAt: 1_000,
    aiJobStatus: null,
    aiJobResultJson: null,
    ...overrides,
  };
}

export interface InMemoryHearingIntakeRuntime {
  readonly repository: { findSheet: (context: { tenantId: string }, id: string) => Promise<HearingSheetRow | null> };
  readonly sheets: HearingSheetRow[];
}

/** `hearingIntakeRuntime()` の差し替え先。screenshots/handoff-tokens/公開route が使うのは findSheet だけ。 */
export function createInMemoryHearingIntakeRuntime(
  initial: readonly HearingSheetRow[] = [],
): InMemoryHearingIntakeRuntime {
  const sheets = [...initial];
  return {
    sheets,
    repository: {
      async findSheet(context, id) {
        return sheets.find((row) => row.tenantId === context.tenantId && row.id === id) ?? null;
      },
    },
  };
}

export interface InMemoryHearingShareRuntime {
  readonly screenshots: HearingScreenshotsRepo;
  readonly shareTokens: HearingShareTokensRepo;
  readonly tenantData: TenantDataRepo;
  readonly audit: AuditLogger;
  readonly screenshotContents: Map<string, Uint8Array>;
}

let nextId = 1;
function newId(prefix: string): string {
  return `${prefix}-${nextId++}`;
}

/** `hearingShareRuntime()` の差し替え先。R2/暗号化を一切通さない純粋な in-memory 実装。 */
export function createInMemoryHearingShareRuntime(): InMemoryHearingShareRuntime {
  const screenshotRows: HearingScreenshotRow[] = [];
  const screenshotContents = new Map<string, Uint8Array>();
  const tokenRows: HearingShareTokenRow[] = [];

  const screenshots: HearingScreenshotsRepo = {
    async upload(context, input) {
      const id = newId('shot');
      const row: HearingScreenshotRow = {
        id,
        tenantId: context.tenantId,
        workspaceId: input.workspaceId,
        sheetId: input.sheetId,
        tenantDataObjectId: newId('obj'),
        title: input.title,
        linkedItem: input.linkedItem ?? null,
        note: input.note ?? null,
        contentType: input.contentType,
        createdBy: input.uploadedBy,
        createdAt: 1_800_000_000_000,
      };
      screenshotRows.push(row);
      screenshotContents.set(id, input.plaintext);
      return row;
    },
    async listBySheetId(context, sheetId) {
      return screenshotRows.filter((row) => row.tenantId === context.tenantId && row.sheetId === sheetId);
    },
    async findById(context, id) {
      return screenshotRows.find((row) => row.tenantId === context.tenantId && row.id === id) ?? null;
    },
    async getContent(_context, id) {
      const content = screenshotContents.get(id);
      if (content === undefined) throw new Error(`screenshot content not found: ${id}`);
      return content;
    },
    async deleteScreenshot(context, id) {
      const index = screenshotRows.findIndex((row) => row.tenantId === context.tenantId && row.id === id);
      if (index === -1) return;
      screenshotRows.splice(index, 1);
      screenshotContents.delete(id);
    },
  };

  const shareTokens: HearingShareTokensRepo = {
    async create(context, input) {
      const row: HearingShareTokenRow = {
        id: input.id,
        tenantId: context.tenantId,
        workspaceId: input.workspaceId,
        sheetId: input.sheetId,
        audience: input.audience,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        revokedAt: null,
        lastAccessedAt: null,
        accessCount: 0,
        createdByUserId: input.createdByUserId,
        createdAt: 1_800_000_000_000,
      };
      tokenRows.push(row);
      return row;
    },
    async listBySheetId(context, sheetId) {
      return tokenRows.filter((row) => row.tenantId === context.tenantId && row.sheetId === sheetId);
    },
    async findValidByTokenHash(tokenHash, nowMs) {
      const row = tokenRows.find((candidate) => candidate.tokenHash === tokenHash && candidate.revokedAt === null);
      if (row === undefined) return null;
      if (row.expiresAt <= nowMs) return null;
      return row;
    },
    async recordAccess(id, accessedAt) {
      const index = tokenRows.findIndex((row) => row.id === id);
      if (index === -1) return;
      const current = tokenRows[index] as HearingShareTokenRow;
      tokenRows[index] = { ...current, lastAccessedAt: accessedAt, accessCount: current.accessCount + 1 };
    },
    async revokeIfActive(context, input) {
      const index = tokenRows.findIndex(
        (row) => row.tenantId === context.tenantId && row.id === input.id && row.revokedAt === null,
      );
      if (index === -1) return false;
      const current = tokenRows[index] as HearingShareTokenRow;
      tokenRows[index] = { ...current, revokedAt: input.revokedAt };
      return true;
    },
  };

  return {
    screenshots,
    shareTokens,
    screenshotContents,
    tenantData: {
      async upload() {
        throw new Error('tenantData.upload はこの fixture では未実装です (screenshots.upload を使ってください)');
      },
      async findById(context, id) {
        const row = screenshotRows.find((candidate) => candidate.tenantDataObjectId === id);
        if (row === undefined) return null;
        const content = screenshotContents.get(row.id);
        return {
          id,
          tenantId: context.tenantId,
          workspaceId: row.workspaceId,
          kind: 'hearing_screenshot',
          title: row.title,
          r2Key: `hearing-screenshots/${row.id}`,
          sizeBytes: content?.byteLength ?? 0,
          contentHash: '',
          encKeyVersion: 1,
          uploadedBy: row.createdBy,
          createdAt: row.createdAt,
        };
      },
      async list() {
        throw new Error('tenantData.list はこの fixture では未実装です');
      },
      async getContent() {
        throw new Error(
          'tenantData.getContent はこの fixture では未実装です (screenshots.getContent を使ってください)',
        );
      },
      async deleteTenantDataObject() {
        throw new Error('tenantData.deleteTenantDataObject はこの fixture では未実装です');
      },
    },
    audit: {
      async record(event) {
        // 監査は本テストの対象外 (route ハンドラの action ロジックのみ検証する)。
        return { ...event, id: newId('audit'), recordedAt: new Date(2_000_000).toISOString() };
      },
    },
  };
}

const BASE = 'https://hub.example.com';

interface CallOptions {
  readonly cookie?: string | null;
  readonly tenantId?: string | null;
  readonly workspaceId?: string | null;
  readonly origin?: string | null;
  readonly json?: unknown;
  readonly formData?: FormData;
}

export async function buildAuthedRequest(method: string, path: string, options: CallOptions = {}): Promise<Request> {
  const headers = new Headers();
  const cookie = options.cookie === undefined ? await sessionCookieFor(testUser(OWNER_ID)) : options.cookie;
  if (cookie !== null) headers.set('cookie', cookie);
  const tenantId = options.tenantId === undefined ? TENANT_A : options.tenantId;
  if (tenantId !== null) headers.set('x-harness-tenant-id', tenantId);
  const workspaceId = options.workspaceId === undefined ? WORKSPACE_A1 : options.workspaceId;
  if (workspaceId !== null) headers.set('x-harness-workspace-id', workspaceId);
  const origin = options.origin === undefined ? ALLOWED_ORIGIN : options.origin;
  if (origin !== null) headers.set('origin', origin);

  let body: BodyInit | undefined;
  if (options.formData !== undefined) body = options.formData;
  else if (options.json !== undefined) {
    headers.set('content-type', 'application/json');
    body = typeof options.json === 'string' ? options.json : JSON.stringify(options.json);
  }
  return new Request(`${BASE}${path}`, { method, headers, ...(body === undefined ? {} : { body }) });
}

export function buildPublicRequest(path: string): Request {
  return new Request(`${BASE}${path}`);
}

export function params<T>(value: T): { readonly params: Promise<T> } {
  return { params: Promise.resolve(value) };
}

export async function bodyOf(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

export function uploadForm(input: {
  readonly title?: string;
  readonly linkedItem?: string;
  readonly note?: string;
  readonly file?: File;
}): FormData {
  const form = new FormData();
  form.set('title', input.title ?? 'title.png');
  if (input.linkedItem !== undefined) form.set('linkedItem', input.linkedItem);
  if (input.note !== undefined) form.set('note', input.note);
  form.set('file', input.file ?? new File([PNG_IMAGE_BYTES], 'title.png', { type: 'image/png' }));
  return form;
}
