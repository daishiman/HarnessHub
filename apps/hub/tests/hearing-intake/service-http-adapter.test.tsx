import type { AiJobRow, HearingIntakeRepository, HearingSheetRow, RepositoryContext } from '@harness-hub/db';
import {
  createHearingSheetFormSnapshot,
  createSheetRequestSchema,
  generatedSectionsSchema,
} from '@harness-hub/schemas';
import { UiProvider } from '@harness-hub/ui';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import HearingSheetDetailPage from '../../src/app/(dashboard)/sheets/[id]/page.js';
import HearingIntakePage from '../../src/app/(dashboard)/sheets/new/page.js';
import HearingSheetsPage from '../../src/app/(dashboard)/sheets/page.js';
import {
  buildSheetGenerationPayload,
  parseGenerationResult,
  serializeGenerationResult,
  toPulledJob,
} from '../../src/features/hearing-intake/ai-job-adapter/index.js';
import { parseJsonRequest, problemResponse } from '../../src/features/hearing-intake/http.js';
import { createHearingIntakeService } from '../../src/features/hearing-intake/service.js';

// server page は `resolveDashboardScope` 経由で `cookies()` を無条件に呼ぶ (呼び出し元 page の静的化を防ぐため。
// 理由は src/lib/routing/dashboard-scope.ts のコメント参照)。ここは request scope の外で SSR するので空 cookie を差す。
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));

const CONTEXT: RepositoryContext = { tenantId: 'tenant-a', workspaceId: 'workspace-a', actorId: 'user-a' };

const FORM = createSheetRequestSchema.parse({
  taskName: '請求書処理',
  company: 'サンプル社',
  applicant: '山田',
  domain: '経理',
  issue: '手入力が多い',
  tools: '表計算',
  hours: 40,
  people: 5,
  salary: 6_000_000,
  features: 'OCR と確認画面',
  output: 'CSV',
  priority: 'high',
  usagePurpose: 'app_development',
  expertise: 'novice',
  role: 'employee',
  context: 'business',
  motivation: 'efficiency',
  sharingIntent: 'small_group',
  constraintTags: [],
  shareTarget: 'チーム内',
  knowledgeAssets: ['経理マニュアル'],
});

const FORM_SNAPSHOT = createHearingSheetFormSnapshot(FORM);
const LEGACY_FORM_SNAPSHOT = {
  taskName: FORM.taskName,
  company: FORM.company,
  applicant: FORM.applicant,
  domain: FORM.domain,
  issue: FORM.issue,
  tools: FORM.tools,
  hours: FORM.hours,
  people: FORM.people,
  features: FORM.features,
  output: FORM.output,
  priority: FORM.priority,
};
const ESTIMATE = {
  savedMinutesPerYear: 50_400,
  savedHoursPerYear: 840,
  savedAmountPerYear: 2_520_000,
};
const GENERATED = generatedSectionsSchema.parse({
  overview: '# 概要',
  issue: '## 課題',
  feature_tags: ['OCR', '確認'],
  estimated_effect: '## 効果',
});

const SHEET_ROW: HearingSheetRow = {
  id: 'sheet-1',
  tenantId: 'tenant-a',
  workspaceId: 'workspace-a',
  code: 'HS-0001',
  title: FORM.taskName,
  applicantUserId: 'user-a',
  applicantName: '山田',
  department: '経理部',
  status: 'generating',
  formJson: JSON.stringify(FORM_SNAPSHOT),
  estimateJson: JSON.stringify(ESTIMATE),
  aiJobId: 'job-1',
  generatedDocIdsJson: null,
  buildId: null,
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_001_000,
  aiJobStatus: 'processing',
  aiJobResultJson: JSON.stringify({ generated_sections: GENERATED }),
};

