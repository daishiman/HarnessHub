import { HEARING_SHEET_FORM_LIMITS, type HearingSheetFormInput } from '@harness-hub/schemas';
import { describe, expect, it } from 'vitest';

import {
  hearingIntakeStepIsValid,
  informationSourcesValidationError,
  knowledgeAssetsValidationError,
} from '../../src/features/hearing-intake/wizard-validation.js';

const VALID_FORM: HearingSheetFormInput = {
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
  informationSources: ['会計システム'],
  trueProblem: '単純転記に時間を奪われ、例外判断へ集中できないこと',
  knowledgeAssets: ['経理マニュアル'],
};

describe('HI-WIZARD-VALIDATION: POST 前の schema 境界', () => {
  it('全 23 項目が有効なら各ステップと最終確認を通す', () => {
    for (const index of [0, 1, 2, 3, 4]) {
      expect(hearingIntakeStepIsValid(VALID_FORM, index)).toBe(true);
    }
  });

  it('任意 profile は null を許容し、null と回答済み 0 件を区別する', () => {
    expect(
      hearingIntakeStepIsValid(
        {
          ...VALID_FORM,
          usagePurpose: null,
          shareTarget: null,
          informationSources: null,
          trueProblem: null,
          knowledgeAssets: null,
        },
        2,
      ),
    ).toBe(true);
    expect(hearingIntakeStepIsValid({ ...VALID_FORM, informationSources: [], knowledgeAssets: [] }, 2)).toBe(true);
  });

  it('共有相手は 200 文字を通し 201 文字を用途プロファイル step で止める', () => {
    const max = HEARING_SHEET_FORM_LIMITS.shortTextLength;
    expect(hearingIntakeStepIsValid({ ...VALID_FORM, shareTarget: 'a'.repeat(max) }, 2)).toBe(true);
    expect(hearingIntakeStepIsValid({ ...VALID_FORM, shareTarget: 'a'.repeat(max + 1) }, 2)).toBe(false);
  });

  it('情報源は 10 件・各 200 文字までとし、理由を入力欄へ返す', () => {
    const maxItems = HEARING_SHEET_FORM_LIMITS.informationSources;
    const maxLength = HEARING_SHEET_FORM_LIMITS.shortTextLength;
    expect(hearingIntakeStepIsValid({ ...VALID_FORM, informationSources: Array(maxItems).fill('資料') }, 2)).toBe(true);

    const tooMany = Array(maxItems + 1).fill('資料');
    expect(hearingIntakeStepIsValid({ ...VALID_FORM, informationSources: tooMany }, 2)).toBe(false);
    expect(informationSourcesValidationError(tooMany)).toContain(`${maxItems} 件以内`);

    const tooLong = ['a'.repeat(maxLength + 1)];
    expect(hearingIntakeStepIsValid({ ...VALID_FORM, informationSources: tooLong }, 2)).toBe(false);
    expect(informationSourcesValidationError(tooLong)).toContain(`${maxLength} 文字以内`);
  });

  it('ナレッジ資産は 10 件・各 200 文字までとし、理由を入力欄へ返す', () => {
    const maxItems = HEARING_SHEET_FORM_LIMITS.knowledgeAssets;
    const maxLength = HEARING_SHEET_FORM_LIMITS.shortTextLength;
    expect(hearingIntakeStepIsValid({ ...VALID_FORM, knowledgeAssets: Array(maxItems).fill('資料') }, 2)).toBe(true);

    const tooMany = Array(maxItems + 1).fill('資料');
    expect(hearingIntakeStepIsValid({ ...VALID_FORM, knowledgeAssets: tooMany }, 2)).toBe(false);
    expect(knowledgeAssetsValidationError(tooMany)).toContain(`${maxItems} 件以内`);

    const tooLong = ['a'.repeat(maxLength + 1)];
    expect(hearingIntakeStepIsValid({ ...VALID_FORM, knowledgeAssets: tooLong }, 2)).toBe(false);
    expect(knowledgeAssetsValidationError(tooLong)).toContain(`${maxLength} 文字以内`);
  });

  it('数値上限と長文上限も該当 step と最終確認の両方で止める', () => {
    expect(hearingIntakeStepIsValid({ ...VALID_FORM, salary: 100_000_001 }, 1)).toBe(false);
    expect(
      hearingIntakeStepIsValid(
        { ...VALID_FORM, features: 'a'.repeat(HEARING_SHEET_FORM_LIMITS.requiredTextLength + 1) },
        3,
      ),
    ).toBe(false);
    expect(hearingIntakeStepIsValid({ ...VALID_FORM, salary: 100_000_001 }, 4)).toBe(false);
  });
});
