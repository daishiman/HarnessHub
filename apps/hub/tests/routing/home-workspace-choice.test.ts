/**
 * ランディング (`/`) が「サインイン済みだが作業先が決まっていない」利用者を行き止まりへ送らないことの検査。
 *
 * 従来は session が有効なら無条件で既定着地へ redirect していたため、2 件以上の workspace に
 * 所属する利用者は着地先で missing_tenant_scope の 403 に落ち、cookie を書く操作も画面に無く
 * 復帰できなかった。ここでは「redirect してよい条件」を middleware と同じ規則で判定していること、
 * 判定できないときは選択肢を出すことを固定する。
 */
import { UiProvider } from '@harness-hub/ui';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { SESSION_COOKIE_NAME } from '../../src/lib/auth/config.js';
import { ACTIVE_WORKSPACE_COOKIE_NAME } from '../../src/lib/auth/session.js';
import { DEFAULT_POST_SIGNIN_LANDING } from '../../src/lib/routing/post-signin-landing.js';
import { workspaceEntryPath } from '../../src/lib/routing/workspace-entry.js';

const { getCookie, redirectMock, verifySessionToken } = vi.hoisted(() => ({
  getCookie: vi.fn(),
  redirectMock: vi.fn(),
  verifySessionToken: vi.fn(),
}));

// HomePage は cookies()/redirect() を使う server component。scope-resolution.test.ts と同じく
// mock を hoist してから dynamic import する
vi.mock('next/headers', () => ({ cookies: async () => ({ get: getCookie }) }));
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    redirectMock(path);
    throw new Error('NEXT_REDIRECT');
  },
}));
vi.mock('../../src/lib/auth/index.js', async () => {
  const actual = await vi.importActual<typeof import('../../src/lib/auth/index.js')>('../../src/lib/auth/index.js');
  return { ...actual, verifySessionToken };
});

const HomePage = (await import('../../src/app/page.js')).default;

const ORIGINAL_SECRET = process.env.AUTH_SESSION_SECRET;

function claimsFor(
  workspaceIds: readonly string[],
  status: 'active' | 'inactive' = 'active',
  workspaceNames?: Readonly<Record<string, string>>,
) {
  return {
    sub: 'user-1',
    tenant_id: 'tenant-a',
    role: 'member',
    status,
    workspace_ids: workspaceIds,
    ...(workspaceNames === undefined ? {} : { workspace_names: workspaceNames }),
  };
}

/** session cookie と active workspace cookie だけを返す (名前を見ずに返すと別 cookie を汚染する) */
function cookies(session: string | null, activeWorkspace?: string): void {
  getCookie.mockImplementation((name: string) => {
    if (name === SESSION_COOKIE_NAME) return session === null ? undefined : { value: session };
    if (name === ACTIVE_WORKSPACE_COOKIE_NAME && activeWorkspace !== undefined) return { value: activeWorkspace };
    return undefined;
  });
}

async function renderHome(): Promise<string> {
  return renderToStaticMarkup(createElement(UiProvider, null, await HomePage({ searchParams: Promise.resolve({}) })));
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.AUTH_SESSION_SECRET = 'test-secret';
  getCookie.mockReturnValue(undefined);
});

afterAll(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.AUTH_SESSION_SECRET;
  else process.env.AUTH_SESSION_SECRET = ORIGINAL_SECRET;
});

describe('workspace が確定するときは従来どおり既定着地へ送る', () => {
  it('所属 1 件なら cookie が無くても redirect する (選択の余地が無い)', async () => {
    cookies('valid-token');
    verifySessionToken.mockResolvedValue({ ok: true, claims: claimsFor(['ws-1']) });

    await expect(renderHome()).rejects.toThrow('NEXT_REDIRECT');
    expect(redirectMock).toHaveBeenCalledExactlyOnceWith(DEFAULT_POST_SIGNIN_LANDING);
  });

  it('複数所属でも active workspace cookie が所属内なら redirect する', async () => {
    cookies('valid-token', 'ws-2');
    verifySessionToken.mockResolvedValue({ ok: true, claims: claimsFor(['ws-1', 'ws-2']) });

    await expect(renderHome()).rejects.toThrow('NEXT_REDIRECT');
    expect(redirectMock).toHaveBeenCalledExactlyOnceWith(DEFAULT_POST_SIGNIN_LANDING);
  });
});

describe('workspace が確定しないときは選ばせる', () => {
  it('複数所属 + cookie 無しなら redirect せず、所属 workspace の選択肢を出す', async () => {
    cookies('valid-token');
    verifySessionToken.mockResolvedValue({ ok: true, claims: claimsFor(['ws-1', 'ws-2']) });

    const html = await renderHome();

    expect(redirectMock).not.toHaveBeenCalled();
    expect(html).toContain('Workspace を選択');
    expect(html).toContain(`href="${workspaceEntryPath('ws-1')}"`);
    expect(html).toContain(`href="${workspaceEntryPath('ws-2')}"`);
  });

  it('session に表示名がある Workspace は名前を主表示し、未解決 ID は識別子として示す', async () => {
    cookies('valid-token');
    verifySessionToken.mockResolvedValue({
      ok: true,
      claims: claimsFor(['ws-1', 'ws-2'], 'active', { 'ws-1': '営業部' }),
    });

    const html = await renderHome();

    expect(html).toContain('営業部 で作業する');
    expect(html).toContain('data-hh-id-badge');
    expect(html).toContain('aria-label="Workspace ID: ws-2"');
    expect(html).toContain(`href="${workspaceEntryPath('ws-2')}"`);
  });

  it('所属外を指す cookie は握りつぶし、選び直させる (fail-closed)', async () => {
    cookies('valid-token', 'ws-9');
    verifySessionToken.mockResolvedValue({ ok: true, claims: claimsFor(['ws-1', 'ws-2']) });

    const html = await renderHome();

    expect(redirectMock).not.toHaveBeenCalled();
    expect(html).toContain('Workspace を選択');
    expect(html).not.toContain('ws-9');
  });

  it('選択画面では所属していない workspace を一切出さない', async () => {
    cookies('valid-token');
    verifySessionToken.mockResolvedValue({ ok: true, claims: claimsFor(['ws-1', 'ws-2']) });

    const html = await renderHome();

    expect(html.match(/\/signin\/workspace\?workspace=/g)).toHaveLength(2);
  });
});

describe('選択肢が無いときも状態を名指しする', () => {
  it('所属 0 件なら空の選択肢を出さず、何が起きているかを説明する', async () => {
    cookies('valid-token');
    verifySessionToken.mockResolvedValue({ ok: true, claims: claimsFor([]) });

    const html = await renderHome();

    expect(redirectMock).not.toHaveBeenCalled();
    expect(html).toContain('Workspace に追加されていません');
    expect(html).not.toContain('/signin/workspace?');
  });
});

describe('主体として扱えない session は入口へ戻す', () => {
  it('無効化された利用者は redirect せず、サインインの入口を出す (着地先と往復させない)', async () => {
    cookies('valid-token');
    verifySessionToken.mockResolvedValue({ ok: true, claims: claimsFor(['ws-1'], 'inactive') });

    const html = await renderHome();

    expect(redirectMock).not.toHaveBeenCalled();
    expect(html).toContain('テナント ID を入力');
  });
});
