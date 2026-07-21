// シート試算と ROI の単体テスト。

import { describe, expect, it } from 'vitest';

import { estimateRoi, estimateSeatPlan } from './seats';
import { EstimationInputError } from './types';

describe('estimateSeatPlan', () => {
  it('シート数 × 単価 × 月数で費用を求める', () => {
    expect(estimateSeatPlan({ seats: 10, monthlyUnitPrice: 1500, months: 12 })).toStrictEqual({
      monthlyCost: 15_000,
      totalCost: 180_000,
    });
  });

  it('シート数 0 は許可する (見積開始時の初期値)', () => {
    expect(estimateSeatPlan({ seats: 0, monthlyUnitPrice: 1500, months: 12 }).totalCost).toBe(0);
  });

  it('小数シート数・負の単価・上限超過の月数を拒否する', () => {
    expect(() => estimateSeatPlan({ seats: 1.5, monthlyUnitPrice: 1500, months: 12 })).toThrow(EstimationInputError);
    expect(() => estimateSeatPlan({ seats: 10, monthlyUnitPrice: -1, months: 12 })).toThrow(EstimationInputError);
    expect(() => estimateSeatPlan({ seats: 10, monthlyUnitPrice: 1500, months: 121 })).toThrow(EstimationInputError);
  });
});

describe('estimateRoi', () => {
  it('純便益と投資倍率を返す', () => {
    expect(estimateRoi(180_000, 60_000)).toStrictEqual({ netGain: 120_000, roiRatio: 3 });
  });

  it('費用 0 のとき比率は Infinity ではなく null', () => {
    expect(estimateRoi(180_000, 0)).toStrictEqual({ netGain: 180_000, roiRatio: null });
  });

  it('削減額が費用を下回れば純便益は負になる', () => {
    expect(estimateRoi(50_000, 60_000).netGain).toBe(-10_000);
  });

  it('負の金額を拒否する', () => {
    expect(() => estimateRoi(-1, 60_000)).toThrow(EstimationInputError);
  });
});
