/**
 * `withAuthz` の入口・出口の分岐 (判定表そのものは authz-matrix / tenant-isolation が持つ)。
 *
 * ここで見るのは 3 つ:
 *   - 判定より手前で落ちる Origin 検査 (state-changing 要求の CSRF 対策)
 *   - handler 内で追加判定した `AuthzError` を同じ形の応答へ寄せること
 *   - それ以外の例外は 403 に化けさせず、real reason 付きの problem+json 500 として返すこと
 */

import { describe, expect, it, vi } from 'vitest';

import { SESSION_COOKIE_NAME } from '../../src/lib/auth/config.js';
import { buildSessionClaims, signSessionToken } from '../../src/lib/auth/index.js';
import type { AuthzResourceRef } from '../../src/lib/authz/types.js';
import { AuthzError, type AuthzRuntimeDeps, withAuthz } from '../../src/lib/authz/with-authz.js';
import { createAuditLogger, createInMemoryAuditSink } from '../../src/shared/audit/index.js';
import {
  createSequentialIds,
  createTestPorts,
  directoryUser,
  TENANT_A,
  WORKSPACE_A1,
} from './support/in-memory-ports.js';

const NOW = 1_800_000_000;
const USER_A = 'user-a';
const SESSION_SECRET = 'session-secret';
const ALLOWED_ORIGIN = 'https://hub.example.com';

function harness() {
  const ports = createTestPorts({ users: [directoryUser({ id: USER_A, tenantId: TENANT_A })] });
  ports.clock.set(NOW);
  const sink = createInMemoryAuditSink();
  const deps: AuthzRuntimeDeps = {
    ports,
    audit: createAuditLogger({ sink, now: () => new Date(NOW * 1000), newId: createSequentialIds('audit') }),
    revocation: { isRevoked: async () => false },
    sessionSecret: SESSION_SECRET,
    accessTokenSecret: 'access-secret',
    allowedOrigins: [ALLOWED_ORIGIN],
  };
  return { deps, ports, sink };
}

const resource: AuthzResourceRef = {
  type: 'token',
  id: 'token-1',
  tenantId: TENANT_A,
  workspaceId: WORKSPACE_A1,
  ownerUserId: USER_A,
};

async function sessionRequest(init: RequestInit = {}): Promise<Request> {
  const claims = buildSessionClaims(
    directoryUser({ id: USER_A, tenantId: TENANT_A, workspaceIds: [WORKSPACE_A1] }),
    NOW,
  );
  const token = await signSessionToken(claims, SESSION_SECRET);
  const headers = new Headers(init.headers);
  headers.set('cookie', `${SESSION_COOKIE_NAME}=${token}`);
  return new Request(`${ALLOWED_ORIGIN}/api/v1/tokens`, { ...init, headers });
}

describe('AuthzError: handler 内の追加判定を表す例外', () => {
  it('拒否理由と HTTP status を保持し、name が識別できる', () => {
    const error = new AuthzError('not_owner', 403);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('AuthzError');
    expect(error.reason).toBe('not_owner');
    expect(error.status).toBe(403);
    expect(error.message).toBe('authz denied: not_owner');
  });
});

describe('withAuthz: Origin 検査 (判定より手前)', () => {
  it('state-changing 要求で Origin が無ければ untrusted_origin で 403', async () => {
    const { deps } = harness();
    const handler = vi.fn(async () => Response.json({ ok: true }));
    const route = withAuthz({ action: 'token.revoke', deps, resolveResource: async () => resource }, handler);

    const response = await route(await sessionRequest({ method: 'POST' }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'untrusted_origin' });
    // 資格情報の解決へ進む前に落とす
    expect(handler).not.toHaveBeenCalled();
  });

  it('許可外 Origin の state-changing 要求も untrusted_origin', async () => {
    const { deps } = harness();
    const route = withAuthz({ action: 'token.revoke', deps, resolveResource: async () => resource }, async () =>
      Response.json({ ok: true }),
    );

    const response = await route(await sessionRequest({ method: 'POST', headers: { origin: 'https://evil.example' } }));

    expect(await response.json()).toEqual({ error: 'untrusted_origin' });
  });

  it('許可 Origin なら通常どおり判定へ進む', async () => {
    const { deps } = harness();
    const route = withAuthz({ action: 'token.revoke', deps, resolveResource: async () => resource }, async () =>
      Response.json({ ok: true }),
    );

    const response = await route(await sessionRequest({ method: 'POST', headers: { origin: ALLOWED_ORIGIN } }));

    expect(response.status).toBe(200);
  });
});

describe('withAuthz: handler が投げた例外の扱い', () => {
  it('AuthzError は同じ形 ({error: reason}) の応答へ寄せる', async () => {
    const { deps } = harness();
    const route = withAuthz({ action: 'token.list.self', deps, resolveResource: async () => resource }, async () => {
      throw new AuthzError('unresolved_resource', 400);
    });

    const response = await route(await sessionRequest());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'unresolved_resource' });
  });

  it('AuthzError 以外は 403/4xx に化けさせず、real reason 付きの problem+json 500 として返す', async () => {
    // 実測 (2026-08-13, HarnessHub GET /api/v1/sheets?limit=25 500): これを rethrow していた頃は
    // Next.js の既定 500 (非 JSON 本文) がそのまま返り、フロント (extractApiErrorMessage) が
    // 理由を読めず固定の汎用文言に落ちていた。#717 の「本当のエラー理由を画面に表示する」を
    // AuthzError 以外の例外にも効かせるため、ここで problem+json へ変換して返す。
    const { deps } = harness();
    const route = withAuthz({ action: 'token.list.self', deps, resolveResource: async () => resource }, async () => {
      throw new TypeError('repository が落ちた');
    });

    const response = await route(await sessionRequest());

    expect(response.status).toBe(500);
    expect(response.headers.get('content-type')).toBe('application/problem+json');
    const body = (await response.json()) as { readonly status: number; readonly detail?: string };
    expect(body.status).toBe(500);
    expect(body.detail).toBe('repository が落ちた');
  });
});

describe('withAuthz: deps の遅延解決', () => {
  it('関数形の deps は要求時まで評価されない', async () => {
    const { deps } = harness();
    const resolveDeps = vi.fn(() => deps);
    const route = withAuthz(
      { action: 'token.list.self', deps: resolveDeps, resolveResource: async () => resource },
      async () => Response.json({ ok: true }),
    );

    // route を組んだだけでは環境変数へ触らない
    expect(resolveDeps).not.toHaveBeenCalled();

    await route(await sessionRequest());
    expect(resolveDeps).toHaveBeenCalledTimes(1);
  });
});
