// packages/estimation の公開 API。試算式の単一実装として consumer feature はこの入口のみを参照する。

export {
  EstimationInputError,
  type EstimationErrorCode,
  type HourlyRateInput,
  type NumericRange,
  type RoiResult,
  type SavingsInput,
  type SavingsResult,
  type SeatPlanInput,
  type SeatPlanResult,
  type TimeSavingInput,
  type TimeSavingResult,
} from './types';

export {
  ESTIMATION_LIMITS,
  assertFiniteNumber,
  assertInRange,
  assertInteger,
  assertIntegerLimit,
  assertLimit,
  roundTo,
  type EstimationField,
} from './validation';

export {
  calcHourlyRateFromSalary,
  calcSavedAmount,
  calcTimeSaving,
  estimateSavings,
  resolveHourlyRate,
} from './estimate';

export { estimateRoi, estimateSeatPlan } from './seats';