function repository(overrides: Partial<HearingIntakeRepository> = {}): HearingIntakeRepository {
  return {
    getCoefficients: vi.fn(async () => ({
      tenantId: 'tenant-a',
      annualHours: 2_000,
      minutesPerRun: 15,
      sheetReductionRate: 0.35,
      updatedBy: 'system-default',
    })),
    updateCoefficients: vi.fn(async (context, input) => ({
      tenantId: context.tenantId,
      annualHours: input.annualHours ?? 2_000,
      minutesPerRun: input.minutesPerRun ?? 15,
      sheetReductionRate: input.sheetReductionRate ?? 0.35,
      updatedBy: context.actorId ?? 'system-default',
    })),
    createSheetAndEnqueue: vi.fn(async (_context, input) => {
      input.buildPayloadJson(SHEET_ROW.id, SHEET_ROW.code);
      return SHEET_ROW;
    }),
    listSheets: vi.fn(async () => ({ items: [SHEET_ROW], nextCursor: 'sheet-next' })),
    findSheet: vi.fn(async () => SHEET_ROW),
    updateSheetStatus: vi.fn(async (_context, _id, status) => ({ ...SHEET_ROW, status })),
    regenerate: vi.fn(async () => SHEET_ROW),
    claimNextSheetGenerationJob: vi.fn(async () => null),
    findJob: vi.fn(async () => null),
    completeSheetGenerationJob: vi.fn(async () => {
      throw new Error('not used');
    }),
    failSheetGenerationJob: vi.fn(async () => {
      throw new Error('not used');
    }),
    ...overrides,
  };
}

