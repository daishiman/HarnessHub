// ヒアリング共有のDB固有不変条件: token counterの原子性と、screenshotの補償・冪等削除。

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTursoClient, type TursoAdapter } from '@harness-hub/db/connection';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createHearingScreenshotsRepo } from '../repository/hearing-screenshots';
import { createHearingShareTokensRepo } from '../repository/hearing-share-tokens';
import type { TenantDataObjectRow, TenantDataRepo } from '../repository/tenant-data';
import { hearingScreenshots } from '../schema/hearing-intake/schema';
import { createRepositoryContext } from '../src/context';
import { EntityNotFoundError } from '../src/errors';
import type { RepositoryContext } from '../src/types';
import { asCore, createLibsqlTestDb } from './support/test-db';

const TENANT_ID = 'tenant-hearing-share';
const WORKSPACE_ID = 'workspace-hearing-share';
const ACTOR_ID = 'user-hearing-share';
const SCREENSHOT_ID = 'screenshot-1';
const OBJECT_ID = 'object-1';

const context = createRepositoryContext({
  tenantId: TENANT_ID,
  workspaceId: WORKSPACE_ID,
  actorId: ACTOR_ID,
});

const tenantDataRow: TenantDataObjectRow = {
  id: OBJECT_ID,
  tenantId: TENANT_ID,
  workspaceId: WORKSPACE_ID,
  kind: 'hearing_screenshot',
  title: 'Screenshot',
  r2Key: `tenant/${TENANT_ID}/${WORKSPACE_ID}/hearing_screenshot/${OBJECT_ID}`,
  sizeBytes: 3,
  contentHash: 'hash',
  encKeyVersion: 1,
  uploadedBy: ACTOR_ID,
  createdAt: 1_800_000_000_000,
};

function fakeTenantDataRepo(overrides: Partial<TenantDataRepo> = {}): TenantDataRepo {
  return {
    upload: async () => tenantDataRow,
    findById: async () => tenantDataRow,
    list: async () => ({ items: [], nextCursor: null }),
    getContent: async () => new Uint8Array([1, 2, 3]),
    deleteTenantDataObject: async () => undefined,
    ...overrides,
  };
}

describe('hearing share token repository', () => {
  it('別接続からの並行アクセスを単一SQLで全件加算し、lastAccessedAtを巻き戻さない', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'dmdb-hearing-share-counter-'));
    const url = `file:${join(tempDir, 'test.db')}`;
    const schemaOwner = await createLibsqlTestDb(url);
    const writers = [schemaOwner, ...Array.from({ length: 5 }, () => createTursoClient({ url }))];
    const reader = createTursoClient({ url });
    const tokenId = 'share-token-1';
    const tokenHash = 'a'.repeat(64);
    const baseMs = 1_800_000_000_000;
    const expiresAtMs = baseMs + 60_000;

    try {
      await createHearingShareTokensRepo(asCore(schemaOwner)).create(context, {
        id: tokenId,
        workspaceId: WORKSPACE_ID,
        sheetId: 'sheet-1',
        audience: 'harness_creator',
        tokenHash,
        expiresAt: expiresAtMs,
        createdByUserId: ACTOR_ID,
      });

      await Promise.all(
        writers.map((adapter, index) =>
          createHearingShareTokensRepo(asCore(adapter)).recordAccess(tokenId, baseMs + index),
        ),
      );

      const repo = createHearingShareTokensRepo(asCore(reader));
      const row = (await repo.listBySheetId(context, 'sheet-1'))[0];
      expect(row?.accessCount).toBe(writers.length);
      expect(row?.lastAccessedAt).toBe(baseMs + writers.length - 1);

      await repo.recordAccess(tokenId, baseMs - 1);
      const afterLateOldAccess = (await repo.listBySheetId(context, 'sheet-1'))[0];
      expect(afterLateOldAccess?.accessCount).toBe(writers.length + 1);
      expect(afterLateOldAccess?.lastAccessedAt).toBe(baseMs + writers.length - 1);

      expect(await repo.findValidByTokenHash(tokenHash, expiresAtMs - 1)).not.toBeNull();
      expect(await repo.findValidByTokenHash(tokenHash, expiresAtMs)).toBeNull();
    } finally {
      reader.close();
      for (const adapter of writers) adapter.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  }, 30_000);
});

