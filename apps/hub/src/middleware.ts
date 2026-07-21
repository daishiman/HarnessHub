// Next.js middleware エントリ。判定は行わず src/middleware/authz.ts へ委譲するだけの配線層
import { type NextRequest, NextResponse } from 'next/server';
// 認可層は公開入口 (src/middleware/index.ts) 経由でのみ参照する。内部ファイルへ直接入ると境界の迂回になる
import { authorize } from './middleware/index.js';
import { createAuthAdapter, toAuthRequestContext } from './shared/auth/index.js';

// provider 未注入の間は deny-all。feat-auth-tenancy が OIDC provider を差し込む。
const authAdapter = createAuthAdapter();

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const context = toAuthRequestContext(request);
  const principal = await authAdapter.resolvePrincipal(context);

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
