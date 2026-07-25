/**
 * 要求 (Request) から認可主体を作る。
 *
 * ブラウザ (session cookie) と CLI (Bearer access token) の 2 経路を **同じ型へ正規化**する。
 * 正規化を route ごとに書くと「token 経路だけ status を見ていない」といった非対称が必ず生まれる。
 */

import { accessTokenClaimsSchema } from '@harness-hub/schemas';

import { SESSION_COOKIE_NAME } from '../auth/config.js';
import { verifyJwt } from '../auth/jwt.js';
import { readCookie, verifySessionToken } from '../auth/session.js';
import type { AuthzPrincipal } from './types.js';

export interface PrincipalResolverDeps {
  readonly sessionSecret: string;
  readonly accessTokenSecret: string;
  readonly nowSeconds: number;
}

/**
 * 主体を解決する。解決できなければ null (例外にしない)。
 * Bearer を先に見るのは、CLI が誤って cookie を送っても token 側の scope 制限が効くようにするため。
 */
export async function resolveRequestPrincipal(
  request: Request,
  deps: PrincipalResolverDeps,
): Promise<AuthzPrincipal | null> {
  const bearer = readBearerToken(request.headers.get('authorization'));
  if (bearer !== null) return resolveFromAccessToken(bearer, deps);
  return resolveFromSession(request.headers.get('cookie'), deps);
}

async function resolveFromAccessToken(token: string, deps: PrincipalResolverDeps): Promise<AuthzPrincipal | null> {
  const verified = await verifyJwt(token, deps.accessTokenSecret);
  if (!verified.ok) return null;

  const parsed = accessTokenClaimsSchema.safeParse(verified.payload);
  // typ: 'access' の literal 検査もここに含まれる。session token を Bearer に載せても通らない
  if (!parsed.success) return null;

  const claims = parsed.data;
  if (claims.exp <= deps.nowSeconds) return null;

  return {
    userId: claims.sub,
    tenantId: claims.tenant_id,
    role: claims.role,
    // token 経路では利用者の生死を DB で見る余地がある。ここでは token 発行時点の事実として active 扱いにし、
    // 失効後の停止は session_revocations (iat 比較) 側で担保する
    status: 'active',
    issuedAtSeconds: claims.iat,
    workspaceIds: [claims.workspace_id],
    scope: claims.scope,
    credential: 'access_token',
  };
}

async function resolveFromSession(
  cookieHeader: string | null,
  deps: PrincipalResolverDeps,
): Promise<AuthzPrincipal | null> {
  const token = readCookie(cookieHeader, SESSION_COOKIE_NAME);
  if (token === null) return null;

  const verified = await verifySessionToken(token, deps.sessionSecret, deps.nowSeconds);
  if (!verified.ok) return null;

  const { claims } = verified;
  return {
    userId: claims.sub,
    tenantId: claims.tenant_id,
    role: claims.role,
    status: claims.status,
    issuedAtSeconds: claims.iat,
    workspaceIds: claims.workspace_ids,
    // session は scope 概念の外。null を「無制限」と読まないこと (decide がそう扱う)
    scope: null,
    credential: 'session',
  };
}

/** `Authorization: Bearer <token>` を読む。scheme の大小は区別しない (RFC 7235 §2.1)。 */
export function readBearerToken(header: string | null): string | null {
  if (header === null) return null;
  const separator = header.indexOf(' ');
  if (separator < 0) return null;
  if (header.slice(0, separator).toLowerCase() !== 'bearer') return null;
  const value = header.slice(separator + 1).trim();
  return value.length > 0 ? value : null;
}
