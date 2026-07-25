/**
 * Auth.js (NextAuth) 設定の組み立て (ADR AD-2)。
 *
 * **Auth.js への依存はこのディレクトリの中だけ**に閉じる。境界の外 (lib/authz, app/) は
 * 本 feature が定義した型だけを見る。移行判断のトリガは ADR AD-2 に記載。
 *
 * 現時点で `next-auth` はワークスペースに入っていないため、ここでは **設定オブジェクトの生成まで**を
 * 実装する。依存導入、session claims bridge、route 結線は HarnessHub-b7ng で追跡する。
 */

import { AUTH_NUMERIC_CONTRACT, SESSION_COOKIE_ATTRIBUTES, SESSION_COOKIE_NAME } from '../config.js';
import { resolveTenantOidcConfig } from '../oidc.js';
import type { TenantOidcConnection, TenantOidcConnectionPort } from '../ports.js';

/** テナント 1 件に対応する OIDC provider 設定。 */
export interface OidcProviderConfig {
  /** provider id は全テナント共通。テナントの出し分けは設定の解決時点で終わっている。 */
  readonly id: 'tenant-oidc';
  readonly name: string;
  readonly type: 'oidc';
  readonly issuer: string;
  readonly clientId: string;
  readonly clientSecret: string;
  /** PKCE / state / nonce は全て必須。1 つでも外すと oidc.ts の検証契約と食い違う。 */
  readonly checks: readonly ['pkce', 'state', 'nonce'];
  readonly authorization: {
    readonly params: {
      readonly scope: 'openid email profile';
      readonly code_challenge_method: 'S256';
    };
  };
}

export interface AuthjsConfig {
  readonly providers: readonly OidcProviderConfig[];
  readonly session: {
    readonly strategy: 'jwt';
    readonly maxAge: number;
    readonly updateAge: number;
  };
  readonly cookies: {
    readonly sessionToken: {
      readonly name: string;
      readonly options: typeof SESSION_COOKIE_ATTRIBUTES;
    };
  };
  /** Host ヘッダを信用しない。信用すると Host 偽装で callback URL を差し替えられる。 */
  readonly trustHost: false;
  readonly pages: {
    readonly signIn: string;
    readonly error: string;
  };
}

export interface AuthjsConfigDeps {
  readonly oidcConnections: TenantOidcConnectionPort;
  /** client_secret は port ではなく秘密管理から取る。DB 行に載せない設計と対応する。 */
  readonly clientSecretFor: (tenantId: string) => Promise<string | null>;
}

/** 接続 1 件から provider 設定を作る。 */
export function buildOidcProvider(connection: TenantOidcConnection, clientSecret: string): OidcProviderConfig {
  return {
    id: 'tenant-oidc',
    name: connection.displayName,
    type: 'oidc',
    issuer: connection.issuer,
    clientId: connection.clientId,
    clientSecret,
    checks: ['pkce', 'state', 'nonce'],
    authorization: {
      params: { scope: 'openid email profile', code_challenge_method: 'S256' },
    },
  };
}

/**
 * テナント slug から Auth.js 設定を解決する。
 *
 * 解決できないときは **null を返して呼び出し側を落とす**。既定 provider へのフォールバックを置くと、
 * 未登録テナントが別テナントの IdP でログインできる経路になる (AD-5)。
 */
export async function resolveAuthjsConfig(deps: AuthjsConfigDeps, tenantSlug: string): Promise<AuthjsConfig | null> {
  const connection = await resolveTenantOidcConfig(deps.oidcConnections, tenantSlug);
  if (connection === null) return null;

  const clientSecret = await deps.clientSecretFor(connection.tenantId);
  if (clientSecret === null || clientSecret.length === 0) return null;

  return {
    providers: [buildOidcProvider(connection, clientSecret)],
    session: {
      strategy: 'jwt',
      maxAge: AUTH_NUMERIC_CONTRACT.sessionMaxAgeSeconds,
      updateAge: AUTH_NUMERIC_CONTRACT.sessionUpdateAgeSeconds,
    },
    cookies: {
      sessionToken: { name: SESSION_COOKIE_NAME, options: SESSION_COOKIE_ATTRIBUTES },
    },
    trustHost: false,
    pages: {
      // テナント先頭 URL。テナントを決めずに入れるサインイン画面は作らない
      signIn: `/${connection.tenantSlug}/signin`,
      error: `/${connection.tenantSlug}/signin`,
    },
  };
}
