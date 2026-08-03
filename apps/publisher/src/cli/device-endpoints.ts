/**
 * device flow の bootstrap 3 endpoint 用 fetch ラッパー (AD-1 cli/)。
 *
 * `http-client.ts` の `HubApiClient` を使わないのは意図的: `/device/code`・`/device/token`・
 * `/token/refresh` は Hub 側で `withAuthz` を通さない未認証 endpoint (device_code/refresh_token
 * 自体が資格情報になるため、RFC 8628 §3.1/§3.4・RFC 6749 §6 の設計)。`HubApiClient` は
 * Authorization ヘッダを必須にする契約なので、まだ access token を持たないこの段階では使えない。
 */
import { type DeviceCodeResponse, deviceCodeResponseSchema, type PublisherTokenScope } from '@harness-hub/schemas';
import type { PollTokenEndpoint, RefreshTokenEndpoint } from '../auth/index.js';

async function postJson(baseUrl: string, path: string, body: unknown): Promise<{ status: number; body: unknown }> {
  const response = await fetch(new URL(path, baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

export function createDeviceCodeRequester(
  hubBaseUrl: string,
): (tenantSlug: string, scope: readonly PublisherTokenScope[]) => Promise<DeviceCodeResponse> {
  return async (tenantSlug, scope) => {
    const { body } = await postJson(hubBaseUrl, '/api/v1/device/code', { tenant_slug: tenantSlug, scope });
    return deviceCodeResponseSchema.parse(body);
  };
}

export function createPollTokenEndpoint(hubBaseUrl: string, tenantSlug: string): PollTokenEndpoint {
  return (deviceCode) =>
    postJson(hubBaseUrl, '/api/v1/device/token', {
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      device_code: deviceCode,
      tenant_slug: tenantSlug,
    });
}

export function createRefreshTokenEndpoint(hubBaseUrl: string, tenantSlug: string): RefreshTokenEndpoint {
  return (refreshToken) =>
    postJson(hubBaseUrl, '/api/v1/token/refresh', {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      tenant_slug: tenantSlug,
    });
}
