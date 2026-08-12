/**
 * ウィザードの「目安」が、サーバの正式計算と食い違わないことの固定。
 *
 * 画面の目安と送信後の結果は別の場所で計算されるので、放っておくと片方だけ直されて
 * 「入力時は 20 時間と出たのに、登録したら別の数字になった」が起きる。
 * ここでは (1) 既定の係数が DB の既定値と同じであること、
 * (2) 目安の式が年換算するとサーバの結果と一致すること、の 2 点を突き合わせる。
 */
import { DEFAULT_TENANT_COEFFICIENT_VALUES } from '@harness-hub/db';
import { describe, expect, it } from 'vitest';

import { estimateHearingSheet } from '../../src/features/hearing-intake/estimation-adapter/index.js';
import { DEFAULT_SHEET_REDUCTION_RATE, previewMonthlySavedHours } from '../../src/shared/estimation/wizard-preview.js';

const MONTHS_PER_YEAR = 12;

describe('HI-PREVIEW: ウィザードの削減時間の目安', () => {
  it('HI-PREVIEW-001: 画面が持つ既定の削減率は、DB の既定値の写しである', () => {
    // 写しがズレると、設定を一度も保存していないテナントで
    // 「目安」と「登録後の結果」が別の前提で計算されることになる。
    expect(DEFAULT_SHEET_REDUCTION_RATE).toBe(DEFAULT_TENANT_COEFFICIENT_VALUES.sheetReductionRate);
  });

  it('HI-PREVIEW-002: 目安の式は、サーバの年間計算を 12 で割ったものと一致する', () => {
    const coefficients = {
      annualHours: DEFAULT_TENANT_COEFFICIENT_VALUES.annualHours,
      sheetReductionRate: DEFAULT_TENANT_COEFFICIENT_VALUES.sheetReductionRate,
    };
    // 端数が出る組み合わせも混ぜる (きれいな数字だけだと式の違いが打ち消されて見えない)
    for (const form of [
      { hours: 10, people: 3, salary: 6_000_000 },
      { hours: 7, people: 1, salary: 4_800_000 },
      { hours: 160, people: 12, salary: 9_000_000 },
    ]) {
      const server = estimateHearingSheet(form, coefficients);
      const preview = previewMonthlySavedHours(form, DEFAULT_SHEET_REDUCTION_RATE);

      expect(preview).toBeCloseTo(server.savedHoursPerYear / MONTHS_PER_YEAR, 5);
    }
  });

  it('HI-PREVIEW-003: 削減率を変えれば目安も変わる (率が計算に効いている)', () => {
    // 率を無視した実装 (例: 定数を掛け忘れる) でも 001/002 は通り得るため、
    // 率が結果へ効いていること自体を別に押さえる。
    const form = { hours: 10, people: 2 };
    expect(previewMonthlySavedHours(form, 0.5)).toBe(10);
    expect(previewMonthlySavedHours(form, 0.25)).toBe(5);
  });
});
