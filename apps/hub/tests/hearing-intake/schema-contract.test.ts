// P04 テストスタブ (SYS-HEARING-INTAKE-P04)
// HI-SCHEMA-* : HearingSheet/FormData と ai_jobs consumer の入出力検証 (AD-2 / AD-9)
// HI-D4-*     : tenant_id / workspace_id スコープ列の分離 (qa-024 / D4)
//
// 実 schema (packages/schemas/hearing-intake/) の追加は P05 の責務なので、
// ここでは「P05 が満たすべき形」を宣言的データと参照実装で固定する。
// ただし共通プリミティブ (tenantIdSchema 等) と共通 registry は既に存在するので、
// それらに対する検証は今すぐ実行し、机上の契約で終わらせない。

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CURRENT_HEARING_SHEET_FORM_SNAPSHOT_VERSION,
  contractSchemaNames,
  createHearingSheetFormSnapshot,
  createSheetRequestSchema,
  HEARING_SHEET_FORM_LIMITS,
  hearingSheetFormInputSchema,
  hearingSheetFormSnapshotSchema,
  identifierSchema,
  normalizeHearingSheetFormSnapshot,
  problemDetails,
  sheetDetailSchema,
  sheetListQuerySchema,
  tenantIdSchema,
  workspaceIdSchema,
} from '@harness-hub/schemas';
import { describe, expect, it } from 'vitest';

// ---------------------------------------------------------------------------
// (A) FormData 12 項目 → form_json 11 項目の導出 (AD-2 / AD-9 / OPEN-2)
// ---------------------------------------------------------------------------

/**
 * ウィザードが送る `HearingSheetFormInput` の 21 項目 (backend-spec §4.3 の 12 項目 +
 * skill-intake 由来の用途プロファイル 9 項目)。
 */
const FORM_INPUT_FIELDS = [
  'taskName',
  'company',
  'applicant',
  'domain',
  'issue',
  'tools',
  'hours',
  'people',
  'salary',
  'features',
  'output',
  'priority',
  'usagePurpose',
  'expertise',
  'role',
  'context',
  'motivation',
  'sharingIntent',
  'constraintTags',
  'shareTarget',
  'knowledgeAssets',
] as const;

/** 保存しない項目。年収は PII (SEC4) で、試算後は保持する必要が無い (P03 判定・OPEN-2)。 */
const OMITTED_FROM_SNAPSHOT = ['salary'] as const;

/** 現行 snapshot は request から salary を除き、保存形式の version を加えて導出する。 */
const FORM_SNAPSHOT_FIELDS = [
  'schemaVersion',
  ...FORM_INPUT_FIELDS.filter((field) => !(OMITTED_FROM_SNAPSHOT as readonly string[]).includes(field)),
] as const;

/** zod で課す境界 (AD-6)。`hours`/`people` の上限は runsPerYear の上限から逆算した値。 */
const NUMERIC_BOUNDS = {
  hours: { min: 1, max: 160, integer: true },
  people: { min: 1, max: 500, integer: true },
  salary: { min: 0, max: 100_000_000, integer: true },
} as const;

type NumericField = keyof typeof NUMERIC_BOUNDS;

/** P05 の zod schema が満たすべき判定。zod 実体が無い段階でも境界の意味を固定できる。 */
function validateNumeric(field: NumericField, value: number): boolean {
  const bound = NUMERIC_BOUNDS[field];
  if (bound.integer && !Number.isInteger(value)) return false;
  return value >= bound.min && value <= bound.max;
}

