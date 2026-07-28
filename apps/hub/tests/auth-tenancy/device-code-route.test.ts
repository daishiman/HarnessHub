/**
 * `POST /api/v1/device/code` (RFC 8628 §3.1) の route handler。
 *
 * この endpoint は **認証不要**なので、検証したいのは「認証の代わりに何で入口を絞っているか」になる。
 * 絞りは 2 段: 要求の形 (schema) と、slug からテナントを確定できること。
 * どちらも落ちたら同じ `invalid_request` へ寄せる — 応答を分けると slug の総当たりで
 * テナントの実在が読み取れてしまう (route の doc コメントが述べている性質)。
 */

import { deviceCodeResponseSchema } from '@harness-hub/schemas';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authRuntime } from '../../src/lib/authz/runtime.js';
import {
  createDeviceRouteHarness,
  type DeviceRouteHarness,
  postRequest,
  TENANT_SLUG,
  VERIFICATION_URI,
} from './support/device-route-runtime.js';
import { TENANT_A } from './support/in-memory-ports.js';

// 合成点だけを差し替える。`index.js` は runtime.js のバレルなので、実体側を mock すれば route にも届く
vi.mock('../../src/lib/authz/runtime.js', () => ({
  authRuntime: vi.fn(),
  createAuthRuntime: vi.fn(),
  createDbAuditSink: vi.fn(),
  createProductionAuthRuntime: vi.fn(),
  readAuthRuntimeEnv: vi.fn(),
}));

const { POST } = await import('../../src/app/api/v1/device/code/route.js');

const URL_UNDER_TEST = 'https://hub.example.com/api/v1/device/code';

let harness: DeviceRouteHarness;

beforeEach(() => {
  harness = createDeviceRouteHarness();
  vi.mocked(authRuntime).mockReturnValue(harness.runtime);
});

function codeRequest(body: unknown): Request {
  return postRequest(URL_UNDER_TEST, JSON.stringify(body));
}

describe('POST /api/v1/device/code: device 認可の開始', () => {
  it('slug からテナントを解決できたら device_code と user_code を発行する', async () => {
    const response = await POST(
      codeRequest({ tenant_slug: TENANT_SLUG, scope: ['publish:write'], device_label: 'macbook-cli' }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(deviceCodeResponseSchema.safeParse(body).success).toBe(true);
    expect(body.verification_uri).toBe(VERIFICATION_URI);
    expect(body.verification_uri_complete).toBe(`${VERIFICATION_URI}?user_code=${body.user_code}`);

    // 発行された認可が、要求した slug の**テナント側**へ紐づいていること (slug ではなく tenantId で保存する)
    const records = harness.ports.deviceAuthorizations.all();
    expect(records).toHaveLength(1);
    expect(records[0]?.tenantId).toBe(TENANT_A);
    expect(records[0]?.deviceLabel).toBe('macbook-cli');
    expect(records[0]?.status).toBe('pending');
  });

  it('資格情報を含む応答なのでキャッシュさせない', async () => {
    const response = await POST(codeRequest({ tenant_slug: TENANT_SLUG }));

    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('scope と device_label は省略できる (省略は「無し」であって既定値の付与ではない)', async () => {
    const response = await POST(codeRequest({ tenant_slug: TENANT_SLUG }));

    expect(response.status).toBe(200);
    const records = harness.ports.deviceAuthorizations.all();
    expect(records[0]?.scope).toEqual([]);
    expect(records[0]?.deviceLabel).toBeNull();
  });

  it('要求の形が不正なら 400 invalid_request で、認可を作らない', async () => {
    // slug は小文字のみ。大文字を許すと同一テナントが 2 通りの URL を持つ
    const response = await POST(codeRequest({ tenant_slug: 'Acme' }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_request' });
    expect(harness.ports.deviceAuthorizations.all()).toHaveLength(0);
  });

  it('JSON として読めない body も 400 invalid_request (例外を外へ出さない)', async () => {
    const response = await POST(postRequest(URL_UNDER_TEST, 'not-json'));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_request' });
  });

  it('未登録の slug は「存在しない」と言わず invalid_request へ寄せる', async () => {
    const response = await POST(codeRequest({ tenant_slug: 'unknown-tenant' }));

    // 形は妥当なので、応答が形の不正と区別できてしまうと slug 総当たりでテナント一覧が作れる
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_request' });
    expect(harness.ports.deviceAuthorizations.all()).toHaveLength(0);
  });

  it('無効化された OIDC 接続も解決対象から外す', async () => {
    harness.ports.oidcConnections.put({
      tenantId: TENANT_A,
      tenantSlug: TENANT_SLUG,
      issuer: 'https://idp.example.com',
      clientId: 'client-a',
      displayName: 'Acme IdP',
      enabled: false,
    });

    const response = await POST(codeRequest({ tenant_slug: TENANT_SLUG }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_request' });
  });
});
