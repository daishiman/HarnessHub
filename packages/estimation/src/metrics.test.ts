// metrics-tracking 向け formula / rollup module の単体テスト。
// 「試算式を再実装していないこと」を等価性テストで固定するのが主目的 (duplicate implementation = 0)。

import { describe, expect, it } from 'vitest';

import { estimateSavings } from './estimate';
import { aggregateMetricsRollup, type MetricsCoefficients, metricsEstimate } from './metrics';
import { EstimationInputError } from './types';

const coefficients: MetricsCoefficients = {
  minutesPerRun: 30,
  reductionRate: 0.5,
  hourlyRate: { kind: 'direct', hourlyRate: 3_000 },
};

describe('metricsEstimate', () => {
  it('estimateSavings と同値になる (式を再実装していない)', () => {
    expect(metricsEstimate({ ...coefficients, runCount: 120 })).toStrictEqual(
      estimateSavings({
        runsPerYear: 120,
        minutesPerRun: 30,
        reductionRate: 0.5,
        hourlyRate: { kind: 'direct', hourlyRate: 3_000 },
      }),
    );
  });

  it('年収換算の時給指定でも同じ primitives を通る', () => {
    const hourlyRate = { kind: 'from-salary', annualSalary: 6_000_000, annualHours: 2_000 } as const;
    expect(metricsEstimate({ ...coefficients, hourlyRate, runCount: 120 })).toStrictEqual(
      metricsEstimate({ ...coefficients, runCount: 120 }),
    );
  });

  it('回数 × 分/回 × 削減率 から削減時間と削減額を返す', () => {
    expect(metricsEstimate({ ...coefficients, runCount: 120 })).toStrictEqual({
      hourlyRate: 3_000,
      savedMinutesPerYear: 1_800,
      savedHoursPerYear: 30,
      savedAmountPerYear: 90_000,
    });
  });

  it('不正な回数・係数は試算せずに EstimationInputError で拒否する', () => {
    expect(() => metricsEstimate({ ...coefficients, runCount: 1.5 })).toThrow(EstimationInputError);
    expect(() => metricsEstimate({ ...coefficients, runCount: -1 })).toThrow(EstimationInputError);
    expect(() => metricsEstimate({ ...coefficients, runCount: Number.NaN })).toThrow(EstimationInputError);
    expect(() => metricsEstimate({ ...coefficients, reductionRate: 1.2, runCount: 1 })).toThrow(EstimationInputError);
    expect(() => metricsEstimate({ ...coefficients, minutesPerRun: 1_441, runCount: 1 })).toThrow(EstimationInputError);
  });
});

describe('aggregateMetricsRollup', () => {
  it('同じ dimension キーの回数を合算してからキーごとに試算する', () => {
    expect(
      aggregateMetricsRollup(
        [
          { dimKey: 'harness-1', runCount: 80 },
          { dimKey: 'harness-2', runCount: 40 },
          { dimKey: 'harness-1', runCount: 40 },
        ],
        coefficients,
      ),
    ).toStrictEqual([
      { dimKey: 'harness-1', runCount: 120, savedMinutes: 1_800, savedHours: 30, savedAmount: 90_000 },
      { dimKey: 'harness-2', runCount: 40, savedMinutes: 600, savedHours: 10, savedAmount: 30_000 },
    ]);
  });

  it('各行の削減額は同じ回数を metricsEstimate に渡した結果と一致する', () => {
    const [row] = aggregateMetricsRollup([{ dimKey: 'dept-1', runCount: 52 }], coefficients);
    const expected = metricsEstimate({ ...coefficients, runCount: 52 });
    expect(row?.savedAmount).toBe(expected.savedAmountPerYear);
    expect(row?.savedHours).toBe(expected.savedHoursPerYear);
  });

  it('event が無い期間は空配列を返す (0 行を欠損として扱わない)', () => {
    expect(aggregateMetricsRollup([], coefficients)).toStrictEqual([]);
  });

  it('最初に現れたキーの順で返る (同じ入力なら同じ並び)', () => {
    const rows = [
      { dimKey: 'b', runCount: 1 },
      { dimKey: 'a', runCount: 1 },
    ];
    expect(aggregateMetricsRollup(rows, coefficients).map((row) => row.dimKey)).toStrictEqual(['b', 'a']);
  });

  it('不正な回数を含む行があれば集計せずに拒否する', () => {
    expect(() => aggregateMetricsRollup([{ dimKey: 'harness-1', runCount: 0.5 }], coefficients)).toThrow(
      EstimationInputError,
    );
    expect(() =>
      aggregateMetricsRollup(
        [
          { dimKey: 'harness-1', runCount: 1 },
          { dimKey: 'harness-2', runCount: -1 },
        ],
        coefficients,
      ),
    ).toThrow(EstimationInputError);
  });

  it('合算後の回数が上限を超える場合も拒否する (行単位では通る値でも防ぐ)', () => {
    expect(() =>
      aggregateMetricsRollup(
        [
          { dimKey: 'harness-1', runCount: 900_000 },
          { dimKey: 'harness-1', runCount: 900_000 },
        ],
        coefficients,
      ),
    ).toThrow(EstimationInputError);
  });
});
