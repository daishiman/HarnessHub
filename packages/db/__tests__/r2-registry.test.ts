// DMDB-T05: R2 content-addressed PackageRegistry (C4)。冪等 put・immutable・決定的 key。

import { createPackageRegistry, packageR2Key } from '@harness-hub/db/registry';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TursoAdapter } from '../connection/turso';
import { sha256Hex } from '../repository/bytes';
import { createPackagesRepo } from '../repository/packages';
import { createFakeR2Bucket, streamToBytes } from './support/r2-fake';
import { asCore, createLibsqlTestDb } from './support/test-db';

let adapter: TursoAdapter;

beforeAll(async () => {
  adapter = await createLibsqlTestDb();
});

afterAll(() => adapter.close());

describe('DMDB-T05 R2 content-addressed registry', () => {
  it('putPackage が sha256 content hash と決定的 r2_key を返す', async () => {
    const bucket = createFakeR2Bucket();
    const registry = createPackageRegistry(bucket);
    const body = new TextEncoder().encode('skill-package-body');

    const result = await registry.putPackage(body);
    expect(result.contentHash).toBe(await sha256Hex(body));
    expect(result.r2Key).toBe(packageR2Key(result.contentHash));
    expect(result.sizeBytes).toBe(body.length);
  });

  it('同一内容の再 put は書込なしで同一結果を返す (冪等・immutable)', async () => {
    const bucket = createFakeR2Bucket();
    const registry = createPackageRegistry(bucket);
    const body = new TextEncoder().encode('same-content');

    const first = await registry.putPackage(body);
    const second = await registry.putPackage(body);
    expect(second).toStrictEqual(first);
    expect(bucket.putCalls.length).toBe(1); // 2 回目は書込スキップ = 上書き禁止
  });

  it('getPackage round-trip でバイト列が一致する', async () => {
    const bucket = createFakeR2Bucket();
    const registry = createPackageRegistry(bucket);
    const body = crypto.getRandomValues(new Uint8Array(1024));

    const { contentHash } = await registry.putPackage(body);
    const stream = await registry.getPackage(contentHash);
    expect(stream).not.toBeNull();
    const roundTripped = await streamToBytes(stream as ReadableStream<Uint8Array>);
    expect(roundTripped).toStrictEqual(body);

    expect(await registry.getPackage('0'.repeat(64))).toBeNull();
  });

  it('DB 側 (packages テーブル) は content_hash/r2_key/size_bytes/kind の参照のみを保持する (C4)', async () => {
    const repo = createPackagesRepo(asCore(adapter));
    const body = new TextEncoder().encode('db-ref');
    const contentHash = await sha256Hex(body);

    const recorded = await repo.record({
      contentHash,
      r2Key: packageR2Key(contentHash),
      sizeBytes: body.length,
      kind: 'skills-package',
    });
    // 再登録は no-op (冪等)
    const again = await repo.record({
      contentHash,
      r2Key: packageR2Key(contentHash),
      sizeBytes: body.length,
      kind: 'skills-package',
    });
    expect(again).toStrictEqual(recorded);
    expect(Object.keys(recorded).sort()).toStrictEqual(['contentHash', 'createdAt', 'kind', 'r2Key', 'sizeBytes']);
  });
});