describe('HI-SVC: service の提出・参照・管理操作', () => {
  it('提出時だけ試算し、salary を保存せず、transaction 後に受付通知する', async () => {
    let storedForm = '';
    let queuedPayload = '';
    const repo = repository({
      createSheetAndEnqueue: vi.fn(async (_context, input) => {
        storedForm = input.formJson;
        queuedPayload = input.buildPayloadJson(SHEET_ROW.id, SHEET_ROW.code);
        return SHEET_ROW;
      }),
    });
    const notifyReceipt = vi.fn(async () => undefined);
    const service = createHearingIntakeService(repo, { notifyReceipt });

    await expect(
      service.createSheet({
        context: CONTEXT,
        workspaceId: 'workspace-a',
        applicantUserId: 'user-a',
        request: FORM,
      }),
    ).resolves.toEqual({ id: 'sheet-1', code: 'HS-0001', status: 'generating' });

    expect(storedForm).not.toContain('salary');
    expect(queuedPayload).not.toContain('salary');
    expect(JSON.parse(storedForm)).toMatchObject({ schemaVersion: 2 });
    expect(JSON.parse(queuedPayload)).toMatchObject({
      sheet_id: 'sheet-1',
      sheet_code: 'HS-0001',
      estimate: { savedHoursPerYear: 840, savedAmountPerYear: 2_520_000 },
    });
    expect(notifyReceipt).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      userId: 'user-a',
      sheetId: 'sheet-1',
      code: 'HS-0001',
    });
  });

  it('transaction 後の通知失敗は受付成功を取り消さない', async () => {
    const service = createHearingIntakeService(repository(), {
      notifyReceipt: vi.fn(async () => {
        throw new Error('notification unavailable');
      }),
    });

    await expect(
      service.createSheet({
        context: CONTEXT,
        workspaceId: 'workspace-a',
        applicantUserId: 'user-a',
        request: FORM,
      }),
    ).resolves.toMatchObject({ code: 'HS-0001' });
  });

  it('一覧は本人用フィルタと管理者用フィルタを分け、snapshot から表示項目を作る', async () => {
    const listSheets = vi.fn(async () => ({ items: [SHEET_ROW], nextCursor: 'sheet-next' }));
    const service = createHearingIntakeService(repository({ listSheets }));
    const query = { status: 'generating' as const, department: '経理部', q: '請求', cursor: 'cursor-1', limit: 20 };

    const own = await service.listSheets({
      context: CONTEXT,
      workspaceId: 'workspace-a',
      applicantUserId: 'user-a',
      readAll: false,
      query,
    });
    expect(own).toMatchObject({
      items: [{ id: 'sheet-1', domain: '経理', people: 5, hours: 40 }],
      next_cursor: 'sheet-next',
    });
    expect(listSheets).toHaveBeenLastCalledWith(CONTEXT, {
      workspaceId: 'workspace-a',
      applicantUserId: 'user-a',
      status: 'generating',
      department: '経理部',
      query: '請求',
      cursor: 'cursor-1',
      limit: 20,
    });

    await service.listSheets({
      context: CONTEXT,
      applicantUserId: 'user-a',
      readAll: true,
      query: { limit: 10 },
    });
    expect(listSheets).toHaveBeenLastCalledWith(CONTEXT, { limit: 10 });
  });

  it('旧 11 項目 form_json を一覧・詳細で version 1 と未回答へ安全に読み上げる', async () => {
    const legacyRow = { ...SHEET_ROW, formJson: JSON.stringify(LEGACY_FORM_SNAPSHOT) };
    const service = createHearingIntakeService(
      repository({
        listSheets: vi.fn(async () => ({ items: [legacyRow], nextCursor: null })),
        findSheet: vi.fn(async () => legacyRow),
      }),
    );

    await expect(
      service.listSheets({
        context: CONTEXT,
        workspaceId: 'workspace-a',
        applicantUserId: 'user-a',
        readAll: false,
        query: { limit: 20 },
      }),
    ).resolves.toMatchObject({ items: [{ domain: '経理', people: 5, hours: 40 }] });
    await expect(service.getSheet({ context: CONTEXT, id: 'sheet-1' })).resolves.toMatchObject({
      form_snapshot: {
        schemaVersion: 1,
        usagePurpose: null,
        expertise: null,
        constraintTags: null,
        shareTarget: null,
        knowledgeAssets: null,
      },
    });
  });

  it('詳細の未検出・生成結果・状態変更・再生成を repository 境界へ写像する', async () => {
    const findSheet = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(SHEET_ROW);
    const updateSheetStatus = vi.fn(async (_context, _id, status) => ({
      ...SHEET_ROW,
      status,
    })) as HearingIntakeRepository['updateSheetStatus'];
    const regenerate = vi.fn(async () => ({ ...SHEET_ROW, status: 'generating' as const }));
    const service = createHearingIntakeService(repository({ findSheet, updateSheetStatus, regenerate }));

    await expect(service.getSheet({ context: CONTEXT, id: 'missing' })).resolves.toBeNull();
    await expect(service.getSheet({ context: CONTEXT, id: 'sheet-1' })).resolves.toMatchObject({
      generated_sections: GENERATED,
      ai_job_status: 'processing',
      can_manage: false,
    });
    await expect(service.updateSheetStatus({ context: CONTEXT, id: 'sheet-1', status: 'received' })).rejects.toThrow(
      'review または completed',
    );
    await expect(
      service.updateSheetStatus({ context: CONTEXT, id: 'sheet-1', status: 'completed' }),
    ).resolves.toMatchObject({ status: 'completed' });
    await expect(service.regenerate({ context: CONTEXT, id: 'sheet-1' })).resolves.toMatchObject({
      status: 'generating',
    });
  });
});

