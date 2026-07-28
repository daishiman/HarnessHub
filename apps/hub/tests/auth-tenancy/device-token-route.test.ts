/**
 * `POST /api/v1/device/token` (RFC 8628 §3.4) の route handler。
 *
 * client はこの endpoint を **polling する**ので、応答は「まだ待て」「もう諦めろ」を
 * 取り違えない形でなければならない。そのため検証の主眼は status ではなく
 * `error` コードと status の**対応**に置く (RFC 8628 §3.5 / RFC 6749 §5.2)。
 */

import { tokenResponseSchema } from '@harness-hub/schemas';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authRuntime } from '../../src/lib/authz/runtime.js';
import {
  createDeviceRouteHarness,
  DEVICE_CODE_TTL_SECONDS,
  type DeviceRouteHarness,
  postRequest,
  TENANT_SLUG,
  USER_CODE_MAX_ATTEMPTS,
  USER_ID,
} from './support/device-route-runtime.js';
import { TENANT_A, WORKSPACE_A1 } from './support/in-memory-ports.js';

vi.mock('../../src/lib/authz/runtime.js', () => ({
  authRuntime: vi.fn(),
  createAuthRuntime: vi.fn(),
  createDbAuditSink: vi.fn(),
  createProductionAuthRuntime: vi.fn(),
  readAuthRuntimeEnv: vi.fn(),
}));

const { POST } = await import('../../src/app/api/v1/device/token/route.js');

const URL_UNDER_TEST = 'https://hub.example.com/api/v1/device/token';
const GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:device_code';
/** 形は妥当 (32 文字以上) だが、どの認可にも対応しない device_code。 */
const UNKNOWN_DEVICE_CODE = 'x'.repeat(48);

let harness: DeviceRouteHarness;

beforeEach(() => {
  harness = createDeviceRouteHarness();
  vi.mocked(authRuntime).mockReturnValue(harness.runtime);
});

function tokenRequest(body: unknown): Request {
  return postRequest(URL_UNDER_TEST, JSON.stringify(body));
}

/** CLI が §3.1 で受け取った device_code。多くのテストがここから始まる。 */
async function issueCode() {
  return harness.runtime.deviceFlow.requestCode({
    tenantId: TENANT_A,
    scope: ['publish:write'],
    deviceLabel: 'macbook-cli',
  });
}

async function approve(userCode: string) {
  return harness.runtime.deviceFlow.approve({
    tenantId: TENANT_A,
    userCode,
    userId: USER_ID,
    workspaceId: WORKSPACE_A1,
  });
}

describe('POST /api/v1/device/token: device_code を token に交換する', () => {
  it('承認済みの device_code は token pair と引き換えになる', async () => {
    const issued = await issueCode();
    await approve(issued.user_code);

    const response = await POST(
      tokenRequest({ grant_type: GRANT_TYPE, device_code: issued.device_code, tenant_slug: TENANT_SLUG }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = await response.json();
    expect(tokenResponseSchema.safeParse(body).success).toBe(true);
    expect(body.scope).toEqual(['publish:write']);
  });

  it('未承認の間は 400 authorization_pending (client は polling を続けてよい)', async () => {
    const issued = await issueCode();

    const response = await POST(
      tokenRequest({ grant_type: GRANT_TYPE, device_code: issued.device_code, tenant_slug: TENANT_SLUG }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'authorization_pending' });
  });

  it('interval を守らない連投は 400 slow_down', async () => {
    const issued = await issueCode();
    const payload = { grant_type: GRANT_TYPE, device_code: issued.device_code, tenant_slug: TENANT_SLUG };
    await POST(tokenRequest(payload));

    // 時計を進めずにもう一度叩く = 告知した interval を待っていない
    const response = await POST(tokenRequest(payload));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'slow_down' });
  });

  it('TTL を過ぎた device_code は 400 expired_token (最初からやり直す)', async () => {
    const issued = await issueCode();
    await approve(issued.user_code);
    harness.ports.clock.advance(DEVICE_CODE_TTL_SECONDS);

    const response = await POST(
      tokenRequest({ grant_type: GRANT_TYPE, device_code: issued.device_code, tenant_slug: TENANT_SLUG }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'expired_token' });
  });

  it('不明な device_code は 400 invalid_grant', async () => {
    const response = await POST(
      tokenRequest({ grant_type: GRANT_TYPE, device_code: UNKNOWN_DEVICE_CODE, tenant_slug: TENANT_SLUG }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_grant' });
  });

  it('device_code は使い捨て。2 回目の交換は 400 invalid_grant', async () => {
    const issued = await issueCode();
    await approve(issued.user_code);
    const payload = { grant_type: GRANT_TYPE, device_code: issued.device_code, tenant_slug: TENANT_SLUG };
    expect((await POST(tokenRequest(payload))).status).toBe(200);

    const response = await POST(tokenRequest(payload));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_grant' });
  });

  it('試行上限に達して denied になった認可は 403 access_denied (polling を止めさせる)', async () => {
    const issued = await issueCode();
    await approve(issued.user_code);
    // 承認済みの user_code へさらに approve を撃つと「code は知っているが承認できない」試行として数えられ、
    // 上限で認可そのものが denied へ落ちる
    for (let attempt = 0; attempt < USER_CODE_MAX_ATTEMPTS; attempt += 1) {
      await approve(issued.user_code);
    }

    const response = await POST(
      tokenRequest({ grant_type: GRANT_TYPE, device_code: issued.device_code, tenant_slug: TENANT_SLUG }),
    );

    // 403 は「名乗り直しても通らない」側。400 群 (待てば変わりうる) と分けてある
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'access_denied' });
  });

  it('grant_type が RFC 8628 の値でなければ 400 invalid_request', async () => {
    const issued = await issueCode();

    const response = await POST(
      tokenRequest({ grant_type: 'authorization_code', device_code: issued.device_code, tenant_slug: TENANT_SLUG }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_request' });
  });

  it('JSON として読めない body も 400 invalid_request', async () => {
    const response = await POST(postRequest(URL_UNDER_TEST, '{'));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_request' });
  });

  it('tenant_slug を解決できない要求は device_code を照合せずに 400 invalid_request', async () => {
    const issued = await issueCode();
    await approve(issued.user_code);

    const response = await POST(
      tokenRequest({ grant_type: GRANT_TYPE, device_code: issued.device_code, tenant_slug: 'unknown-tenant' }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_request' });
    // テナントを確定できないまま全テナント横断で device_code を探す経路を作らない (D4)
    expect(harness.ports.deviceAuthorizations.all()[0]?.status).toBe('approved');
  });

  it('エラー応答もキャッシュさせない', async () => {
    const response = await POST(postRequest(URL_UNDER_TEST, '{'));

    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
