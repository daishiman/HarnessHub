/**
 * `GET /api/v1/tokens` の route 単体検査。
 *
 * この route の要点は **`?workspace_id=` の有無で要求権限が変わる**こと。
 * 1 本の handler の中で「管理者なら他人の分も返す」と分岐すると判定が規則表の外へ漏れるため、
 * 入口で 2 本の `withAuthz` へ振り分けている。ここではその振り分けが
 * 権限・応答の両面で意図どおりかを、実際の Request を通して確かめる。
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '../../src/app/api/v1/tokens/route.js';
import type { DirectoryUser } from '../../src/lib/auth/index.js';
import type { AuthRuntime } from '../../src/lib/authz/runtime.js';
import { TENANT_HEADER } from '../../src/middleware-contract.js';
import { TENANT_A, TENANT_B, WORKSPACE_A1 } from './support/in-memory-ports.js';
import {
  adminUser,
  createTokenRouteHarness,
  issuePublisherToken,
  NOW,
  OWNER_ID,
  STRANGER_ID,
  sessionCookieFor,
  type TokenRouteHarness,
  testUser,
} from './support/token-route-runtime.js';

const runtimeHolder = vi.hoisted(() => ({ current: null as AuthRuntime | null }));

vi.mock('../../src/lib/authz/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/authz/index.js')>();
  return {
    ...actual,
    authRuntime: () => {
      if (runtimeHolder.current === null) throw new Error('テスト用 runtime が未設定です');
      return runtimeHolder.current;
    },
  };
});

interface ListRequestOptions {
  /** 未指定なら owner の session。null なら資格情報を載せない。 */
  readonly user?: DirectoryUser | null;
  /** `?workspace_id=` の値。未指定ならクエリ自体を付けない (= 自分の一覧)。 */
  readonly workspaceQuery?: string;
  /** テナント申告。null なら header を送らない。 */
  readonly tenantId?: string | null;
}

async function listRequest(options: ListRequestOptions = {}): Promise<Request> {
  const url = new URL('https://hub.example.com/api/v1/tokens');
  if (options.workspaceQuery !== undefined) url.searchParams.set('workspace_id', options.workspaceQuery);

  const headers = new Headers();
  const user = options.user === undefined ? testUser(OWNER_ID) : options.user;
  if (user !== null) headers.set('cookie', await sessionCookieFor(user));

  const tenantId = options.tenantId === undefined ? TENANT_A : options.tenantId;
  if (tenantId !== null) headers.set(TENANT_HEADER, tenantId);

  return new Request(url, { method: 'GET', headers });
}

interface ListBody {
  readonly items: readonly { readonly id: string; readonly workspace_id: string; readonly status: string }[];
}

describe('GET /api/v1/tokens: 自分の一覧 (token.list.self)', () => {
  let harness: TokenRouteHarness;

  beforeEach(() => {
    harness = createTokenRouteHarness();
    runtimeHolder.current = harness.runtime;
  });

  it('member は自分の token だけを取得でき、他人の分は現れない', async () => {
    await issuePublisherToken(harness, OWNER_ID);
    await issuePublisherToken(harness, STRANGER_ID);

    const response = await GET(await listRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = (await response.json()) as ListBody;
    expect(body.items).toHaveLength(1);
    expect(body.items[0]?.workspace_id).toBe(WORKSPACE_A1);
    expect(body.items[0]?.status).toBe('active');
  });

  it('応答に平文の token を含めない (一覧経路から資格情報を漏らさない)', async () => {
    const issued = await issuePublisherToken(harness, OWNER_ID);

    const serialized = JSON.stringify(await (await GET(await listRequest())).json());

    expect(serialized).not.toContain(issued.refresh_token);
    expect(serialized).not.toContain(issued.access_token);
  });

  it('資格情報が無ければ 401', async () => {
    const response = await GET(await listRequest({ user: null }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'unauthenticated' });
  });

  it('緊急失効された session は 401 (名乗り直せる側の拒否)', async () => {
    harness.ports.sessionRevocations.revoke(TENANT_A, OWNER_ID, NOW);

    const response = await GET(await listRequest());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'revoked_session' });
  });

  it('テナント申告が無ければ 400 (資源を推測で埋めない)', async () => {
    const response = await GET(await listRequest({ tenantId: null }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'unresolved_resource' });
  });

  it('他テナントを申告した要求は 404 (資源の存在自体を伏せる)', async () => {
    const response = await GET(await listRequest({ tenantId: TENANT_B }));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'tenant_mismatch' });
  });
});

describe('GET /api/v1/tokens?workspace_id=: Workspace の一覧 (token.list.workspace)', () => {
  let harness: TokenRouteHarness;

  beforeEach(() => {
    harness = createTokenRouteHarness();
    runtimeHolder.current = harness.runtime;
  });

  it('workspace-admin は Workspace 内の他人の token も取得できる', async () => {
    await issuePublisherToken(harness, OWNER_ID);
    await issuePublisherToken(harness, STRANGER_ID);

    const response = await GET(await listRequest({ user: adminUser(), workspaceQuery: WORKSPACE_A1 }));

    expect(response.status).toBe(200);
    const body = (await response.json()) as ListBody;
    expect(body.items).toHaveLength(2);
  });

  it('member が workspace_id を付けても他人の分へ広がらない (403)', async () => {
    await issuePublisherToken(harness, STRANGER_ID);

    const response = await GET(await listRequest({ workspaceQuery: WORKSPACE_A1 }));

    // 自分の一覧の権限で Workspace 全体を読ませない。振り分けが入口で効いている証拠
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'insufficient_role' });
  });

  it('workspace_id が空文字なら 400 (自分の一覧へ読み替えない)', async () => {
    const response = await GET(await listRequest({ user: adminUser(), workspaceQuery: '' }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'unresolved_resource' });
  });

  it('所属しない Workspace を指定した workspace-admin は 403', async () => {
    const response = await GET(await listRequest({ user: adminUser(), workspaceQuery: 'ws-other' }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'workspace_not_member' });
  });
});