describe('hearing screenshot repository', () => {
  let adapter: TursoAdapter;

  beforeEach(async () => {
    adapter = await createLibsqlTestDb();
  });

  afterEach(() => adapter.close());

  async function seedMetadata(): Promise<void> {
    await adapter.client.insert(hearingScreenshots).values({
      id: SCREENSHOT_ID,
      tenantId: TENANT_ID,
      workspaceId: WORKSPACE_ID,
      sheetId: 'sheet-1',
      tenantDataObjectId: OBJECT_ID,
      title: 'Screenshot',
      linkedItem: null,
      note: null,
      contentType: 'image/png',
      createdBy: ACTOR_ID,
      createdAt: 1_800_000_000_000,
    });
  }

  it('metadata insert失敗時に作成済みtenant_dataを補償削除する', async () => {
    const deleted: string[] = [];
    const tenantData = fakeTenantDataRepo({
      deleteTenantDataObject: async (_context, objectId) => {
        deleted.push(objectId);
      },
    });
    const repo = createHearingScreenshotsRepo(asCore(adapter), tenantData);

    await expect(
      repo.upload(context, {
        workspaceId: WORKSPACE_ID,
        sheetId: 'sheet-1',
        // DBのNOT NULL違反を意図的に起こし、2段目insertだけが失敗する経路を作る。
        title: undefined as unknown as string,
        contentType: 'image/png',
        plaintext: new Uint8Array([1, 2, 3]),
        uploadedBy: ACTOR_ID,
      }),
    ).rejects.toThrow();

    expect(deleted).toStrictEqual([OBJECT_ID]);
    expect(await repo.listBySheetId(context, 'sheet-1')).toHaveLength(0);
  });

  it('実体が既に無い再試行でもmetadataを削除し、contextのactor/workspaceをそのまま渡す', async () => {
    await seedMetadata();
    let observedContext: RepositoryContext | null = null;
    const tenantData = fakeTenantDataRepo({
      deleteTenantDataObject: async (received) => {
        observedContext = received;
        throw new EntityNotFoundError('tenant_data_objects', OBJECT_ID);
      },
      findById: async () => null,
    });
    const repo = createHearingScreenshotsRepo(asCore(adapter), tenantData);

    await expect(repo.deleteScreenshot(context, SCREENSHOT_ID)).resolves.toBeUndefined();
    expect(observedContext).toBe(context);
    expect(await repo.findById(context, SCREENSHOT_ID)).toBeNull();
  });

  it('tenant_data削除後のaudit失敗でもmetadataを掃除してから元エラーを返す', async () => {
    await seedMetadata();
    const auditFailure = new Error('audit unavailable');
    const tenantData = fakeTenantDataRepo({
      deleteTenantDataObject: async () => {
        throw auditFailure;
      },
      findById: async () => null,
    });
    const repo = createHearingScreenshotsRepo(asCore(adapter), tenantData);

    await expect(repo.deleteScreenshot(context, SCREENSHOT_ID)).rejects.toBe(auditFailure);
    expect(await repo.findById(context, SCREENSHOT_ID)).toBeNull();
  });

  it('tenant_data実体が残る削除失敗ではmetadataを保持して再試行可能にする', async () => {
    await seedMetadata();
    const storageFailure = new Error('R2 unavailable');
    const tenantData = fakeTenantDataRepo({
      deleteTenantDataObject: async () => {
        throw storageFailure;
      },
      findById: async () => tenantDataRow,
    });
    const repo = createHearingScreenshotsRepo(asCore(adapter), tenantData);

    await expect(repo.deleteScreenshot(context, SCREENSHOT_ID)).rejects.toBe(storageFailure);
    expect(await repo.findById(context, SCREENSHOT_ID)).not.toBeNull();
  });
});
