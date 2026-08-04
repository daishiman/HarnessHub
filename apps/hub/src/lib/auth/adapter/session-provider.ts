/**
 * 共通 auth-adapter 層 (`src/shared/auth`) に差し込む provider 実体。
 * foundation が置いた `denyAllAuthProvider` を本 feature が置き換える結線点。
 *
 * ここで行うのは **session cookie の署名検証まで**。緊急失効 (session_revocations) は見ない。
 * edge middleware は DB へ届かないため、失効判定は route 側の `withAuthz` が担う 2 段構えにしてある
 * (ADR AD-7)。edge を通ったこと自体は「認可された」ことを意味しない。
 */

import type { AuthProvider, Principal } from '../../../shared/auth/index.js';
import { SESSION_COOKIE_NAME } from '../config.js';
import type { AuthClock } from '../ports.js';
import { readCookie, verifySessionToken } from '../session.js';

export interface SessionAuthProviderDeps {
  readonly sessionSecret: string;
  readonly clock: AuthClock;
}

export function createSessionAuthProvider(deps: SessionAuthProviderDeps): AuthProvider {
  return {
    name: 'harness-hub-session',
    async authenticate(context): Promise<Principal | null> {
      const token = readCookie(context.headers.get('cookie') ?? null, SESSION_COOKIE_NAME);
      if (token === null) return null;

      const verified = await verifySessionToken(token, deps.sessionSecret, deps.clock.nowSeconds());
      if (!verified.ok) return null;

      const { claims } = verified;
      // 無効化された利用者の session は署名が正しくても主体として扱わない
      if (claims.status !== 'active') return null;

      return {
        subject: claims.sub,
        tenantId: claims.tenant_id,
        workspaceIds: claims.workspace_ids,
        // 共通境界は role を文字列の集合として扱う。順序関係の解釈は lib/authz だけが持つ
        roles: [claims.role],
      };
    },
  };
}
