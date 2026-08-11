// Next.js middleware エントリ。判定は行わず src/middleware/authz.ts へ委譲するだけの配線層
import { type NextRequest, NextResponse } from 'next/server';
import {
  CWV_PROBE_COOKIE_NAME,
  hasCwvProbeCookie,
  isCwvProbeRequestAllowed,
  readCwvProbeConfig,
  resolveCwvProbePrincipal,
  resolveCwvProbeTicket,
} from './lib/auth/cwv-probe.js';
// 認可層は公開入口 (src/middleware-contract.ts) 経由でのみ参照する。内部ファイルへ直接入ると境界の迂回になる
import { createSessionAuthProvider, systemAuthClock } from './lib/auth/index.js';
import { readBearerToken, resolveAccessTokenPrincipal } from './lib/authz/index.js';
// 拒否応答の見た目だけを担う表示層 (認可の判断は持たない)
import { isNavigationRequest, renderDenyNavigationPage } from './lib/routing/deny-navigation.js';
import { PATHNAME_HEADER } from './lib/routing/pathname-header.js';
import { authorize, TENANT_HEADER, WORKSPACE_HEADER } from './middleware-contract.js';
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
const cwvProbeConfig =
  process.env.AUTH_CANONICAL_ORIGIN === undefined || process.env.AUTH_CANONICAL_ORIGIN.trim() === ''
    ? undefined
    : readCwvProbeConfig(process.env, process.env.AUTH_CANONICAL_ORIGIN);
const authAdapter =
  sessionSecret === undefined || sessionSecret.length === 0
    ? createAuthAdapter()
    : createAuthAdapter(createSessionAuthProvider({ sessionSecret, clock: systemAuthClock }));

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const context = toAuthRequestContext(request);
  const nowSeconds = systemAuthClock.nowSeconds();
  // ticket claim だけでなく実際の Host も固定する。同一 Worker に別 custom domain が
  // 紐づいた場合も、canonical origin 向けに発行した credential を横展開させない。
  const isCwvProbeOrigin = cwvProbeConfig !== undefined && request.nextUrl.origin === cwvProbeConfig.origin;

  // `/catalog` の bootstrap ticket は 1 回だけ URL で受け、署名済み scope を Cookie 化してから
  // ticket を含まない URL へ遷移する。以後の画像/JS などへ query credential を送らない。
  const bootstrapTicket = request.nextUrl.searchParams.get('__cwv_probe');
  if (bootstrapTicket !== null) {
    const ticketCount = request.nextUrl.searchParams.getAll('__cwv_probe').length;
    const tenant = request.nextUrl.searchParams.getAll('tenant');
    const workspace = request.nextUrl.searchParams.getAll('workspace');
    const principal =
      cwvProbeConfig === undefined ||
      !isCwvProbeOrigin ||
      request.method !== 'GET' ||
      request.nextUrl.pathname !== '/catalog' ||
      ticketCount !== 1
        ? null
        : await resolveCwvProbeTicket(bootstrapTicket, cwvProbeConfig, nowSeconds);

    if (
      principal !== null &&
      tenant.length === 1 &&
      workspace.length === 1 &&
      tenant[0] === principal.tenantId &&
      workspace[0] === principal.workspaceIds[0]
    ) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.searchParams.delete('__cwv_probe');
      const response = NextResponse.redirect(redirectUrl, 307);
      response.cookies.set({
        name: CWV_PROBE_COOKIE_NAME,
        value: bootstrapTicket,
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
        maxAge: 5 * 60,
      });
      response.headers.set('cache-control', 'no-store');
      response.headers.set('referrer-policy', 'no-referrer');
      return response;
    }

    // ticket がある要求を通常認証へ fallback させない。詳細を返すと署名・設定状態を oracle にするため 401 に畳む。
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const bearer = readBearerToken(context.headers.get('authorization') ?? null);
  let principal: Principal | null;
  let isCwvProbe = false;

  const cwvCookie = hasCwvProbeCookie(context.headers.get('cookie') ?? null);
  if (cwvProbeConfig !== undefined && cwvCookie) {
    const resolved = isCwvProbeOrigin
      ? await resolveCwvProbePrincipal(context.headers.get('cookie') ?? null, cwvProbeConfig, nowSeconds)
      : null;
    principal =
      resolved === null
        ? null
        : {
            subject: resolved.userId,
            tenantId: resolved.tenantId,
            workspaceIds: resolved.workspaceIds,
            roles: [resolved.role],
          };
    isCwvProbe = principal !== null;
  } else if (bearer === null) {
    principal = await authAdapter.resolvePrincipal(context);
  } else if (accessTokenSecret === undefined || accessTokenSecret.length === 0) {
    // Bearer が提示されたのに検証鍵が無い場合、cookie へ fallback させず fail-closed にする。
    principal = null;
  } else {
    const resolved = await resolveAccessTokenPrincipal(bearer, {
      accessTokenSecret,
      nowSeconds,
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

  if (isCwvProbe && !isCwvProbeRequestAllowed(request.method, request.nextUrl.pathname)) {
    return NextResponse.json({ error: 'credential_not_allowed' }, { status: 403 });
  }

  // catalog page の初回 GET には client が header を付けられない。probe のときだけ、検証済み JWT の
  // scope を既存の single authorization layer へ合成する。query の tenant/workspace はここで信用しない。
  const authzHeaders = new Map(context.headers);
  if (isCwvProbe && principal !== null) {
    authzHeaders.set(TENANT_HEADER, principal.tenantId);
    authzHeaders.set(WORKSPACE_HEADER, principal.workspaceIds[0] ?? '');
  }

  const decision = authorize({
    pathname: request.nextUrl.pathname,
    headers: authzHeaders,
    principal,
    // Bearer token (Device Flow access token) は cookie を送らない機械クライアント前提のため、
    // session cookie 由来の active workspace 自動解決 (所属1件なら cookie 無しでも確定) を適用しない。
    allowSessionScope: bearer === null,
  });

  if (!decision.allowed) {
    // ブラウザの画面遷移にだけ HTML を返す。API 経路 (fetch / Bearer / `/api/*`) の
    // `{"error": "..."}` 契約は変えない。判定 (reason/status) は共通のまま、表現だけを分ける。
    if (
      isNavigationRequest({
        method: request.method,
        pathname: request.nextUrl.pathname,
        accept: context.headers.get('accept') ?? null,
        hasBearer: bearer !== null,
      })
    ) {
      return new NextResponse(renderDenyNavigationPage(decision.reason), {
        status: decision.status,
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
      });
    }
    return NextResponse.json({ error: decision.reason }, { status: decision.status });
  }

  // 共通シェル (サイドバー / ボトムタブ) が「いま自分がどの画面にいるか」を
  // server component のまま知るための唯一の手段。layout は pathname を受け取れず、
  // usePathname() を使うと nav 全体が client bundle へ移ってしまう。
  // 認可判定はすでに終わっているので、ここでの header 追加は判定へ影響しない。
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(PATHNAME_HEADER, request.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // 全 path を通す。除外は authz.ts の PUBLIC_PATH_PREFIXES 側だけで管理し、
  // matcher と allowlist の二重管理でスコープ漏れが生まれないようにする。
  matcher: ['/((?!_next/static|_next/image).*)'],
};
