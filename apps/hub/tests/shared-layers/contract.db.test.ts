// @harness-hub/db (repository-layer) の consumer 2 系統検証。
// この層は境界と型のみを所有し、スキーマ実体は feat-domain-model-db の責務 (ADR §11.3-7) なので、
// 確かめるのは「境界型・生成関数が 2 系統から public API 経由で参照でき、同一実装を指していること」まで。

import { createRepositoryContext, DATABASE_DRIVERS, normalizePageRequest } from '@harness-hub/db';
import { describe, expect, it } from 'vitest';
import * as consumerA from '../fixtures/consumer-a/uses-db.js';
import { APP_SRC, boundaryBypassImports, CONSUMER_A, deepImports, publicApiImports } from './source-scan.js';

const PACKAGE_NAME = '@harness-hub/db';

describe('contract: @harness-hub/db', () => {
  it('consumer 系統 1 (apps/hub 本体) が public API 経由で参照している', () => {
    // 実体は src/shared/audit が RepositoryContext を境界型として使っている
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
    expect(consumerA.boundCreateRepositoryContext).toBe(createRepositoryContext);
    expect(consumerA.boundNormalizePageRequest).toBe(normalizePageRequest);
    expect(consumerA.boundDatabaseDrivers).toBe(DATABASE_DRIVERS);
  });

  it('境界型が consumer 側から実際に構築できる', () => {
    expect(consumerA.sampleContext).toStrictEqual({
      tenantId: 'tenant-a',
      workspaceId: 'workspace-1',
      actorId: 'user-1',
    });
    // 境界が空スコープを弾いていることも consumer 経由で確かめる (緩めると tenant 分離が崩れる)
    expect(() => consumerA.boundCreateRepositoryContext({ tenantId: ' ' })).toThrow();
  });

  it('ページング既定値が package 側の単一ソースから来ている', () => {
    expect(consumerA.normalizeSample()).toStrictEqual(normalizePageRequest());
    expect(consumerA.emptyResultPage().items).toStrictEqual([]);
    expect(consumerA.supportsDriver('unknown-driver')).toBe(false);
  });
});
