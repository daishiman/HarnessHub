// HF-A4-CONTRACT-004: @harness-hub/estimation を 2 系統の consumer が public API 経由で参照し、
// 同一入力に対して同一結果を返すことを検証
import { describe, expect, it } from 'vitest';
import { estimateSavings, resolveHourlyRate } from '@harness-hub/estimation';
import * as consumerA from '../fixtures/consumer-a/uses-estimation.js';
import { calculateWorkspaceSavings } from '../../src/shared/estimation/index.js';
import { APP_SRC, CONSUMER_A, boundaryBypassImports, deepImports, publicApiImports } from './source-scan.js';

const PACKAGE_NAME = '@harness-hub/estimation';

describe('contract: @harness-hub/estimation', () => {
  it('consumer 系統 1 (apps/hub 本体) が public API 経由で参照している', () => {
    expect(publicApiImports(APP_SRC, PACKAGE_NAME).length).toBeGreaterThan(0);
    expect(deepImports(APP_SRC, PACKAGE_NAME)).toEqual([]);
  });

  it('consumer 系統 2 (consumer-a fixture) が public API 経由で参照している', () => {
    expect(publicApiImports(CONSUMER_A, PACKAGE_NAME).length).toBeGreaterThan(0);
    expect(deepImports(CONSUMER_A, PACKAGE_NAME)).toEqual([]);
  });

  it('相対 path で packages/ を直接参照している箇所が無い', () => {
    expect(boundaryBypassImports(APP_SRC)).toEqual([]);
    expect(boundaryBypassImports(CONSUMER_A)).toEqual([]);
  });

  it('2 系統が同一の実装 (同一オブジェクト) を指している', () => {
    expect(consumerA.boundEstimateSavings).toBe(estimateSavings);
    expect(consumerA.boundResolveHourlyRate).toBe(resolveHourlyRate);
  });

  it('Hub 側の結線層と fixture が同一入力で同一結果を返す', () => {
    const viaHub = calculateWorkspaceSavings(
      { hourlyRate: consumerA.sampleSavingsInput.hourlyRate },
      {
        runsPerYear: consumerA.sampleSavingsInput.runsPerYear,
        minutesPerRun: consumerA.sampleSavingsInput.minutesPerRun,
        reductionRate: consumerA.sampleSavingsInput.reductionRate,
      },
    );

    expect(viaHub).toEqual(consumerA.estimateSample());
  });

  it('Hub 側の結線層が計算式を持たず package に委譲している', () => {
    const settings = { hourlyRate: { kind: 'direct', hourlyRate: 5000 } } as const;
    const input = { runsPerYear: 100, minutesPerRun: 12, reductionRate: 0.25 };

    expect(calculateWorkspaceSavings(settings, input)).toEqual(
      estimateSavings({ ...input, hourlyRate: settings.hourlyRate }),
    );
  });
});
