// P04 テストスタブ (SYS-HEARING-INTAKE-P04)
// HI-EST-*: 試算のサーバ計算限定 (SEC5) と、ADR AD-6 の写像が backend-spec §6.2 の式と一致することを検証する。
//
// 実装 (apps/hub/src/features/hearing-intake/estimation-adapter/) は P05 で追加される。
// P05 の受入契約は P06 で全て実行テストへ昇格済み。
// 一方、写像そのものの正しさは @harness-hub/estimation の公開 API だけで今すぐ検証できるため、
// 「実装待ちだから何も検証しない」状態を作らずここで固定する。

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ESTIMATION_LIMITS, EstimationInputError, estimateSavings } from '@harness-hub/estimation';
import { createSheetRequestSchema } from '@harness-hub/schemas';
import { describe, expect, it } from 'vitest';
import { estimateHearingSheet } from '../../src/features/hearing-intake/estimation-adapter/index.js';

/** tenant_coefficients の既定値 (backend-spec §2.3)。 */
const COEFFICIENTS = {
  annual_hours: 2000,
  /**
   * metrics-tracking の savedMinutes 用の係数 (§6.2)。
   * sheetEstimate では使わない。AD-6 の minutesPerRun と同名別物なので定数として持ち込む。
   */
  minutes_per_run: 15,
  sheet_reduction_rate: 0.35,
} as const;

/** FormData の zod 制約 (ADR AD-6)。runsPerYear の上限を守るために設ける。 */
const FORM_LIMITS = {
  hours: { min: 1, max: 160 },
  people: { min: 1, max: 500 },
} as const;

/** AD-6 の写像。1 run = 「1 人が 1 時間行う業務」と定義するため minutesPerRun は入力に依存しない定数。 */
const MINUTES_PER_RUN = 60;

/** ADR AD-6 が定める estimateSavings への入力写像。P05 の estimation-adapter はこれと同一でなければならない。 */
function toSavingsInput(form: { hours: number; people: number; salary: number }) {
  return {
    runsPerYear: form.hours * form.people * 12,
    minutesPerRun: MINUTES_PER_RUN,
    reductionRate: COEFFICIENTS.sheet_reduction_rate,
    hourlyRate: {
      kind: 'from-salary',
      annualSalary: form.salary,
      annualHours: COEFFICIENTS.annual_hours,
    },
  } as const;
}

/** backend-spec §6.2 の sheetEstimate (月次削減時間)。写像を経由せず式から直接求める参照実装。 */
function sheetEstimateMonthlyHours(hours: number, people: number): number {
  return hours * people * COEFFICIENTS.sheet_reduction_rate;
}

