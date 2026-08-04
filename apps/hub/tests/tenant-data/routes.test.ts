/**
 * feat-tenant-data-retention の route 契約テスト (API-1〜API-5)。
 * 対応: docs/features/feat-tenant-data-retention/test-design.md §4.3。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthRuntime } from '../../src/lib/authz/runtime.js';

const runtimeHolder = vi.hoisted(() => ({ current: null as AuthRuntime | null }));

vi.mock('../../src/lib/authz/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/authz/index.js')>();
  return {
    ...actual,
    authRuntime: () => {
      if (runtimeHolder.current === null) throw new Error('テスト用 runtime が未設定です');
      return runtimeHolder.current;
    },
  };
});

import {
  auth,
  bodyOf,
  buildRequest,
  contentRoute,
  deleteRoute,
  detailRoute,
  listRoute,
  params,
  STRANGER_ID,
  sessionCookieFor,
  setTenantDataRateLimiterForTest,
  TENANT_B,
  tenantData,
  testUser,
  uploadForm,
  uploadRoute,
  WORKSPACE_A1,
} from './support/route-context.js';

beforeEach(() => {
  runtimeHolder.current = auth.runtime;
});

afterEach(() => {
  runtimeHolder.current = null;
});

describe('POST /tenant-data/objects: アップロード (API-1)', () => {
  it('201 と応答契約の形で返る', async () => {
    const request = await buildRequest('POST', '/tenant-data/objects', { formData: uploadForm({ title: 'a' }) });
    const response = await uploadRoute(request);

    expect(response.status).toBe(201);
    expect(await bodyOf(response)).toMatchObject({
      workspace_id: WORKSPACE_A1,
      kind: 'knowledge_doc',
      title: 'a',
      size_bytes: 3,
    });
  });

  it('multipart の workspaceId と header の x-harness-workspace-id が食い違うと 400', async () => {
    const request = await buildRequest('POST', '/tenant-data/objects', {
      formData: uploadForm({ workspaceId: 'ws-other' }),
    });
    const response = await uploadRoute(request);

    expect(response.status).toBe(400);
  });

  it('file が無いと 400 (zod ではなく明示チェック)', async () => {
    const form = uploadForm({});
    form.delete('file');
    const request = await buildRequest('POST', '/tenant-data/objects', { formData: form });
    const response = await uploadRoute(request);

    expect(response.status).toBe(400);
  });

  it('kind が enum 外だと 422 (zod 契約違反、problemDetailsFromZodError)', async () => {
    const request = await buildRequest('POST', '/tenant-data/objects', {
      formData: uploadForm({ kind: 'not_a_kind' }),
    });
    const response = await uploadRoute(request);

    expect(response.status).toBe(422);
  });

  it('rate limit (20 req/min) 超過で 429', async () => {
    setTenantDataRateLimiterForTest('upload', {
      consume: () => ({ allowed: false, limit: 20, remaining: 0, resetAtMs: 60_000 }),
    });
    const request = await buildRequest('POST', '/tenant-data/objects', { formData: uploadForm({}) });
    const response = await uploadRoute(request);

    expect(response.status).toBe(429);
  });

  it('member role で許可される', async () => {
    const cookie = await sessionCookieFor(testUser(STRANGER_ID));
    const request = await buildRequest('POST', '/tenant-data/objects', { cookie, formData: uploadForm({}) });
    const response = await uploadRoute(request);

    expect(response.status).toBe(201);
  });
});

describe('GET /tenant-data/objects: 一覧 (API-2)', () => {
  it('自テナント分のみ返す', async () => {
    tenantData.putRow({
      id: 'obj-a',
      tenantId: 'tenant-a',
      workspaceId: WORKSPACE_A1,
      kind: 'knowledge_doc',
      title: 'mine',
      r2Key: 'k1',
      sizeBytes: 1,
      contentHash: 'h1',
      encKeyVersion: 1,
      uploadedBy: 'user-1',
      createdAt: 1,
    });
    tenantData.putRow({
      id: 'obj-b',
      tenantId: TENANT_B,
      workspaceId: WORKSPACE_A1,
      kind: 'knowledge_doc',
      title: 'other-tenant',
      r2Key: 'k2',
      sizeBytes: 1,
      contentHash: 'h2',
      encKeyVersion: 1,
      uploadedBy: 'user-1',
      createdAt: 1,
    });

    const request = await buildRequest('GET', `/tenant-data/objects?workspaceId=${WORKSPACE_A1}`);
    const response = await listRoute(request);
    const body = await bodyOf(response);

    expect(response.status).toBe(200);
    expect((body.items as unknown[]).map((row) => (row as { id: string }).id)).toStrictEqual(['obj-a']);
  });

  it('query の workspaceId と header が食い違うと 400', async () => {
    const request = await buildRequest('GET', '/tenant-data/objects?workspaceId=ws-other');
    const response = await listRoute(request);

    expect(response.status).toBe(400);
  });

  it('rate limit (120 req/min) 超過で 429', async () => {
    setTenantDataRateLimiterForTest('list', {
      consume: () => ({ allowed: false, limit: 120, remaining: 0, resetAtMs: 60_000 }),
    });
    const request = await buildRequest('GET', `/tenant-data/objects?workspaceId=${WORKSPACE_A1}`);
    const response = await listRoute(request);

    expect(response.status).toBe(429);
  });
});

describe('GET /tenant-data/objects/:id: メタ取得 (API-3)', () => {
  it('自テナントの資源は 200', async () => {
    const uploaded = await tenantData.repo.upload(
      { tenantId: 'tenant-a', workspaceId: WORKSPACE_A1, actorId: 'user-1' },
      {
        workspaceId: WORKSPACE_A1,
        kind: 'knowledge_doc',
        title: 't',
        plaintext: new Uint8Array([1]),
        uploadedBy: 'user-1',
      },
    );

    const request = await buildRequest('GET', `/tenant-data/objects/${uploaded.id}`);
    const response = await detailRoute(request, params({ id: uploaded.id }));

    expect(response.status).toBe(200);
  });

  it('他テナントの :id 指定は 404 (存在秘匿。403 を返さない — T-12 パターン)', async () => {
    const uploaded = await tenantData.repo.upload(
      { tenantId: TENANT_B, workspaceId: WORKSPACE_A1, actorId: 'user-9' },
      {
        workspaceId: WORKSPACE_A1,
        kind: 'knowledge_doc',
        title: 't',
        plaintext: new Uint8Array([1]),
        uploadedBy: 'user-9',
      },
    );

    const request = await buildRequest('GET', `/tenant-data/objects/${uploaded.id}`);
    const response = await detailRoute(request, params({ id: uploaded.id }));

    expect(response.status).toBe(404);
  });

  it('存在しない id も 404', async () => {
    const request = await buildRequest('GET', '/tenant-data/objects/does-not-exist');
    const response = await detailRoute(request, params({ id: 'does-not-exist' }));

    expect(response.status).toBe(404);
  });

  it('rate limit (120 req/min) 超過で 429', async () => {
    setTenantDataRateLimiterForTest('read', {
      consume: () => ({ allowed: false, limit: 120, remaining: 0, resetAtMs: 60_000 }),
    });
    const request = await buildRequest('GET', '/tenant-data/objects/whatever');
    const response = await detailRoute(request, params({ id: 'whatever' }));

    expect(response.status).toBe(429);
  });
});

describe('GET /tenant-data/objects/:id/content: 本体取得 (API-4)', () => {
  it('認可 MW 通過後に復号済み本体を返す', async () => {
    const plaintext = new Uint8Array([9, 8, 7]);
    const uploaded = await tenantData.repo.upload(
      { tenantId: 'tenant-a', workspaceId: WORKSPACE_A1, actorId: 'user-1' },
      { workspaceId: WORKSPACE_A1, kind: 'knowledge_doc', title: 't', plaintext, uploadedBy: 'user-1' },
    );

    const request = await buildRequest('GET', `/tenant-data/objects/${uploaded.id}/content`);
    const response = await contentRoute(request, params({ id: uploaded.id }));

    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toStrictEqual(plaintext);
  });

  it('他テナントの :id は 404', async () => {
    const uploaded = await tenantData.repo.upload(
      { tenantId: TENANT_B, workspaceId: WORKSPACE_A1, actorId: 'user-9' },
      {
        workspaceId: WORKSPACE_A1,
        kind: 'knowledge_doc',
        title: 't',
        plaintext: new Uint8Array([1]),
        uploadedBy: 'user-9',
      },
    );

    const request = await buildRequest('GET', `/tenant-data/objects/${uploaded.id}/content`);
    const response = await contentRoute(request, params({ id: uploaded.id }));

    expect(response.status).toBe(404);
  });

  it('rate limit (60 req/min) 超過で 429', async () => {
    setTenantDataRateLimiterForTest('readContent', {
      consume: () => ({ allowed: false, limit: 60, remaining: 0, resetAtMs: 60_000 }),
    });
    const request = await buildRequest('GET', '/tenant-data/objects/whatever/content');
    const response = await contentRoute(request, params({ id: 'whatever' }));

    expect(response.status).toBe(429);
  });
});

describe('DELETE /tenant-data/objects/:id: 削除 (API-5)', () => {
  it('削除実行後、一覧・取得の双方から消える (DMDB-T16 TC-6〜TC-9 と整合)', async () => {
    const uploaded = await tenantData.repo.upload(
      { tenantId: 'tenant-a', workspaceId: WORKSPACE_A1, actorId: 'user-1' },
      {
        workspaceId: WORKSPACE_A1,
        kind: 'knowledge_doc',
        title: 't',
        plaintext: new Uint8Array([1]),
        uploadedBy: 'user-1',
      },
    );

    const request = await buildRequest('DELETE', `/tenant-data/objects/${uploaded.id}`);
    const response = await deleteRoute(request, params({ id: uploaded.id }));

    expect(response.status).toBe(204);
    expect(tenantData.rows().find((row) => row.id === uploaded.id)).toBeUndefined();
  });

  it('member role では拒否される (workspace-admin 未満、復元不可な破壊的操作のため)', async () => {
    const uploaded = await tenantData.repo.upload(
      { tenantId: 'tenant-a', workspaceId: WORKSPACE_A1, actorId: 'user-1' },
      {
        workspaceId: WORKSPACE_A1,
        kind: 'knowledge_doc',
        title: 't',
        plaintext: new Uint8Array([1]),
        uploadedBy: 'user-1',
      },
    );

    const cookie = await sessionCookieFor(testUser(STRANGER_ID));
    const request = await buildRequest('DELETE', `/tenant-data/objects/${uploaded.id}`, { cookie });
    const response = await deleteRoute(request, params({ id: uploaded.id }));

    expect(response.status).toBe(403);
  });

  it('存在しない id は 404', async () => {
    const request = await buildRequest('DELETE', '/tenant-data/objects/does-not-exist');
    const response = await deleteRoute(request, params({ id: 'does-not-exist' }));

    expect(response.status).toBe(404);
  });

  it('rate limit (20 req/min) 超過で 429', async () => {
    setTenantDataRateLimiterForTest('delete', {
      consume: () => ({ allowed: false, limit: 20, remaining: 0, resetAtMs: 60_000 }),
    });
    const request = await buildRequest('DELETE', '/tenant-data/objects/whatever');
    const response = await deleteRoute(request, params({ id: 'whatever' }));

    expect(response.status).toBe(429);
  });
});
