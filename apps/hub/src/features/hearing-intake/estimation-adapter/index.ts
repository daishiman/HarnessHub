/**
 * Hearing の入力を共有 estimation package へ写す唯一の場所。
 * 計算式を再実装せず、estimateSavings を 1 回だけ呼ぶ。
 */

import type { TenantCoefficientRow } from '@harness-hub/db';
import { estimateSavings } from '@harness-hub/estimation';
import {
  type HearingSheetEstimate,
  type HearingSheetFormInput,
  hearingSheetEstimateSchema,
} from '@harness-hub/schemas';

const MINUTES_PER_ONE_PERSON_HOUR = 60;

export function estimateHearingSheet(
  form: Pick<HearingSheetFormInput, 'hours' | 'people' | 'salary'>,
  coefficients: Pick<TenantCoefficientRow, 'annualHours' | 'sheetReductionRate'>,
): HearingSheetEstimate {
  const result = estimateSavings({
    runsPerYear: form.hours * form.people * 12,
    minutesPerRun: MINUTES_PER_ONE_PERSON_HOUR,
    reductionRate: coefficients.sheetReductionRate,
    hourlyRate: {
      kind: 'from-salary',
      annualSalary: form.salary,
      annualHours: coefficients.annualHours,
    },
  });
  return hearingSheetEstimateSchema.parse({
    savedMinutesPerYear: result.savedMinutesPerYear,
    savedHoursPerYear: result.savedHoursPerYear,
    savedAmountPerYear: result.savedAmountPerYear,
  });
}
