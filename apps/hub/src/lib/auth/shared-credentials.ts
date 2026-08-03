/**
 * OIDC credential の出所を 1 箇所へ畳む abstraction (issue-auth-tenancy-shared-google-oidc-20260729)。
 *
 * 顧客持ち込み方式は「テナント行の暗号化 secret を復号する」、共有方式は「環境単位の Secret を読む」。
 * 出所は違うが、呼び出し側 (Auth.js 設定の組立) が必要とするのは
 * **「この接続の client_secret」1 つ**だけ。だから分岐をここへ閉じ込め、
 * 上位には `(connection) => Promise<string | null>` という同じ形だけを見せる。
 *
 * 分岐を上位に置くと、共有方式を足すたびに provider 組立・handler・テストの 3 箇所へ
 * 同じ `if (mode === ...)` が増える。増えた分岐のどれか 1 つが「不明なら共有」に倒れた瞬間、
 * 既存テナントの認証境界が変わる。
 */

import type { TenantOidcConnection } from './ports.js';

/** Google の OIDC issuer。共有方式はこの issuer 以外を受け付けない。 */
export const GOOGLE_OIDC_ISSUER = 'https://accounts.google.com';

/** 共有 client の環境変数名。運用手順 (runbook) と実装のズレを防ぐため定数で持つ。 */
export const SHARED_GOOGLE_CLIENT_ID_ENV = 'SHARED_GOOGLE_OAUTH_CLIENT_ID';
export const SHARED_GOOGLE_CLIENT_SECRET_ENV = 'SHARED_GOOGLE_OAUTH_CLIENT_SECRET';

/**
 * 環境単位で 1 組だけ保持する共有 Google OAuth credential。
 *
 * `toJSON` で secret を伏せてある。構造化ログや API 応答で
 * `JSON.stringify(credentials)` が呼ばれても平文が出ない — 受入条件 4 の
 * 「ログ・レスポンスへ露出しない」を、規約ではなく**型の振る舞い**で担保する。
 * (`clientId` は秘密ではないのでそのまま出す。障害調査でどの client を見ているかは分かるべき。)
 */
export interface SharedGoogleCredentials {
  readonly clientId: string;
  readonly clientSecret: string;
  toJSON(): { readonly clientId: string; readonly clientSecret: '[redacted]' };
}

/**
 * 環境から共有 credential を読む。**片方でも欠けたら null**。
 *
 * 「client_id はあるが secret が無い」を部分的に有効として扱うと、
 * 認可要求だけ組み立てられて token 交換で必ず失敗する状態が生まれる。
 * 設定不備は入口で 1 度だけ検出したい。
 */
export function readSharedGoogleCredentials(env: Record<string, string | undefined>): SharedGoogleCredentials | null {
  const clientId = env[SHARED_GOOGLE_CLIENT_ID_ENV];
  const clientSecret = env[SHARED_GOOGLE_CLIENT_SECRET_ENV];
  if (clientId === undefined || clientId.length === 0) return null;
  if (clientSecret === undefined || clientSecret.length === 0) return null;

  return {
    clientId,
    clientSecret,
    toJSON: () => ({ clientId, clientSecret: '[redacted]' }),
  };
}

export interface OidcCredentialResolverDeps {
  /** 環境単位の共有 credential。未設定なら null (= 共有方式のテナントは解決できない)。 */
  readonly sharedGoogle: SharedGoogleCredentials | null;
  /** 顧客方式の secret 取得。テナント行の暗号化列を復号する実装を渡す。 */
  readonly customerClientSecretFor: (tenantId: string) => Promise<string | null>;
}

/**
 * 接続 1 件に対する client_secret を解決する関数を作る。
 *
 * **既定へ落ちる枝を作らない。** 共有 credential 未設定・issuer 不一致・未知 mode は
 * すべて null (= このテナントでは認証できない) にする。呼び出し側は null を 404 に倒す。
 * 「mode が読めなかったから共有を使う」を 1 箇所でも許すと、
 * 顧客方式のテナントが共有 client で認証できてしまう (受入条件 5 の fail-closed 違反)。
 */
export function createOidcCredentialResolver(
  deps: OidcCredentialResolverDeps,
): (connection: TenantOidcConnection) => Promise<string | null> {
  return async (connection) => {
    switch (connection.credentialMode) {
      case 'shared_google': {
        if (deps.sharedGoogle === null) return null;
        // 共有 client は Google の client。別 issuer の接続へ共有 secret を渡さない
        if (connection.issuer !== GOOGLE_OIDC_ISSUER) return null;
        return deps.sharedGoogle.clientSecret;
      }
      case 'customer_google':
        return deps.customerClientSecretFor(connection.tenantId);
      default:
        return null;
    }
  };
}
