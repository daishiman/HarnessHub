/**
 * PT7: feedback サブコマンド (AD-6 で本 feature に owner 確定)。
 * 対応: docs/features/feat-publisher-plugin/test-design.md §PT7。
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { PublisherCredentialRecord, TokenResponse } from '@harness-hub/schemas';
import { describe, expect, it, vi } from 'vitest';

import type { CredentialStoreAdapter } from '../auth/index.js';
import type { FeedbackCommandDeps, FeedbackCommandOptions } from '../cli/feedback-command.js';
import { runFeedbackCommand } from '../cli/feedback-command.js';
import type { HubApiClient, HubApiClientConfig } from '../cli/http-client.js';

const SCHEMAS_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', 'packages', 'schemas');

function base64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

// accessTokenClaimsSchema (packages/schemas/auth-tenancy/token.ts) を満たす claims を積んだ fake JWT。
// 署名検証はしない実装 (decodeAccessTokenClaims) なので signature 部は任意文字列で良い。
const FAKE_ACCESS_TOKEN = `${base64url({ alg: 'none' })}.${base64url({
  typ: 'access',
  sub: 'user_1',
  tenant_id: 'tenant_123',
  workspace_id: 'workspace_456',
  token_id: 'tok_1',
  role: 'member',
  scope: ['feedback:write'],
  iat: 1_700_000_000,
  exp: 1_700_000_900,
})}.sig`;

const STORED_RECORD: PublisherCredentialRecord = {
  tenant_slug: 'acme',
  workspace_id: 'workspace_456',
  refresh_token: 'r'.repeat(32),
  scope: ['feedback:write'],
  issued_at: 1_699_999_000,
};

const REFRESHED_TOKEN: TokenResponse = {
  access_token: FAKE_ACCESS_TOKEN,
  token_type: 'Bearer',
  expires_in: 900,
  refresh_token: 'n'.repeat(32),
  scope: ['feedback:write'],
};

function neverCall(name: string): never {
  throw new Error(`${name} は呼ばれないはずです (保存済み refresh token 経路を使う)`);
}

function createDeps(postJson: ReturnType<typeof vi.fn>): {
  deps: FeedbackCommandDeps;
  createHubApiClient: ReturnType<typeof vi.fn>;
} {
  const credentialStore: CredentialStoreAdapter = {
    platform: 'darwin',
    getToken: async () => STORED_RECORD,
    saveToken: async () => {},
    clearToken: async () => {},
  };
  const createHubApiClient = vi.fn(
    (): HubApiClient => ({
      getJson: () => neverCall('getJson'),
      putBytes: () => neverCall('putBytes'),
      postJson,
    }),
  );
  return {
    deps: {
      credentialStore,
      requestDeviceCode: () => neverCall('requestDeviceCode'),
      pollTokenEndpoint: () => neverCall('pollTokenEndpoint'),
      openVerificationUrl: () => neverCall('openVerificationUrl'),
      refreshTokenEndpoint: async () => ({ status: 200, body: REFRESHED_TOKEN }),
      sleep: async () => {},
      now: () => 1_700_000_500,
      log: () => {},
      createHubApiClient,
    },
    createHubApiClient,
  };
}

describe('PT7-A feedback CLI 薄いクライアントの契約テスト', () => {
  it('feedback サブコマンドは AD-4 の Device Flow 基盤が発行した Bearer token を再利用する', async () => {
    const postJson = vi.fn().mockResolvedValue({ id: 'fb_1' });
    const { deps, createHubApiClient } = createDeps(postJson);
    const options: FeedbackCommandOptions = {
      tenantSlug: 'acme',
      projectId: 'proj_123',
      type: 'improvement',
      priority: 'high',
      body: 'ここが使いにくかったです',
      hubBaseUrl: 'https://hub.example.com',
      origin: 'https://cli.harness-hub.example.com',
    };

    await runFeedbackCommand(options, deps);

    // requestDeviceCode/pollTokenEndpoint/openVerificationUrl を呼ばずに (neverCall で保証)
    // 保存済み refresh token → obtainAccessToken 経由で得た access token がそのまま使われている。
    const config = (createHubApiClient.mock.calls[0] as [HubApiClientConfig])[0];
    expect(config.accessToken).toBe(FAKE_ACCESS_TOKEN);
    expect(config.tenantId).toBe('tenant_123');
    expect(config.workspaceId).toBe('workspace_456');
  });

  it('feedback サブコマンドは POST /api/v1/feedback を呼び出すだけで、受理ロジックを再実装しない', async () => {
    const postJson = vi.fn().mockResolvedValue({ id: 'fb_1' });
    const { deps } = createDeps(postJson);
    const options: FeedbackCommandOptions = {
      tenantSlug: 'acme',
      projectId: 'proj_123',
      type: 'bug',
      priority: 'medium',
      body: '再現手順: ...',
      hubBaseUrl: 'https://hub.example.com',
      origin: 'https://cli.harness-hub.example.com',
    };

    await runFeedbackCommand(options, deps);

    expect(postJson).toHaveBeenCalledTimes(1);
    expect(postJson).toHaveBeenCalledWith('/api/v1/feedback', {
      project_id: 'proj_123',
      type: 'bug',
      priority: 'medium',
      body: '再現手順: ...',
    });
  });

  it('feedback サブコマンドは feat-feedback-loop の endpoint 契約を再定義しない', () => {
    // endpoint 契約の owner は feat-feedback-loop であり、canonical schema は packages/schemas 側に置く。
    // Publisher は schema を import・再定義せず、薄い HTTP client のまま維持する。
    const feedbackSchemaFiles = collectFiles(SCHEMAS_ROOT).filter((path) => /feedback/i.test(path));
    expect(
      feedbackSchemaFiles.map((path) => path.replace(`${SCHEMAS_ROOT}/`, '').replaceAll('\\', '/')).sort(),
    ).toEqual(['feedback-loop/contracts.ts', 'feedback-loop/index.ts']);

    const commandPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'cli', 'feedback-command.ts');
    const source = readFileSync(commandPath, 'utf-8');
    expect(source).not.toMatch(/from ['"]@harness-hub\/schemas['"]/);
  });
});

function collectFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    return entry.isDirectory() ? collectFiles(fullPath) : [fullPath];
  });
}
