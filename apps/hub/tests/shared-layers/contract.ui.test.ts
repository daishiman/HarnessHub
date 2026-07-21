// HF-A4-CONTRACT-001: @harness-hub/ui を 2 系統の consumer が public API 経由で参照し、同一実装を指すことを検証

import { Button } from '@harness-hub/ui';
import { describe, expect, it } from 'vitest';
import * as consumerA from '../fixtures/consumer-a/uses-ui';
import { APP_SRC, boundaryBypassImports, CONSUMER_A, deepImports, publicApiImports } from './source-scan.js';

const PACKAGE_NAME = '@harness-hub/ui';

describe('contract: @harness-hub/ui', () => {
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

  it('2 系統が同一の実装 (同一コンポーネント) を指している', () => {
    expect(consumerA.boundButton).toBe(Button);
  });
});
