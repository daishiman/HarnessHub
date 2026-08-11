import { describe, expect, it, vi } from 'vitest';
import { normalizeUserCodeInput } from '../../src/app/device/device-approval-code.js';
import { submitDeviceApproval } from '../../src/app/device/device-approval-form.js';
import { resolveDeviceApprovalSession } from '../../src/app/device/device-approval-session.js';
import { SESSION_COOKIE_NAME, signSessionToken } from '../../src/lib/auth/index.js';
import { TENANT_HEADER, WORKSPACE_HEADER } from '../../src/middleware-contract.js';

const SESSION_SECRET = 'device-approval-session-secret-32-bytes';
const NOW_SECONDS = 1_800_000_000;
const activeSessionDeps = {
  sessionSecret: SESSION_SECRET,
  nowSeconds: NOW_SECONDS,
  isRevoked: vi.fn(async () => false),
};

describe('/device session 表示境界', () => {
  it('署名済みactive sessionからtenantとWorkspaceだけをフォームへ渡す', async () => {
    const token = await signSessionToken(
      {
        sub: 'user-acme',
        tenant_id: 'tenant-acme',
        role: 'member',
        status: 'active',
        workspace_ids: ['workspace-a', 'workspace-b'],
        workspace_names: { 'workspace-a': '営業部' },
        iat: NOW_SECONDS,
        exp: NOW_SECONDS + 3600,
      },
      SESSION_SECRET,
    );

    await expect(resolveDeviceApprovalSession(`${SESSION_COOKIE_NAME}=${token}`, activeSessionDeps)).resolves.toEqual({
      status: 'authenticated',
      tenantId: 'tenant-acme',
      workspaceIds: ['workspace-a', 'workspace-b'],
      workspaceNames: { 'workspace-a': '営業部' },
    });
    expect(activeSessionDeps.isRevoked).toHaveBeenCalledWith('tenant-acme', 'user-acme', NOW_SECONDS);
  });

  it('workspace_names が無い既存 session は空の表示名対応表へ落とす', async () => {
    const token = await signSessionToken(
      {
        sub: 'user-acme',
        tenant_id: 'tenant-acme',
        role: 'member',
        status: 'active',
        workspace_ids: ['workspace-a'],
        iat: NOW_SECONDS,
        exp: NOW_SECONDS + 3600,
      },
      SESSION_SECRET,
    );

    await expect(resolveDeviceApprovalSession(`${SESSION_COOKIE_NAME}=${token}`, activeSessionDeps)).resolves.toEqual({
      status: 'authenticated',
      tenantId: 'tenant-acme',
      workspaceIds: ['workspace-a'],
      workspaceNames: {},
    });
  });

  it('cookieなし・inactive sessionを承認フォームへ通さない', async () => {
    await expect(resolveDeviceApprovalSession(null, activeSessionDeps)).resolves.toEqual({
      status: 'unauthenticated',
    });

    const inactive = await signSessionToken(
      {
        sub: 'inactive-user',
        tenant_id: 'tenant-acme',
        role: 'member',
        status: 'inactive',
        workspace_ids: ['workspace-a'],
        iat: NOW_SECONDS,
        exp: NOW_SECONDS + 3600,
      },
      SESSION_SECRET,
    );
    await expect(
      resolveDeviceApprovalSession(`${SESSION_COOKIE_NAME}=${inactive}`, activeSessionDeps),
    ).resolves.toEqual({ status: 'unauthenticated' });
  });

  it('緊急失効済みsessionではWorkspaceを表示しない', async () => {
    const token = await signSessionToken(
      {
        sub: 'revoked-user',
        tenant_id: 'tenant-acme',
        role: 'member',
        status: 'active',
        workspace_ids: ['workspace-secret'],
        iat: NOW_SECONDS,
        exp: NOW_SECONDS + 3600,
      },
      SESSION_SECRET,
    );

    await expect(
      resolveDeviceApprovalSession(`${SESSION_COOKIE_NAME}=${token}`, {
        ...activeSessionDeps,
        isRevoked: async () => true,
      }),
    ).resolves.toEqual({ status: 'unauthenticated' });
  });
});

describe('/device 承認送信', () => {
  it('空白・hyphen・小文字を正規化し、session cookieとtenant/workspace scopeで既存APIへ送る', async () => {
    const fetcher = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) =>
      Response.json({ approved: true, device_label: 'daishi-macbook' }),
    );

    await expect(
      submitDeviceApproval(
        {
          tenantId: 'tenant-acme',
          workspaceId: 'workspace-a',
          userCode: 'abcd-1234',
        },
        fetcher,
      ),
    ).resolves.toEqual({ ok: true, deviceLabel: 'daishi-macbook' });

    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe('/api/v1/device/approve');
    expect(init?.method).toBe('POST');
    expect(init?.credentials).toBe('same-origin');
    expect(new Headers(init?.headers).get(TENANT_HEADER)).toBe('tenant-acme');
    expect(new Headers(init?.headers).get(WORKSPACE_HEADER)).toBe('workspace-a');
    expect(JSON.parse(String(init?.body))).toEqual({
      user_code: 'ABCD1234',
      workspace_id: 'workspace-a',
    });
  });

  it.each([
    [400, 'invalid_code'],
    [401, 'unauthenticated'],
    [403, 'denied'],
    [404, 'not_found'],
    [409, 'already_used'],
    [410, 'expired'],
    [500, 'unavailable'],
  ] as const)('HTTP %iを利用者向け状態 %sへ閉じて変換する', async (status, error) => {
    const fetcher = vi.fn(async () => Response.json({ error: 'internal-value' }, { status }));
    await expect(
      submitDeviceApproval({ tenantId: 'tenant-acme', workspaceId: 'workspace-a', userCode: 'ABCD1234' }, fetcher),
    ).resolves.toEqual({ ok: false, error });
  });

  it('形式不正はAPIへ送らず、通信失敗は内部情報を出さない状態へ倒す', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('network contains sensitive detail');
    });

    await expect(
      submitDeviceApproval({ tenantId: 'tenant-acme', workspaceId: 'workspace-a', userCode: 'INVALID' }, fetcher),
    ).resolves.toEqual({ ok: false, error: 'invalid_code' });
    expect(fetcher).not.toHaveBeenCalled();

    await expect(
      submitDeviceApproval({ tenantId: 'tenant-acme', workspaceId: 'workspace-a', userCode: 'ABCD1234' }, fetcher),
    ).resolves.toEqual({ ok: false, error: 'unavailable' });
  });

  it('URL埋め込み用の確認コードを表示前にも正規化する', () => {
    expect(normalizeUserCodeInput(' abcd-1234 ')).toBe('ABCD1234');
  });
});
