/**
 * `DELETE /api/v1/tokens/{id}` の route 単体検査。
 *
 * この route の要点は **所有者と Workspace を要求の申告ではなく DB から取る**こと。
 * 申告を信じると、他人の token を「自分のもの」と名乗って失効させられる。
 * また存在しない id は「所有者なし」として判定へ渡すため、member から見ると
 * 存在しない token と他人の token が同じ 403 になる (存在の有無を漏らさない)。
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DELETE } from '../../src/app/api/v1/tokens/[id]/route.js';
import type { DirectoryUser } from '../../src/lib/auth/index.js';
import type { AuthRuntime } from '../../src/lib/authz/runtime.js';
import { TENANT_HEADER } from '../../src/middleware-contract.js';
import { TENANT_A } from './support/in-memory-ports.js';
import {
  ALLOWED_ORIGIN,
  adminUser,
  createTokenRouteHarness,
  issuePublisherToken,
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

interface RevokeRequestOptions {
  /** 未指定なら owner の session。null なら資格情報を載せない。 */
  readonly user?: DirectoryUser | null;
  readonly tenantId?: string | null;
  /** state-changing 要求の Origin。null なら header を送らない。 */
  readonly origin?: string | null;
}

async function revokeRequest(tokenId: string, options: RevokeRequestOptions = {}): Promise<Request> {
  const headers = new Headers();

  const user = options.user === undefined ? testUser(OWNER_ID) : options.user;
  if (user !== null) headers.set('cookie', await sessionCookieFor(user));

  const tenantId = options.tenantId === undefined ? TENANT_A : options.tenantId;
  if (tenantId !== null) headers.set(TENANT_HEADER, tenantId);

  const origin = options.origin === undefined ? ALLOWED_ORIGIN : options.origin;
  if (origin !== null) headers.set('origin', origin);

  return new Request(`https://hub.example.com/api/v1/tokens/${tokenId}`, { method: 'DELETE', headers });
}

/** Next.js の動的 segment は Promise で渡ってくる。 */
const routeContext = (id: string) => ({ params: Promise.resolve({ id }) });

/** 発行済み token の id。route は id しか受け取らないので、ここで実体と突き合わせる。 */
function issuedTokenId(harness: TokenRouteHarness): string {
  const id = harness.ports.publisherTokens.all()[0]?.id;
  if (id === undefined) throw new Error('前提: token が発行されているはず');
  return id;
}

describe('DELETE /api/v1/tokens/{id}: 失効の成功経路', () => {
  let harness: TokenRouteHarness;

  beforeEach(() => {
    harness = createTokenRouteHarness();
    runtimeHolder.current = harness.runtime;
  });

  it('本人は自分の token を失効でき、件数が返る', async () => {
    await issuePublisherToken(harness, OWNER_ID);
    const tokenId = issuedTokenId(harness);

    const response = await DELETE(await revokeRequest(tokenId), routeContext(tokenId));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: tokenId, status: 'revoked', revoked_count: 1 });
    expect(harness.ports.publisherTokens.all()[0]?.revokedAtSeconds).not.toBeNull();
  });

  it('2 回目の失効も成功を返す (冪等)', async () => {
    await issuePublisherToken(harness, OWNER_ID);
    const tokenId = issuedTokenId(harness);

    await DELETE(await revokeRequest(tokenId), routeContext(tokenId));
    const revokedAt = harness.ports.publisherTokens.all()[0]?.revokedAtSeconds;
    harness.ports.clock.advance(30);
    const second = await DELETE(await revokeRequest(tokenId), routeContext(tokenId));

    expect(second.status).toBe(200);
    // 2 回目で失効時刻を上書きしない (「いつ止まったか」が監査の起点になる)
    expect(harness.ports.publisherTokens.all()[0]?.revokedAtSeconds).toBe(revokedAt);
  });

  it('workspace-admin は Workspace 内の他人の token を失効できる', async () => {
    await issuePublisherToken(harness, STRANGER_ID);
    const tokenId = issuedTokenId(harness);

    const response = await DELETE(await revokeRequest(tokenId, { user: adminUser() }), routeContext(tokenId));

    expect(response.status).toBe(200);
    expect(harness.ports.publisherTokens.all()[0]?.revokedAtSeconds).not.toBeNull();
  });
});

describe('DELETE /api/v1/tokens/{id}: 拒否経路', () => {
  let harness: TokenRouteHarness;

  beforeEach(() => {
    harness = createTokenRouteHarness();
    runtimeHolder.current = harness.runtime;
  });

  it('member が他人の token を失効しようとすると 403 で、資源は無傷', async () => {
    await issuePublisherToken(harness, STRANGER_ID);
    const tokenId = issuedTokenId(harness);

    const response = await DELETE(await revokeRequest(tokenId), routeContext(tokenId));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'not_owner' });
    expect(harness.ports.publisherTokens.all()[0]?.revokedAtSeconds).toBeNull();
  });

  it('存在しない id も member には他人の token と同じ 403 に見える', async () => {
    const response = await DELETE(await revokeRequest('token-unknown'), routeContext('token-unknown'));

    // 404 と 403 を出し分けると、id の総当たりで在庫を推定できてしまう
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'not_owner' });
  });

  it('権限のある workspace-admin から見れば存在しない id は 404', async () => {
    const response = await DELETE(
      await revokeRequest('token-unknown', { user: adminUser() }),
      routeContext('token-unknown'),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'not_found' });
  });

  it('Origin が許可外・欠落の DELETE は 403 で handler へ届かない', async () => {
    await issuePublisherToken(harness, OWNER_ID);
    const tokenId = issuedTokenId(harness);

    const forged = await DELETE(
      await revokeRequest(tokenId, { origin: 'https://evil.example.com' }),
      routeContext(tokenId),
    );
    const missing = await DELETE(await revokeRequest(tokenId, { origin: null }), routeContext(tokenId));

    expect(forged.status).toBe(403);
    expect(await forged.json()).toEqual({ error: 'untrusted_origin' });
    expect(missing.status).toBe(403);
    // status だけ見ていると handler が走った後で潰した実装を通してしまう。失効していないことまで見る
    expect(harness.ports.publisherTokens.all()[0]?.revokedAtSeconds).toBeNull();
  });

  it('資格情報が無ければ 401', async () => {
    await issuePublisherToken(harness, OWNER_ID);
    const tokenId = issuedTokenId(harness);

    const response = await DELETE(await revokeRequest(tokenId, { user: null }), routeContext(tokenId));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'unauthenticated' });
  });

  it('テナント申告が無ければ 400 (id だけで資源を決めない)', async () => {
    await issuePublisherToken(harness, OWNER_ID);
    const tokenId = issuedTokenId(harness);

    const response = await DELETE(await revokeRequest(tokenId, { tenantId: null }), routeContext(tokenId));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'unresolved_resource' });
    expect(harness.ports.publisherTokens.all()[0]?.revokedAtSeconds).toBeNull();
  });
});
