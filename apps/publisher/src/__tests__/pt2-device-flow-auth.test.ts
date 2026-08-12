/**
 * PT2: Device Flow 認証 + OS 資格情報域保存。
 * 対応: docs/features/feat-publisher-plugin/test-design.md §PT2, AD-4。
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { PublisherCredentialRecord } from '@harness-hub/schemas';
import { describe, expect, it, vi } from 'vitest';

import {
  ACCESS_TOKEN_TTL_SECONDS,
  applyPollResponse,
  createMacKeychainAdapter,
  createWindowsCredentialManagerAdapter,
  DEVICE_POLL_BACKOFF_SECONDS,
  DEVICE_POLL_MAX_INTERVAL_SECONDS,
  type DevicePollState,
  isExpired,
  REFRESH_TOKEN_ROTATION_SECONDS,
  refreshOrClear,
  scopesForCommand,
  startDevicePoll,
} from '../auth/index.js';
import type { ProcessResult, RunProcess } from '../shared/process.js';

const AUTH_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'auth');

function baseState(overrides: Partial<DevicePollState> = {}): DevicePollState {
  return {
    deviceCode: 'device-code-0123456789abcdef0123456789',
    intervalSeconds: 5,
    issuedAtEpochSeconds: 1000,
    expiresInSeconds: 600,
    ...overrides,
  };
}

describe('PT2-A device_code/token polling 状態機械', () => {
  it('authorization_pending 応答時は interval (5秒) を維持してポーリングを継続する', () => {
    const state = baseState();
    const outcome = applyPollResponse(state, { status: 400, body: { error: 'authorization_pending' } });
    expect(outcome).toEqual({ kind: 'pending', nextState: state });
  });

  it('slow_down 応答時は interval を +5 秒し、以後その間隔を使う', () => {
    const state = baseState({ intervalSeconds: 5 });
    const outcome = applyPollResponse(state, { status: 400, body: { error: 'slow_down' } });
    expect(outcome.kind).toBe('slow_down');
    if (outcome.kind === 'slow_down') {
      expect(outcome.nextState.intervalSeconds).toBe(5 + DEVICE_POLL_BACKOFF_SECONDS);
    }
  });

  it('interval が上限 60 秒を超えて増加しない', () => {
    const state = baseState({ intervalSeconds: DEVICE_POLL_MAX_INTERVAL_SECONDS - 2 });
    const outcome = applyPollResponse(state, { status: 400, body: { error: 'slow_down' } });
    expect(outcome.kind).toBe('slow_down');
    if (outcome.kind === 'slow_down') {
      expect(outcome.nextState.intervalSeconds).toBe(DEVICE_POLL_MAX_INTERVAL_SECONDS);
    }
  });

  it('expired_token 応答時はポーリングを終了しエラーを返す', () => {
    const state = baseState();
    const outcome = applyPollResponse(state, { status: 400, body: { error: 'expired_token' } });
    expect(outcome).toEqual({ kind: 'expired' });
  });
});

describe('PT2-B token 数値契約', () => {
  it('device_code は発行から 10 分で TTL 切れと判定する', () => {
    const response = {
      device_code: 'device-code-0123456789abcdef0123456789',
      user_code: 'ABCDEFGH',
      verification_uri: 'https://hub.example.com/device',
      verification_uri_complete: 'https://hub.example.com/device?user_code=ABCDEFGH',
      expires_in: 600,
      interval: 5,
    };
    const state = startDevicePoll(response, 1_000);
    expect(isExpired(state.issuedAtEpochSeconds, state.expiresInSeconds, 1_000 + 599)).toBe(false);
    expect(isExpired(state.issuedAtEpochSeconds, state.expiresInSeconds, 1_000 + 600)).toBe(true);
  });

  it('access token は発行から 15 分で期限切れと判定する', () => {
    expect(ACCESS_TOKEN_TTL_SECONDS).toBe(15 * 60);
    expect(isExpired(1_000, ACCESS_TOKEN_TTL_SECONDS, 1_000 + ACCESS_TOKEN_TTL_SECONDS - 1)).toBe(false);
    expect(isExpired(1_000, ACCESS_TOKEN_TTL_SECONDS, 1_000 + ACCESS_TOKEN_TTL_SECONDS)).toBe(true);
  });

  it('refresh token は発行から 90 日で rotation 対象と判定する', () => {
    expect(REFRESH_TOKEN_ROTATION_SECONDS).toBe(90 * 24 * 60 * 60);
    expect(isExpired(1_000, REFRESH_TOKEN_ROTATION_SECONDS, 1_000 + REFRESH_TOKEN_ROTATION_SECONDS - 1)).toBe(false);
    expect(isExpired(1_000, REFRESH_TOKEN_ROTATION_SECONDS, 1_000 + REFRESH_TOKEN_ROTATION_SECONDS)).toBe(true);
  });
});

describe('PT2-C reuse-detection による family 全失効', () => {
  it.todo(
    '対象外: 同一 family の token を全て失効させる判定そのものは Hub 側 (feat-auth-tenancy) の責務。' +
      'client 側の責務は失敗時に無条件で自分の credential store をクリアすることのみ (auth/token-manager.ts 冒頭コメント参照)',
  );

  it('family 失効時に OS credential store 側の該当 token もクリアする (reuse-detection の応答は invalid_grant/access_denied を区別しないため無条件でクリアする)', async () => {
    const clearToken = vi.fn(async () => {});
    const store = {
      platform: 'darwin' as const,
      saveToken: vi.fn(async () => {}),
      getToken: vi.fn(async () => null),
      clearToken,
    };
    const endpoint = async () => ({ status: 400, body: { error: 'invalid_grant' } });

    await expect(
      refreshOrClear(store, 'https://hub.example.com', 'acme', 'used-up-refresh-token-0123456789ab', endpoint),
    ).rejects.toThrow();
    expect(clearToken).toHaveBeenCalledWith('https://hub.example.com', 'acme');
  });
});

describe('PT2-D OS 資格情報域への保存・平文非保存', () => {
  function fakeRunProcess(result: ProcessResult): {
    runProcess: RunProcess;
    calls: Array<{ command: string; args: readonly string[] }>;
  } {
    const calls: Array<{ command: string; args: readonly string[] }> = [];
    const runProcess: RunProcess = async (command, args) => {
      calls.push({ command, args });
      return result;
    };
    return { runProcess, calls };
  }

  const record: PublisherCredentialRecord = {
    hub_origin: 'https://hub.example.com',
    tenant_slug: 'acme',
    workspace_id: 'ws-1',
    refresh_token: 'a'.repeat(32),
    scope: ['publish:write'],
    issued_at: 1_000,
  };

  it('macOS では Keychain adapter (security コマンド) 経由でのみ token を保存する', async () => {
    const { runProcess, calls } = fakeRunProcess({ exitCode: 0, stdout: '', stderr: '' });
    const adapter = createMacKeychainAdapter(runProcess);
    await adapter.saveToken(record);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.command).toBe('security');
    expect(calls[0]?.args).toContain('add-generic-password');
  });

  it('Windows では Credential Manager adapter (PasswordVault) 経由でのみ token を保存する', async () => {
    const { runProcess, calls } = fakeRunProcess({ exitCode: 0, stdout: '', stderr: '' });
    const adapter = createWindowsCredentialManagerAdapter(runProcess);
    await adapter.saveToken(record);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.command).toBe('powershell.exe');
    expect(calls[0]?.args.join(' ')).toContain('PasswordVault');
  });

  it('token 保存処理の実行中、平文ファイル・環境変数への書き込みが発生しない (静的検査)', () => {
    const source = readFileSync(join(AUTH_DIR, 'credential-store.ts'), 'utf-8');
    expect(source).not.toMatch(/writeFileSync|fs\.write|process\.env\[.*\]\s*=/);
  });
});

describe('PT2-E scope 最小権限', () => {
  it('publish サブコマンドは publish:write のみを要求する', () => {
    expect(scopesForCommand('publish')).toEqual(['publish:write']);
  });

  it('feedback サブコマンドは feedback:write のみを追加要求する (AD-6)', () => {
    expect(scopesForCommand('feedback')).toEqual(['feedback:write']);
  });

  it('docs サブコマンドは docs:write だけを要求する', () => {
    expect(scopesForCommand('docs')).toEqual(['docs:write']);
  });
});
