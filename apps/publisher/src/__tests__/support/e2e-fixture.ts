/**
 * PT4-D/PT6-B が共有する「初回 publish 全体」の実行 fixture。
 * test-design.md §PT6-B が「PT4-D の実機 E2E タイムボックス計測と同一の実行」と明記しているため、
 * 2 つの test file に同じ組み立てを複製せず本 file に集約する。
 *
 * **計測の限界 (誠実性のための明記、audit-must-measure-run-not-invocation の精神)**:
 * ここで計測できるのは `runPublishCommand` (package 収集 → pre-check → Device Flow →
 * wrangler 実行 → Hub 登録) という *ソフトウェア自身の処理オーバーヘッド* のみである。
 * Hub API・wrangler CLI 子プロセス・ブラウザでの実 OAuth 認可操作はすべて fake (即時応答) に
 * 置き換えている。実ネットワーク往復・人間の認可待ち時間・実 Cloudflare デプロイを含む実測ではない。
 * この開発環境には実 Hub サーバー・実 tenant・実ブラウザ操作が存在しないため、真の実機実測は
 * できない (詳細は docs/features/feat-publisher-plugin/test-run-results.md に明記)。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { PublishRequestView } from '@harness-hub/schemas';
import { vi } from 'vitest';

import type { CredentialStoreAdapter, PollTokenEndpoint, RefreshTokenEndpoint } from '../../auth/index.js';
import type { HubApiClient } from '../../cli/http-client.js';
import {
  type PublishCommandDeps,
  type PublishCommandOptions,
  type PublishCommandResult,
  runPublishCommand,
} from '../../cli/publish-command.js';
import type { ProcessResult, RunProcess } from '../../shared/process.js';

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

function writeValidPackage(dir: string): void {
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
    }),
  );
  writeFileSync(join(dir, 'README.md'), '# demo package\n');
  writeFileSync(join(dir, 'skills', 'demo', 'SKILL.md'), '# デモ skill\n\nこれはテスト用のデモ説明です。\n');
}

export interface InitialPublishTimeboxResult {
  readonly result: PublishCommandResult;
  readonly elapsedMs: number;
}

/**
 * 保存済み token が無い「初回」状態から device flow → publish → wrangler deploy → Hub 登録まで
 * 一気通貫させ、所要時間を計測する (acceptance 1 の「Hub への登録が確認できる」を満たす経路として
 * target='web_app' を使う)。
 */
export async function runInitialPublishTimebox(): Promise<InitialPublishTimeboxResult> {
  const packageDir = mkdtempSync(join(tmpdir(), 'publisher-e2e-'));
  try {
    writeValidPackage(packageDir);

    const created = fakeRequestView({ status: 'draft', release_id: null });
    const submitted = fakeRequestView({ status: 'published', release_id: 'rel_1', channel_id: 'chan_1' });
    const postJson = vi
      .fn()
      .mockResolvedValueOnce(created)
      .mockResolvedValueOnce(submitted)
      .mockResolvedValueOnce({ id: 'dep_1' });
    const putBytes = vi.fn().mockResolvedValue(undefined);
    const client: HubApiClient = { postJson, putBytes, getJson: vi.fn() };

    const runProcess: RunProcess = vi.fn(
      async (): Promise<ProcessResult> => ({
        exitCode: 0,
        stdout: 'Deployed to https://demo.example.workers.dev',
        stderr: '',
      }),
    );

    const credentialStore: CredentialStoreAdapter = {
      platform: 'darwin',
      getToken: vi.fn(async () => null),
      saveToken: vi.fn(async () => {}),
      clearToken: vi.fn(async () => {}),
    };
    const requestDeviceCode: PublishCommandDeps['requestDeviceCode'] = vi.fn(async () => ({
      device_code: 'device-code-0123456789abcdef0123456789',
      user_code: 'ABCD-EFGH',
      verification_uri: 'https://hub.example.com/device',
      verification_uri_complete: 'https://hub.example.com/device?code=ABCD-EFGH',
      expires_in: 600,
      interval: 5,
    }));
    const pollTokenEndpoint: PollTokenEndpoint = vi.fn(async () => ({
      status: 200,
      body: {
        access_token: fakeAccessToken(),
        token_type: 'Bearer',
        expires_in: 900,
        refresh_token: 'r'.repeat(32),
        scope: ['publish:write'],
      },
    }));
    const refreshTokenEndpoint: RefreshTokenEndpoint = vi.fn();

    const deps: PublishCommandDeps = {
      credentialStore,
      requestDeviceCode,
      pollTokenEndpoint,
      refreshTokenEndpoint,
      // fake の待ち時間をそのまま計測に混ぜない (実 interval 秒を待たせても実測の意味が無いため)。
      sleep: vi.fn(async () => {}),
      now: () => 1_000,
      openVerificationUrl: vi.fn(),
      log: vi.fn(),
      runProcess,
      createHubApiClient: vi.fn(() => client),
    };

    const options: PublishCommandOptions = {
      packageDir,
      tenantSlug: 'acme',
      projectId: 'proj_1',
      target: 'web_app',
      visibility: 'private',
      hubBaseUrl: 'https://hub.example.com',
      origin: 'https://cli.harness-hub.example.com',
      wranglerConfigPath: 'wrangler.toml',
    };

    const startedAt = performance.now();
    const result = await runPublishCommand(options, deps);
    const elapsedMs = performance.now() - startedAt;

    return { result, elapsedMs };
  } finally {
    rmSync(packageDir, { recursive: true, force: true });
  }
}