describe('HI-EST: 試算のサーバ計算限定 (SEC5) と §6.2 との一致', () => {
  it('HI-EST-001: AD-6 の写像が §6.2 の式の年換算と一致する', () => {
    const form = { hours: 40, people: 5, salary: 6_000_000 };

    const result = estimateSavings(toSavingsInput(form));

    // §6.2: sheetEstimate = 月間工数 × 人数 × sheet_reduction_rate → 月 70h
    expect(sheetEstimateMonthlyHours(form.hours, form.people)).toBeCloseTo(70, 9);
    // 年換算 = 70h × 12 = 840h
    expect(result.savedHoursPerYear).toBeCloseTo(840, 9);
    // 時給 = 6,000,000 ÷ 2,000 = 3,000 円
    expect(result.hourlyRate).toBeCloseTo(3_000, 9);
    expect(result.savedAmountPerYear).toBeCloseTo(2_520_000, 6);
  });

  it('HI-EST-002: 任意の入力で写像の結果が §6.2 の月次式 × 12 に一致する', () => {
    const cases = [
      { hours: 1, people: 1, salary: 0 },
      { hours: 8, people: 3, salary: 4_000_000 },
      { hours: 160, people: 500, salary: 12_000_000 },
    ];

    for (const form of cases) {
      const result = estimateSavings(toSavingsInput(form));
      expect(result.savedHoursPerYear).toBeCloseTo(sheetEstimateMonthlyHours(form.hours, form.people) * 12, 6);
    }
  });

  it('HI-EST-003 (承認条件 C-1): tenant_coefficients.minutes_per_run を誤配線すると値が 1/4 に化ける', () => {
    // design-review-notes.md R-4: minutes_per_run (15) と AD-6 の minutesPerRun (60) は同名別物。
    // 誤配線してもエラーにならず「もっともらしい小さい値」になるため、差分をテストで固定する。
    const form = { hours: 40, people: 5, salary: 6_000_000 };

    const correct = estimateSavings(toSavingsInput(form));
    const miswired = estimateSavings({ ...toSavingsInput(form), minutesPerRun: COEFFICIENTS.minutes_per_run });

    expect(miswired.savedHoursPerYear).toBeCloseTo(correct.savedHoursPerYear / 4, 9);
    // 誤配線は例外を投げない = 型検査でもランタイム検証でも捕まらない。だからこのテストが唯一の検出点になる
    expect(miswired.savedHoursPerYear).toBeGreaterThan(0);
    expect(MINUTES_PER_RUN).not.toBe(COEFFICIENTS.minutes_per_run);
  });

  it('HI-EST-004: minutesPerRun は定数なので入力値によらず ESTIMATION_LIMITS の上限に触れない', () => {
    expect(MINUTES_PER_RUN).toBeLessThanOrEqual(ESTIMATION_LIMITS.minutesPerRun.max);

    // 参考: 初版 AD-6 の合成 (hours × people × 60) は同じ入力で上限 1440 を大きく超えていた
    const legacyMinutesPerRun = 40 * 5 * 60;
    expect(legacyMinutesPerRun).toBeGreaterThan(ESTIMATION_LIMITS.minutesPerRun.max);
  });

  it('HI-EST-005: FormData の zod 上限が runsPerYear の上限を必ず満たす', () => {
    const maxRunsPerYear = FORM_LIMITS.hours.max * FORM_LIMITS.people.max * 12;

    expect(maxRunsPerYear).toBeLessThanOrEqual(ESTIMATION_LIMITS.runsPerYear.max);
    // 上限ちょうどの入力が例外なく通ることまで確認する (境界を机上で終わらせない)
    expect(() =>
      estimateSavings(toSavingsInput({ hours: FORM_LIMITS.hours.max, people: FORM_LIMITS.people.max, salary: 0 })),
    ).not.toThrow();
  });

  it('HI-EST-006: zod 上限を超える入力は estimateSavings が out-of-range で拒否する', () => {
    // hours=200 は zod で弾かれる想定だが、仮に素通りしても試算側で必ず失敗することを固定する (二重防御)
    expect(() => estimateSavings(toSavingsInput({ hours: 200, people: 500, salary: 0 }))).toThrowError(
      EstimationInputError,
    );
  });

  it('HI-EST-007: hours の整数制約は zod 側で独立に課す必要がある (試算側の検証だけでは漏れる)', () => {
    // 小数の hours は runsPerYear を非整数にし得るので試算側で弾かれる
    expect(() => estimateSavings(toSavingsInput({ hours: 7.1, people: 1, salary: 0 }))).toThrowError(
      EstimationInputError,
    );

    // ただし ×12 で整数化する小数 (7.5 → 90 回) は素通りする。
    // 「試算側が弾いてくれるから zod の整数制約は不要」という判断を防ぐためここで固定する
    expect(() => estimateSavings(toSavingsInput({ hours: 7.5, people: 1, salary: 0 }))).not.toThrow();
  });

  // --- 以下は P05 実装を対象とする受入契約 (P06 で実行対象へ昇格させる) ---

  it('HI-EST-101: adapter が AD-6 の写像で共有 estimateSavings と同じ結果を返す', () => {
    const form = { hours: 40, people: 5, salary: 6_000_000 };
    const actual = estimateHearingSheet(form, { annualHours: 2_000, sheetReductionRate: 0.35 });
    const expected = estimateSavings(toSavingsInput(form));
    expect(actual).toEqual({
      savedMinutesPerYear: expected.savedMinutesPerYear,
      savedHoursPerYear: expected.savedHoursPerYear,
      savedAmountPerYear: expected.savedAmountPerYear,
    });
    const source = readFileSync(
      resolve(process.cwd(), 'src/features/hearing-intake/estimation-adapter/index.ts'),
      'utf8',
    );
    expect(source.match(/estimateSavings\(/g)).toHaveLength(1);
  });

  it('HI-EST-102: CreateSheetRequest がクライアント申告の金額・削減量を strict に拒否する', () => {
    const form = {
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
      expertise: 'novice' as const,
      role: 'employee' as const,
      context: 'business' as const,
      motivation: 'efficiency' as const,
      sharingIntent: 'small_group' as const,
      constraintTags: [],
      shareTarget: 'チーム内',
      informationSources: ['会計システム'],
      trueProblem: '単純転記に時間を奪われ、例外判断へ集中できないこと',
      knowledgeAssets: ['経理マニュアル'],
    };
    expect(createSheetRequestSchema.safeParse(form).success).toBe(true);
    expect(createSheetRequestSchema.safeParse({ ...form, savedAmountPerYear: 1 }).success).toBe(false);
    expect(createSheetRequestSchema.safeParse({ ...form, savedHoursPerYear: 1 }).success).toBe(false);
  });

  it('HI-EST-103: service は提出時の結果を estimateJson に保存し、読取時に再計算しない', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/features/hearing-intake/service.ts'), 'utf8');
    expect(source).toContain('estimateJson: JSON.stringify(estimate)');
    expect(source.match(/estimateHearingSheet\(/g)).toHaveLength(1);
    expect(source).not.toMatch(/savedHoursPerYear\s*[*+/=-]/);
  });

  it('HI-EST-104: salary は snapshot から除外され、AI payload は snapshot だけを受け取る', () => {
    const service = readFileSync(resolve(process.cwd(), 'src/features/hearing-intake/service.ts'), 'utf8');
    const adapter = readFileSync(resolve(process.cwd(), 'src/features/hearing-intake/ai-job-adapter/index.ts'), 'utf8');
    const contracts = readFileSync(
      resolve(process.cwd(), '../../packages/schemas/hearing-intake/contracts.ts'),
      'utf8',
    );
    expect(service).toContain('createHearingSheetFormSnapshot(input.request)');
    expect(contracts).toContain('const { salary: _discardedSalary, ...snapshot }');
    expect(adapter).toContain('form: input.form');
    expect(adapter).not.toContain('input.form.salary');
  });

  it('HI-EST-105: S10 の確認表示は時間だけを概算し、削減額を計算しない', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/app/(dashboard)/sheets/new/hearing-intake-wizard.tsx'),
      'utf8',
    );
    const confirm = source.slice(source.indexOf("id: 'confirm'"), source.indexOf('const canProceed'));
    expect(confirm).toContain('削減時間の目安');
    expect(confirm).not.toContain('savedAmountPerYear');
    expect(confirm).not.toMatch(/salary\s*[*+/]/);
    // 係数は名前付き定数から読む。数値の直書きに戻ると、設定画面と食い違っても気付けない
    expect(confirm).toContain('DEFAULT_SHEET_REDUCTION_RATE');
    expect(confirm).not.toMatch(/0\.\d+/);
  });
});
