/**
 * T-SESS-01 〜 T-SESS-14 (QC-7)。
 *
 * 数値の期待値は**仕様書のリテラル**を書く (`AUTH_NUMERIC_CONTRACT` を参照しない)。
 * 定数を参照するテストは、定数を書き換えた瞬間に一緒に緑になって値の誤りを検出できない。
 */

import { describe, expect, it } from 'vitest';

import {
  AUTH_NUMERIC_CONTRACT,
  isTrustedOrigin,
  SESSION_COOKIE_ATTRIBUTES,
  SESSION_COOKIE_NAME,
  serializeClearedSessionCookie,
  serializeSessionCookie,
} from '../../src/lib/auth/config.js';
import {
  buildSessionClaims,
  readCookie,
  shouldRefreshSession,
  signSessionToken,
  verifySessionToken,
} from '../../src/lib/auth/session.js';
import { resolveRequestPrincipal } from '../../src/lib/authz/principal.js';
import { createRevocationChecker } from '../../src/lib/authz/revocation.js';
import {
  createInMemorySessionRevocations,
  createMutableClock,
  directoryUser,
  TENANT_A,
  TENANT_B,
  WORKSPACE_A1,
} from './support/in-memory-ports.js';

const NOW = 1_800_000_000;
const SECRET = 'session-secret';

const USER = directoryUser({ id: 'user-1', tenantId: TENANT_A, workspaceIds: [WORKSPACE_A1] });

describe('T-SESS-01〜03: 数値・cookie・claims の契約 (QC-7)', () => {
  it('T-SESS-01: 数値契約が仕様書のリテラル値と一致する', () => {
    expect(AUTH_NUMERIC_CONTRACT).toEqual({
      sessionMaxAgeSeconds: 28_800, // 8 時間
      sessionUpdateAgeSeconds: 900, // 15 分
      deviceCodeTtlSeconds: 600, // 10 分
      devicePollIntervalSeconds: 5,
      devicePollBackoffSeconds: 5,
      devicePollMaxIntervalSeconds: 60, // security-spec §2.2 (qa-073 で確定)
      userCodeLength: 8,
      userCodeMaxAttempts: 5,
      accessTokenTtlSeconds: 900, // 15 分
      refreshTokenTtlSeconds: 7_776_000, // 90 日
      revocationCacheTtlSeconds: 60,
    });
  });

  it('T-SESS-02: cookie 名と属性が仕様どおり', () => {
    expect(SESSION_COOKIE_NAME).toBe('__Host-harness-hub.session');
    expect(SESSION_COOKIE_ATTRIBUTES).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      path: '/',
      maxAgeSeconds: 28_800,
    });

    const serialized = serializeSessionCookie('token-value');
    // `__Host-` 接頭辞は Path=/ かつ Secure かつ Domain 無しを UA に強制させる
    expect(serialized).toContain('__Host-harness-hub.session=token-value');
    expect(serialized).toContain('Path=/');
    expect(serialized).toContain('SameSite=Lax');
    expect(serialized).toContain('HttpOnly');
    expect(serialized).toContain('Secure');
    expect(serialized).not.toContain('Domain=');

    expect(serializeClearedSessionCookie()).toContain('Max-Age=0');
  });

  it('T-SESS-03: session claims が sub / tenant_id / role / status / workspace_ids / iat / exp を持つ', () => {
    const claims = buildSessionClaims(USER, NOW);
    expect(claims).toEqual({
      sub: 'user-1',
      tenant_id: TENANT_A,
      role: 'member',
      status: 'active',
      workspace_ids: [WORKSPACE_A1],
      iat: NOW,
      exp: NOW + 28_800,
    });
  });

  it('T-SESS-03 補: 15 分経過で再発行の合図が立つ', () => {
    const claims = buildSessionClaims(USER, NOW);
    expect(shouldRefreshSession(claims, NOW + 899)).toBe(false);
    expect(shouldRefreshSession(claims, NOW + 900)).toBe(true);
  });

  it('T-SESS-03 補: cookie 名は完全一致で読む (前方一致で別 cookie を拾わない)', () => {
    const header = `__Host-harness-hub.session.backup=decoy; ${SESSION_COOKIE_NAME}=real`;
    expect(readCookie(header, SESSION_COOKIE_NAME)).toBe('real');
  });
});

