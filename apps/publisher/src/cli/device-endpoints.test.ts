import { afterEach, describe, expect, it, vi } from 'vitest';

import { createDeviceCodeRequester, createPollTokenEndpoint, createRefreshTokenEndpoint } from './device-endpoints.js';

const HUB_BASE_URL = 'https://hub.example.com';

const DEVICE_CODE_RESPONSE = {
  device_code: 'device-code-0123456789abcdef0123456789',
  user_code: 'ABCDEFGH',
  verification_uri: 'https://hub.example.com/device',
  verification_uri_complete: 'https://hub.example.com/device?user_code=ABCDEFGH',
  expires_in: 600,
  interval: 5,
};

function fakeResponse(status: number, body: unknown) {
  return { status, json: async () => body } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createDeviceCodeRequester', () => {
  it('未認証で POST /api/v1/device/code を呼び、応答を deviceCodeResponseSchema で検証して返す', async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse(200, DEVICE_CODE_RESPONSE));
    vi.stubGlobal('fetch', fetchMock);

    const requestDeviceCode = createDeviceCodeRequester(HUB_BASE_URL);
    const result = await requestDeviceCode('acme', ['publish:write']);

    expect(result).toEqual(DEVICE_CODE_RESPONSE);
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe('https://hub.example.com/api/v1/device/code');
    expect(init.headers).toEqual({ 'content-type': 'application/json' });
    expect(JSON.parse(init.body as string)).toEqual({ tenant_slug: 'acme', scope: ['publish:write'] });
  });

  it('Authorization ヘッダを付けない (device_code 発行前で access token を持たない未認証 endpoint)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse(200, DEVICE_CODE_RESPONSE));
    vi.stubGlobal('fetch', fetchMock);

    await createDeviceCodeRequester(HUB_BASE_URL)('acme', ['publish:write']);

    const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(Object.keys(init.headers as Record<string, string>)).not.toContain('authorization');
  });
});

describe('createPollTokenEndpoint', () => {
  it('POST /api/v1/device/token を RFC 8628 の grant_type で呼ぶ', async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse(400, { error: 'authorization_pending' }));
    vi.stubGlobal('fetch', fetchMock);

    const pollTokenEndpoint = createPollTokenEndpoint(HUB_BASE_URL, 'acme');
    const result = await pollTokenEndpoint('device-code-0123456789abcdef0123456789');

    expect(result).toEqual({ status: 400, body: { error: 'authorization_pending' } });
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe('https://hub.example.com/api/v1/device/token');
    expect(JSON.parse(init.body as string)).toEqual({
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      device_code: 'device-code-0123456789abcdef0123456789',
      tenant_slug: 'acme',
    });
  });
});

describe('createRefreshTokenEndpoint', () => {
  it('POST /api/v1/token/refresh を RFC 6749 §6 の grant_type で呼ぶ', async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse(200, { access_token: 'a' }));
    vi.stubGlobal('fetch', fetchMock);

    const refreshTokenEndpoint = createRefreshTokenEndpoint(HUB_BASE_URL, 'acme');
    const result = await refreshTokenEndpoint('r'.repeat(32));

    expect(result).toEqual({ status: 200, body: { access_token: 'a' } });
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe('https://hub.example.com/api/v1/token/refresh');
    expect(JSON.parse(init.body as string)).toEqual({
      grant_type: 'refresh_token',
      refresh_token: 'r'.repeat(32),
      tenant_slug: 'acme',
    });
  });
});
