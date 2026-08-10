/**
 * ランディング (`/`) から active workspace を確定させる動線の検査。
 *
 * この動線が無かった頃、2 件以上の workspace に所属する利用者はサインインに成功しても
 * `hh_active_workspace` cookie を書く操作がどこにも無く、業務画面が missing_tenant_scope で
 * 403 になったまま自力で復帰できなかった。ここで固定するのは次の 3 点。
 *   1. 所属外の workspace ID を絶対に cookie にしないこと (fail-closed)
 *   2. 受理した場合だけ cookie を書き、既定着地へ 303 で送ること
 *   3. この受け口が認証前後どちらでも middleware を通過できること (public path)
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { GET } from '../../src/app/signin/workspace/route.js';
import { SESSION_COOKIE_NAME } from '../../src/lib/auth/config.js';
import { buildSessionClaims, type DirectoryUser, signSessionToken } from '../../src/lib/auth/index.js';
import { ACTIVE_WORKSPACE_COOKIE_NAME } from '../../src/lib/auth/session.js';
import { DEFAULT_POST_SIGNIN_LANDING } from '../../src/lib/routing/post-signin-landing.js';
import {
  resolveWorkspaceEntry,
  WORKSPACE_ENTRY_PATH,
  WORKSPACE_RETURN_TO_QUERY_PARAM,
  workspaceEntryPath,
} from '../../src/lib/routing/workspace-entry.js';
import { isPublicPath } from '../../src/middleware/authz.js';

const SESSION_SECRET = 'workspace-entry-test-secret';
const ORIGINAL_SECRET = process.env.AUTH_SESSION_SECRET;

const USER: DirectoryUser = {
  id: 'user-1',
  tenantId: 'tenant-a',
  idpSubject: 'idp-user-1',
  role: 'member',
  status: 'active',
  // 「cookie 無しでは自動確定しない」= この動線が必要になる 2 件所属の利用者
  workspaceIds: ['ws-1', 'ws-2'],
};

async function sessionCookie(user: DirectoryUser = USER, secret = SESSION_SECRET): Promise<string> {
  const claims = buildSessionClaims(user, Math.floor(Date.now() / 1000));
  return `${SESSION_COOKIE_NAME}=${await signSessionToken(claims, secret)}`;
}

function request(query: string, cookie?: string): Request {
  return new Request(`https://hub.example.com${WORKSPACE_ENTRY_PATH}${query}`, {
    headers: cookie === undefined ? {} : { cookie },
  });
}

beforeEach(() => {
  process.env.AUTH_SESSION_SECRET = SESSION_SECRET;
});

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.AUTH_SESSION_SECRET;
  else process.env.AUTH_SESSION_SECRET = ORIGINAL_SECRET;
});

describe('選択値の受理', () => {
  it('所属一覧に含まれる ID だけを受理し、着地先を既定着地にする', () => {
    const resolution = resolveWorkspaceEntry('ws-2', ['ws-1', 'ws-2']);
    expect(resolution).toEqual({ ok: true, workspaceId: 'ws-2', location: DEFAULT_POST_SIGNIN_LANDING });
  });

  it('安全な returnTo は切替後の着地先として維持し、外部 URL は既定着地へ落とす', () => {
    expect(resolveWorkspaceEntry('ws-2', ['ws-1', 'ws-2'], '/catalog/releases')).toEqual({
      ok: true,
      workspaceId: 'ws-2',
      location: '/catalog/releases',
    });
    expect(resolveWorkspaceEntry('ws-2', ['ws-1', 'ws-2'], 'https://evil.example/phish')).toEqual({
      ok: true,
      workspaceId: 'ws-2',
      location: DEFAULT_POST_SIGNIN_LANDING,
    });
  });

  it.each([
    ['所属外', 'ws-9'],
    ['未指定', null],
    ['空文字', ''],
  ])('%s は受理せず、ランディングへ戻す', (_label, value) => {
    expect(resolveWorkspaceEntry(value, ['ws-1', 'ws-2'])).toEqual({ ok: false, location: '/' });
  });

  it('所属 1 件でも未指定を勝手に補完しない (選んでいない値を焼き付けない)', () => {
    expect(resolveWorkspaceEntry(null, ['ws-1'])).toEqual({ ok: false, location: '/' });
  });

  it('リンクの workspace ID は encode する', () => {
    expect(workspaceEntryPath('ws/1?a=b')).toBe(`${WORKSPACE_ENTRY_PATH}?workspace=ws%2F1%3Fa%3Db`);
  });

  it('リンクの returnTo も encode し、危険な戻り先を組み立て時点で既定着地へ畳む', () => {
    expect(workspaceEntryPath('ws-2', '/catalog/releases')).toBe(
      `${WORKSPACE_ENTRY_PATH}?workspace=ws-2&${WORKSPACE_RETURN_TO_QUERY_PARAM}=%2Fcatalog%2Freleases`,
    );
    expect(workspaceEntryPath('ws-2', '//evil.example')).toBe(
      `${WORKSPACE_ENTRY_PATH}?workspace=ws-2&${WORKSPACE_RETURN_TO_QUERY_PARAM}=%2Fsheets`,
    );
  });
});

describe(`GET ${WORKSPACE_ENTRY_PATH}`, () => {
  it('所属する workspace を選ぶと、cookie を書いて旧 scope を含まない中間文書を先に返す', async () => {
    const cookie = `${await sessionCookie()}; ${ACTIVE_WORKSPACE_COOKIE_NAME}=old-workspace-secret`;
    const response = await GET(request('?workspace=ws-2&returnTo=%2Fcatalog%2Freleases', cookie));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('content-security-policy')).toContain("default-src 'none'");

    const html = await response.text();
    expect(html).toContain('data-hh-workspace-switch-intermediate');
    expect(html).toContain('http-equiv="refresh"');
    expect(html).toContain('content="0;url=/catalog/releases"');
    expect(html).toContain('href="/catalog/releases"');
    // 最終の新 scope 画面より先に commit される文書へ、旧 scope の識別子や業務本文を持ち込まない。
    expect(html).not.toContain('old-workspace-secret');
    expect(html).not.toContain('ws-2');

    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain(`${ACTIVE_WORKSPACE_COOKIE_NAME}=ws-2`);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('Path=/');
  });

  it('returnTo が外部 URL でも中間文書の遷移先は既定着地で、HTML 属性へ注入されない', async () => {
    const response = await GET(
      request('?workspace=ws-2&returnTo=https%3A%2F%2Fevil.example%2F%22%3E%3Cscript%3E', await sessionCookie()),
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('content="0;url=/sheets"');
    expect(html).not.toContain('evil.example');
    expect(html).not.toContain('<script>');
  });

  it('所属外の workspace は cookie を書かずランディングへ戻す', async () => {
    const response = await GET(request('?workspace=ws-9', await sessionCookie()));

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('https://hub.example.com/');
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('session cookie が無い要求では cookie を書かない (未認証の要求で選択を焼かせない)', async () => {
    const response = await GET(request('?workspace=ws-2'));

    expect(response.headers.get('location')).toBe('https://hub.example.com/');
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('別の鍵で署名された session cookie は主体として扱わない', async () => {
    const response = await GET(request('?workspace=ws-2', await sessionCookie(USER, 'another-secret')));

    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('無効化された利用者の session では cookie を書かない', async () => {
    const inactive: DirectoryUser = { ...USER, status: 'inactive' };
    const response = await GET(request('?workspace=ws-2', await sessionCookie(inactive)));

    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('AUTH_SESSION_SECRET が未設定なら、どの要求でも cookie を書かない', async () => {
    const cookie = await sessionCookie();
    delete process.env.AUTH_SESSION_SECRET;

    const response = await GET(request('?workspace=ws-2', cookie));

    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('受け口自体は public path として middleware を通過する (通れないと選択に到達できない)', () => {
    expect(isPublicPath(WORKSPACE_ENTRY_PATH)).toBe(true);
  });
});
