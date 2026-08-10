import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  PUBLISH_NEEDS_FIX_HEADING,
  PUBLISH_RESUBMIT_ACTION_LABEL,
  type PublisherCredentialRecord,
  type PublishRequestView,
  publishNeedsFixSummary,
} from '@harness-hub/schemas';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CredentialStoreAdapter, PollTokenEndpoint, RefreshTokenEndpoint } from '../auth/index.js';
import type { ProcessResult, RunProcess } from '../shared/process.js';
import type { HubApiClient } from './http-client.js';
import { type PublishCommandDeps, type PublishCommandOptions, runPublishCommand } from './publish-command.js';

function base64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function fakeAccessToken(): string {
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
  };
  return `${base64url({ alg: 'none' })}.${base64url(claims)}.sig`;
}

function fakeRequestView(overrides: Partial<PublishRequestView> = {}): PublishRequestView {
  return {
    id: 'req_1',
    project_id: 'proj_1',
    channel_id: 'chan_1',
    status: 'draft',
    verdict: null,
    findings: [],
    release_id: null,
    content_hash: null,
    requested_by: 'user_1',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as PublishRequestView;
}

function neverCall(name: string): (...args: unknown[]) => never {
  return () => {
    throw new Error(`${name} は呼ばれない想定`);
  };
}

function writeValidPackage(dir: string, manifestOverrides: Record<string, unknown> = {}): void {
  mkdirSync(join(dir, 'skills', 'demo'), { recursive: true });
  writeFileSync(
    join(dir, 'plugin.json'),
    JSON.stringify({
      name: 'demo-skill',
      version: '1.0.0',
      description: 'デモパッケージ',
      owner: 'team-a',
      visibility: 'private',
      summary: 'デモ用の要約です',
      ...manifestOverrides,
    }),
  );
  writeFileSync(join(dir, 'README.md'), '# demo package\n');
  writeFileSync(join(dir, 'skills', 'demo', 'SKILL.md'), '# デモ skill\n\nこれはテスト用のデモ説明です。\n');
}

function baseOptions(packageDir: string, overrides: Partial<PublishCommandOptions> = {}): PublishCommandOptions {
  return {
    packageDir,
    tenantSlug: 'acme',
    projectId: 'proj_1',
    target: 'skill',
    visibility: 'private',
    hubBaseUrl: 'https://hub.example.com',
    origin: 'https://cli.harness-hub.example.com',
    ...overrides,
  };
}

function createFakeDeps(overrides: Partial<PublishCommandDeps> = {}) {
  const postJson = vi.fn();
  const putBytes = vi.fn().mockResolvedValue(undefined);
  const getJson = vi.fn();
  const client: HubApiClient = { postJson, putBytes, getJson };
  const createHubApiClient = vi.fn(() => client);
  const runProcess: RunProcess = vi.fn(async (): Promise<ProcessResult> => ({ exitCode: 0, stdout: '', stderr: '' }));
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
  const refreshTokenEndpoint: RefreshTokenEndpoint = vi.fn(async () => ({
    status: 200,
    body: {
      access_token: fakeAccessToken(),
      token_type: 'Bearer',
      expires_in: 900,
      refresh_token: 'r'.repeat(32),
      scope: ['publish:write'],
    },
  }));
  const deps: PublishCommandDeps = {
    credentialStore,
    requestDeviceCode: neverCall('requestDeviceCode') as PublishCommandDeps['requestDeviceCode'],
    pollTokenEndpoint: neverCall('pollTokenEndpoint') as PollTokenEndpoint,
    refreshTokenEndpoint,
    sleep: vi.fn(async () => {}),
    now: () => 1_000,
    openVerificationUrl: vi.fn(),
    log: vi.fn(),
    runProcess,
    createHubApiClient,
    ...overrides,
  };
  return { deps, postJson, putBytes, runProcess, createHubApiClient };
}

let packageDir: string | undefined;

afterEach(() => {
  if (packageDir !== undefined) rmSync(packageDir, { recursive: true, force: true });
  packageDir = undefined;
});

describe('runPublishCommand', () => {
  it('plugin.json の必須項目が無ければ認証やネットワークに触れず manifest エラーを返す', async () => {
    packageDir = mkdtempSync(join(tmpdir(), 'publisher-publish-'));
    writeFileSync(join(packageDir, 'README.md'), '# no manifest\n');
    const { deps, createHubApiClient } = createFakeDeps();

    const result = await runPublishCommand(baseOptions(packageDir), deps);

    expect(result).toEqual({
      ok: false,
      reason: expect.stringContaining('plugin.json の必須項目が不足しています'),
    });
    expect(createHubApiClient).not.toHaveBeenCalled();
    expect(deps.credentialStore.getToken).not.toHaveBeenCalled();
  });

  it('ローカル pre-check で禁止ファイルが見つかったら送信せずに終了する', async () => {
    packageDir = mkdtempSync(join(tmpdir(), 'publisher-publish-'));
    writeValidPackage(packageDir);
    writeFileSync(join(packageDir, 'skills', 'demo', 'run.sh'), '#!/bin/bash\necho hi\n');
    const { deps, createHubApiClient } = createFakeDeps();

    const result = await runPublishCommand(baseOptions(packageDir), deps);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('PKG-FORBIDDEN-SCRIPT');
    expect(createHubApiClient).not.toHaveBeenCalled();
  });

  it('正常系 (target=skill): publish → package アップロード → submit の順で呼び、published なら成功で終わる', async () => {
    packageDir = mkdtempSync(join(tmpdir(), 'publisher-publish-'));
    writeValidPackage(packageDir);
    const { deps, postJson, putBytes, runProcess } = createFakeDeps();
    const created = fakeRequestView({ status: 'draft', release_id: null });
    const submitted = fakeRequestView({ status: 'published', release_id: 'rel_1' });
    postJson.mockResolvedValueOnce(created).mockResolvedValueOnce(submitted);

    const result = await runPublishCommand(baseOptions(packageDir, { target: 'skill' }), deps);

    expect(result).toEqual({ ok: true, request: submitted, deployedUrl: null });
    expect(postJson).toHaveBeenNthCalledWith(1, '/api/v1/publish', {
      project_id: 'proj_1',
      target: 'skill',
      visibility: 'private',
    });
    expect(putBytes).toHaveBeenCalledTimes(1);
    const [putPath, putBody] = putBytes.mock.calls[0] as [string, Uint8Array];
    expect(putPath).toBe('/api/v1/publish/req_1/package');
    expect(putBody).toBeInstanceOf(Uint8Array);
    expect(postJson).toHaveBeenNthCalledWith(2, '/api/v1/publish/req_1/submit', {});
    expect(runProcess).not.toHaveBeenCalled();
  });

  it('Hub 検査で needs_fix と判定されたら findings を添えて失敗を返す', async () => {
    packageDir = mkdtempSync(join(tmpdir(), 'publisher-publish-'));
    writeValidPackage(packageDir);
    const { deps, postJson } = createFakeDeps();
    postJson.mockResolvedValueOnce(fakeRequestView()).mockResolvedValueOnce(
      fakeRequestView({
        status: 'needs_fix',
        verdict: 'red',
        findings: [
          {
            rule_id: 'PKG-SEMVER',
            stage: 'static-validation',
            severity: 'error',
            message: 'semver 不正',
            path: 'plugin.json',
            line: null,
          },
        ],
      }),
    );

    const result = await runPublishCommand(baseOptions(packageDir), deps);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      // 文言の正本は @harness-hub/schemas 側 (Web 経路と共有する) なので、そこから引く
      expect(result.reason).toContain(publishNeedsFixSummary('red'));
      expect(result.reason).toContain(PUBLISH_NEEDS_FIX_HEADING);
      expect(result.reason).toContain(PUBLISH_RESUBMIT_ACTION_LABEL);
      expect(result.reason).toContain('PKG-SEMVER');
    }
  });

  it('submit 後の status が published でも needs_fix でもなければ想定外エラーとして返す', async () => {
    packageDir = mkdtempSync(join(tmpdir(), 'publisher-publish-'));
    writeValidPackage(packageDir);
    const { deps, postJson } = createFakeDeps();
    postJson.mockResolvedValueOnce(fakeRequestView()).mockResolvedValueOnce(fakeRequestView({ status: 'validating' }));

    const result = await runPublishCommand(baseOptions(packageDir), deps);

    expect(result).toEqual({ ok: false, reason: expect.stringContaining('status=validating') });
  });

  it('published なのに release_id が null なら内部不整合として失敗を返す', async () => {
    packageDir = mkdtempSync(join(tmpdir(), 'publisher-publish-'));
    writeValidPackage(packageDir);
    const { deps, postJson } = createFakeDeps();
    postJson
      .mockResolvedValueOnce(fakeRequestView())
      .mockResolvedValueOnce(fakeRequestView({ status: 'published', release_id: null }));

    const result = await runPublishCommand(baseOptions(packageDir), deps);

    expect(result).toEqual({ ok: false, reason: expect.stringContaining('内部不整合') });
  });

  it('target=web_app なのに wranglerConfigPath が無ければエラーを返す', async () => {
    packageDir = mkdtempSync(join(tmpdir(), 'publisher-publish-'));
    writeValidPackage(packageDir);
    const { deps, postJson, runProcess } = createFakeDeps();
    postJson
      .mockResolvedValueOnce(fakeRequestView())
      .mockResolvedValueOnce(fakeRequestView({ status: 'published', release_id: 'rel_1' }));

    const result = await runPublishCommand(baseOptions(packageDir, { target: 'web_app' }), deps);

    expect(result).toEqual({ ok: false, reason: expect.stringContaining('wranglerConfigPath が必要です') });
    expect(runProcess).not.toHaveBeenCalled();
  });

  it('wrangler deploy が失敗しても Hub は既に published 済みなので ok:true・deployedUrl:null で返す', async () => {
    packageDir = mkdtempSync(join(tmpdir(), 'publisher-publish-'));
    writeValidPackage(packageDir);
    const { deps, postJson, runProcess } = createFakeDeps();
    const submitted = fakeRequestView({ status: 'published', release_id: 'rel_1', channel_id: 'chan_1' });
    postJson.mockResolvedValueOnce(fakeRequestView()).mockResolvedValueOnce(submitted);
    (runProcess as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      exitCode: 1,
      stdout: '',
      stderr: 'wrangler が壊れています',
    });

    const result = await runPublishCommand(
      baseOptions(packageDir, { target: 'web_app', wranglerConfigPath: 'wrangler.toml' }),
      deps,
    );

    expect(result).toEqual({ ok: true, request: submitted, deployedUrl: null });
    expect(deps.log).toHaveBeenCalledWith(expect.stringContaining('wrangler deploy に失敗しました'));
    expect(postJson).toHaveBeenCalledTimes(2);
  });

  it('wrangler deploy が URL 出力後に失敗したら orphan_candidate として deployment を登録する', async () => {
    packageDir = mkdtempSync(join(tmpdir(), 'publisher-publish-'));
    writeValidPackage(packageDir);
    const { deps, postJson, runProcess } = createFakeDeps();
    const submitted = fakeRequestView({ status: 'published', release_id: 'rel_1', channel_id: 'chan_1' });
    postJson
      .mockResolvedValueOnce(fakeRequestView())
      .mockResolvedValueOnce(submitted)
      .mockResolvedValueOnce({ id: 'dep_1' });
    (runProcess as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      exitCode: 1,
      stdout: 'Deployed to https://demo.example.workers.dev',
      stderr: 'post-deploy check failed',
    });

    const result = await runPublishCommand(
      baseOptions(packageDir, { target: 'web_app', wranglerConfigPath: 'wrangler.toml' }),
      deps,
    );

    expect(result).toEqual({ ok: true, request: submitted, deployedUrl: 'https://demo.example.workers.dev' });
    expect(deps.log).toHaveBeenCalledWith(expect.stringContaining('orphan_candidate'));
    expect(postJson).toHaveBeenNthCalledWith(3, '/api/v1/projects/proj_1/deployment', {
      channel_id: 'chan_1',
      release_id: 'rel_1',
      url: 'https://demo.example.workers.dev',
      provider: 'cloudflare',
      exit_code: 1,
    });
  });

  it('wrangler deploy が成功したら deployment を登録し deployedUrl を返す', async () => {
    packageDir = mkdtempSync(join(tmpdir(), 'publisher-publish-'));
    writeValidPackage(packageDir);
    const { deps, postJson, runProcess } = createFakeDeps();
    const submitted = fakeRequestView({ status: 'published', release_id: 'rel_1', channel_id: 'chan_1' });
    postJson
      .mockResolvedValueOnce(fakeRequestView())
      .mockResolvedValueOnce(submitted)
      .mockResolvedValueOnce({ id: 'dep_1' });
    (runProcess as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      exitCode: 0,
      stdout: 'Deployed to https://demo.example.workers.dev',
      stderr: '',
    });

    const result = await runPublishCommand(
      baseOptions(packageDir, { target: 'web_app', wranglerConfigPath: 'wrangler.toml' }),
      deps,
    );

    expect(result).toEqual({ ok: true, request: submitted, deployedUrl: 'https://demo.example.workers.dev' });
    expect(postJson).toHaveBeenNthCalledWith(3, '/api/v1/projects/proj_1/deployment', {
      channel_id: 'chan_1',
      release_id: 'rel_1',
      url: 'https://demo.example.workers.dev',
      provider: 'cloudflare',
      exit_code: 0,
    });
  });
});
