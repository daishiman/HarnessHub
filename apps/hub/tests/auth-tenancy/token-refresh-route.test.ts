/**
 * `POST /api/v1/token/refresh` の route 単体検査。
 *
 * この route は **認証不要** (refresh token そのものが資格情報) なので `withAuthz` を通らない。
 * 代わりに「提示された値だけで判断する」経路が正しく閉じているかがここの検査対象になる:
 *   - 壊れた要求を推測で補完しないこと (invalid_request)
 *   - 再利用検知の発生を応答から読み取れないこと (invalid_grant に潰す)
 *
 * runtime は in-memory へ差し替えるが、rotation と再利用検知は本物の service を通す。
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '../../src/app/api/v1/token/refresh/route.js';
import type { AuthRuntime } from '../../src/lib/authz/runtime.js';
import {
  createTokenRouteHarness,
  issuePublisherToken,
  OWNER_ID,
  TENANT_SLUG,
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

const ENDPOINT = 'https://hub.example.com/api/v1/token/refresh';

function refreshRequest(body: unknown): Request {
  return new Request(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function refreshBody(refreshToken: string, tenantSlug: string = TENANT_SLUG) {
  return { grant_type: 'refresh_token', refresh_token: refreshToken, tenant_slug: tenantSlug };
}

describe('POST /api/v1/token/refresh: 正常系', () => {
  let harness: TokenRouteHarness;

  beforeEach(() => {
    harness = createTokenRouteHarness();
    runtimeHolder.current = harness.runtime;
  });

  it('提示された refresh token を rotation し、新しい組を no-store で返す', async () => {
    const issued = await issuePublisherToken(harness);
    harness.ports.clock.advance(60);

    const response = await POST(refreshRequest(refreshBody(issued.refresh_token)));

    expect(response.status).toBe(200);
    // 資格情報を中間キャッシュへ残さない。route 側の責務なので header まで見る
    expect(response.headers.get('cache-control')).toBe('no-store');

    const body = (await response.json()) as { refresh_token: string; access_token: string; token_type: string };
    expect(body.token_type).toBe('Bearer');
    expect(body.refresh_token).not.toBe(issued.refresh_token);
    // 旧枝は失効済み、新枝だけが生きている
    const records = harness.ports.publisherTokens.all();
    expect(records).toHaveLength(2);
    expect(records[0]?.revokedAtSeconds).not.toBeNull();
    expect(records[1]?.revokedAtSeconds).toBeNull();
  });
});

describe('POST /api/v1/token/refresh: 要求の検証 (invalid_request)', () => {
  let harness: TokenRouteHarness;

  beforeEach(() => {
    harness = createTokenRouteHarness();
    runtimeHolder.current = harness.runtime;
  });

  it('JSON として読めない body は 400 (例外にせず要求不正として返す)', async () => {
    const response = await POST(refreshRequest('{壊れた JSON'));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_request' });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('grant_type が refresh_token 以外なら 400', async () => {
    const issued = await issuePublisherToken(harness);

    const response = await POST(
      refreshRequest({
        grant_type: 'authorization_code',
        refresh_token: issued.refresh_token,
        tenant_slug: TENANT_SLUG,
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_request' });
    // 検証で落ちた要求は rotation まで届かない
    expect(harness.ports.publisherTokens.all()).toHaveLength(1);
  });

  it('refresh_token が契約の最小長に満たなければ 400', async () => {
    const response = await POST(refreshRequest(refreshBody('short')));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_request' });
  });

  it('未登録の tenant_slug は 400 (既定テナントへ落とさない)', async () => {
    const issued = await issuePublisherToken(harness);

    const response = await POST(refreshRequest(refreshBody(issued.refresh_token, 'unknown-tenant')));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_request' });
    // テナントを解決できない要求で他テナントの token を触らない
    expect(harness.ports.publisherTokens.all()[0]?.revokedAtSeconds).toBeNull();
  });
});

describe('POST /api/v1/token/refresh: 交付の拒否', () => {
  let harness: TokenRouteHarness;

  beforeEach(() => {
    harness = createTokenRouteHarness();
    runtimeHolder.current = harness.runtime;
  });

  it('未知の refresh token は 400 invalid_grant', async () => {
    const response = await POST(refreshRequest(refreshBody('u'.repeat(64))));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_grant' });
  });

  it('失効済み refresh token の再提示も 400 invalid_grant (family 失効を応答から悟らせない)', async () => {
    const issued = await issuePublisherToken(harness);
    harness.ports.clock.advance(60);
    const rotated = await POST(refreshRequest(refreshBody(issued.refresh_token)));
    expect(rotated.status).toBe(200);

    harness.ports.clock.advance(60);
    const reused = await POST(refreshRequest(refreshBody(issued.refresh_token)));

    // 未知 token と同じ応答。ここが違うと、窃取側が「検知された」ことを応答で判別できてしまう
    expect(reused.status).toBe(400);
    expect(await reused.json()).toEqual({ error: 'invalid_grant' });
    // 応答は同じでも、裏では family 全体が落ちている
    expect(harness.ports.publisherTokens.all().every((record) => record.revokedAtSeconds !== null)).toBe(true);
  });

  it('無効化された利用者の refresh は 403 access_denied', async () => {
    const issued = await issuePublisherToken(harness);
    harness.ports.users.put(testUser(OWNER_ID, { status: 'inactive' }));

    const response = await POST(refreshRequest(refreshBody(issued.refresh_token)));

    // 名乗り直しても通らない拒否なので 403 (400 の invalid_grant 系と status を分ける)
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'access_denied' });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
