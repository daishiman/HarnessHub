// feat-metrics-tracking へ提供する formula / rollup domain module。
//
// 式そのものは `estimate.ts` の単一実装 (`estimateSavings`) を呼ぶだけで、ここでは再実装しない。
// metrics と hearing-intake が別々の式を持つと「同じ削減額が画面ごとに違う」状態になるため、
// この module の責務は「metrics の語彙 (実行回数・集計次元) を試算エンジンの語彙へ翻訳すること」に限る。
// 係数は全て引数で受け取り、テナント固有の既定値をこの package に持たない (types.ts の方針)。

import { estimateSavings } from './estimate';
import type { HourlyRateInput, SavingsResult } from './types';
import { assertIntegerLimit } from './validation';

/** rollup 算出に使うテナント係数。呼び出し側が `tenant_coefficients` から注入する。 */
export interface MetricsCoefficients {
  /** 1 回あたりの所要時間 (分)。 */
  readonly minutesPerRun: number;
  /** 削減率 (0〜1)。 */
  readonly reductionRate: number;
  /** 時給の与え方 (直接指定 or 年収換算)。 */
  readonly hourlyRate: HourlyRateInput;
}

/** metrics 側の試算入力。クライアントから来てよいのは `runCount` だけで、係数はサーバが与える (SEC5)。 */
export interface MetricsEstimateInput extends MetricsCoefficients {
  /** 集計対象期間の実行回数。 */
  readonly runCount: number;
}

/** metrics 側の試算結果。`estimateSavings` の結果をそのまま使う (別型を作らず単一実装を共有する)。 */
export type MetricsEstimateResult = SavingsResult;

/**
 * 実行回数と係数から削減時間・削減額を求める。
 *
 * `estimateSavings` の `runsPerYear` は「試算対象期間の実行回数」を意味し、式は回数に線形なので
 * 日次・週次の rollup でもそのまま使える (期間の意味づけは呼び出し側が持つ)。
 */
export function metricsEstimate(input: MetricsEstimateInput): MetricsEstimateResult {
  return estimateSavings({
    runsPerYear: input.runCount,
    minutesPerRun: input.minutesPerRun,
    reductionRate: input.reductionRate,
    hourlyRate: input.hourlyRate,
  });
}

/**
 * 集計元の event 行。metrics_events は回数しか持たないので、この型も回数しか持たない。
 * `dimKey` は集計次元の値 (tenant_id / harness_id / department_id / user_id のいずれか)。
 *
 * 名前を `MetricsEventRow` にしないのは、`@harness-hub/db` が同名で**永続行**の型を公開しており、
 * 同名 export が 2 package に並ぶと `check:duplicates` (共通層の重複実装検出) が落ちるため。
 * ここは「集計の入出力」であって永続行ではない、という区別を型名で示す。
 */
export interface MetricsAggregationEvent {
  readonly dimKey: string;
  readonly runCount: number;
}

/** dimension キーごとの rollup 結果。金額はここで初めて (= サーバ側でのみ) 現れる。 */
export interface MetricsAggregationResult {
  readonly dimKey: string;
  readonly runCount: number;
  readonly savedMinutes: number;
  readonly savedHours: number;
  readonly savedAmount: number;
}

/**
 * event 行を dimension キーで畳み込み、キーごとの削減時間・削減額を算出する。
 *
 * 回数を先に合算してから 1 度だけ試算するのは、行ごとに試算して足すと浮動小数の誤差が
 * 行数ぶん積み上がるため。合算後の回数も `runsPerYear` の範囲検証を通す。
 * 返り値の順序は最初に現れたキーの順で、同じ入力なら常に同じ並びになる。
 */
export function aggregateMetricsRollup(
  rows: readonly MetricsAggregationEvent[],
  coefficients: MetricsCoefficients,
): readonly MetricsAggregationResult[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const runCount = assertIntegerLimit('runsPerYear', row.runCount);
    totals.set(row.dimKey, (totals.get(row.dimKey) ?? 0) + runCount);
  }

  return [...totals].map(([dimKey, runCount]) => {
    const estimate = metricsEstimate({ ...coefficients, runCount });
    return {
      dimKey,
      runCount,
      savedMinutes: estimate.savedMinutesPerYear,
      savedHours: estimate.savedHoursPerYear,
      savedAmount: estimate.savedAmountPerYear,
    };
  });
}
