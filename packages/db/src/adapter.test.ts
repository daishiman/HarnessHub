// adapter 境界 (D2 ヘッジ) の単体テスト。

import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter, TransactionalAdapter } from './adapter';
import { assertSupportedDriver, DATABASE_DRIVERS, isDatabaseDriver, isTransactionalAdapter } from './adapter';
import { DriverNotSupportedError } from './errors';

const plainAdapter: DatabaseAdapter = { driver: 'turso', schema: {}, client: null };

const txAdapter: TransactionalAdapter = {
  driver: 'd1',
  schema: {},
  client: null,
  transaction: async (run) => run(plainAdapter),
};

describe('driver 判定', () => {
  it('turso / d1 を対応 driver として扱う', () => {
    expect([...DATABASE_DRIVERS]).toStrictEqual(['turso', 'd1']);
    expect(isDatabaseDriver('turso')).toBe(true);
    expect(isDatabaseDriver('d1')).toBe(true);
  });

  it('未知の値を拒否する', () => {
    expect(isDatabaseDriver('postgres')).toBe(false);
    expect(isDatabaseDriver(undefined)).toBe(false);
  });

  it('assertSupportedDriver は対応集合を絞れる', () => {
    expect(assertSupportedDriver('turso')).toBe('turso');
    expect(() => assertSupportedDriver('d1', ['turso'])).toThrow(DriverNotSupportedError);
    expect(() => assertSupportedDriver('mysql')).toThrow(/未対応/);
  });
});

describe('isTransactionalAdapter', () => {
  it('transaction を持つ adapter だけを true と判定する', () => {
    expect(isTransactionalAdapter(plainAdapter)).toBe(false);
    expect(isTransactionalAdapter(txAdapter)).toBe(true);
  });

  it('driver が変わっても同じ境界型で扱える (D2 退避がアプリ層へ波及しない)', async () => {
    const result = await txAdapter.transaction(async (tx) => tx.driver);
    expect(result).toBe('turso');
  });
});
