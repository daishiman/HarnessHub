// 入力検証の単体テスト。SEC5: クライアント申告値をそのまま信じないことを確認する。

import { describe, expect, it } from 'vitest';

import { EstimationInputError } from './types';
import {
  assertFiniteNumber,
  assertInRange,
  assertInteger,
  assertIntegerLimit,
  assertLimit,
  ESTIMATION_LIMITS,
  roundTo,
} from './validation';

describe('assertFiniteNumber', () => {
  it('有限な数値はそのまま返す', () => {
    expect(assertFiniteNumber('x', 1.5)).toBe(1.5);
    expect(assertFiniteNumber('x', 0)).toBe(0);
  });

  const invalidValues: [string, unknown][] = [
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['-Infinity', Number.NEGATIVE_INFINITY],
    ['数値形式の文字列', '100'],
    ['null', null],
    ['undefined', undefined],
    ['真偽値', true],
    ['オブジェクト', { valueOf: () => 100 }],
  ];

  it.each(invalidValues)('%s を拒否する', (_label, value) => {
    expect(() => assertFiniteNumber('x', value)).toThrow(EstimationInputError);
  });

  it('拒否理由を code / field / value で返す', () => {
    try {
      assertFiniteNumber('hourlyRate', '3000');
      expect.unreachable('例外が投げられるべき');
    } catch (error) {
      expect(error).toBeInstanceOf(EstimationInputError);
      const typed = error as EstimationInputError;
      expect(typed.code).toBe('not-a-number');
      expect(typed.field).toBe('hourlyRate');
      expect(typed.value).toBe('3000');
    }
  });
});

describe('assertInRange', () => {
  it('境界値 (閉区間) を許可する', () => {
    expect(assertInRange('x', 0, { min: 0, max: 10 })).toBe(0);
    expect(assertInRange('x', 10, { min: 0, max: 10 })).toBe(10);
  });

  it('負値と上限超過を拒否する', () => {
    expect(() => assertInRange('x', -1, { min: 0, max: 10 })).toThrow(/0 以上 10 以下/);
    expect(() => assertInRange('x', 11, { min: 0, max: 10 })).toThrow(EstimationInputError);
  });

  it('範囲外は out-of-range を返す', () => {
    try {
      assertInRange('reductionRate', 1.5, ESTIMATION_LIMITS.reductionRate);
      expect.unreachable('例外が投げられるべき');
    } catch (error) {
      expect((error as EstimationInputError).code).toBe('out-of-range');
    }
  });
});

describe('assertInteger', () => {
  it('小数を拒否する', () => {
    expect(() => assertInteger('runs', 1.5, { min: 0, max: 10 })).toThrow(/整数/);
  });

  it('整数は通す', () => {
    expect(assertInteger('runs', 3, { min: 0, max: 10 })).toBe(3);
  });
});

describe('assertLimit / assertIntegerLimit', () => {
  it('登録済みフィールドの範囲を適用する', () => {
    expect(assertLimit('reductionRate', 0.3)).toBe(0.3);
    expect(() => assertLimit('annualHours', 0)).toThrow(EstimationInputError);
    expect(() => assertLimit('annualHours', 9000)).toThrow(EstimationInputError);
    expect(assertIntegerLimit('seats', 5)).toBe(5);
    expect(() => assertIntegerLimit('seats', 5.5)).toThrow(EstimationInputError);
  });
});

describe('roundTo', () => {
  it('指定桁で丸める', () => {
    expect(roundTo(1234.5678, 2)).toBe(1234.57);
    expect(roundTo(1234.5678)).toBe(1235);
  });

  it('不正な桁数を拒否する', () => {
    expect(() => roundTo(1, -1)).toThrow(EstimationInputError);
    expect(() => roundTo(1, 1.5)).toThrow(EstimationInputError);
  });
});
