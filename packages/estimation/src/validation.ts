// 入力値の検証。SEC5 (クライアント申告値を信じない) のため、試算前に必ずここを通す。

import type { NumericRange } from './types';
import { EstimationInputError } from './types';

/**
 * 各フィールドの許容範囲。非現実値をここで機械的に拒否する。
 * 値そのものは「物理的にあり得る上限」であって、テナントの業務的な妥当値ではない。
 */
export const ESTIMATION_LIMITS = {
  /** 年間労働時間。上限は 1 年の総時間 (24h × 365)。 */
  annualHours: { min: 1, max: 8760 },
  /** 年収。 */
  annualSalary: { min: 0, max: 1_000_000_000 },
  /** 時給。 */
  hourlyRate: { min: 0, max: 1_000_000 },
  /** 1 回あたりの所要時間 (分)。上限は 1 日。 */
  minutesPerRun: { min: 0, max: 1440 },
  /** 年間実施回数。 */
  runsPerYear: { min: 0, max: 1_000_000 },
  /** 削減時間 (時間)。組織合計を想定し、1 人の年間労働時間より広く取る。 */
  savedHours: { min: 0, max: 100_000_000 },
  /** 削減率。 */
  reductionRate: { min: 0, max: 1 },
  /** シート数。 */
  seats: { min: 0, max: 100_000 },
  /** シート月額単価。 */
  monthlyUnitPrice: { min: 0, max: 10_000_000 },
  /** 試算期間 (月数)。上限は 10 年。 */
  months: { min: 0, max: 120 },
  /** 削減額・費用など、金額として扱う値。他フィールドの上限同士の積を許容できる幅を取る。 */
  amount: { min: 0, max: 1_000_000_000_000_000 },
} as const satisfies Readonly<Record<string, NumericRange>>;

/** 検証済みフィールド名。 */
export type EstimationField = keyof typeof ESTIMATION_LIMITS;

/**
 * 有限な数値であることを保証する。
 * NaN / Infinity / number 型でない値 (JSON 由来の文字列など) は全て拒否する。
 */
export function assertFiniteNumber(field: string, value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new EstimationInputError('not-a-number', field, value, `${field} は有限の数値である必要があります`);
  }
  return value;
}

/** 指定範囲 (閉区間) に収まることを保証する。 */
export function assertInRange(field: string, value: unknown, range: NumericRange): number {
  const numeric = assertFiniteNumber(field, value);
  if (numeric < range.min || numeric > range.max) {
    throw new EstimationInputError(
      'out-of-range',
      field,
      numeric,
      `${field} は ${range.min} 以上 ${range.max} 以下である必要があります`,
    );
  }
  return numeric;
}

/** 整数であることを保証する (回数・シート数・月数など、小数があり得ない量に使う)。 */
export function assertInteger(field: string, value: unknown, range: NumericRange): number {
  const numeric = assertInRange(field, value, range);
  if (!Number.isInteger(numeric)) {
    throw new EstimationInputError('not-an-integer', field, numeric, `${field} は整数である必要があります`);
  }
  return numeric;
}

/** ESTIMATION_LIMITS に登録済みのフィールドを範囲検証する。 */
export function assertLimit(field: EstimationField, value: unknown): number {
  return assertInRange(field, value, ESTIMATION_LIMITS[field]);
}

/** ESTIMATION_LIMITS に登録済みのフィールドを整数として範囲検証する。 */
export function assertIntegerLimit(field: EstimationField, value: unknown): number {
  return assertInteger(field, value, ESTIMATION_LIMITS[field]);
}

/**
 * 表示用の丸め。試算結果自体は丸めずに返し、丸めるかどうかは consumer が決める。
 * digits は 0〜10 の整数。
 */
export function roundTo(value: number, digits = 0): number {
  const safeValue = assertFiniteNumber('value', value);
  const safeDigits = assertInteger('digits', digits, { min: 0, max: 10 });
  const factor = 10 ** safeDigits;
  return Math.round(safeValue * factor) / factor;
}