describe('T-SESS-04〜09: 緊急失効 (QC-7)', () => {
  function checker() {
    const clock = createMutableClock(NOW);
    const port = createInMemorySessionRevocations();
    return { clock, port, revocation: createRevocationChecker(port, clock) };
  }

  it('T-SESS-04: 失効時刻より前に発行された session は拒否', async () => {
    const { port, revocation } = checker();
    port.revoke(TENANT_A, 'user-1', NOW);

    expect(await revocation.isRevoked(TENANT_A, 'user-1', NOW - 1)).toBe(true);
  });

  it('T-SESS-05: 失効時刻より後に発行された session は通過', async () => {
    const { port, revocation } = checker();
    port.revoke(TENANT_A, 'user-1', NOW);

    expect(await revocation.isRevoked(TENANT_A, 'user-1', NOW + 1)).toBe(false);
  });

  it('T-SESS-05 補: 同時刻ちょうどは失効側に含める (安全側)', async () => {
    const { port, revocation } = checker();
    port.revoke(TENANT_A, 'user-1', NOW);

    // 秒精度では「失効指示と同じ秒に発行された session」が失効前か後か決められない。
    // 決められないものを通すと失効が漏れるので拒否側へ倒す
    expect(await revocation.isRevoked(TENANT_A, 'user-1', NOW)).toBe(true);
  });

  it('T-SESS-06: 失効はテナント単位で分離される (A の失効が B に波及しない)', async () => {
    const { port, revocation } = checker();
    port.revoke(TENANT_A, 'user-1', NOW);

    expect(await revocation.isRevoked(TENANT_A, 'user-1', NOW - 1)).toBe(true);
    expect(await revocation.isRevoked(TENANT_B, 'user-1', NOW - 1)).toBe(false);
  });

  it('T-SESS-07: TTL 60 秒以内は port を再呼び出ししない', async () => {
    const { clock, port, revocation } = checker();

    await revocation.isRevoked(TENANT_A, 'user-1', NOW);
    clock.advance(59);
    await revocation.isRevoked(TENANT_A, 'user-1', NOW);

    expect(port.callCount()).toBe(1);
  });

  it('T-SESS-08: TTL 経過後は再取得する', async () => {
    const { clock, port, revocation } = checker();

    await revocation.isRevoked(TENANT_A, 'user-1', NOW);
    clock.advance(60);
    await revocation.isRevoked(TENANT_A, 'user-1', NOW);

    expect(port.callCount()).toBe(2);
  });

  it('T-SESS-08 補: TTL 経過後に入った失効指示が反映される', async () => {
    const { clock, port, revocation } = checker();

    expect(await revocation.isRevoked(TENANT_A, 'user-1', NOW)).toBe(false);
    port.revoke(TENANT_A, 'user-1', NOW + 10);
    clock.advance(60);

    expect(await revocation.isRevoked(TENANT_A, 'user-1', NOW)).toBe(true);
  });

  it('T-SESS-09: port が例外を投げたら拒否 (fail-closed)', async () => {
    const { port, revocation } = checker();
    port.failWith(new Error('turso unreachable'));

    expect(await revocation.isRevoked(TENANT_A, 'user-1', NOW)).toBe(true);
  });

  it('T-SESS-09 補: 障害時の結果をキャッシュしない (復旧後すぐ通常判定へ戻る)', async () => {
    const { clock, port, revocation } = checker();
    port.failWith(new Error('turso unreachable'));
    expect(await revocation.isRevoked(TENANT_A, 'user-1', NOW)).toBe(true);

    port.failWith(null);
    clock.advance(1);
    // 障害中の true を 60 秒キャッシュすると、復旧しても 1 分間ログインできない
    expect(await revocation.isRevoked(TENANT_A, 'user-1', NOW)).toBe(false);
  });
});

