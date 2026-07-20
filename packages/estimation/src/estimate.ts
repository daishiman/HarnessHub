// 時給・削減時間・削減額の試算 (純関数)。係数は全て呼び出し側から受け取る。

import { assertIntegerLimit, assertLimit } from './validation';
import type {
  HourlyRateInput,
  SavingsInput,
  SavingsResult,
  TimeSavingInput,
  TimeSavingResult,
} from './types';
import { EstimationInputError } from './types';

/** 年収と年間労働時間から時給を求める。annualHours は 0 を許さない (0 除算の回避も兼ねる)。 */
export function calcHourlyRateFromSalary(annualSalary: number, annualHours: number): number {
  const salary = assertLimit('annualSalary', annualSalary);
  const hours = assertLimit('annualHours', annualHours);
  return salary / hours;
}

/** 時給を解決する。直接指定と年収換算のどちらでも同じ検証を通る。 */
export function resolveHourlyRate(input: HourlyRateInput): number {
  switch (input.kind) {
    case 'direct':
      return assertLimit('hourlyRate', input.hourlyRate);
    case 'from-salary':
      return calcHourlyRateFromSalary(input.annualSalary, input.annualHours);
    default: {
      const exhaustive: never = input;
      throw new EstimationInputError(
        'not-a-number',
        'hourlyRate.kind',
        exhaustive,
        '時給の指定方法が不正です',
      );
    }
  }
}

/** 年間の削減時間を求める。回数は整数として扱う。 */
export function calcTimeSaving(input: TimeSavingInput): TimeSavingResult {
  const runsPerYear = assertIntegerLimit('runsPerYear', input.runsPerYear);
  const minutesPerRun = assertLimit('minutesPerRun', input.minutesPerRun);
  const reductionRate = assertLimit('reductionRate', input.reductionRate);

  const savedMinutesPerYear = runsPerYear * minutesPerRun * reductionRate;
  return {
    savedMinutesPerYear,
    savedHoursPerYear: savedMinutesPerYear / 60,
  };
}

/** 削減時間と時給から削減額を求める。 */
export function calcSavedAmount(savedHours: number, hourlyRate: number): number {
  const hours = assertLimit('savedHours', savedHours);
  const rate = assertLimit('hourlyRate', hourlyRate);
  return hours * rate;
}

/**
 * 削減時間と削減額をまとめて試算する単一実装。
 * metrics-tracking と hearing-intake はこの関数を共有し、各自で式を再実装しない。
 */
export function estimateSavings(input: SavingsInput): SavingsResult {
  const hourlyRate = resolveHourlyRate(input.hourlyRate);
  const timeSaving = calcTimeSaving(input);
  return {
    ...timeSaving,
    hourlyRate,
    savedAmountPerYear: calcSavedAmount(timeSaving.savedHoursPerYear, hourlyRate),
  };
}
