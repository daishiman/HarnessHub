/**
 * `sheets/{id}/screenshots` と `sheets/{id}/handoff-tokens` の認証必須 route の契約。
 *
 * 認可判定 (`withAuthz`/`decide`) は本物を通し、`hearingIntakeRuntime`/`hearingShareRuntime`
 * の port だけを in-memory 実装へ差し替える (`tenant-data/routes.test.ts` と同じ方針)。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthRuntime } from '../../src/lib/authz/runtime.js';

const runtimeHolder = vi.hoisted(() => ({ current: null as AuthRuntime | null }));
const hearingIntakeHolder = vi.hoisted(() => ({ current: null as unknown }));

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

vi.mock('../../src/features/hearing-intake/runtime.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/features/hearing-intake/runtime.js')>();
  return {
    ...actual,
    hearingIntakeRuntime: () => hearingIntakeHolder.current,
  };
});

import { PATCH as revokeHandoffTokenRoute } from '../../src/app/api/v1/sheets/[id]/handoff-tokens/[tokenId]/route.js';
import {
  POST as issueHandoffTokenRoute,
  GET as listHandoffTokensRoute,
} from '../../src/app/api/v1/sheets/[id]/handoff-tokens/route.js';
import {
  DELETE as deleteOneScreenshotRoute,
  GET as downloadOneScreenshotRoute,
} from '../../src/app/api/v1/sheets/[id]/screenshots/[screenshotId]/route.js';
import {
  GET as getScreenshotsRoute,
  POST as uploadScreenshotRoute,
} from '../../src/app/api/v1/sheets/[id]/screenshots/route.js';
import { setHearingShareRuntimeForTest } from '../../src/lib/hearing-share/index.js';
import { setTenantDataRateLimiterForTest } from '../../src/lib/tenant-data/index.js';
import { createTokenRouteHarness, type TokenRouteHarness } from '../auth-tenancy/support/token-route-runtime.js';
import {
  ADMIN_ID,
  bodyOf,
  buildAuthedRequest,
  buildSheetRow,
  createInMemoryHearingIntakeRuntime,
  createInMemoryHearingShareRuntime,
  type InMemoryHearingShareRuntime,
  OWNER_ID,
  PNG_IMAGE_BYTES,
  params,
  STRANGER_ID,
  sessionCookieFor,
  TENANT_B,
  testUser,
  uploadForm,
} from './support/handoff-route-context.js';

let auth: TokenRouteHarness;
let share: InMemoryHearingShareRuntime;

beforeEach(() => {
  auth = createTokenRouteHarness();
  runtimeHolder.current = auth.runtime;
  hearingIntakeHolder.current = createInMemoryHearingIntakeRuntime([buildSheetRow({ applicantUserId: OWNER_ID })]);
  share = createInMemoryHearingShareRuntime();
  setHearingShareRuntimeForTest(share);
  setTenantDataRateLimiterForTest('upload', null);
  setTenantDataRateLimiterForTest('read', null);
  setTenantDataRateLimiterForTest('readContent', null);
  setTenantDataRateLimiterForTest('delete', null);
  // `readAuthRuntimeEnv` は handoff-tokens/公開 route から直接呼ばれ (authRuntime() 経由ではない)、
  // fail-closed で全キー必須。ここでだけ最小限の値を与える (auth.runtime 自体はモック済み)。
  process.env.AUTH_SESSION_SECRET = 'session-secret';
  process.env.AUTH_ACCESS_TOKEN_SECRET = 'access-secret';
  process.env.AUTH_ALLOWED_ORIGINS = 'https://hub.example.com';
  process.env.AUTH_DEVICE_VERIFICATION_URI = 'https://hub.example.com/device';
  process.env.AUTH_CANONICAL_ORIGIN = 'https://hub.example.com';
});

afterEach(() => {
  runtimeHolder.current = null;
  hearingIntakeHolder.current = null;
  setHearingShareRuntimeForTest(null);
  setTenantDataRateLimiterForTest('upload', null);
  setTenantDataRateLimiterForTest('read', null);
  setTenantDataRateLimiterForTest('readContent', null);
  setTenantDataRateLimiterForTest('delete', null);
  delete process.env.AUTH_SESSION_SECRET;
  delete process.env.AUTH_ACCESS_TOKEN_SECRET;
  delete process.env.AUTH_ALLOWED_ORIGINS;
  delete process.env.AUTH_DEVICE_VERIFICATION_URI;
  delete process.env.AUTH_CANONICAL_ORIGIN;
});

describe('POST /sheets/:id/screenshots: アップロード', () => {
  it('所有者は 201 で応答契約の形が返る', async () => {
    const request = await buildAuthedRequest('POST', '/api/v1/sheets/sheet-1/screenshots', {
      formData: uploadForm({ title: '参考URL A の画面', linkedItem: '参考URL A', note: 'メモ' }),
    });
    const response = await uploadScreenshotRoute(request, params({ id: 'sheet-1' }));

    expect(response.status).toBe(201);
    expect(await bodyOf(response)).toMatchObject({
      title: '参考URL A の画面',
      linked_item: '参考URL A',
      note: 'メモ',
      content_type: 'image/png',
    });
  });

  it('PNG/JPEG/WebP allowlist 以外は 400', async () => {
    const request = await buildAuthedRequest('POST', '/api/v1/sheets/sheet-1/screenshots', {
      formData: uploadForm({ file: new File([new Uint8Array([1])], 'doc.txt', { type: 'text/plain' }) }),
    });
    const response = await uploadScreenshotRoute(request, params({ id: 'sheet-1' }));

    expect(response.status).toBe(400);
  });

  it('image/png と申告した HTML/SVG や MIME 偽装を実バイト検査で拒否する', async () => {
    const attempts = [
      new File([new TextEncoder().encode('<html><script>alert(1)</script></html>')], 'fake.png', {
        type: 'image/png',
      }),
      new File([new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>')], 'active.svg', {
        type: 'image/svg+xml',
      }),
      new File([PNG_IMAGE_BYTES], 'mismatch.jpg', { type: 'image/jpeg' }),
      new File([PNG_IMAGE_BYTES, new TextEncoder().encode('<script>alert(1)</script>')], 'polyglot.png', {
        type: 'image/png',
      }),
    ];

    for (const file of attempts) {
      const request = await buildAuthedRequest('POST', '/api/v1/sheets/sheet-1/screenshots', {
        formData: uploadForm({ file }),
      });
      const response = await uploadScreenshotRoute(request, params({ id: 'sheet-1' }));
      expect(response.status).toBe(400);
    }
    expect(share.screenshotContents.size).toBe(0);
  });

  it('tenant-data と共有する upload rate limit の超過は buffer/保存前に 429', async () => {
    setTenantDataRateLimiterForTest('upload', {
      consume: () => ({ allowed: false, limit: 20, remaining: 0, resetAtMs: Date.now() + 60_000 }),
    });
    const request = await buildAuthedRequest('POST', '/api/v1/sheets/sheet-1/screenshots', {
      formData: uploadForm({}),
    });
    const response = await uploadScreenshotRoute(request, params({ id: 'sheet-1' }));

    expect(response.status).toBe(429);
    expect(share.screenshotContents.size).toBe(0);
  });

  it('他人の sheet への操作は 403', async () => {
    const cookie = await sessionCookieFor(testUser(STRANGER_ID));
    const request = await buildAuthedRequest('POST', '/api/v1/sheets/sheet-1/screenshots', {
      cookie,
      formData: uploadForm({}),
    });
    const response = await uploadScreenshotRoute(request, params({ id: 'sheet-1' }));

    expect(response.status).toBe(403);
  });

  it('存在しない sheet は 404', async () => {
    const request = await buildAuthedRequest('POST', '/api/v1/sheets/does-not-exist/screenshots', {
      formData: uploadForm({}),
    });
    const response = await uploadScreenshotRoute(request, params({ id: 'does-not-exist' }));

    expect(response.status).toBe(404);
  });

  it('他テナントの header 申告は 404 (tenant_mismatch)', async () => {
    const request = await buildAuthedRequest('POST', '/api/v1/sheets/sheet-1/screenshots', {
      tenantId: TENANT_B,
      formData: uploadForm({}),
    });
    const response = await uploadScreenshotRoute(request, params({ id: 'sheet-1' }));

    expect(response.status).toBe(404);
  });
});

describe('GET /sheets/:id/screenshots → DELETE: 一覧と削除', () => {
  it('所有者は安全なheader付きで添付画像をダウンロードできる', async () => {
    const uploadRequest = await buildAuthedRequest('POST', '/api/v1/sheets/sheet-1/screenshots', {
      formData: uploadForm({ title: '確認画面.png' }),
    });
    const uploaded = await bodyOf(await uploadScreenshotRoute(uploadRequest, params({ id: 'sheet-1' })));
    const request = await buildAuthedRequest('GET', `/api/v1/sheets/sheet-1/screenshots/${uploaded.id as string}`);

    const response = await downloadOneScreenshotRoute(
      request,
      params({ id: 'sheet-1', screenshotId: uploaded.id as string }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-disposition')).toContain('attachment;');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(new Uint8Array(await response.arrayBuffer())).toStrictEqual(PNG_IMAGE_BYTES);
  });

  it('アップロード→一覧→削除が一貫する', async () => {
    const uploadRequest = await buildAuthedRequest('POST', '/api/v1/sheets/sheet-1/screenshots', {
      formData: uploadForm({ title: 'a.png' }),
    });
    const uploaded = await bodyOf(await uploadScreenshotRoute(uploadRequest, params({ id: 'sheet-1' })));

    const listRequest = await buildAuthedRequest('GET', '/api/v1/sheets/sheet-1/screenshots');
    const listResponse = await getScreenshotsRoute(listRequest, params({ id: 'sheet-1' }));
    const listed = await bodyOf(listResponse);
    expect((listed.items as unknown[]).map((row) => (row as { id: string }).id)).toStrictEqual([uploaded.id]);

    const deleteRequest = await buildAuthedRequest(
      'DELETE',
      `/api/v1/sheets/sheet-1/screenshots/${uploaded.id as string}`,
    );
    const deleteResponse = await deleteOneScreenshotRoute(
      deleteRequest,
      params({ id: 'sheet-1', screenshotId: uploaded.id as string }),
    );
    expect(deleteResponse.status).toBe(204);

    const afterRequest = await buildAuthedRequest('GET', '/api/v1/sheets/sheet-1/screenshots');
    const afterResponse = await getScreenshotsRoute(afterRequest, params({ id: 'sheet-1' }));
    expect((await bodyOf(afterResponse)).items).toStrictEqual([]);
  });

  it('他 sheet の screenshotId を渡した削除は 404', async () => {
    hearingIntakeHolder.current = createInMemoryHearingIntakeRuntime([
      buildSheetRow({ id: 'sheet-1', applicantUserId: OWNER_ID }),
      buildSheetRow({ id: 'sheet-2', applicantUserId: OWNER_ID }),
    ]);
    const uploadRequest = await buildAuthedRequest('POST', '/api/v1/sheets/sheet-2/screenshots', {
      formData: uploadForm({}),
    });
    const uploaded = await bodyOf(await uploadScreenshotRoute(uploadRequest, params({ id: 'sheet-2' })));

    const deleteRequest = await buildAuthedRequest(
      'DELETE',
      `/api/v1/sheets/sheet-1/screenshots/${uploaded.id as string}`,
    );
    const deleteResponse = await deleteOneScreenshotRoute(
      deleteRequest,
      params({ id: 'sheet-1', screenshotId: uploaded.id as string }),
    );
    expect(deleteResponse.status).toBe(404);
  });

  it('一覧は tenant-data と共有する read rate limit を適用する', async () => {
    setTenantDataRateLimiterForTest('read', {
      consume: () => ({ allowed: false, limit: 120, remaining: 0, resetAtMs: Date.now() + 60_000 }),
    });
    const request = await buildAuthedRequest('GET', '/api/v1/sheets/sheet-1/screenshots');
    const response = await getScreenshotsRoute(request, params({ id: 'sheet-1' }));

    expect(response.status).toBe(429);
  });

  it('本体ダウンロードは tenant-data と共有する readContent rate limit を適用する', async () => {
    const uploadRequest = await buildAuthedRequest('POST', '/api/v1/sheets/sheet-1/screenshots', {
      formData: uploadForm({}),
    });
    const uploaded = await bodyOf(await uploadScreenshotRoute(uploadRequest, params({ id: 'sheet-1' })));
    setTenantDataRateLimiterForTest('readContent', {
      consume: () => ({ allowed: false, limit: 60, remaining: 0, resetAtMs: Date.now() + 60_000 }),
    });

    const request = await buildAuthedRequest('GET', `/api/v1/sheets/sheet-1/screenshots/${uploaded.id as string}`);
    const response = await downloadOneScreenshotRoute(
      request,
      params({ id: 'sheet-1', screenshotId: uploaded.id as string }),
    );

    expect(response.status).toBe(429);
  });

  it('削除は tenant-data と共有する delete rate limit を適用する', async () => {
    const uploadRequest = await buildAuthedRequest('POST', '/api/v1/sheets/sheet-1/screenshots', {
      formData: uploadForm({}),
    });
    const uploaded = await bodyOf(await uploadScreenshotRoute(uploadRequest, params({ id: 'sheet-1' })));
    setTenantDataRateLimiterForTest('delete', {
      consume: () => ({ allowed: false, limit: 20, remaining: 0, resetAtMs: Date.now() + 60_000 }),
    });

    const request = await buildAuthedRequest('DELETE', `/api/v1/sheets/sheet-1/screenshots/${uploaded.id as string}`);
    const response = await deleteOneScreenshotRoute(
      request,
      params({ id: 'sheet-1', screenshotId: uploaded.id as string }),
    );

    expect(response.status).toBe(429);
    expect(share.screenshotContents.has(uploaded.id as string)).toBe(true);
  });
});

describe('POST /sheets/:id/handoff-tokens: 発行', () => {
  it('発行成功で token/url/instruction_text/audience/expires_at を返す', async () => {
    const request = await buildAuthedRequest('POST', '/api/v1/sheets/sheet-1/handoff-tokens', {
      json: { audience: 'harness_creator' },
    });
    const response = await issueHandoffTokenRoute(request, params({ id: 'sheet-1' }));
    const body = await bodyOf(response);

    expect(response.status).toBe(201);
    expect(body.audience).toBe('harness_creator');
    expect(typeof body.token).toBe('string');
    expect(body.url).toContain(body.token as string);
    expect(body.instruction_text).toContain(body.url as string);
  });

  it('audience ごとに instruction_text の文面が異なる', async () => {
    const harnessRequest = await buildAuthedRequest('POST', '/api/v1/sheets/sheet-1/handoff-tokens', {
      json: { audience: 'harness_creator' },
    });
    const systemRequest = await buildAuthedRequest('POST', '/api/v1/sheets/sheet-1/handoff-tokens', {
      json: { audience: 'system_orchestrator' },
    });
    const harnessBody = await bodyOf(await issueHandoffTokenRoute(harnessRequest, params({ id: 'sheet-1' })));
    const systemBody = await bodyOf(await issueHandoffTokenRoute(systemRequest, params({ id: 'sheet-1' })));

    expect(harnessBody.instruction_text).not.toBe(systemBody.instruction_text);
    expect(harnessBody.instruction_text).toContain('HarnessCreator');
    expect(systemBody.instruction_text).toContain('開発計画');
  });

  it('他人の sheet への発行は 403', async () => {
    const cookie = await sessionCookieFor(testUser(STRANGER_ID));
    const request = await buildAuthedRequest('POST', '/api/v1/sheets/sheet-1/handoff-tokens', {
      cookie,
      json: { audience: 'harness_creator' },
    });
    const response = await issueHandoffTokenRoute(request, params({ id: 'sheet-1' }));

    expect(response.status).toBe(403);
  });
});

describe('GET /sheets/:id/handoff-tokens → PATCH: 一覧と無効化', () => {
  it('発行→一覧→無効化が一貫する', async () => {
    const issueRequest = await buildAuthedRequest('POST', '/api/v1/sheets/sheet-1/handoff-tokens', {
      json: { audience: 'harness_creator' },
    });
    const issued = await bodyOf(await issueHandoffTokenRoute(issueRequest, params({ id: 'sheet-1' })));

    const listRequest = await buildAuthedRequest('GET', '/api/v1/sheets/sheet-1/handoff-tokens');
    const listed = await bodyOf(await listHandoffTokensRoute(listRequest, params({ id: 'sheet-1' })));
    expect((listed.items as unknown[]).map((row) => (row as { id: string }).id)).toStrictEqual([issued.id]);
    expect((listed.items as { revoked_at: unknown }[])[0]?.revoked_at).toBeNull();

    const revokeRequest = await buildAuthedRequest(
      'PATCH',
      `/api/v1/sheets/sheet-1/handoff-tokens/${issued.id as string}`,
      { json: {} },
    );
    const revokeResponse = await revokeHandoffTokenRoute(
      revokeRequest,
      params({ id: 'sheet-1', tokenId: issued.id as string }),
    );
    expect(revokeResponse.status).toBe(200);
    expect((await bodyOf(revokeResponse)).revoked).toBe(true);

    const afterListRequest = await buildAuthedRequest('GET', '/api/v1/sheets/sheet-1/handoff-tokens');
    const afterListed = await bodyOf(await listHandoffTokensRoute(afterListRequest, params({ id: 'sheet-1' })));
    expect((afterListed.items as { revoked_at: unknown }[])[0]?.revoked_at).not.toBeNull();
  });

  it('存在しない tokenId は 404', async () => {
    const request = await buildAuthedRequest('PATCH', '/api/v1/sheets/sheet-1/handoff-tokens/does-not-exist', {
      json: {},
    });
    const response = await revokeHandoffTokenRoute(request, params({ id: 'sheet-1', tokenId: 'does-not-exist' }));

    expect(response.status).toBe(404);
  });

  it('所有者でない別ユーザーは selfOnly で拒否される', async () => {
    const cookie = await sessionCookieFor(testUser(ADMIN_ID));
    const request = await buildAuthedRequest('GET', '/api/v1/sheets/sheet-1/handoff-tokens', { cookie });
    const response = await listHandoffTokensRoute(request, params({ id: 'sheet-1' }));

    expect(response.status).toBe(403);
  });
});
