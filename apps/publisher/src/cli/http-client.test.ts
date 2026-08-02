import { afterEach, describe, expect, it, vi } from 'vitest';

import { createHubApiClient, type HubApiClientConfig } from './http-client.js';

const CONFIG: HubApiClientConfig = {
  baseUrl: 'https://hub.example.com',
  tenantId: 'tenant_123',
  workspaceId: 'workspace_456',
  accessToken: 'token-abc',
  origin: 'https://cli.harness-hub.example.com',
};

function fakeResponse(
  overrides: Partial<{ ok: boolean; status: number; statusText: string; json: unknown; text: string }>,
) {
  const { ok = true, status = 200, statusText = 'OK', json = {}, text = '' } = overrides;
  return {
    ok,
    status,
    statusText,
    json: async () => json,
    text: async () => text,
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createHubApiClient', () => {
  it('getJson は共通ヘッダ (Authorization/tenant/workspace) を付けて GET する', async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse({ json: { id: '1' } }));
    vi.stubGlobal('fetch', fetchMock);

    const client = createHubApiClient(CONFIG);
    const result = await client.getJson('/api/v1/projects/proj_1');

    expect(result).toEqual({ id: '1' });
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe('https://hub.example.com/api/v1/projects/proj_1');
    expect(init.method).toBe('GET');
    const headers = init.headers as Record<string, string>;
    expect(headers.authorization).toBe('Bearer token-abc');
    expect(headers['x-harness-tenant-id']).toBe('tenant_123');
    expect(headers['x-harness-workspace-id']).toBe('workspace_456');
    expect(headers.origin).toBeUndefined();
    expect(headers['idempotency-key']).toBeUndefined();
  });

  it('postJson は origin/idempotency-key/content-type を付けて JSON body を POST する', async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse({ json: { id: '1' } }));
    vi.stubGlobal('fetch', fetchMock);

    const client = createHubApiClient(CONFIG);
    await client.postJson('/api/v1/publish', { project_id: 'proj_1' });

    const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ project_id: 'proj_1' }));
    const headers = init.headers as Record<string, string>;
    expect(headers['content-type']).toBe('application/json');
    expect(headers.origin).toBe(CONFIG.origin);
    expect(headers['idempotency-key']).toMatch(/^publisher-.{8,}$/);
  });

  it('postJson を 2 回呼ぶと idempotency-key はそれぞれ異なる値になる', async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse({ json: {} }));
    vi.stubGlobal('fetch', fetchMock);

    const client = createHubApiClient(CONFIG);
    await client.postJson('/api/v1/publish', {});
    await client.postJson('/api/v1/publish', {});

    const firstHeaders = (fetchMock.mock.calls[0] as [URL, RequestInit])[1].headers as Record<string, string>;
    const secondHeaders = (fetchMock.mock.calls[1] as [URL, RequestInit])[1].headers as Record<string, string>;
    expect(firstHeaders['idempotency-key']).not.toBe(secondHeaders['idempotency-key']);
  });

  it('putBytes は content-type: application/octet-stream で bytes をそのまま送る', async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse({ json: {} }));
    vi.stubGlobal('fetch', fetchMock);

    const client = createHubApiClient(CONFIG);
    const bytes = new Uint8Array([1, 2, 3]);
    await client.putBytes('/api/v1/publish/req_1/package', bytes);

    const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(init.method).toBe('PUT');
    expect(init.body).toBe(bytes);
    const headers = init.headers as Record<string, string>;
    expect(headers['content-type']).toBe('application/octet-stream');
  });

  it('応答が ok でない場合、method/path/status/本文を含むエラーを投げる', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        fakeResponse({ ok: false, status: 422, statusText: 'Unprocessable Entity', text: 'validation failed' }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const client = createHubApiClient(CONFIG);
    await expect(client.getJson('/api/v1/projects/proj_1')).rejects.toThrow(
      /GET \/api\/v1\/projects\/proj_1.*status=422.*validation failed/s,
    );
  });

  it('応答が ok でなく本文が空の場合は statusText をエラー詳細として使う', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(fakeResponse({ ok: false, status: 500, statusText: 'Internal Server Error', text: '' }));
    vi.stubGlobal('fetch', fetchMock);

    const client = createHubApiClient(CONFIG);
    await expect(client.getJson('/api/v1/projects/proj_1')).rejects.toThrow(/Internal Server Error/);
  });
});
