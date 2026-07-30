// Next.js middleware エントリ。判定は行わず src/middleware/authz.ts へ委譲するだけの配線層
import { type NextRequest, NextResponse } from 'next/server';
// 認可層は公開入口 (src/middleware/index.ts) 経由でのみ参照する。内部ファイルへ直接入ると境界の迂回になる
import { createSessionAuthProvider, systemAuthClock } from './lib/auth/index.js';
import { readBearerToken, resolveAccessTokenPrincipal } from './lib/authz/index.js';
import { authorize } from './middleware/index.js';
import { createAuthAdapter, type Principal, toAuthRequestContext } from './shared/auth/index.js';

/**
 * feat-auth-tenancy の session provider を差し込む (foundation の deny-all を置き換える結線点)。
 *
 * 秘密が未設定なら **provider を差さない** = deny-all のまま。
 * 「秘密が無いときは検証を飛ばす」実装にすると、環境変数の設定漏れがそのまま認証バイパスになる。
 *
 * ここで見るのは session cookie の署名までで、緊急失効 (session_revocations) は見ない。
 * edge は DB へ届かないため、失効判定は route 側の withAuthz が担う 2 段構え (ADR AD-7)。
 */
const sessionSecret = process.env.AUTH_SESSION_SECRET;
const accessTokenSecret = process.env.AUTH_ACCESS_TOKEN_SECRET;
const authAdapter =
  sessionSecret === undefined || sessionSecret.length === 0
    ? createAuthAdapter()
    : createAuthAdapter(createSessionAuthProvider({ sessionSecret, clock: systemAuthClock }));

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const context = toAuthRequestContext(request);
  const bearer = readBearerToken(context.headers.get('authorization') ?? null);
  let principal: Principal | null;

  if (bearer === null) {
    principal = await authAdapter.resolvePrincipal(context);
  } else if (accessTokenSecret === undefined || accessTokenSecret.length === 0) {
    // Bearer が提示されたのに検証鍵が無い場合、cookie へ fallback させず fail-closed にする。
    principal = null;
  } else {
    const resolved = await resolveAccessTokenPrincipal(bearer, {
      accessTokenSecret,
      nowSeconds: systemAuthClock.nowSeconds(),
    });
    principal =
      resolved === null
        ? null
        : {
            subject: resolved.userId,
            tenantId: resolved.tenantId,
            workspaceIds: resolved.workspaceIds,
            roles: [resolved.role],
          };
  }

  const decision = authorize({
    pathname: request.nextUrl.pathname,
    headers: context.headers,
    principal,
  });

  if (!decision.allowed) {
    return NextResponse.json({ error: decision.reason }, { status: decision.status });
  }

  return NextResponse.next();
}

export const config = {
  // 全 path を通す。除外は authz.ts の PUBLIC_PATH_PREFIXES 側だけで管理し、
  // matcher と allowlist の二重管理でスコープ漏れが生まれないようにする。
  matcher: ['/((?!_next/static|_next/image).*)'],
};