describe('T-SESS-10/11: session token の検証 (QC-7)', () => {
  it('T-SESS-10: exp を過ぎた token は拒否', async () => {
    const token = await signSessionToken(buildSessionClaims(USER, NOW), SECRET);

    expect(await verifySessionToken(token, SECRET, NOW + 28_799)).toMatchObject({ ok: true });
    expect(await verifySessionToken(token, SECRET, NOW + 28_800)).toEqual({ ok: false, reason: 'expired' });
  });

  it('T-SESS-11: 署名が違う token は拒否', async () => {
    const token = await signSessionToken(buildSessionClaims(USER, NOW), SECRET);

    expect(await verifySessionToken(token, 'another-secret', NOW)).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('T-SESS-11 補: payload を差し替えた token は署名段階で落ちる', async () => {
    const token = await signSessionToken(buildSessionClaims(USER, NOW), SECRET);
    const [header, , signature] = token.split('.');
    const tampered = btoa(JSON.stringify({ ...buildSessionClaims(USER, NOW), role: 'provider-admin' }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const forged = `${header}.${tampered}.${signature}`;
    // claims を読む前に署名を確かめるので、昇格した role が判定へ届かない
    expect(await verifySessionToken(forged, SECRET, NOW)).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('T-SESS-11 補: 形が JWT でない値は malformed', async () => {
    expect(await verifySessionToken('not-a-jwt', SECRET, NOW)).toEqual({ ok: false, reason: 'malformed' });
  });

  it('T-SESS-10 補: session token を Bearer に載せ替えても principal にならない', async () => {
    // access token 側は `typ: 'access'` の literal を要求するので、
    // 署名鍵が同じでも経路をまたいだ流用ができない
    const sessionToken = await signSessionToken(buildSessionClaims(USER, NOW), SECRET);
    const request = new Request('https://hub.example.com/api/v1/tokens', {
      headers: { authorization: `Bearer ${sessionToken}` },
    });

    expect(
      await resolveRequestPrincipal(request, {
        sessionSecret: SECRET,
        accessTokenSecret: SECRET,
        nowSeconds: NOW,
      }),
    ).toBeNull();
  });
});

describe('T-SESS-12〜14: CSRF (Origin 検査)', () => {
  const allowed = ['https://hub.example.com'];

  it('T-SESS-12: state-changing で Origin が一致しなければ拒否', () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      expect(isTrustedOrigin(method, 'https://evil.example.com', allowed), method).toBe(false);
    }
  });

  it('T-SESS-13: state-changing で Origin 欠落は拒否 (送らなければ検査を外せる、にしない)', () => {
    expect(isTrustedOrigin('POST', null, allowed)).toBe(false);
    expect(isTrustedOrigin('POST', '', allowed)).toBe(false);
  });

  it('T-SESS-14: GET / HEAD / OPTIONS は Origin 検査の対象外', () => {
    for (const method of ['GET', 'HEAD', 'OPTIONS', 'get']) {
      expect(isTrustedOrigin(method, null, allowed), method).toBe(true);
    }
  });

  it('T-SESS-12 補: 許可 Origin なら state-changing でも通る / メソッドは大小を問わない', () => {
    expect(isTrustedOrigin('POST', 'https://hub.example.com', allowed)).toBe(true);
    expect(isTrustedOrigin('post', 'https://hub.example.com', allowed)).toBe(true);
    // 許可一覧が空なら全ての state-changing 要求が落ちる (既定で開かない)
    expect(isTrustedOrigin('POST', 'https://hub.example.com', [])).toBe(false);
  });
});