describe('HI-ADAPTER: 共通キューとの wire 変換', () => {
  const JOB_ROW: AiJobRow = {
    id: 'job-1',
    tenantId: 'tenant-a',
    workspaceId: 'workspace-a',
    kind: 'sheet_generation',
    status: 'processing',
    payloadJson: JSON.stringify({
      sheet_id: 'sheet-1',
      sheet_code: 'HS-0001',
      form: FORM_SNAPSHOT,
      estimate: { savedHoursPerYear: 840, savedAmountPerYear: 2_520_000 },
    }),
    resultJson: null,
    error: null,
    attempt: 0,
    maxAttempts: 3,
    leaseExpiresAt: 1_800_000_000_000,
    claimedByTokenId: 'token-1',
    refType: 'hearing_sheet',
    refId: 'sheet-1',
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_001_000,
  };

  it('payload・pull 応答・complete 結果を schema 検証付きで変換する', () => {
    expect(
      buildSheetGenerationPayload({
        sheetId: 'sheet-1',
        sheetCode: 'HS-0001',
        form: FORM_SNAPSHOT,
        estimate: ESTIMATE,
      }),
    ).toMatchObject({ sheet_id: 'sheet-1', estimate: { savedHoursPerYear: 840 } });
    expect(toPulledJob(JOB_ROW)).toMatchObject({
      id: 'job-1',
      kind: 'sheet_generation',
      lease_expires_at: 1_800_000_000_000,
    });
    const serialized = serializeGenerationResult({ generated_sections: GENERATED });
    expect(parseGenerationResult(serialized)).toEqual({ generated_sections: GENERATED });
    expect(parseGenerationResult(null)).toBeNull();
    expect(parseGenerationResult('{"unexpected":true}')).toBeNull();
  });

  it('処理待ちの旧 11 項目 AI payload も version 1 と未回答へ正規化する', () => {
    const legacyJob = {
      ...JOB_ROW,
      payloadJson: JSON.stringify({
        sheet_id: 'sheet-1',
        sheet_code: 'HS-0001',
        form: LEGACY_FORM_SNAPSHOT,
        estimate: { savedHoursPerYear: 840, savedAmountPerYear: 2_520_000 },
      }),
    };

    expect(toPulledJob(legacyJob)).toMatchObject({
      payload: {
        form: {
          schemaVersion: 1,
          usagePurpose: null,
          expertise: null,
          constraintTags: null,
          shareTarget: null,
          knowledgeAssets: null,
        },
      },
    });
  });
});

describe('HI-HTTP: JSON request と Problem Details', () => {
  it('正しい JSON を parse し、不正な shape は application/problem+json で返す', async () => {
    const valid = new Request('https://hub.example/api/v1/sheets', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(FORM),
    });
    await expect(parseJsonRequest(valid, createSheetRequestSchema)).resolves.toMatchObject({ ok: true, data: FORM });

    const invalid = new Request('https://hub.example/api/v1/sheets', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...FORM, extra: true }),
    });
    const parsed = await parseJsonRequest(invalid, createSheetRequestSchema);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.response.status).toBe(422);
      expect(parsed.response.headers.get('content-type')).toContain('application/problem+json');
    }
  });

  it('壊れた JSON と明示的な problem 応答を HTTP status へ写像する', async () => {
    const broken = new Request('https://hub.example/api/v1/sheets', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    });
    const parsed = await parseJsonRequest(broken, createSheetRequestSchema);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      await expect(parsed.response.json()).resolves.toMatchObject({
        title: 'JSON を読み取れません',
        status: 400,
        instance: '/api/v1/sheets',
      });
    }

    const response = problemResponse({
      type: 'about:blank',
      title: '見つかりません',
      status: 404,
      detail: '対象がありません。',
      instance: '/api/v1/sheets/missing',
    });
    expect(response.status).toBe(404);
  });
});

describe('HI-PAGE: dashboard の3画面を query/params から構成する', () => {
  it('作成・一覧・詳細 page が tenant/workspace/id を子画面へ渡す', async () => {
    const intake = renderToStaticMarkup(
      <UiProvider>
        {
          await HearingIntakePage({
            searchParams: Promise.resolve({ tenant: 'tenant-a', workspace: 'workspace-a' }),
          })
        }
      </UiProvider>,
    );
    const list = renderToStaticMarkup(
      <UiProvider>
        {
          await HearingSheetsPage({
            searchParams: Promise.resolve({ tenant: 'tenant-a', workspace: 'workspace-a' }),
          })
        }
      </UiProvider>,
    );
    const detail = renderToStaticMarkup(
      <UiProvider>
        {
          await HearingSheetDetailPage({
            params: Promise.resolve({ id: 'sheet-1' }),
            searchParams: Promise.resolve({ tenant: 'tenant-a', workspace: 'workspace-a' }),
          })
        }
      </UiProvider>,
    );

    expect(intake).toContain('業務の困りごとを登録');
    expect(list).toContain('/sheets/new?tenant=tenant-a&amp;workspace=workspace-a');
    expect(detail).toContain('読み込み中です');
    expect(detail).toContain('@media print');
  });
});
