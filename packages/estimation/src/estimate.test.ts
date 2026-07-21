// 時給・削減時間・削減額の試算ロジックの単体テスト。

import { describe, expect, it } from 'vitest';

import {
  calcHourlyRateFromSalary,
  calcSavedAmount,
  calcTimeSaving,
  estimateSavings,
  resolveHourlyRate,
} from './estimate';
import { EstimationInputError } from './types';

describe('calcHourlyRateFromSalary', () => {
  it('年収 ÷ 年間労働時間で時給を求める', () => {
    expect(calcHourlyRateFromSalary(6_000_000, 2000)).toBe(3000);
  });

  it('年間労働時間 0 を拒否する (0 除算を発生させない)', () => {
    expect(() => calcHourlyRateFromSalary(6_000_000, 0)).toThrow(EstimationInputError);
  });

  it('負の年収を拒否する', () => {
    expect(() => calcHourlyRateFromSalary(-1, 2000)).toThrow(EstimationInputError);
  });
});

describe('resolveHourlyRate', () => {
  it('直接指定と年収換算のどちらでも同じ値に解決できる', () => {
    expect(resolveHourlyRate({ kind: 'direct', hourlyRate: 3000 })).toBe(3000);
    expect(resolveHourlyRate({ kind: 'from-salary', annualSalary: 6_000_000, annualHours: 2000 })).toBe(3000);
  });

  it('直接指定でも範囲検証を行う', () => {
    expect(() => resolveHourlyRate({ kind: 'direct', hourlyRate: -100 })).toThrow(EstimationInputError);
  });
});

describe('calcTimeSaving', () => {
  it('回数 × 分/回 × 削減率で年間削減時間を求める', () => {
    expect(calcTimeSaving({ runsPerYear: 120, minutesPerRun: 30, reductionRate: 0.5 })).toStrictEqual({
      savedMinutesPerYear: 1800,
      savedHoursPerYear: 30,
    });
  });

  it('削減率 0 なら削減時間は 0', () => {
    expect(calcTimeSaving({ runsPerYear: 120, minutesPerRun: 30, reductionRate: 0 }).savedHoursPerYear).toBe(0);
  });

  it('削減率 1 超・負の実施回数・小数の実施回数を拒否する', () => {
    expect(() => calcTimeSaving({ runsPerYear: 120, minutesPerRun: 30, reductionRate: 1.2 })).toThrow(
      EstimationInputError,
    );
    expect(() => calcTimeSaving({ runsPerYear: -1, minutesPerRun: 30, reductionRate: 0.5 })).toThrow(
      EstimationInputError,
    );
    expect(() => calcTimeSaving({ runsPerYear: 1.5, minutesPerRun: 30, reductionRate: 0.5 })).toThrow(
      EstimationInputError,
    );
  });

  it('1 日を超える分/回 を非現実値として拒否する', () => {
    expect(() => calcTimeSaving({ runsPerYear: 1, minutesPerRun: 1441, reductionRate: 0.5 })).toThrow(
      EstimationInputError,
    );
  });
});

describe('calcSavedAmount', () => {
  it('削減時間 × 時給', () => {
    expect(calcSavedAmount(30, 3000)).toBe(90_000);
  });

  it('負の削減時間を拒否する', () => {
    expect(() => calcSavedAmount(-1, 3000)).toThrow(EstimationInputError);
  });
});

describe('estimateSavings', () => {
  it('削減時間と削減額を一括で返す', () => {
    expect(
      estimateSavings({
        hourlyRate: { kind: 'from-salary', annualSalary: 6_000_000, annualHours: 2000 },
        runsPerYear: 120,
        minutesPerRun: 30,
        reductionRate: 0.5,
      }),
    ).toStrictEqual({
      hourlyRate: 3000,
      savedMinutesPerYear: 1800,
      savedHoursPerYear: 30,
      savedAmountPerYear: 90_000,
    });
  });

  it('同じ入力なら常に同じ結果を返す (係数は引数由来のみ)', () => {
    const input = {
      hourlyRate: { kind: 'direct', hourlyRate: 4000 },
      runsPerYear: 52,
      minutesPerRun: 45,
      reductionRate: 0.4,
    } as const;
    expect(estimateSavings(input)).toStrictEqual(estimateSavings(input));
  });

  it('時給の指定が不正なら試算せずに拒否する', () => {
    expect(() =>
      estimateSavings({
        hourlyRate: { kind: 'direct', hourlyRate: Number.NaN },
        runsPerYear: 52,
        minutesPerRun: 45,
        reductionRate: 0.4,
      }),
    ).toThrow(EstimationInputError);
  });
});