describe('HI-SCHEMA: FormData の契約 (AD-2 / AD-9)', () => {
  it('HI-SCHEMA-001: 入力は 21 項目、現行 snapshot は salary を除いて version を足した 21 項目になる', () => {
    expect(FORM_INPUT_FIELDS).toHaveLength(21);
    expect(FORM_SNAPSHOT_FIELDS).toHaveLength(21);
    expect(FORM_SNAPSHOT_FIELDS).not.toContain('salary');
  });

  it('HI-SCHEMA-002: snapshot は入力からの omit 導出であり、独立に列挙されていない', () => {
    // 導出元へ項目を足したら snapshot 側も必ず増える = 追従漏れが構造的に起きない
    const extended = [
      'schemaVersion',
      ...[...FORM_INPUT_FIELDS, 'newField'].filter(
        (field) => !(OMITTED_FROM_SNAPSHOT as readonly string[]).includes(field),
      ),
    ];

    expect(extended).toHaveLength(22);
    expect(extended).toContain('newField');
  });

  it('HI-SCHEMA-003: 数値項目の境界が AD-6 の逆算値と一致し、境界の内外で判定が変わる', () => {
    expect(NUMERIC_BOUNDS.hours.max * NUMERIC_BOUNDS.people.max * 12).toBe(960_000);

    expect(validateNumeric('hours', 1)).toBe(true);
    expect(validateNumeric('hours', 160)).toBe(true);
    expect(validateNumeric('hours', 0)).toBe(false);
    expect(validateNumeric('hours', 161)).toBe(false);
    // 整数制約は試算側では捕まらない (estimation-adapter.test.ts HI-EST-007) ので zod 側で必須
    expect(validateNumeric('hours', 7.5)).toBe(false);
    expect(validateNumeric('people', 500)).toBe(true);
    expect(validateNumeric('people', 501)).toBe(false);
    expect(validateNumeric('salary', 0)).toBe(true);
    expect(validateNumeric('salary', -1)).toBe(false);
  });

  it('HI-SCHEMA-004: 検証失敗は RFC 9457 の errors[] へフィールド単位で載る (AD-9)', () => {
    const problem = problemDetails({
      title: '入力内容を確認してください',
      status: 422,
      errors: [
        { field: 'hours', code: 'too_big', message: '月間工数は 160 時間以下で入力してください' },
        { field: 'people', code: 'too_small', message: '対象人数は 1 人以上で入力してください' },
      ],
    });

    expect(problem.status).toBe(422);
    expect(problem.type).toBe('about:blank');
    expect(problem.errors?.map((error) => error.field)).toEqual(['hours', 'people']);
  });

  it('HI-SCHEMA-005: hearing 固有契約を共通 registry へ登録しない (責務境界・AD-9)', () => {
    // packages/schemas の registry は共通プリミティブと共通エンベロープまでが責務。
    // 業務ドメイン契約は auth-tenancy と同じく別サブパッケージから再エクスポートする
    const registered: readonly string[] = contractSchemaNames;

    for (const name of ['HearingSheetFormInput', 'HearingSheetFormSnapshot', 'SheetGenerationPayload']) {
      expect(registered).not.toContain(name);
    }
    // 登録簿が空で緑化していないことの確認
    expect(registered.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// (B) D4: tenant_id / workspace_id スコープ列の分離 (qa-024)
// ---------------------------------------------------------------------------

/** 本 feature が触る 4 テーブルのスコープ列 (backend-spec §2.3 / ADR AD-1)。 */
const SCOPE_COLUMNS: Readonly<Record<string, readonly string[]>> = {
  hearing_sheets: ['tenant_id', 'workspace_id'],
  ai_jobs: ['tenant_id', 'workspace_id'],
  display_code_counters: ['tenant_id'],
  tenant_coefficients: ['tenant_id'],
};

interface ScopedRow {
  readonly id: string;
  readonly tenantId: string;
  readonly workspaceId: string | null;
}

const ROWS: readonly ScopedRow[] = [
  { id: 'sheet-a1', tenantId: 'tenant-a', workspaceId: 'ws-1' },
  { id: 'sheet-a2', tenantId: 'tenant-a', workspaceId: 'ws-2' },
  { id: 'sheet-b1', tenantId: 'tenant-b', workspaceId: 'ws-1' },
];

/** D4 は行レベル分離。読み取りは必ず tenant_id で絞る (アプリ側の後追い除外に頼らない)。 */
function scopeToTenant(rows: readonly ScopedRow[], tenantId: string): readonly ScopedRow[] {
  return rows.filter((row) => row.tenantId === tenantId);
}

describe('HI-D4: tenant/workspace スコープ列の分離 (qa-024)', () => {
  it('HI-D4-001: 本 feature が触る 4 テーブルすべてに tenant_id がある', () => {
    for (const [table, columns] of Object.entries(SCOPE_COLUMNS)) {
      expect({ table, hasTenantId: columns.includes('tenant_id') }).toEqual({ table, hasTenantId: true });
    }
    expect(Object.keys(SCOPE_COLUMNS)).toHaveLength(4);
  });

  it('HI-D4-002: スコープ列の値が共通プリミティブ schema を満たす', () => {
    // 素の string ではなく共通 schema (brand 型) を経由することで、
    // tenant_id と workspace_id の取り違えを型で防ぐ (primitives.ts の設計意図)
    expect(tenantIdSchema.safeParse('tenant-a').success).toBe(true);
    expect(workspaceIdSchema.safeParse('ws-1').success).toBe(true);
    // path segment に置けない値は弾く = 検証が実際に効いている
    expect(identifierSchema.safeParse('../etc/passwd').success).toBe(false);
    expect(tenantIdSchema.safeParse('').success).toBe(false);
  });

  it('HI-D4-003: テナントで絞った読み取りに他テナントの行が混ざらない', () => {
    const visible = scopeToTenant(ROWS, 'tenant-a');

    expect(visible.map((row) => row.id)).toEqual(['sheet-a1', 'sheet-a2']);
    // 「常に空を返す」実装で緑化しないための確認
    expect(visible.length).toBeGreaterThan(0);
    expect(scopeToTenant(ROWS, 'tenant-b').map((row) => row.id)).toEqual(['sheet-b1']);
  });

  it('HI-D4-004: workspace_id が同値でもテナントが違えば混ざらない', () => {
    // ws-1 は tenant-a にも tenant-b にも存在する。workspace だけで絞ると越境する
    const byWorkspaceOnly = ROWS.filter((row) => row.workspaceId === 'ws-1');
    expect(byWorkspaceOnly).toHaveLength(2);

    const byTenantAndWorkspace = scopeToTenant(ROWS, 'tenant-a').filter((row) => row.workspaceId === 'ws-1');
    expect(byTenantAndWorkspace.map((row) => row.id)).toEqual(['sheet-a1']);
  });
});

// --- 以下は P05 実装を対象とする受入契約 (P06 で実行対象へ昇格させる) ---

describe('HI-SCHEMA / HI-D4: P05 実装後の受入契約', () => {
  const validForm = {
    taskName: '請求書処理',
    company: 'サンプル社',
    applicant: '山田',
    domain: '経理',
    issue: '転記が多い',
    tools: '表計算',
    hours: 40,
    people: 5,
    salary: 6_000_000,
    features: 'OCR',
    output: 'CSV',
    priority: 'high' as const,
    usagePurpose: 'app_development' as const,
    expertise: 'intermediate' as const,
    role: 'employee' as const,
    context: 'business' as const,
    motivation: 'efficiency' as const,
    sharingIntent: 'small_group' as const,
    constraintTags: ['time', 'budget'] as const,
    shareTarget: 'チーム内',
    knowledgeAssets: ['過去の経理マニュアル'],
  };

  it('HI-SCHEMA-101: hearing schema が @harness-hub/schemas の単一入口から利用できる', () => {
    expect(hearingSheetFormInputSchema.parse(validForm)).toEqual(validForm);
  });

  it('HI-SCHEMA-102: snapshot が入力の omit で導出され salary を拒否する', () => {
    const source = readFileSync(resolve(process.cwd(), '../../packages/schemas/hearing-intake/contracts.ts'), 'utf8');
    expect(source).toContain('hearingSheetFormInputSchema.omit({ salary: true })');
    const snapshot = createHearingSheetFormSnapshot(hearingSheetFormInputSchema.parse(validForm));
    expect(snapshot.schemaVersion).toBe(CURRENT_HEARING_SHEET_FORM_SNAPSHOT_VERSION);
    expect(Object.keys(snapshot)).toHaveLength(21);
    expect(snapshot).not.toHaveProperty('salary');
    expect(hearingSheetFormSnapshotSchema.safeParse(validForm).success).toBe(false);
  });

  it('HI-SCHEMA-102b: 旧 11 項目 fixture は version 1 と null（当時は未回答）へ正規化する', () => {
    const legacySnapshot = {
      taskName: validForm.taskName,
      company: validForm.company,
      applicant: validForm.applicant,
      domain: validForm.domain,
      issue: validForm.issue,
      tools: validForm.tools,
      hours: validForm.hours,
      people: validForm.people,
      features: validForm.features,
      output: validForm.output,
      priority: validForm.priority,
    };

    expect(normalizeHearingSheetFormSnapshot(legacySnapshot)).toEqual({
      schemaVersion: 1,
      ...legacySnapshot,
      usagePurpose: null,
      expertise: null,
      role: null,
      context: null,
      motivation: null,
      sharingIntent: null,
      constraintTags: null,
      shareTarget: null,
      knowledgeAssets: null,
    });
  });

  it('HI-SCHEMA-102c: version 無しの現行 20 項目も version 2 へ読み上げる', () => {
    const { salary: _salary, ...unversionedSnapshot } = validForm;
    expect(normalizeHearingSheetFormSnapshot(unversionedSnapshot)).toEqual({
      schemaVersion: CURRENT_HEARING_SHEET_FORM_SNAPSHOT_VERSION,
      ...unversionedSnapshot,
    });
  });

  it('HI-SCHEMA-103: CreateSheetRequest は未知キーとクライアント計算額を拒否する', () => {
    expect(createSheetRequestSchema.safeParse({ ...validForm, savedAmountPerYear: 123 }).success).toBe(false);
  });

  it('HI-SCHEMA-103b: 共有相手とナレッジ資産は UI と共有する上限で境界判定する', () => {
    const shortMax = HEARING_SHEET_FORM_LIMITS.shortTextLength;
    const assetsMax = HEARING_SHEET_FORM_LIMITS.knowledgeAssets;

    expect(createSheetRequestSchema.safeParse({ ...validForm, shareTarget: 'a'.repeat(shortMax) }).success).toBe(true);
    expect(createSheetRequestSchema.safeParse({ ...validForm, shareTarget: 'a'.repeat(shortMax + 1) }).success).toBe(
      false,
    );
    expect(
      createSheetRequestSchema.safeParse({ ...validForm, knowledgeAssets: Array(assetsMax).fill('資料') }).success,
    ).toBe(true);
    expect(
      createSheetRequestSchema.safeParse({ ...validForm, knowledgeAssets: Array(assetsMax + 1).fill('資料') }).success,
    ).toBe(false);
    expect(
      createSheetRequestSchema.safeParse({ ...validForm, knowledgeAssets: ['a'.repeat(shortMax + 1)] }).success,
    ).toBe(false);
  });

  it('HI-SCHEMA-104: SheetDetail の form_snapshot と応答ルートに salary が現れない', () => {
    const snapshot = createHearingSheetFormSnapshot(hearingSheetFormInputSchema.parse(validForm));
    const candidate = {
      id: 'sheet-1',
      code: 'HS-0001',
      status: 'review',
      title: validForm.taskName,
      applicant: { id: 'user-1', name: '山田' },
      department: '経理',
      form_snapshot: snapshot,
      estimate_snapshot: { savedMinutesPerYear: 60, savedHoursPerYear: 1, savedAmountPerYear: 3_000 },
      generated_sections: null,
      created_at: 1,
      updated_at: 1,
      ai_job_status: 'completed',
      build_ref: null,
      publish_request_ref: null,
      can_manage: false,
    };
    expect(sheetDetailSchema.parse(candidate).form_snapshot).not.toHaveProperty('salary');
    expect(
      sheetDetailSchema.safeParse({
        ...candidate,
        form_snapshot: { ...snapshot, salary: validForm.salary },
      }).success,
    ).toBe(false);
  });

  it('HI-SCHEMA-105: GET /sheets は共通 cursor/limit 境界を継承する', () => {
    expect(sheetListQuerySchema.parse({ cursor: 'sheet-1', limit: '100' })).toMatchObject({
      cursor: 'sheet-1',
      limit: 100,
    });
    expect(sheetListQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
  });

  it('HI-D4-101: hearing repository の各検索条件が tenantId を必須注入する', () => {
    const source = [
      readFileSync(resolve(process.cwd(), '../../packages/db/repository/hearing-intake.ts'), 'utf8'),
      readFileSync(resolve(process.cwd(), '../../packages/db/repository/hearing-intake-queue.ts'), 'utf8'),
    ].join('\n');
    expect(source).toContain('eq(hearingSheets.tenantId, context.tenantId)');
    expect(source).toContain('eq(aiJobs.tenantId, context.tenantId)');
    expect(source).toContain('eq(aiJobs.workspaceId, workspaceId)');
    expect(source).toContain('eq(tenantCoefficients.tenantId, context.tenantId)');
    expect(source).toContain('eq(displayCodeCounters.tenantId, tenantId)');
  });

  it('HI-D4-102: ID 詳細 route は要求 tenant で repository を引き、認可 wrapper で 404 境界を作る', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app/api/v1/sheets/[id]/route.ts'), 'utf8');
    expect(source).toContain('requestScopedResource');
    expect(source).toContain('createRepositoryContext({ tenantId: base.tenantId })');
    expect(source).toContain("action: 'sheets.read_own'");
  });

  it('HI-D4-103: counter の主キーと CAS 条件が tenant_id + kind で独立する', () => {
    const migration = readFileSync(
      resolve(process.cwd(), '../../packages/db/migrations/0002_hearing-intake-ai-queue.sql'),
      'utf8',
    );
    const repository = readFileSync(resolve(process.cwd(), '../../packages/db/repository/hearing-intake.ts'), 'utf8');
    expect(migration).toContain('PRIMARY KEY(`tenant_id`, `kind`)');
    expect(repository).toContain('eq(displayCodeCounters.tenantId, tenantId)');
    expect(repository).toContain("eq(displayCodeCounters.kind, 'HS')");
  });
});
