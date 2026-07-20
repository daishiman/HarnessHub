// Next.js middleware エントリ。判定は行わず src/middleware/authz.ts へ委譲するだけの配線層
import { NextResponse, type NextRequest } from 'next/server';
import { authorize } from './middleware/authz.js';
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
    return NextResponse.json(
      { error: decision.reason },
      { status: decision.status },
    );
  }

  return NextResponse.next();
}

export const config = {
  // 全 path を通す。除外は authz.ts の PUBLIC_PATH_PREFIXES 側だけで管理し、
  // matcher と allowlist の二重管理でスコープ漏れが生まれないようにする。
  matcher: ['/((?!_next/static|_next/image).*)'],
};
