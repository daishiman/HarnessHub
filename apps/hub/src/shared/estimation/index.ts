// 試算エンジンを Hub 実行文脈へ結線するだけの層。計算式は持たず、テナント設定の係数を渡すだけ
// 実装の正本は @harness-hub/estimation (同名 export を作らないこと)
import { estimateSavings, type HourlyRateInput, type SavingsResult } from '@harness-hub/estimation';

/** テナント設定に保持する試算係数。値の永続化は feat-domain-model-db の責務 */
export interface TenantEstimationSettings {
  readonly hourlyRate: HourlyRateInput;
}

export interface WorkspaceSavingsInput {
  readonly runsPerYear: number;
  readonly minutesPerRun: number;
  readonly reductionRate: number;
}

/**
 * Workspace 単位の削減額試算。
 * 係数はテナント設定から、実績値は呼び出し側から受け取り、計算は package に委譲する。
 */
export function calculateWorkspaceSavings(
  settings: TenantEstimationSettings,
  input: WorkspaceSavingsInput,
): SavingsResult {
  return estimateSavings({
    runsPerYear: input.runsPerYear,
    minutesPerRun: input.minutesPerRun,
    reductionRate: input.reductionRate,
    hourlyRate: settings.hourlyRate,
  });
}
