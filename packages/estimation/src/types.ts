// 試算エンジンの公開型。係数は全て引数で受け取り、この package 内にテナント固有の値を持たない。

/** 入力検証に失敗した理由。SEC5 (クライアント申告値を信じない) の拒否理由を機械可読にする。 */
export type EstimationErrorCode = 'not-a-number' | 'out-of-range' | 'not-an-integer';

/** 入力検証エラー。どのフィールドのどの値が、なぜ拒否されたかを保持する。 */
export class EstimationInputError extends Error {
  readonly code: EstimationErrorCode;
  readonly field: string;
  readonly value: unknown;

  constructor(code: EstimationErrorCode, field: string, value: unknown, message: string) {
    super(message);
    this.name = 'EstimationInputError';
    this.code = code;
    this.field = field;
    this.value = value;
  }
}

/** 許容範囲 (閉区間)。 */
export interface NumericRange {
  readonly min: number;
  readonly max: number;
}

/**
 * 時給の与え方。テナント設定から直接時給を持つ場合と、年収 ÷ 年間労働時間から導く場合がある。
 * どちらかを取り違えないよう判別可能な union にしている。
 */
export type HourlyRateInput =
  | { readonly kind: 'direct'; readonly hourlyRate: number }
  | { readonly kind: 'from-salary'; readonly annualSalary: number; readonly annualHours: number };

/** 削減時間の試算入力。分/回・回数・削減率は全てテナント設定または申告値に由来する。 */
export interface TimeSavingInput {
  /** 年間の実施回数。 */
  readonly runsPerYear: number;
  /** 1 回あたりの所要時間 (分)。 */
  readonly minutesPerRun: number;
  /** 削減率 (0〜1)。 */
  readonly reductionRate: number;
}

/** 削減時間の試算結果。 */
export interface TimeSavingResult {
  readonly savedMinutesPerYear: number;
  readonly savedHoursPerYear: number;
}

/** 削減額まで含む試算入力。 */
export interface SavingsInput extends TimeSavingInput {
  readonly hourlyRate: HourlyRateInput;
}

/** 削減額まで含む試算結果。単一実装として Hub 各画面がこの形を共有する。 */
export interface SavingsResult extends TimeSavingResult {
  readonly hourlyRate: number;
  readonly savedAmountPerYear: number;
}

/** シート試算の入力。 */
export interface SeatPlanInput {
  /** 契約シート数。 */
  readonly seats: number;
  /** 1 シートあたりの月額単価。 */
  readonly monthlyUnitPrice: number;
  /** 試算期間 (月数)。 */
  readonly months: number;
}

/** シート試算の結果。 */
export interface SeatPlanResult {
  readonly monthlyCost: number;
  readonly totalCost: number;
}

/** 投資対効果の試算結果。cost が 0 のとき ratio は算出不能として null を返す。 */
export interface RoiResult {
  readonly netGain: number;
  readonly roiRatio: number | null;
}
