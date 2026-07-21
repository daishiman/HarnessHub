// 第 2 consumer 系統による @harness-hub/estimation の利用。public API 経由のみ
import {
  estimateSavings,
  estimateSeatPlan,
  resolveHourlyRate,
  type SavingsResult,
  type SeatPlanResult,
} from '@harness-hub/estimation';

export const boundEstimateSavings = estimateSavings;
export const boundResolveHourlyRate = resolveHourlyRate;

/** 挙動同値検証で Hub 側と突き合わせる決定論的な入力 */
export const sampleSavingsInput = {
  runsPerYear: 240,
  minutesPerRun: 30,
  reductionRate: 0.5,
  hourlyRate: { kind: 'direct', hourlyRate: 4000 },
} as const;

export function estimateSample(): SavingsResult {
  return estimateSavings(sampleSavingsInput);
}

export function estimateSampleSeats(): SeatPlanResult {
  return estimateSeatPlan({ seats: 10, monthlyUnitPrice: 1200, months: 12 });
}
