import type { DeviceCodeResponse, PublisherCredentialRecord, TokenResponse } from '@harness-hub/schemas';
import { describe, expect, it, vi } from 'vitest';

import type { CredentialStoreAdapter, PollTokenEndpoint, RefreshTokenEndpoint } from '../auth/index.js';
import { obtainAccessToken, type SessionDeps } from './session.js';

function base64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function fakeAccessToken(overrides: Record<string, unknown> = {}): string {
  const claims = {
    typ: 'access',
    sub: 'user_1',
    tenant_id: 'tenant_123',
    workspace_id: 'workspace_456',
    token_id: 'tok_1',
    role: 'member',
    scope: ['publish:write'],
    iat: 1_700_000_000,
    exp: 1_700_000_900,
    ...overrides,
  };
  return `${base64url({ alg: 'none' })}.${base64url(claims)}.sig`;
}

const DEVICE_CODE_RESPONSE: DeviceCodeResponse = {
  device_code: 'device-code-0123456789abcdef0123456789',
  user_code: 'ABCDEFGH',
  verification_uri: 'https://hub.example.com/device',
  verification_uri_complete: 'https://hub.example.com/device?user_code=ABCDEFGH',
  expires_in: 600,
  interval: 5,
};

function tokenResponse(overrides: Partial<TokenResponse> = {}): TokenResponse {
  return {
    access_token: fakeAccessToken(),
    token_type: 'Bearer',
    expires_in: 900,
    refresh_token: 'r'.repeat(32),
    scope: ['publish:write'],
    ...overrides,
  };
}

function neverCall(name: string): (...args: unknown[]) => never {
  return () => {
    throw new Error(`${name} は呼ばれない想定`);
  };
}

function baseDeps(overrides: Partial<SessionDeps> = {}): SessionDeps {
  const credentialStore: CredentialStoreAdapter = {
    platform: 'darwin',
    getToken: vi.fn(async () => null),
    saveToken: vi.fn(async () => {}),
    clearToken: vi.fn(async () => {}),
  };
  return {
    credentialStore,
    requestDeviceCode: neverCall('requestDeviceCode') as SessionDeps['requestDeviceCode'],
    pollTokenEndpoint: neverCall('pollTokenEndpoint') as PollTokenEndpoint,
    refreshTokenEndpoint: neverCall('refreshTokenEndpoint') as RefreshTokenEndpoint,
    sleep: vi.fn(async () => {}),
    now: () => 1_000,
    openVerificationUrl: vi.fn(),
    log: vi.fn(),
    ...overrides,
  };
}

describe('obtainAccessToken', () => {
  it('保存済み token が無ければ device flow でログインし、claims を保存して session を返す', async () => {
    const credentialStore: CredentialStoreAdapter = {
      platform: 'darwin',
      getToken: vi.fn(async () => null),
      saveToken: vi.fn(async () => {}),
      clearToken: vi.fn(async () => {}),
    };
    const requestDeviceCode = vi.fn(async () => DEVICE_CODE_RESPONSE);
    const pollTokenEndpoint: PollTokenEndpoint = vi.fn(async () => ({ status: 200, body: tokenResponse() }));
    const openVerificationUrl = vi.fn();
    const log = vi.fn();
    const deps = baseDeps({ credentialStore, requestDeviceCode, pollTokenEndpoint, openVerificationUrl, log });

    const result = await obtainAccessToken(deps, 'acme', ['publish:write']);

    expect(requestDeviceCode).toHaveBeenCalledWith('acme', ['publish:write']);
    expect(openVerificationUrl).toHaveBeenCalledWith(DEVICE_CODE_RESPONSE.verification_uri_complete);
    expect(log).toHaveBeenCalledWith(expect.stringContaining(DEVICE_CODE_RESPONSE.verification_uri_complete));
    expect(result).toEqual({ accessToken: expect.any(String), tenantId: 'tenant_123', workspaceId: 'workspace_456' });
    expect(credentialStore.saveToken).toHaveBeenCalledWith({
      tenant_slug: 'acme',
      workspace_id: 'workspace_456',
      refresh_token: 'r'.repeat(32),
      scope: ['publish:write'],
      issued_at: 1_000,
    });
  });

  it('保存済み token があれば refresh 経路のみ通り、device flow 系 deps は一切呼ばない', async () => {
    const storedRecord: PublisherCredentialRecord = {
      tenant_slug: 'acme',
      workspace_id: 'workspace_456',
      refresh_token: 'r'.repeat(32),
      scope: ['publish:write'],
      issued_at: 500,
    };
    const credentialStore: CredentialStoreAdapter = {
      platform: 'darwin',
      getToken: vi.fn(async () => storedRecord),
      saveToken: vi.fn(async () => {}),
      clearToken: vi.fn(async () => {}),
    };
    const refreshTokenEndpoint: RefreshTokenEndpoint = vi.fn(async () => ({ status: 200, body: tokenResponse() }));
    const deps = baseDeps({ credentialStore, refreshTokenEndpoint });

    const result = await obtainAccessToken(deps, 'acme', ['publish:write']);

    expect(refreshTokenEndpoint).toHaveBeenCalledWith('r'.repeat(32));
    expect(result.tenantId).toBe('tenant_123');
    expect(result.workspaceId).toBe('workspace_456');
  });

  it('refresh が失敗したら credentialStore をクリアしてエラーで終了する (再ログイン要求)', async () => {
    const storedRecord: PublisherCredentialRecord = {
      tenant_slug: 'acme',
      workspace_id: 'workspace_456',
      refresh_token: 'r'.repeat(32),
      scope: ['publish:write'],
      issued_at: 500,
    };
    const credentialStore: CredentialStoreAdapter = {
      platform: 'darwin',
      getToken: vi.fn(async () => storedRecord),
      saveToken: vi.fn(async () => {}),
      clearToken: vi.fn(async () => {}),
    };
    const refreshTokenEndpoint: RefreshTokenEndpoint = vi.fn(async () => ({ status: 401, body: {} }));
    const deps = baseDeps({ credentialStore, refreshTokenEndpoint });

    await expect(obtainAccessToken(deps, 'acme', ['publish:write'])).rejects.toThrow('再ログイン');
    expect(credentialStore.clearToken).toHaveBeenCalledWith('acme');
  });
});
