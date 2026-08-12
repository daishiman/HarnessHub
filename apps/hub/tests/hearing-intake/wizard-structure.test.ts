import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createSheetRequestSchema, type HearingSheetFormInput } from '@harness-hub/schemas';
import { describe, expect, it } from 'vitest';

import {
  canProceedAtStep,
  collectUnknownFields,
  INITIAL_HEARING_FORM,
  toggleExistingDataSourceOnForm,
  toggleIntegrationToolOnForm,
  toggleRequestPatternOnForm,
  toggleWithExclusiveValue,
} from '../../src/app/(dashboard)/sheets/new/hearing-intake-wizard-model.js';

describe('HI-WIZARD: 分割後の構造と初期値', () => {
  it('30項目schemaを正本にし、選択式8軸は明示的なunknownから始める', () => {
    expect(Object.keys(createSheetRequestSchema.shape)).toHaveLength(30);
    expect([
      INITIAL_HEARING_FORM.usagePurpose,
      INITIAL_HEARING_FORM.expertise,
      INITIAL_HEARING_FORM.role,
      INITIAL_HEARING_FORM.context,
      INITIAL_HEARING_FORM.motivation,
      INITIAL_HEARING_FORM.sharingIntent,
    ]).toEqual(Array.from({ length: 6 }, () => 'unknown'));
    expect(INITIAL_HEARING_FORM.constraintTags).toEqual(['unknown']);
    expect(INITIAL_HEARING_FORM.requestPatterns).toEqual(['unknown']);
    expect(collectUnknownFields(INITIAL_HEARING_FORM)).toHaveLength(8);
  });

  it('unknown と具体値の排他切替を維持する', () => {
    expect(toggleWithExclusiveValue(['unknown'], 'time', 'unknown')).toEqual(['time']);
    expect(toggleWithExclusiveValue(['time'], 'unknown', 'unknown')).toEqual(['unknown']);
    expect(toggleWithExclusiveValue(['unknown'], 'unknown', 'unknown')).toEqual([]);
  });

  it('親を外すと非表示の子項目を消し、none を他のデータ種別と排他にする', () => {
    const withChildren: HearingSheetFormInput = {
      ...INITIAL_HEARING_FORM,
      requestPatterns: ['integration', 'automation', 'data_digitization'],
      integrationTools: ['other'],
      integrationToolsOther: '社内ツール',
      automationDescription: '毎朝集計する',
      existingDataSources: ['spreadsheet', 'other'],
      existingDataSourcesOther: '台帳',
    };

    const withoutIntegration = toggleRequestPatternOnForm(withChildren, 'integration');
    expect(withoutIntegration.integrationTools).toEqual([]);
    expect(withoutIntegration.integrationToolsOther).toBeUndefined();

    const withoutOtherTool = toggleIntegrationToolOnForm(withChildren, 'other');
    expect(withoutOtherTool.integrationToolsOther).toBeUndefined();

    const onlyNone = toggleExistingDataSourceOnForm(withChildren, 'none');
    expect(onlyNone.existingDataSources).toEqual(['none']);
    expect(onlyNone.existingDataSourcesOther).toBeUndefined();
  });

  it('条件付きの必須項目が空なら要望パターン画面から進めない', () => {
    expect(
      canProceedAtStep({ ...INITIAL_HEARING_FORM, requestPatterns: ['integration'], integrationTools: [] }, 3),
    ).toBe(false);
    expect(
      canProceedAtStep(
        {
          ...INITIAL_HEARING_FORM,
          requestPatterns: ['integration'],
          integrationTools: ['other'],
          integrationToolsOther: '社内ツール',
        },
        3,
      ),
    ).toBe(true);
  });

  it('分割した手書き実装ファイルはすべて500行以下', () => {
    const files = [
      'hearing-intake-wizard.tsx',
      'hearing-intake-wizard-model.ts',
      'hearing-intake-wizard-state.ts',
      'hearing-intake-wizard-steps.tsx',
    ];

    for (const file of files) {
      const source = readFileSync(resolve(process.cwd(), `src/app/(dashboard)/sheets/new/${file}`), 'utf8');
      expect(source.split('\n').length, file).toBeLessThanOrEqual(500);
    }
  });
});
