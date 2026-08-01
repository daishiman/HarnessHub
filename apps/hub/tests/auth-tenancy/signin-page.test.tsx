// HF-QA-TENANT-006: `/{tenant_slug}/signin` の分岐 (不正 slug / 接続なし / 未結線 / 正常) を検証する。
// async Server Component は「Promise を返す関数」なので、await した要素を SSR して本文で検査する。
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TenantOidcConnection } from '../../src/lib/auth/index.js';
import { createInMemoryOidcConnections } from './support/in-memory-ports.js';

const { notFound, authRuntime } = vi.hoisted(() => ({
  notFound: vi.fn(),
  authRuntime: vi.fn(),
}));

vi.mock('next/navigation', () => ({ notFound }));
// authRuntime() は本番 DB へ結線する composition root なので、単体テストでは port だけ差し替える
vi.mock('../../src/lib/authz/index.js', () => ({ authRuntime }));

const SigninPage = (await import('../../src/app/[tenant_slug]/signin/page.js')).default;

function connection(overrides: Partial<TenantOidcConnection> = {}): TenantOidcConnection {
  return {
    tenantId: 'tenant-a',
    tenantSlug: 'acme',
    issuer: 'https://idp.example.com',
    clientId: 'client-1',
    displayName: 'Acme IdP',
    enabled: true,
    ...overrides,
  };
}

function withConnections(connections: readonly TenantOidcConnection[]): void {
  authRuntime.mockReturnValue({ ports: { oidcConnections: createInMemoryOidcConnections(connections) } });
}

async function renderSignin(tenantSlug: string): Promise<string> {
  return renderToStaticMarkup(await SigninPage({ params: Promise.resolve({ tenant_slug: tenantSlug }) }));
}

beforeEach(() => {
  vi.clearAllMocks();
  // 実装の notFound() も例外で描画を打ち切る。no-op にすると
  // 「404 のはずの slug で画面が描けてしまう」状態をテストが見逃す
  notFound.mockImplementation(() => {
    throw new Error('NEXT_NOT_FOUND');
  });
  withConnections([]);
});

describe('サインイン画面の slug 検証', () => {
  it('slug の形が不正なら接続を引く前に 404 にする', async () => {
    await expect(renderSignin('Acme_Corp')).rejects.toThrow('NEXT_NOT_FOUND');

    expect(notFound).toHaveBeenCalledOnce();
    expect(authRuntime).not.toHaveBeenCalled();
  });
});

describe('サインイン画面の接続解決', () => {
  it('接続が見つからないテナントには「サインインできません」を出す', async () => {
    const html = await renderSignin('acme');

    expect(html).toContain('このテナントではサインインできません');
    expect(notFound).not.toHaveBeenCalled();
  });

  it('無効化された接続は「存在しない」と同じ画面にする (テナントの有無を漏らさない)', async () => {
    withConnections([connection({ enabled: false })]);
    const disabled = await renderSignin('acme');

    withConnections([]);
    const missing = await renderSignin('acme');

    expect(disabled).toBe(missing);
  });

  it('認証基盤が未結線なら、設定漏れと区別できる warning を出す', async () => {
    authRuntime.mockImplementation(() => {
      throw new Error('AUTH_SESSION_SECRET が未設定です');
    });

    const html = await renderSignin('acme');

    expect(html).toContain('認証基盤が未結線です');
    expect(html).not.toContain('このテナントではサインインできません');
  });

  it('接続が有効なら IdP 名とサインインフォームを出す', async () => {
    withConnections([connection()]);

    const html = await renderSignin('acme');

    expect(html).toContain('Acme IdP でサインイン');
    expect(html).toContain('action="/api/auth/acme/signin/tenant-oidc"');
    expect(html).toContain('data-csrf-endpoint="/api/auth/acme/csrf"');
    expect(html).toContain('method="post"');
    expect(html).toContain('name="csrfToken"');
    expect(html).toContain('name="callbackUrl"');
    expect(html).toContain('value="/"');
  });

  it('他テナントの slug では、そのテナントの接続だけを引く', async () => {
    withConnections([connection()]);

    const html = await renderSignin('other-tenant');

    expect(html).toContain('このテナントではサインインできません');
  });
});
