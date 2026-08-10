// packages/estimation の公開 API。試算式の単一実装として consumer feature はこの入口のみを参照する。

export {
  calcHourlyRateFromSalary,
  calcSavedAmount,
  calcTimeSaving,
  estimateSavings,
  resolveHourlyRate,
} from './estimate';
// feat-metrics-tracking へ提供する formula/rollup domain module。
// package 境界の owner は feat-hub-foundation のままで、metrics は primitives の consumer にすぎない。
// 集計入出力の行型は `@harness-hub/db` の永続行型と同名にしない (module 側で改名済み)。
// barrel で別名を付ける方式だと、重複検出は module の export 名を見るため素通りしてしまう。
export {
  aggregateMetricsRollup,
  type MetricsAggregationEvent,
  type MetricsAggregationResult,
  type MetricsCoefficients,
  type MetricsEstimateInput,
  type MetricsEstimateResult,
  metricsEstimate,
} from './metrics';
export { estimateRoi, estimateSeatPlan } from './seats';
export {
  type EstimationErrorCode,
  EstimationInputError,
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
  assertFiniteNumber,
  assertInRange,
  assertInteger,
  assertIntegerLimit,
  assertLimit,
  ESTIMATION_LIMITS,
  type EstimationField,
  roundTo,
} from './validation';
