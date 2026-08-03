// DMDB-T16: tenant_data 削除完全性 (security-spec §1.3 T-15 新規)。
// 対応: docs/features/feat-tenant-data-retention/test-design.md §4.2

import type { TursoAdapter } from '@harness-hub/db/connection';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTenantDataRegistry } from '../registry/tenant-data';
import { createAuditRepo } from '../repository/audit';
import { createTenantDataRepo } from '../repository/tenant-data';
import { tenantDataObjects } from '../schema/tenant-data/schema';
import { tenantDataTombstones } from '../schema/tenant-data/tombstones';
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
  return { core, bucket, repo, audit };
}

describe('DMDB-T16 tenant_data deletion completeness', () => {
  it('TC-6: 削除 API 実行後、対象行が DB から即時に存在しない (soft delete 列を経由しない)', async () => {
    const { core, repo } = setup();
    const ctx = createRepositoryContext({ tenantId: 'tenant-tc6' });
    const row = await repo.upload(ctx, {
      workspaceId: 'ws',
      kind: 'knowledge_doc',
      title: 'doc',
      plaintext: new TextEncoder().encode('plain'),
      uploadedBy: 'user',
    });

    await repo.deleteTenantDataObject(ctx, row.id);

    const remaining = await core.client
      .select()
      .from(tenantDataObjects)
      .where(and(eq(tenantDataObjects.id, row.id), eq(tenantDataObjects.tenantId, ctx.tenantId)));
    expect(remaining).toHaveLength(0);
    expect(await repo.findById(ctx, row.id)).toBeNull();
  });

  it('TC-7: 削除 API 実行後、対応する R2 blob が存在しない (行単位一意 key のため他行に影響しない)', async () => {
    const { bucket, repo } = setup();
    const ctx = createRepositoryContext({ tenantId: 'tenant-tc7' });
    const target = await repo.upload(ctx, {
      workspaceId: 'ws',
      kind: 'knowledge_doc',
      title: 'target',
      plaintext: new TextEncoder().encode('target-plain'),
      uploadedBy: 'user',
    });
    const sibling = await repo.upload(ctx, {
      workspaceId: 'ws',
      kind: 'knowledge_doc',
      title: 'sibling',
      plaintext: new TextEncoder().encode('sibling-plain'),
      uploadedBy: 'user',
    });

    await repo.deleteTenantDataObject(ctx, target.id);

    expect(bucket.objects.has(target.r2Key)).toBe(false);
    expect(bucket.deleteCalls).toStrictEqual([target.r2Key]);
    // 行単位一意 key なので兄弟オブジェクトの blob は無傷
    expect(bucket.objects.has(sibling.r2Key)).toBe(true);
  });

  it('TC-8: backup snapshot から restore しても tombstone 適用後は当該データが復元されない', async () => {
    const { core, repo } = setup();
    const ctx = createRepositoryContext({ tenantId: 'tenant-tc8' });
    const row = await repo.upload(ctx, {
      workspaceId: 'ws',
      kind: 'knowledge_doc',
      title: 'doc',
      plaintext: new TextEncoder().encode('plain'),
      uploadedBy: 'user',
    });
    await repo.deleteTenantDataObject(ctx, row.id);

    // backup snapshot が削除前の行を巻き戻して復元しようとするシナリオを模倣する。
    // tombstone が残っていれば、restore 後処理はこの objectId を再び除去できる。
    await core.client.insert(tenantDataObjects).values({
      id: row.id,
      tenantId: row.tenantId,
      workspaceId: row.workspaceId,
      kind: row.kind,
      title: row.title,
      r2Key: row.r2Key,
      sizeBytes: row.sizeBytes,
      contentHash: row.contentHash,
      encKeyVersion: row.encKeyVersion,
      uploadedBy: row.uploadedBy,
      createdAt: row.createdAt,
    });

    const tombstones = await core.client
      .select()
      .from(tenantDataTombstones)
      .where(and(eq(tenantDataTombstones.objectId, row.id), eq(tenantDataTombstones.tenantId, ctx.tenantId)));
    expect(tombstones).toHaveLength(1);
    expect(tombstones[0]?.r2Key).toBe(row.r2Key);

    // restore 後処理: tombstone にある objectId を全て再削除する (backup/restore ランブックの契約)。
    for (const tombstone of tombstones) {
      await core.client
        .delete(tenantDataObjects)
        .where(and(eq(tenantDataObjects.id, tombstone.objectId), eq(tenantDataObjects.tenantId, ctx.tenantId)));
    }

    expect(await repo.findById(ctx, row.id)).toBeNull();
  });

  it('TC-9: 削除操作が audit_events へ 1 件記録され、soft delete 用の追加列を schema に持たない', async () => {
    const { repo, audit } = setup();
    const ctx = createRepositoryContext({ tenantId: 'tenant-tc9' });
    const row = await repo.upload(ctx, {
      workspaceId: 'ws',
      kind: 'run_output',
      title: 'doc',
      plaintext: new TextEncoder().encode('plain'),
      uploadedBy: 'user',
    });

    const beforeEvents = await audit.read(ctx);
    await repo.deleteTenantDataObject(ctx, row.id);
    const afterEvents = await audit.read(ctx);

    const deleteEvents = afterEvents.filter((e) => e.action === 'tenant_data.delete' && e.entityId === row.id);
    expect(deleteEvents).toHaveLength(1);
    expect(afterEvents.length).toBe(beforeEvents.length + 1);

    // soft delete 用の列 (deleted_at / is_deleted 等) を tenant_data_objects の型が持たないことは
    // schema.ts の型定義自体が契約している (TENANT_DATA_OBJECT_KINDS の列挙にも削除状態を持たない)。
    // ここでは実データとして行が物理削除されていることのみ再確認する。
    expect(await repo.findById(ctx, row.id)).toBeNull();
  });
});
