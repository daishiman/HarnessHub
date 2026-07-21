// HF-A4-CONTRACT-002: @harness-hub/schemas を 2 系統の consumer が public API 経由で参照し、同一実装を指すことを検証

import { buildHealthResponse, deriveHealthStatus, healthResponseSchema } from '@harness-hub/schemas';
import { describe, expect, it } from 'vitest';
import * as consumerA from '../fixtures/consumer-a/uses-schemas.js';
import { APP_SRC, boundaryBypassImports, CONSUMER_A, deepImports, publicApiImports } from './source-scan.js';

const PACKAGE_NAME = '@harness-hub/schemas';

describe('contract: @harness-hub/schemas', () => {
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
    expect(consumerA.boundHealthResponseSchema).toBe(healthResponseSchema);
    expect(consumerA.boundBuildHealthResponse).toBe(buildHealthResponse);
    expect(consumerA.boundDeriveHealthStatus).toBe(deriveHealthStatus);
  });

  it('2 系統の判定結果が一致する (schema による検証結果の同値)', () => {
    const dependencies = [
      { name: 'db', status: 'ok' as const },
      { name: 'mail', status: 'degraded' as const },
    ];

    const viaConsumerA = consumerA.composeHealthBody(dependencies);
    const viaHub = healthResponseSchema.parse(
      buildHealthResponse({
        version: 'consumer-a',
        checkedAt: new Date('2026-07-20T00:00:00.000Z'),
        dependencies,
      }),
    );

    expect(viaConsumerA).toEqual(viaHub);
    expect(viaConsumerA.status).toBe(deriveHealthStatus(dependencies));
  });
});
