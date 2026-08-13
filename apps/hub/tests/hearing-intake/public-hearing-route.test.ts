/**
 * `GET /api/hearing/{token}` と `GET /api/hearing/{token}/screenshots/{screenshotId}` の契約。
 *
 * この経路は認証不要 (`withAuthz` を使わない) — トークンの有効性だけが唯一の境界。
 * 無効・期限切れ・失効・存在しないトークンをすべて同じ 404 に畳むこと、アクセスのたびに
 * `recordAccess` が呼ばれて `access_count` が増えることを検証する。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hearingIntakeHolder = vi.hoisted(() => ({ current: null as unknown }));

vi.mock('../../src/features/hearing-intake/runtime.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/features/hearing-intake/runtime.js')>();
  return {
    ...actual,
    hearingIntakeRuntime: () => hearingIntakeHolder.current,
  };
});

import { hearingSharePayloadSchema } from '@harness-hub/schemas';

import { GET as getShareRoute } from '../../src/app/api/hearing/[token]/route.js';
import { GET as getShareScreenshotRoute } from '../../src/app/api/hearing/[token]/screenshots/[screenshotId]/route.js';
import { sha256Hex } from '../../src/lib/auth/jwt.js';
import { setHearingShareRuntimeForTest } from '../../src/lib/hearing-share/index.js';
import {
  setHearingSharePreResolveRateLimiterForTest,
  setHearingShareRateLimiterForTest,
} from '../../src/lib/hearing-share/rate-limit.js';
import {
  buildPublicRequest,
  buildSheetRow,
  createInMemoryHearingIntakeRuntime,
  createInMemoryHearingShareRuntime,
  type InMemoryHearingShareRuntime,
  PNG_IMAGE_BYTES,
  params,
  TENANT_A,
  WORKSPACE_A1,
} from './support/handoff-route-context.js';

let share: InMemoryHearingShareRuntime;

const NOW_MS = 1_800_000_000_000;

beforeEach(() => {
  hearingIntakeHolder.current = createInMemoryHearingIntakeRuntime([buildSheetRow({ id: 'sheet-1' })]);
  share = createInMemoryHearingShareRuntime();
  setHearingShareRuntimeForTest(share);
  // 1 段目 (token 非依存) も毎回戻す。module global なので test 間で残量が漏れる。
  setHearingSharePreResolveRateLimiterForTest(null);
  setHearingShareRateLimiterForTest('payload', null);
  setHearingShareRateLimiterForTest('screenshot', null);
  // `readAuthRuntimeEnv` は canonicalOrigin だけでなく全キーを fail-closed で要求する。
  process.env.AUTH_SESSION_SECRET = 'session-secret';
  process.env.AUTH_ACCESS_TOKEN_SECRET = 'access-secret';
  process.env.AUTH_ALLOWED_ORIGINS = 'https://hub.example.com';
  process.env.AUTH_DEVICE_VERIFICATION_URI = 'https://hub.example.com/device';
  process.env.AUTH_CANONICAL_ORIGIN = 'https://hub.example.com';
  vi.useFakeTimers();
  vi.setSystemTime(NOW_MS);
});

afterEach(() => {
  hearingIntakeHolder.current = null;
  setHearingShareRuntimeForTest(null);
  setHearingSharePreResolveRateLimiterForTest(null);
  setHearingShareRateLimiterForTest('payload', null);
  setHearingShareRateLimiterForTest('screenshot', null);
  delete process.env.AUTH_SESSION_SECRET;
  delete process.env.AUTH_ACCESS_TOKEN_SECRET;
  delete process.env.AUTH_ALLOWED_ORIGINS;
  delete process.env.AUTH_DEVICE_VERIFICATION_URI;
  delete process.env.AUTH_CANONICAL_ORIGIN;
  vi.useRealTimers();
});

async function issueToken(
  overrides: {
    readonly audience?: 'harness_creator' | 'system_orchestrator';
    readonly expiresAt?: number;
    readonly revokedAt?: number | null;
  } = {},
): Promise<string> {
  // generateOpaqueToken(32 bytes) と同じ 43 文字の base64url 形。
  const plaintext = 'A'.repeat(43);
  const tokenHash = await sha256Hex(plaintext);
  const row = await share.shareTokens.create(
    { tenantId: TENANT_A, workspaceId: WORKSPACE_A1, actorId: 'user-owner' },
    {
      id: 'token-1',
      workspaceId: WORKSPACE_A1,
      sheetId: 'sheet-1',
      audience: overrides.audience ?? 'harness_creator',
      tokenHash,
      expiresAt: overrides.expiresAt ?? NOW_MS + 3_600_000,
      createdByUserId: 'user-owner',
    },
  );
  if (overrides.revokedAt !== undefined && overrides.revokedAt !== null) {
    await share.shareTokens.revokeIfActive(
      { tenantId: TENANT_A, workspaceId: WORKSPACE_A1, actorId: 'user-owner' },
      { id: row.id, revokedAt: overrides.revokedAt },
    );
  }
  return plaintext;
}

describe('GET /api/hearing/:token', () => {
  it('有効なトークンで 200 + hearingSharePayloadSchema 形の JSON を返す', async () => {
    const token = await issueToken();
    const request = buildPublicRequest(`/api/hearing/${token}`);
    const response = await getShareRoute(request, params({ token }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(() => hearingSharePayloadSchema.parse(body)).not.toThrow();
  });

  it('旧11項目の保存済みsnapshotも互換decoderで公開できる', async () => {
    hearingIntakeHolder.current = createInMemoryHearingIntakeRuntime([
      buildSheetRow({
        id: 'sheet-1',
        formJson: JSON.stringify({
          taskName: '請求書処理',
          company: '株式会社サンプル',
          applicant: '山田',
          domain: '経理',
          issue: '転記が多い',
          tools: 'Excel',
          hours: 40,
          people: 5,
          features: 'OCR',
          output: 'CSV',
          priority: 'high',
        }),
      }),
    ]);
    const token = await issueToken();

    const response = await getShareRoute(buildPublicRequest(`/api/hearing/${token}`), params({ token }));

    expect(response.status).toBe(200);
    const body = hearingSharePayloadSchema.parse(await response.json());
    expect(body.form_snapshot).toMatchObject({ usagePurpose: 'unknown', shareTarget: '不明・わからない' });
  });

  it('期限切れトークンは 404', async () => {
    const token = await issueToken({ expiresAt: NOW_MS - 1 });
    const request = buildPublicRequest(`/api/hearing/${token}`);
    const response = await getShareRoute(request, params({ token }));

    expect(response.status).toBe(404);
  });

  it('失効済みトークンは 404', async () => {
    const token = await issueToken({ revokedAt: NOW_MS - 1 });
    const request = buildPublicRequest(`/api/hearing/${token}`);
    const response = await getShareRoute(request, params({ token }));

    expect(response.status).toBe(404);
  });

  it('存在しないトークンも同じ 404', async () => {
    const consume = vi.fn(() => ({ allowed: false, limit: 120, remaining: 0, resetAtMs: NOW_MS + 60_000 }));
    setHearingShareRateLimiterForTest('payload', { consume });
    const request = buildPublicRequest('/api/hearing/does-not-exist');
    const response = await getShareRoute(request, params({ token: 'does-not-exist' }));

    expect(response.status).toBe(404);
    expect(consume).not.toHaveBeenCalled();
  });

  it('有効 token の payload 上限超過は 429 + 再試行 header で、access_count を増やさない', async () => {
    const token = await issueToken();
    setHearingShareRateLimiterForTest('payload', {
      consume: () => ({ allowed: false, limit: 120, remaining: 0, resetAtMs: NOW_MS + 60_000 }),
    });

    const response = await getShareRoute(buildPublicRequest(`/api/hearing/${token}`), params({ token }));

    expect(response.status).toBe(429);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('retry-after')).toBe('60');
    expect(response.headers.get('ratelimit-limit')).toBe('120');
    expect(response.headers.get('ratelimit-remaining')).toBe('0');
    const rows = await share.shareTokens.listBySheetId(
      { tenantId: TENANT_A, workspaceId: WORKSPACE_A1, actorId: 'user-owner' },
      'sheet-1',
    );
    expect(rows[0]?.accessCount).toBe(0);
  });

  it('アクセスのたびに access_count が増える', async () => {
    const token = await issueToken();
    await getShareRoute(buildPublicRequest(`/api/hearing/${token}`), params({ token }));
    await getShareRoute(buildPublicRequest(`/api/hearing/${token}`), params({ token }));

    const rows = await share.shareTokens.listBySheetId(
      { tenantId: TENANT_A, workspaceId: WORKSPACE_A1, actorId: 'user-owner' },
      'sheet-1',
    );
    expect(rows[0]?.accessCount).toBe(2);
    expect(rows[0]?.lastAccessedAt).not.toBeNull();
  });
});

describe('GET /api/hearing/:token/screenshots/:screenshotId', () => {
  it('存在しない token は 404 のままで、screenshot limiter を消費しない', async () => {
    const consume = vi.fn(() => ({ allowed: false, limit: 60, remaining: 0, resetAtMs: NOW_MS + 60_000 }));
    setHearingShareRateLimiterForTest('screenshot', { consume });

    const response = await getShareScreenshotRoute(
      buildPublicRequest('/api/hearing/does-not-exist/screenshots/550e8400-e29b-41d4-a716-446655440000'),
      params({ token: 'does-not-exist', screenshotId: '550e8400-e29b-41d4-a716-446655440000' }),
    );

    expect(response.status).toBe(404);
    expect(consume).not.toHaveBeenCalled();
  });

  it('他 sheet の screenshotId は 404', async () => {
    hearingIntakeHolder.current = createInMemoryHearingIntakeRuntime([
      buildSheetRow({ id: 'sheet-1' }),
      buildSheetRow({ id: 'sheet-2' }),
    ]);
    const uploaded = await share.screenshots.upload(
      { tenantId: TENANT_A, workspaceId: WORKSPACE_A1, actorId: 'user-owner' },
      {
        workspaceId: WORKSPACE_A1,
        sheetId: 'sheet-2',
        title: 'other-sheet.png',
        contentType: 'image/png',
        plaintext: new Uint8Array([1, 2, 3]),
        uploadedBy: 'user-owner',
      },
    );
    const token = await issueToken();

    const request = buildPublicRequest(`/api/hearing/${token}/screenshots/${uploaded.id}`);
    const response = await getShareScreenshotRoute(request, params({ token, screenshotId: uploaded.id }));

    expect(response.status).toBe(404);
  });

  it('同じ sheet の screenshotId は本体を中継する', async () => {
    const uploaded = await share.screenshots.upload(
      { tenantId: TENANT_A, workspaceId: WORKSPACE_A1, actorId: 'user-owner' },
      {
        workspaceId: WORKSPACE_A1,
        sheetId: 'sheet-1',
        title: '画面"\r\nX-Injected: yes/../a.png',
        contentType: 'image/png',
        plaintext: PNG_IMAGE_BYTES,
        uploadedBy: 'user-owner',
      },
    );
    const token = await issueToken();

    const request = buildPublicRequest(`/api/hearing/${token}/screenshots/${uploaded.id}`);
    const response = await getShareScreenshotRoute(request, params({ token, screenshotId: uploaded.id }));

    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toStrictEqual(PNG_IMAGE_BYTES);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('content-disposition')).toContain('attachment;');
    expect(response.headers.get('content-disposition')).toContain('filename*=UTF-8');
    expect(response.headers.get('content-disposition')).not.toContain('\r');
    expect(response.headers.get('content-disposition')).not.toContain('\n');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('content-security-policy')).toContain('sandbox');
    expect(response.headers.get('content-security-policy')).toContain("default-src 'none'");
  });

  it('有効 token の screenshot 上限超過は content 読み取り前に 429', async () => {
    const token = await issueToken();
    setHearingShareRateLimiterForTest('screenshot', {
      consume: () => ({ allowed: false, limit: 60, remaining: 0, resetAtMs: NOW_MS + 60_000 }),
    });

    const response = await getShareScreenshotRoute(
      buildPublicRequest(`/api/hearing/${token}/screenshots/550e8400-e29b-41d4-a716-446655440000`),
      params({ token, screenshotId: '550e8400-e29b-41d4-a716-446655440000' }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('retry-after')).toBe('60');
    expect(response.headers.get('ratelimit-limit')).toBe('60');
  });

  it('旧データに偽装画像が残っていても公開せず、アクセス回数も増やさない', async () => {
    const uploaded = await share.screenshots.upload(
      { tenantId: TENANT_A, workspaceId: WORKSPACE_A1, actorId: 'user-owner' },
      {
        workspaceId: WORKSPACE_A1,
        sheetId: 'sheet-1',
        title: 'fake.png',
        contentType: 'image/png',
        plaintext: new TextEncoder().encode('<html><script>alert(1)</script></html>'),
        uploadedBy: 'user-owner',
      },
    );
    const token = await issueToken();

    const response = await getShareScreenshotRoute(
      buildPublicRequest(`/api/hearing/${token}/screenshots/${uploaded.id}`),
      params({ token, screenshotId: uploaded.id }),
    );

    expect(response.status).toBe(404);
    const rows = await share.shareTokens.listBySheetId(
      { tenantId: TENANT_A, workspaceId: WORKSPACE_A1, actorId: 'user-owner' },
      'sheet-1',
    );
    expect(rows[0]?.accessCount).toBe(0);
  });
});
