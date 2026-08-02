/**
 * PT4: wrangler CLI 実行ラッパー。
 * 対応: docs/features/feat-publisher-plugin/test-design.md §PT4, AD-5, acceptance 1・3。
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { HubApiClient } from '../cli/http-client.js';
import { extractDeployUrl, registerWranglerDeployment, runWranglerDeploy } from '../deploy/index.js';
import type { RunProcess } from '../shared/process.js';
import { runInitialPublishTimebox } from './support/e2e-fixture.js';

const INITIAL_PUBLISH_TIMEBOX_MS = 15 * 60 * 1000;

const DEPLOY_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'deploy');

function fakeRunProcess(result: { exitCode: number; stdout: string; stderr?: string }): RunProcess {
  return async () => ({ exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr ?? '' });
}

describe('PT4-A プロセス実行・exit code 処理', () => {
  it('exit code 0 のとき成功として扱う', async () => {
    const runProcess = fakeRunProcess({ exitCode: 0, stdout: 'Deployed to https://demo.example.workers.dev' });
    const outcome = await runWranglerDeploy(runProcess, { configPath: 'wrangler.toml' });
    expect(outcome).toEqual({ ok: true, url: 'https://demo.example.workers.dev', exitCode: 0, errorMessage: null });
  });

  it('exit code 非0 のとき失敗として扱い、stderr をエラーメッセージに含める', async () => {
    const runProcess = fakeRunProcess({ exitCode: 1, stdout: '', stderr: 'authentication failed' });
    const outcome = await runWranglerDeploy(runProcess, { configPath: 'wrangler.toml' });
    expect(outcome.ok).toBe(false);
    expect(outcome.exitCode).toBe(1);
    expect(outcome.errorMessage).toBe('authentication failed');
  });

  it('exit code 非0でも URL が出力済みなら orphan_candidate 登録用に URL を保持する', async () => {
    const runProcess = fakeRunProcess({
      exitCode: 1,
      stdout: 'Deployed to https://demo.example.workers.dev\npost-deploy check failed',
      stderr: 'post-deploy check failed',
    });
    const outcome = await runWranglerDeploy(runProcess, { configPath: 'wrangler.toml' });
    expect(outcome).toEqual({
      ok: false,
      url: 'https://demo.example.workers.dev',
      exitCode: 1,
      errorMessage: 'post-deploy check failed',
    });
  });
});

describe('PT4-B stdout からの URL 抽出', () => {
  it('wrangler の成功時 stdout フォーマットから deploy 先 URL を抽出する', () => {
    const stdout = 'Uploaded demo (1.23 sec)\nDeployed demo triggers (0.45 sec)\n  https://demo.example.workers.dev\n';
    expect(extractDeployUrl(stdout)).toBe('https://demo.example.workers.dev');
  });

  it('URL が見つからない stdout の場合はエラーとして扱う (成功扱いにしない)', async () => {
    const runProcess = fakeRunProcess({ exitCode: 0, stdout: 'Uploaded demo (1.23 sec)\n' });
    const outcome = await runWranglerDeploy(runProcess, { configPath: 'wrangler.toml' });
    expect(extractDeployUrl('Uploaded demo (1.23 sec)\n')).toBeNull();
    expect(outcome).toEqual({
      ok: false,
      url: null,
      exitCode: 0,
      errorMessage: 'wrangler の出力から URL を抽出できませんでした',
    });
  });
});

describe('PT4-C Hub API (POST /api/v1/projects/:id/deployment) 呼出契約', () => {
  it('抽出した exit code / URL を packages/schemas の deployment 型に沿って送信する', async () => {
    const client: HubApiClient = {
      getJson: async <T>() => ({}) as T,
      postJson: async <T>(path: string, body: unknown) => ({ path, body }) as T,
      putBytes: async <T>() => ({}) as T,
    };
    const result = await registerWranglerDeployment(client, {
      projectId: 'proj-1',
      channelId: 'chan-1',
      releaseId: 'rel-1',
      url: 'https://demo.example.workers.dev',
      exitCode: 0,
    });
    expect(result).toEqual({
      path: '/api/v1/projects/proj-1/deployment',
      body: {
        channel_id: 'chan-1',
        release_id: 'rel-1',
        url: 'https://demo.example.workers.dev',
        provider: 'cloudflare',
        exit_code: 0,
      },
    });
  });

  it('health 確認・Catalog 昇格判定の分岐が deploy/ 側に実装されていない (Hub 側の責務, AD-5 帰結)', () => {
    const wranglerSource = readFileSync(join(DEPLOY_DIR, 'wrangler.ts'), 'utf-8');
    const reportSource = readFileSync(join(DEPLOY_DIR, 'deployment-report.ts'), 'utf-8');
    for (const source of [wranglerSource, reportSource]) {
      expect(source).not.toMatch(/health.?check/i);
      expect(source).not.toMatch(/catalog.?promot/i);
    }
  });
});

describe('PT4-D 実機 E2E タイムボックス計測 (initial-publish-15min-target-o4-h8)', () => {
  it('macOS: package収集→pre-check→Device Flow認証→wrangler実行→Hub登録の合計が15分以内 (自動計測、fake I/O境界)', async () => {
    const { result, elapsedMs } = await runInitialPublishTimebox();

    expect(result.ok).toBe(true);
    expect(elapsedMs).toBeLessThan(INITIAL_PUBLISH_TIMEBOX_MS);
  });

  it.todo(
    'Windows 実機: この開発環境には実機が存在しないため自動計測対象外。' +
      'test-run-results.md の手動実施用再現手順書を参照する (2026-08-02 作者確認)',
  );
});
