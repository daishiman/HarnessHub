/**
 * 要求 (Request) から認可主体を作る。
 *
 * ブラウザ (session cookie) と CLI (Bearer access token) の 2 経路を **同じ型へ正規化**する。
 * 正規化を route ごとに書くと「token 経路だけ status を見ていない」といった非対称が必ず生まれる。
 */

import { accessTokenClaimsSchema } from '@harness-hub/schemas';

import { SESSION_COOKIE_NAME } from '../auth/config.js';
import { CWV_PROBE_COOKIE_NAME, type CwvProbeConfig, resolveCwvProbePrincipal } from '../auth/cwv-probe.js';
import { verifyJwt } from '../auth/jwt.js';
import { readCookie, verifySessionToken } from '../auth/session.js';
import type { AuthzPrincipal } from './types.js';

export interface PrincipalResolverDeps {
  readonly sessionSecret: string;
  readonly accessTokenSecret: string;
  readonly nowSeconds: number;
  /** CWV 専用 credential の設定。未設定なら通常の認証経路だけを使う。 */
  readonly cwvProbe?: CwvProbeConfig | undefined;
}

export type AccessTokenPrincipalResolverDeps = Pick<PrincipalResolverDeps, 'accessTokenSecret' | 'nowSeconds'>;

/**
 * 主体を解決する。解決できなければ null (例外にしない)。
 * Bearer を先に見るのは、CLI が誤って cookie を送っても token 側の scope 制限が効くようにするため。
 */
export async function resolveRequestPrincipal(
  request: Request,
  deps: PrincipalResolverDeps,
): Promise<AuthzPrincipal | null> {
  // 短命 probe cookie が提示された要求は、改ざん時に session/Bearer へ fallback しない。
  // fallback すると cookie を付け替えた攻撃者が別 credential の経路へ滑り込む余地ができる。
  if (deps.cwvProbe !== undefined && readCookie(request.headers.get('cookie'), CWV_PROBE_COOKIE_NAME) !== null) {
    // claim と設定値の照合だけでは、同一 Worker に紐づく別 custom domain まで使えてしまう。
    // route を middleware を通さず unit/integration 実行しても同じ境界を守るため、ここでも request origin を固定する。
    if (new URL(request.url).origin !== deps.cwvProbe.origin) return null;
    return resolveCwvProbePrincipal(request.headers.get('cookie'), deps.cwvProbe, deps.nowSeconds);
  }
  const bearer = readBearerToken(request.headers.get('authorization'));
  if (bearer !== null) return resolveAccessTokenPrincipal(bearer, deps);
  return resolveFromSession(request.headers.get('cookie'), deps);
}

/**
 * Bearer access token だけを共通の AuthzPrincipal へ変換する。
 *
 * Next.js middleware は DB に接続できないが、JWT の署名・claims・期限は stateless に検証できる。
 * route と同じ検証関数を使うことで、middleware 用の緩い token 解釈が増えるのを防ぐ。
 */
export async function resolveAccessTokenPrincipal(
  token: string,
  deps: AccessTokenPrincipalResolverDeps,
): Promise<AuthzPrincipal | null> {
  const verified = await verifyJwt(token, deps.accessTokenSecret);
  if (!verified.ok) {
    // token 本体・署名値・claim は出さない。署名鍵の不整合と入力破損を本番で切り分けるため、
    // 公開しても資格情報にならない拒否段階と固定理由だけを残す。
    console.warn('[authz] access token rejected', { stage: 'jwt', reason: verified.reason });
    return null;
  }

  const parsed = accessTokenClaimsSchema.safeParse(verified.payload);
  // typ: 'access' の literal 検査もここに含まれる。session token を Bearer に載せても通らない
  if (!parsed.success) {
    console.warn('[authz] access token rejected', {
      stage: 'claims',
      issues: parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), code: issue.code })),
    });
    return null;
  }

  const claims = parsed.data;
  if (claims.exp <= deps.nowSeconds) {
    console.warn('[authz] access token rejected', { stage: 'expiry' });
    return null;
  }

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
    tokenId: claims.token_id,
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
    tokenId: null,
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
