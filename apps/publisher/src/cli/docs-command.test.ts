import type { DeviceCodeResponse, ExternalDocumentSyncResponse, PublisherCredentialRecord } from '@harness-hub/schemas';
import { describe, expect, it, vi } from 'vitest';

import type { CredentialStoreAdapter, PollTokenEndpoint, RefreshTokenEndpoint } from '../auth/index.js';
import { type DocsCommandDeps, deriveExternalDocumentId, runDocsCommand } from './docs-command.js';
import type { DocsHubApiClient } from './http-client.js';

function base64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function docsAccessToken(): string {
  return `${base64url({ alg: 'none' })}.${base64url({
    typ: 'access',
    sub: 'user_1',
    tenant_id: 'tenant_123',
    workspace_id: 'workspace_456',
    token_id: 'tok_docs',
    role: 'workspace-admin',
    scope: ['docs:write'],
    iat: 1_700_000_000,
    exp: 1_700_000_900,
  })}.sig`;
}

const RESPONSE: ExternalDocumentSyncResponse = {
  document: {
    id: 'doc_1',
    revision: 1,
    scope: 'tenant',
    title: '設計書',
    body_markdown: '# 本文',
    status: 'draft',
    created_by: 'user_1',
    updated_by: 'user_1',
    created_at: 1,
    updated_at: 1,
    category: null,
    tags: null,
    thumbnail_url: null,
    thumbnail_source: 'auto',
    excerpt: null,
    excerpt_source: 'auto',
    asset_summary: null,
    publish_at: null,
  },
  source: 'claude-code',
  external_document_id: 'a'.repeat(64),
  revision: 1,
  sync_state: 'synced',
  outcome: 'created',
};

function depsWith(client: DocsHubApiClient): DocsCommandDeps {
  const stored: PublisherCredentialRecord = {
    hub_origin: 'https://hub.example.com',
    tenant_slug: 'acme',
    workspace_id: 'workspace_456',
    refresh_token: 'r'.repeat(32),
    scope: ['docs:write'],
    issued_at: 1,
  };
  const credentialStore: CredentialStoreAdapter = {
    platform: 'darwin',
    getToken: vi.fn(async () => stored),
    saveToken: vi.fn(async () => {}),
    clearToken: vi.fn(async () => {}),
  };
  return {
    hubOrigin: 'https://hub.example.com',
    credentialStore,
    requestDeviceCode: vi.fn(async () => ({}) as DeviceCodeResponse),
    pollTokenEndpoint: vi.fn() as PollTokenEndpoint,
    refreshTokenEndpoint: vi.fn(async () => ({
      status: 200,
      body: {
        access_token: docsAccessToken(),
        token_type: 'Bearer',
        expires_in: 900,
        refresh_token: 's'.repeat(32),
        scope: ['docs:write'],
      },
    })) as RefreshTokenEndpoint,
    sleep: vi.fn(async () => {}),
    now: () => 2,
    openVerificationUrl: vi.fn(),
    log: vi.fn(),
    createHubApiClient: vi.fn(() => client),
  };
}

function client(overrides: Record<string, unknown>): DocsHubApiClient {
  const value = {
    getJson: vi.fn(),
    getJsonResponse: vi.fn(async () => ({ status: 404, body: {}, etag: null })),
    postJson: vi.fn(),
    putJsonResponse: vi.fn(async () => ({ status: 201, body: RESPONSE, etag: '"docs-import-1"' })),
    putBytes: vi.fn(),
    ...overrides,
  };
  return value as DocsHubApiClient;
}

const OPTIONS = {
  tenantSlug: 'acme',
  source: 'claude-code',
  repositoryId: 'owner/repository',
  relativePath: 'docs/design.md',
  title: '設計書',
  bodyMarkdown: '# 本文',
  hubBaseUrl: 'https://hub.example.com',
  origin: 'https://cli.example.com',
  force: false,
} as const;

describe('docs sync command', () => {
  it('repository identityと相対pathから安定したhash IDを作り絶対pathを拒否する', async () => {
    const first = await deriveExternalDocumentId('owner/repository', 'docs/design.md');
    const second = await deriveExternalDocumentId('owner/repository', './docs/design.md');
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(second).toBe(first);
    await expect(deriveExternalDocumentId('owner/repository', '/Users/alice/design.md')).rejects.toThrow('相対path');
  });

  it('未同期文書を作成し、本文ではなくhash IDだけをURLへ含める', async () => {
    const api = client({});
    const result = await runDocsCommand(OPTIONS, depsWith(api));
    expect(result.response.outcome).toBe('created');
    expect(api.putJsonResponse).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/v1\/docs\/imports\/claude-code\/[a-f0-9]{64}$/),
      { title: '設計書', body_markdown: '# 本文' },
      {},
    );
  });

  it('Hub側編集を検出したらforce無しでは上書きしない', async () => {
    const api = client({
      getJsonResponse: vi.fn(async () => ({
        status: 200,
        body: { ...RESPONSE, sync_state: 'modified', outcome: 'fetched' },
        etag: '"docs-import-2"',
      })),
    });
    await expect(runDocsCommand(OPTIONS, depsWith(api))).rejects.toThrow('--force true');
    expect(api.putJsonResponse).not.toHaveBeenCalled();
  });

  it('公開済み文書のforce同期はETagを使い、下書きへ戻すことを事前に知らせる', async () => {
    const api = client({
      getJsonResponse: vi.fn(async () => ({
        status: 200,
        body: {
          ...RESPONSE,
          document: { ...RESPONSE.document, status: 'published' },
          sync_state: 'modified',
          outcome: 'fetched',
        },
        etag: '"docs-import-2"',
      })),
    });
    const deps = depsWith(api);
    await runDocsCommand({ ...OPTIONS, force: true }, deps);
    expect(deps.log).toHaveBeenCalledWith('公開済み文書を外部版で置き換え、確認用の下書きへ戻します');
    expect(api.putJsonResponse).toHaveBeenCalledWith(expect.any(String), expect.any(Object), {
      ifMatch: '"docs-import-2"',
    });
  });
});
