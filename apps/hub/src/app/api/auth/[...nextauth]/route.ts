/**
 * `/api/auth/*` — Auth.js (NextAuth) のハンドラを載せる結線点 (ADR AD-2 / §10)。
 *
 * **認証不要 path** なので `withAuthz` を通さない (登録簿の exemptions に明示登録済み)。
 * 認証**前**に到達する経路なので wrapper を掛けられない。実質の統制は OIDC 検証契約 (AD-5) 側にある。
 *
 * この file は結線だけを持つ。実処理は `lib/auth/adapter/authjs-handler.ts` にあり、
 * `@auth/core` への依存はその adapter 境界の内側だけに閉じている
 * (`scripts/check-auth-adapter-boundary.mjs` の T-BND-01 / T-BND-02)。
 * ここから見えるのは `(Request) => Promise<Response>` だけ。
 *
 * URL は `/api/auth/{tenant_slug}/{action}` の形。テナントを path で運ぶので、
 * IdP へ飛んで戻ってくる間もテナントが URL に残る (cookie へ退避する追加状態を持たない / AD-5)。
 *
 * 例外は共通 Google OAuth client 方式の callback だけで、こちらは
 * `/api/auth/shared/callback/tenant-oidc` の固定 1 本 (AD-10)。slug が入らないので
 * テナントは署名付き `state` から復元する。この 1 本を Google Cloud Console へ登録すれば
 * テナントを増やすたびの redirect URI 追加が要らなくなる、というのが共通方式の目的。
 * どちらも同じ catch-all がハンドルし、振り分けは `authjs-handler.ts` が path から行う。
 */

import { authRuntime } from '../../../../lib/authz/index.js';

export async function GET(request: Request): Promise<Response> {
  return authRuntime().authRoute(request);
}

export async function POST(request: Request): Promise<Response> {
  return authRuntime().authRoute(request);
}
