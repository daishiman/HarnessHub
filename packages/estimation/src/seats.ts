// シート試算と投資対効果 (純関数)。単価・期間はテナント設定由来の引数として受け取る。

import { assertIntegerLimit, assertLimit } from './validation';
import type { RoiResult, SeatPlanInput, SeatPlanResult } from './types';

/** シート数 × 月額単価 × 月数から費用を求める。 */
export function estimateSeatPlan(input: SeatPlanInput): SeatPlanResult {
  const seats = assertIntegerLimit('seats', input.seats);
  const monthlyUnitPrice = assertLimit('monthlyUnitPrice', input.monthlyUnitPrice);
  const months = assertIntegerLimit('months', input.months);

  const monthlyCost = seats * monthlyUnitPrice;
  return {
    monthlyCost,
    totalCost: monthlyCost * months,
  };
}

/**
 * 投資対効果を求める。
 * cost が 0 のとき比率は数学的に定義できないため、Infinity ではなく null を返して
 * 「算出不能」を型で表明する (画面側が誤って ∞ を表示しないようにするため)。
 */
export function estimateRoi(savedAmount: number, cost: number): RoiResult {
  const saved = assertLimit('amount', savedAmount);
  const spent = assertLimit('amount', cost);

  return {
    netGain: saved - spent,
    roiRatio: spent === 0 ? null : saved / spent,
  };
}
