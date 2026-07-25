/**
 * `/api/auth/*` — Auth.js (NextAuth) のハンドラを載せる結線点 (ADR AD-2 / §10)。
 *
 * **認証不要 path** なので `withAuthz` を通さない (登録簿の exemptions に明示登録済み)。
 *
 * 現時点で `next-auth` はワークスペースに入っていない。設定の組み立て
 * (`resolveAuthjsConfig`) と ID token 検証 (`verifyOidcIdToken`) は実装済みで単体テストもあるが、
 * 依存導入・session claims bridge・動的 tenant config の route 結線が未了 (HarnessHub-b7ng)。
 *
 * ここを「それらしく動く自前の OIDC ハンドラ」で埋めない。埋めると
 *   - Auth.js の PKCE/state/nonce 実装を使わない別経路が生まれ、AD-2 の境界が崩れる
 *   - 未了が 200 応答で隠れる
 * ため、501 を返して未結線であることを明示する。
 */

const NOT_WIRED = {
  error: 'auth_provider_not_wired',
  error_description:
    'Auth.js (next-auth) が未導入のため /api/auth ハンドラは未結線です。' +
    'テナント別 OIDC の設定生成と ID token 検証は lib/auth 側に実装済みです。',
} as const;

function notWired(): Response {
  return Response.json(NOT_WIRED, { status: 501, headers: { 'cache-control': 'no-store' } });
}

export async function GET(): Promise<Response> {
  return notWired();
}

export async function POST(): Promise<Response> {
  return notWired();
}
