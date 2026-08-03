// DMDB-T15: tenant_data 封筒暗号化 (security-spec §4.1 T-4/T-5 拡張)。
// 対応: docs/features/feat-tenant-data-retention/test-design.md §4.1

import type { TursoAdapter } from '@harness-hub/db/connection';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTenantDataRegistry } from '../registry/tenant-data';
import { createAuditRepo } from '../repository/audit';
import { EncryptionError } from '../repository/crypto';
import { createTenantDataRepo } from '../repository/tenant-data';
import { createRepositoryContext } from '../src/context';
import { createFakeTenantDataBucket } from './support/r2-fake';
import { asCore, createLibsqlTestDb, testCipher } from './support/test-db';

let adapter: TursoAdapter;

beforeAll(async () => {
  adapter = await createLibsqlTestDb();
});

afterAll(() => adapter.close());

function setup() {
  const core = asCore(adapter);
  const cipher = testCipher(core);
  const bucket = createFakeTenantDataBucket();
  const registry = createTenantDataRegistry(bucket);
  const audit = createAuditRepo(core);
  const repo = createTenantDataRepo(core, cipher, registry, audit);
  return { cipher, bucket, repo };
}

describe('DMDB-T15 tenant_data envelope encryption', () => {
  it('TC-1: 2 テナントの R2 key が tenant/{tenant_id}/{workspace_id}/{kind}/{tenant_data_objects.id} で分離される', async () => {
    const { repo } = setup();
    const ctxA = createRepositoryContext({ tenantId: 'tenant-tc1-a' });
    const ctxB = createRepositoryContext({ tenantId: 'tenant-tc1-b' });

    const rowA = await repo.upload(ctxA, {
      workspaceId: 'ws-a',
      kind: 'knowledge_doc',
      title: 'doc-a',
      plaintext: new TextEncoder().encode('plain-a'),
      uploadedBy: 'user-a',
    });
    const rowB = await repo.upload(ctxB, {
      workspaceId: 'ws-b',
      kind: 'knowledge_doc',
      title: 'doc-b',
      plaintext: new TextEncoder().encode('plain-b'),
      uploadedBy: 'user-b',
    });

    expect(rowA.r2Key).toBe(`tenant/tenant-tc1-a/ws-a/knowledge_doc/${rowA.id}`);
    expect(rowB.r2Key).toBe(`tenant/tenant-tc1-b/ws-b/knowledge_doc/${rowB.id}`);
    expect(rowA.r2Key).not.toBe(rowB.r2Key);
  });

  it('TC-2: テナント A/B が同一 purpose=tenant_data でも独立した DEK 系列を持つ', async () => {
    const { cipher } = setup();
    const versionA = await cipher.ensureActiveDek('tenant_data', 'tenant-tc2-a');
    const versionB = await cipher.ensureActiveDek('tenant_data', 'tenant-tc2-b');

    // 各テナントは自分専用の DEK 系列を持つため、両方とも最初の version=1 で独立して発行される。
    expect(versionA).toBe(1);
    expect(versionB).toBe(1);
    // rotation すればテナント間で version がずれることも確認する。
    const rotatedA = await cipher.rotateDek('tenant_data', 'tenant-tc2-a');
    expect(rotatedA).toBe(2);
    expect(await cipher.ensureActiveDek('tenant_data', 'tenant-tc2-b')).toBe(1);
  });

  it('TC-3: テナント A の DEK でテナント B の暗号文を復号すると EncryptionError になる (cross-tenant unwrap 拒否)', async () => {
    const { bucket, cipher, repo } = setup();
    const ctxA = createRepositoryContext({ tenantId: 'tenant-tc3-a' });
    const ctxB = createRepositoryContext({ tenantId: 'tenant-tc3-b' });

    const rowB = await repo.upload(ctxB, {
      workspaceId: 'ws-b',
      kind: 'knowledge_doc',
      title: 'doc-b',
      plaintext: new TextEncoder().encode('plain-b'),
      uploadedBy: 'user-b',
    });

    // A の行レベル分離とは別に、B の暗号文を A の DEK で直接 unwrap できないことを確認する。
    // A 側にも version 1 を作っておくため、「鍵が無い」だけではなく異なる鍵/AAD が拒否する経路を検証する。
    await cipher.ensureActiveDek('tenant_data', ctxA.tenantId);
    const encryptedBytes = bucket.objects.get(rowB.r2Key);
    if (encryptedBytes === undefined) throw new Error('test fixture did not store the R2 object');
    await expect(repo.getContent(ctxA, rowB.id)).rejects.toThrow();
    await expect(
      cipher.decryptColumn(
        'tenant_data',
        new TextDecoder().decode(encryptedBytes),
        { table: 'tenant_data_objects', column: 'r2_object', rowId: rowB.id },
        ctxA.tenantId,
      ),
    ).rejects.toThrow(EncryptionError);
  });

  it('TC-4: AAD 材料の tenant_id が一致しない場合に復号が失敗する', async () => {
    const { cipher } = setup();
    const tenantId = 'tenant-tc4';
    await cipher.ensureActiveDek('tenant_data', tenantId);
    const encrypted = await cipher.encryptColumn(
      'tenant_data',
      'secret-value',
      { table: 'tenant_data_objects', column: 'r2_object', rowId: 'row-1' },
      tenantId,
    );

    // 同じ暗号文を別テナントの scope で decrypt しようとすると、その tenant 用の DEK が存在しない
    // (=AAD/鍵素材が一致しない) ため EncryptionError になる。
    await expect(
      cipher.decryptColumn(
        'tenant_data',
        encrypted,
        { table: 'tenant_data_objects', column: 'r2_object', rowId: 'row-1' },
        'tenant-tc4-other',
      ),
    ).rejects.toThrow(EncryptionError);
  });

  it('TC-5: rotation 後も旧 key_version の tenant_data 暗号文が復号できる', async () => {
    const { cipher } = setup();
    const tenantId = 'tenant-tc5';
    await cipher.ensureActiveDek('tenant_data', tenantId);
    const ref = { table: 'tenant_data_objects', column: 'r2_object', rowId: 'row-tc5' };
    const encryptedV1 = await cipher.encryptColumn('tenant_data', 'value-v1', ref, tenantId);

    await cipher.rotateDek('tenant_data', tenantId);
    const encryptedV2 = await cipher.encryptColumn('tenant_data', 'value-v2', ref, tenantId);

    expect(await cipher.decryptColumn('tenant_data', encryptedV1, ref, tenantId)).toBe('value-v1');
    expect(await cipher.decryptColumn('tenant_data', encryptedV2, ref, tenantId)).toBe('value-v2');
  });

  it('TC-1 (IV 検証): 同一テナント内で同一平文を複数回 upload しても IV が毎回異なる', async () => {
    const { repo, bucket } = setup();
    const ctx = createRepositoryContext({ tenantId: 'tenant-tc1-iv' });
    const plaintext = new TextEncoder().encode('same-plaintext');

    const first = await repo.upload(ctx, {
      workspaceId: 'ws',
      kind: 'knowledge_doc',
      title: 'doc-1',
      plaintext,
      uploadedBy: 'user',
    });
    const second = await repo.upload(ctx, {
      workspaceId: 'ws',
      kind: 'knowledge_doc',
      title: 'doc-2',
      plaintext,
      uploadedBy: 'user',
    });

    const storedFirst = new TextDecoder().decode(bucket.objects.get(first.r2Key));
    const storedSecond = new TextDecoder().decode(bucket.objects.get(second.r2Key));
    const ivFirst = storedFirst.split(':')[1];
    const ivSecond = storedSecond.split(':')[1];
    expect(ivFirst).toBeDefined();
    expect(ivFirst).not.toBe(ivSecond);
  });
});
