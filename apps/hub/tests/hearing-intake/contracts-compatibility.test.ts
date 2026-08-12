import {
  createSheetRequestSchema,
  decodeStoredHearingSheetFormSnapshot,
  decodeStoredSheetGenerationPayload,
  HEARING_HANDOFF_TEXT_MAX_LENGTH,
  HEARING_HANDOFF_TEXT_TRUNCATION_MARKER,
  hearingSharePayloadSchema,
} from '@harness-hub/schemas';
import { describe, expect, it } from 'vitest';

const CURRENT_FORM = {
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
  priority: 'high' as const,
  usagePurpose: 'app_development' as const,
  expertise: 'novice' as const,
  role: 'employee' as const,
  context: 'business' as const,
  motivation: 'efficiency' as const,
  sharingIntent: 'small_group' as const,
  constraintTags: [],
  shareTarget: 'チーム内',
  knowledgeAssets: ['経理マニュアル'],
  requestPatterns: [],
  integrationTools: [],
  existingDataSources: [],
  referenceUrls: [],
};

const LEGACY_V1_SNAPSHOT = {
  taskName: '請求書処理',
  company: 'サンプル社',
  applicant: '山田',
  domain: '経理',
  issue: '手入力が多い',
  tools: '表計算',
  hours: 40,
  people: 5,
  features: 'OCR と確認画面',
  output: 'CSV',
  priority: 'high' as const,
};

describe('HI-SCHEMA: 選択軸の相関制約', () => {
  it('unknown・none の排他と配列の重複を API 境界で拒否する', () => {
    expect(
      createSheetRequestSchema.safeParse({
        ...CURRENT_FORM,
        constraintTags: ['unknown', 'time'],
      }).success,
    ).toBe(false);
    expect(
      createSheetRequestSchema.safeParse({
        ...CURRENT_FORM,
        requestPatterns: ['unknown', 'automation'],
      }).success,
    ).toBe(false);
    expect(
      createSheetRequestSchema.safeParse({
        ...CURRENT_FORM,
        requestPatterns: ['data_digitization'],
        existingDataSources: ['none', 'spreadsheet'],
      }).success,
    ).toBe(false);
    expect(
      createSheetRequestSchema.safeParse({
        ...CURRENT_FORM,
        knowledgeAssets: ['経理マニュアル', '経理マニュアル'],
      }).success,
    ).toBe(false);
  });

  it('requestPatterns の親子関係・other 補足・hidden stale field を拒否する', () => {
    expect(
      createSheetRequestSchema.safeParse({
        ...CURRENT_FORM,
        requestPatterns: ['integration'],
        integrationTools: [],
      }).success,
    ).toBe(false);
    expect(
      createSheetRequestSchema.safeParse({
        ...CURRENT_FORM,
        requestPatterns: ['integration'],
        integrationTools: ['other'],
      }).success,
    ).toBe(false);
    expect(
      createSheetRequestSchema.safeParse({
        ...CURRENT_FORM,
        integrationToolsOther: '社内ツール',
      }).success,
    ).toBe(false);
    expect(
      createSheetRequestSchema.safeParse({
        ...CURRENT_FORM,
        automationDescription: '毎朝実行',
      }).success,
    ).toBe(false);
    expect(
      createSheetRequestSchema.safeParse({
        ...CURRENT_FORM,
        requestPatterns: ['integration', 'automation'],
        integrationTools: ['other'],
        integrationToolsOther: '社内ツール',
        automationDescription: '毎朝実行',
      }).success,
    ).toBe(true);
  });

  it('参考 URL は HTTPS のみを受け付け、同一 URL の重複を拒否する', () => {
    expect(
      createSheetRequestSchema.safeParse({
        ...CURRENT_FORM,
        referenceUrls: [{ url: 'http://example.com' }],
      }).success,
    ).toBe(false);
    expect(
      createSheetRequestSchema.safeParse({
        ...CURRENT_FORM,
        referenceUrls: [{ url: 'https://example.com' }, { url: 'https://example.com' }],
      }).success,
    ).toBe(false);
    expect(
      createSheetRequestSchema.safeParse({
        ...CURRENT_FORM,
        referenceUrls: [{ url: 'https://example.com' }],
      }).success,
    ).toBe(true);
  });
});

