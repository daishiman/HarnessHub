/** publish route の認可・rate limit 配線。共通 runtime は support/route-context.ts。 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthRuntime } from '../../src/lib/authz/runtime.js';

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

import {
  approveRoute,
  auth,
  bodyOf,
  buildRequest,
  cancelRoute,
  createRoute,
  deploymentRoute,
  detailRoute,
  issuePublisherToken,
  listRoute,
  OWNER_ID,
  ownerBearer,
  params,
  publish,
  STRANGER_ID,
  sessionCookieFor,
  submitRoute,
  TENANT_B,
  testUser,
} from './support/route-context.js';

beforeEach(() => {
  runtimeHolder.current = auth.runtime;
});

afterEach(() => {
  runtimeHolder.current = null;
});

describe('認可の入口: 業務へ入る前に落ちるもの', () => {
  it('Origin を名乗らない状態変更要求は 403 (CSRF 対策の入口)', async () => {
    const request = await buildRequest('POST', '/publish', {
      origin: null,
      json: { project_id: 'proj-1', target: 'skill', visibility: 'workspace' },
    });
    const response = await createRoute(request);

    expect(response.status).toBe(403);
    expect(await bodyOf(response)).toEqual({ error: 'untrusted_origin' });
  });

  it('資格情報の無い要求は 401', async () => {
    const response = await listRoute(await buildRequest('GET', '/publish', { cookie: null }));

    expect(response.status).toBe(401);
    expect(await bodyOf(response)).toEqual({ error: 'unauthenticated' });
  });

  it('テナントを申告しない要求は 400 (資源を確定できない)', async () => {
    const response = await listRoute(await buildRequest('GET', '/publish', { tenantId: null }));

    expect(response.status).toBe(400);
    expect(await bodyOf(response)).toEqual({ error: 'unresolved_resource' });
  });

  it('他テナントを申告した要求は 404 — 403 だと資源の存在が読めてしまう', async () => {
    const response = await listRoute(await buildRequest('GET', '/publish', { tenantId: TENANT_B }));

    expect(response.status).toBe(404);
    expect(await bodyOf(response)).toEqual({ error: 'tenant_mismatch' });
  });

  // テスト名に認可判定の識別子 (`minRole` 等) を書かない。
  // check-single-authz-middleware.mjs は文字列リテラルも走査するため、
  // 説明のつもりで書いた語が「判定が lib/authz の外に漏れた」として検出される
  it('Project owner の session は DB の owner_user_id から owner に合成される', async () => {
    publish.putRequest({ id: 'req-a' });
    const request = await buildRequest('GET', '/publish/req-a', { cookie: await sessionCookieFor(testUser(OWNER_ID)) });
    const response = await detailRoute(request, params({ id: 'req-a' }));

    expect(response.status).toBe(200);
  });

  it('同じ Workspace の member でも Project owner でなければ publish.write を通らない', async () => {
    publish.putRequest({ id: 'req-a' });
    const request = await buildRequest('GET', '/publish/req-a', {
      cookie: await sessionCookieFor(testUser(STRANGER_ID)),
    });
    const response = await detailRoute(request, params({ id: 'req-a' }));

    expect(response.status).toBe(403);
    expect(await bodyOf(response)).toEqual({ error: 'insufficient_role' });
  });

  it('publisher token は投稿できる (CI から公開要求を出す経路)', async () => {
    const token = await issuePublisherToken(auth, OWNER_ID);
    const request = await buildRequest('POST', '/publish', {
      bearer: token.access_token,
      json: { project_id: 'proj-1', target: 'skill', visibility: 'workspace' },
    });
    const response = await createRoute(request);

    expect(response.status).toBe(201);
  });

  it('publisher token では承認できない — 承認は人の判断で、CI から自動で押せる形にしない', async () => {
    const token = await issuePublisherToken(auth, OWNER_ID);
    publish.putRequest({ id: 'req-a', status: 'ready', payload: { contentHash: 'hash-1', findings: [] } });

    const request = await buildRequest('POST', '/publish/req-a/approve', { bearer: token.access_token });
    const response = await approveRoute(request, params({ id: 'req-a' }));

    expect(response.status).toBe(403);
    expect(await bodyOf(response)).toEqual({ error: 'credential_not_allowed' });
    // 落ちた要求が状態を進めていないこと。403 を返しつつ書いてしまう配線は最悪の形
    expect(publish.requestRows().find((row) => row.id === 'req-a')?.status).toBe('ready');
  });

  it('取消は session では行えない — Project owner でも Publisher Bearer が必要', async () => {
    publish.putRequest({ id: 'req-a', status: 'ready' });

    const request = await buildRequest('POST', '/publish/req-a/cancel', {
      cookie: await sessionCookieFor(testUser(OWNER_ID)),
    });
    const response = await cancelRoute(request, params({ id: 'req-a' }));

    expect(response.status).toBe(403);
    expect(await bodyOf(response)).toEqual({ error: 'credential_not_allowed' });
  });

  it('取消は Project owner の Publisher Bearer で行える', async () => {
    publish.putRequest({ id: 'req-a', status: 'ready' });

    const request = await buildRequest('POST', '/publish/req-a/cancel', { bearer: await ownerBearer() });
    const response = await cancelRoute(request, params({ id: 'req-a' }));

    expect(response.status).toBe(200);
    expect((await bodyOf(response)).status).toBe('draft');
  });

  it('Publisher Bearer でも Project owner でなければ取消できない', async () => {
    const token = await issuePublisherToken(auth, STRANGER_ID);
    publish.putRequest({ id: 'req-a', status: 'ready' });

    const response = await cancelRoute(
      await buildRequest('POST', '/publish/req-a/cancel', { bearer: token.access_token }),
      params({ id: 'req-a' }),
    );

    expect(response.status).toBe(403);
    expect(await bodyOf(response)).toEqual({ error: 'insufficient_role' });
  });

  it('deployment 登録も Project owner の Publisher Bearer 限定', async () => {
    const response = await deploymentRoute(
      await buildRequest('POST', '/projects/proj-1/deployment', {
        cookie: await sessionCookieFor(testUser(OWNER_ID)),
        json: {
          channel_id: 'ch-0001',
          release_id: 'rel-1',
          url: 'https://demo.example.com',
          provider: 'cloudflare',
          exit_code: 0,
        },
      }),
      params({ id: 'proj-1' }),
    );

    expect(response.status).toBe(403);
    expect(await bodyOf(response)).toEqual({ error: 'credential_not_allowed' });
  });
});

describe('上限: 1 分あたりの変更要求数 (qa-037)', () => {
  /** 冪等鍵は 8 文字以上。毎回変えないと 2 件目以降が「再送」として扱われる。 */
  const keyFor = (index: number) => `key-rate-${String(index).padStart(4, '0')}`;

  const createOnce = async (index: number) =>
    createRoute(
      await buildRequest('POST', '/publish', {
        idempotencyKey: keyFor(index),
        json: { project_id: 'proj-1', target: 'skill', visibility: 'workspace' },
      }),
    );

  it('10 回までは通り、11 回目は 429 + Retry-After で拒否される', async () => {
    for (let i = 0; i < 10; i += 1) {
      const response = await createOnce(i);
      expect(response.status).toBe(201);
    }

    const limited = await createOnce(10);
    expect(limited.status).toBe(429);
    expect(await bodyOf(limited)).toEqual({ error: 'rate_limited' });
    expect(limited.headers.get('retry-after')).toBe('60');
    // 上限に当たった要求は業務側へ届かない (11 件目の行が増えていない)
    expect(publish.requestRows()).toHaveLength(10);
  });

  it('成功応答にも残り回数が載る — client が 429 を踏まずに減速できる', async () => {
    const response = await createOnce(0);

    expect(response.status).toBe(201);
    expect(response.headers.get('ratelimit-limit')).toBe('10');
    expect(response.headers.get('ratelimit-remaining')).toBe('9');
    // 本文は上限判定を挟んでも壊れない (header を足すために応答を作り直しているため)
    expect(await bodyOf(response)).toMatchObject({ project_id: 'proj-1', status: 'draft' });
  });

  it('endpoint が違えば別々に数える — create で詰まっても submit は動く', async () => {
    for (let i = 0; i < 10; i += 1) await createOnce(i);
    publish.putRequest({ id: 'req-a', status: 'draft' });

    const submit = await submitRoute(
      await buildRequest('POST', '/publish/req-a/submit', { idempotencyKey: keyFor(99) }),
      params({ id: 'req-a' }),
    );

    expect(submit.status).not.toBe(429);
  });
});
