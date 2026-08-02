import { describe, expect, it, vi } from 'vitest';

import { type DevicePollState, type PollTokenEndpoint, pollForToken } from './device-flow.js';

const TOKEN_RESPONSE = {
  access_token: 'a'.repeat(40),
  token_type: 'Bearer' as const,
  expires_in: 900,
  refresh_token: 'r'.repeat(32),
  scope: ['publish:write' as const],
};

function shiftOrThrow<T>(queue: T[]): T {
  const item = queue.shift();
  if (item === undefined) throw new Error('response queue が空です (test の設定ミス)');
  return item;
}

function baseState(overrides: Partial<DevicePollState> = {}): DevicePollState {
  return {
    deviceCode: 'device-code-0123456789abcdef0123456789',
    intervalSeconds: 5,
    issuedAtEpochSeconds: 1_000,
    expiresInSeconds: 600,
    ...overrides,
  };
}

describe('pollForToken', () => {
  it('pending を経て approved になったら sleep してから token を返す', async () => {
    const responses: Array<{ status: number; body: unknown }> = [
      { status: 400, body: { error: 'authorization_pending' } },
      { status: 200, body: TOKEN_RESPONSE },
    ];
    const pollTokenEndpoint: PollTokenEndpoint = vi.fn(async () => shiftOrThrow(responses));
    const sleep = vi.fn(async () => {});

    const result = await pollForToken(baseState(), { pollTokenEndpoint, sleep, now: () => 1_000 });

    expect(result).toEqual(TOKEN_RESPONSE);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenNthCalledWith(1, 5_000);
    expect(pollTokenEndpoint).toHaveBeenCalledTimes(2);
  });

  it('slow_down を受けたら次回以降 sleep の間隔を +5 秒にする', async () => {
    const responses: Array<{ status: number; body: unknown }> = [
      { status: 400, body: { error: 'slow_down' } },
      { status: 200, body: TOKEN_RESPONSE },
    ];
    const pollTokenEndpoint: PollTokenEndpoint = vi.fn(async () => shiftOrThrow(responses));
    const sleep = vi.fn(async () => {});

    await pollForToken(baseState({ intervalSeconds: 5 }), { pollTokenEndpoint, sleep, now: () => 1_000 });

    expect(sleep).toHaveBeenNthCalledWith(1, 5_000);
    expect(sleep).toHaveBeenNthCalledWith(2, 10_000);
  });

  it('expired_token を受けたらエラーで終了する', async () => {
    const pollTokenEndpoint: PollTokenEndpoint = vi.fn(async () => ({ status: 400, body: { error: 'expired_token' } }));
    const sleep = vi.fn(async () => {});

    await expect(pollForToken(baseState(), { pollTokenEndpoint, sleep, now: () => 1_000 })).rejects.toThrow(
      '有効期限が切れました',
    );
  });

  it('access_denied を受けたらエラーで終了する', async () => {
    const pollTokenEndpoint: PollTokenEndpoint = vi.fn(async () => ({ status: 400, body: { error: 'access_denied' } }));
    const sleep = vi.fn(async () => {});

    await expect(pollForToken(baseState(), { pollTokenEndpoint, sleep, now: () => 1_000 })).rejects.toThrow(
      '認可が拒否されました',
    );
  });

  it('未知のエラーコードを受けたらそのコードを含むエラーで終了する', async () => {
    const pollTokenEndpoint: PollTokenEndpoint = vi.fn(async () => ({
      status: 400,
      body: { error: 'invalid_request' },
    }));
    const sleep = vi.fn(async () => {});

    await expect(pollForToken(baseState(), { pollTokenEndpoint, sleep, now: () => 1_000 })).rejects.toThrow(
      /invalid_request/,
    );
  });

  it('device_code の TTL が切れていたら endpoint を呼ばずにエラーで終了する', async () => {
    const pollTokenEndpoint: PollTokenEndpoint = vi.fn();
    const sleep = vi.fn(async () => {});
    const state = baseState({ issuedAtEpochSeconds: 1_000, expiresInSeconds: 600 });

    await expect(pollForToken(state, { pollTokenEndpoint, sleep, now: () => 1_000 + 600 })).rejects.toThrow(
      'device_code の有効期限が切れました。最初からやり直してください',
    );
    expect(pollTokenEndpoint).not.toHaveBeenCalled();
  });
});