describe('HI-SCHEMA: 保存 snapshot の後方互換 decoder', () => {
  it('旧 11 項目を現行 snapshot へ正規化し、salary を生成・保持しない', () => {
    const decoded = decodeStoredHearingSheetFormSnapshot(LEGACY_V1_SNAPSHOT);

    expect(decoded).toMatchObject({
      usagePurpose: 'unknown',
      expertise: 'unknown',
      role: 'unknown',
      context: 'unknown',
      motivation: 'unknown',
      sharingIntent: 'unknown',
      constraintTags: [],
      requestPatterns: [],
      integrationTools: [],
      existingDataSources: [],
      referenceUrls: [],
    });
    expect(decoded.knowledgeAssets).toHaveLength(1);
    expect(decoded).not.toHaveProperty('salary');
  });

  it('新規 request は旧 11 項目を受理せず、部分移行・salary 付き保存値も decoder が拒否する', () => {
    expect(createSheetRequestSchema.safeParse(LEGACY_V1_SNAPSHOT).success).toBe(false);
    expect(() => decodeStoredHearingSheetFormSnapshot({ ...LEGACY_V1_SNAPSHOT, usagePurpose: 'unknown' })).toThrow();
    expect(() => decodeStoredHearingSheetFormSnapshot({ ...LEGACY_V1_SNAPSHOT, salary: 6_000_000 })).toThrow();
  });

  it('旧 form を含む ai_jobs payload だけを正規化し、envelope の未知キーは拒否する', () => {
    const payload = {
      sheet_id: 'sheet-1',
      sheet_code: 'HS-0001',
      form: LEGACY_V1_SNAPSHOT,
      estimate: { savedHoursPerYear: 840, savedAmountPerYear: 2_520_000 },
    };

    expect(decodeStoredSheetGenerationPayload(payload).form.usagePurpose).toBe('unknown');
    expect(() => decodeStoredSheetGenerationPayload({ ...payload, stale: true })).toThrow();
  });
});

describe('HI-SCHEMA: handoff_text の明示的省略', () => {
  it('20,000 文字を超える入力を marker 付きで上限内へ切り詰める', () => {
    const { salary: _salary, ...snapshot } = CURRENT_FORM;
    const parsed = hearingSharePayloadSchema.parse({
      sheet_code: 'HS-0001',
      audience: 'harness_creator',
      form_snapshot: snapshot,
      estimate_snapshot: {
        savedMinutesPerYear: 50_400,
        savedHoursPerYear: 840,
        savedAmountPerYear: 2_520_000,
      },
      generated_sections: null,
      reference_urls: [],
      screenshots: [],
      handoff_text: 'あ'.repeat(HEARING_HANDOFF_TEXT_MAX_LENGTH + 1),
      expires_at: 1_800_000_000_000,
    });

    expect(parsed.handoff_text).toHaveLength(HEARING_HANDOFF_TEXT_MAX_LENGTH);
    expect(parsed.handoff_text.endsWith(HEARING_HANDOFF_TEXT_TRUNCATION_MARKER)).toBe(true);
  });

  it('共有APIの時刻へepoch秒を混入させない', () => {
    const { salary: _salary, ...snapshot } = CURRENT_FORM;
    const payload = {
      sheet_code: 'HS-0001',
      audience: 'harness_creator',
      form_snapshot: snapshot,
      estimate_snapshot: {
        savedMinutesPerYear: 50_400,
        savedHoursPerYear: 840,
        savedAmountPerYear: 2_520_000,
      },
      generated_sections: null,
      reference_urls: [],
      screenshots: [],
      handoff_text: '共有内容',
      expires_at: 1_800_000_000,
    };

    expect(hearingSharePayloadSchema.safeParse(payload).success).toBe(false);
    expect(hearingSharePayloadSchema.safeParse({ ...payload, expires_at: 1_800_000_000_000 }).success).toBe(true);
  });
});
