/**
 * rollup の金額換算に使うテナント係数の解決 (sys-metrics-tracking-p05 / SEC5 / SEC4)。
 *
 * 何を: `tenant_coefficients` (read-only consume) と標準年収から
 *       `packages/estimation` の `MetricsCoefficients` を組み立てる。
 * なぜ: 「どの係数で金額に換算したか」をサーバ側の 1 箇所に閉じるため。
 *       この関数を通らない金額算出経路を作らないことが SEC5 の実装上の担保になる。
 *
 * 制約と、その理由:
 *   - `tenant_coefficients` の owner は feat-user-org-admin。本 feature は **読むだけ**で書かない。
 *   - 時給は `users.salary` から個人別に出すのが理想だが、当該列は SEC4 のため暗号化列であり、
 *     テナント全体の rollup を回すたびに全ユーザーぶんを復号するのは費用にも権限設計にも合わない。
 *     そこで「テナント標準年収 ÷ `annual_hours`」で時給を出す (`from-salary`)。
 *     個人別の金額 (dim=user) も同じ標準年収で算出されるため、rollup の値から
 *     個人の実年収は逆算できない — SEC4 の要請とも整合する。
 *   - 削減率はテナント係数の `sheet_reduction_rate` を使う。metrics 専用の削減率列は
 *     現行スキーマに無く、列の追加は owner feature の責務 (本 task の write scope 外)。
 */
import type { TenantCoefficientRow } from '@harness-hub/db';
import type { MetricsCoefficients } from '@harness-hub/estimation';

/**
 * テナント標準年収 (円) の既定値。
 * 環境変数 `METRICS_STANDARD_ANNUAL_SALARY_JPY` で上書きできるが、
 * **リクエストからは決して受け取らない** (クライアント申告の係数を使わない / SEC5)。
 */
export const DEFAULT_STANDARD_ANNUAL_SALARY_JPY = 6_000_000;

/** 年収として受理する範囲。桁を誤った運用設定を起動時に落とす。 */
const MIN_ANNUAL_SALARY_JPY = 1;
const MAX_ANNUAL_SALARY_JPY = 100_000_000;

/**
 * 環境変数から標準年収を読む。未設定・不正値は既定値へ倒す。
 * 例外にしないのは、係数の設定ミスで cron 全体 (他ジョブを含む) を止めたくないため。
 */
export function readStandardAnnualSalary(source: Record<string, string | undefined>): number {
  const raw = source.METRICS_STANDARD_ANNUAL_SALARY_JPY?.trim();
  if (raw === undefined || raw.length === 0) return DEFAULT_STANDARD_ANNUAL_SALARY_JPY;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < MIN_ANNUAL_SALARY_JPY || parsed > MAX_ANNUAL_SALARY_JPY) {
    return DEFAULT_STANDARD_ANNUAL_SALARY_JPY;
  }
  return parsed;
}

/**
 * テナント係数行を試算エンジンの入力へ写す。
 * 換算式そのものは持たない — 式は `packages/estimation` の単一実装だけが持つ。
 */
export function resolveMetricsCoefficients(
  row: Pick<TenantCoefficientRow, 'annualHours' | 'minutesPerRun' | 'sheetReductionRate'>,
  standardAnnualSalaryJpy: number,
): MetricsCoefficients {
  return {
    minutesPerRun: row.minutesPerRun,
    reductionRate: row.sheetReductionRate,
    hourlyRate: {
      kind: 'from-salary',
      annualSalary: standardAnnualSalaryJpy,
      annualHours: row.annualHours,
    },
  };
}
