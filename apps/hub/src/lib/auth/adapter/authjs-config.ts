/**
 * Auth.js (NextAuth) 設定の組み立て (ADR AD-2)。
 *
 * **Auth.js への依存はこのディレクトリの中だけ**に閉じる。境界の外 (lib/authz, app/) は
 * 本 feature が定義した型だけを見る。移行判断のトリガは ADR AD-2 に記載。
 *
 * `@auth/core` の実行・session claims bridge・route 結線は同じ adapter 境界内の
 * `authjs-handler.ts` が担う。このファイルは tenant ごとの設定解決だけに責務を絞る。
 */

import {
  AUTH_NUMERIC_CONTRACT,
  SESSION_COOKIE_ATTRIBUTES,
  SESSION_COOKIE_NAME,
  SHARED_OIDC_PATH_SEGMENT,
  SHARED_OIDC_PROVIDER_ID,
} from '../config.js';
import { resolveTenantOidcConfig } from '../oidc.js';
import type { TenantOidcConnection, TenantOidcConnectionPort } from '../ports.js';

/**
 * 認可要求に付ける検査。
 *
 * 顧客持ち込み方式は 3 つとも Auth.js に任せる。共有方式は `state` だけ外して自前の
 * 署名付き state を使う (理由は `buildOidcProvider` の解説を参照)。
 *
 * 固定長 tuple をやめて配列にした分、`pkce` を落とした設定も型上は作れてしまう。
 * そこは型ではなくテストで固定する (`shared-google-oidc-state-config.test.ts` が両方式の `checks` を実値で検査する) —
 * 「どの方式でも PKCE と nonce は必ず入る」は仕様であって、型の表現力の問題ではない。
 */
export type OidcCheck = 'pkce' | 'state' | 'nonce';

/** テナント 1 件に対応する OIDC provider 設定。 */
export interface OidcProviderConfig {
  /** provider id は全テナント共通。テナントの出し分けは設定の解決時点で終わっている。 */
  readonly id: typeof SHARED_OIDC_PROVIDER_ID;
  readonly name: string;
  readonly type: 'oidc';
  readonly issuer: string;
  readonly clientId: string;
  readonly clientSecret: string;
  /** PKCE と nonce は常に必須。`state` の担い手だけが方式によって変わる。 */
  readonly checks: readonly OidcCheck[];
  readonly authorization: {
    readonly params: {
      readonly scope: 'openid email profile';
      readonly code_challenge_method: 'S256';
      /** 共有方式でのみ載る署名付き tenant state。顧客方式では Auth.js が自前生成する。 */
      readonly state?: string;
      /**
       * Google のアカウント選択画面を特定 Workspace に寄せる**表示ヒント**。
       * 許可ドメインがちょうど 1 件のときだけ載せる。
       * **これは境界ではない** — 要求パラメータは利用者が書き換えられるので、
       * 実際の帰属判定は ID token の `hd` claim 側 (`verifyOidcIdToken`) が行う。
       */
      readonly hd?: string;
    };
  };
}

export interface AuthjsConfig {
  readonly providers: readonly OidcProviderConfig[];
  /**
   * Auth.js を駆動する basePath。これが callback URL (`{basePath}/callback/{id}`) を決める。
   *
   * 顧客方式は `/api/auth/{slug}` (テナントが URL に残る従来形)、
   * 共有方式は `/api/auth/shared` 固定 — Google Cloud Console へ登録する URI を 1 本にするため。
   */
  readonly basePath: string;
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
  /**
   * client_secret の取得。DB 行に載せない設計 (共有方式) と載せる設計 (顧客方式) の
   * 両方をこの 1 関数の裏に隠す — 呼び出し側に mode 分岐を漏らさないため。
   * 実装は `lib/auth/shared-credentials.ts` の `createOidcCredentialResolver`。
   */
  readonly clientSecretFor: (connection: TenantOidcConnection) => Promise<string | null>;
}

export interface BuildOidcProviderOptions {
  /**
   * 共有方式で使う署名付き state。
   * **共有方式では必須** (無ければ provider を組まない)。顧客方式では渡さない。
   */
  readonly sharedState?: string;
}

/**
 * 接続 1 件から provider 設定を作る。組めない場合は null。
 *
 * ## 共有方式で `state` を Auth.js から取り上げる理由
 *
 * 共通 callback には slug が無いので、callback を受けた時点でテナントを知る手掛かりが
 * `state` しか無い。Auth.js が自前生成する state は不透明な乱数で `tid` を運べないため、
 * **署名付き state を `authorization.params.state` に載せ、`checks` からは `state` を外す**。
 * 外さないと Auth.js 側の state と我々の state が二重に載り、片方が上書きされる。
 *
 * 検査が弱くなったわけではない: Auth.js の state は「cookie の値と一致するか」しか見ないが、
 * こちらは HMAC 署名 + 期限 + CSRF binding cookie の 3 点で同じ役割を果たす
 * (`shared-oidc-state.ts`)。`pkce` と `nonce` は cookie ベースで動くので Auth.js に残す。
 */
export function buildOidcProvider(
  connection: TenantOidcConnection,
  clientSecret: string,
  options: BuildOidcProviderOptions = {},
): OidcProviderConfig | null {
  const base = {
    id: SHARED_OIDC_PROVIDER_ID,
    name: connection.displayName,
    type: 'oidc',
    issuer: connection.issuer,
    clientId: connection.clientId,
    clientSecret,
  } as const;

  if (connection.credentialMode === 'shared_google') {
    const state = options.sharedState;
    // state 無しの共有 provider は「callback でテナントを復元できない認可要求」。組ませない
    if (state === undefined || state.length === 0) return null;

    return {
      ...base,
      checks: ['pkce', 'nonce'],
      authorization: {
        params: {
          scope: 'openid email profile',
          code_challenge_method: 'S256',
          state,
          ...hdHintParam(connection),
        },
      },
    };
  }

  return {
    ...base,
    checks: ['pkce', 'state', 'nonce'],
    authorization: {
      params: { scope: 'openid email profile', code_challenge_method: 'S256' },
    },
  };
}

/**
 * `hd` 表示ヒント。許可ドメインが**ちょうど 1 件**のときだけ載せる。
 *
 * Google の `hd` 要求パラメータは単一値しか取らない。複数許可のテナントで先頭だけ載せると、
 * 2 番目以降のドメインの利用者が「選べないアカウント」を見せられて詰まる。
 * 載せないほうが利用者は自分のアカウントを選べる (受理判定は ID token 側で行われる)。
 */
function hdHintParam(connection: TenantOidcConnection): { readonly hd?: string } {
  const domains = connection.allowedWorkspaceDomains;
  const only = domains.length === 1 ? domains[0] : undefined;
  return only === undefined ? {} : { hd: only };
}

/**
 * 解決結果。`connection` を一緒に返すのは、route handler が `tenantId` を必要とするため。
 * (JIT provisioning と session claims はテナント slug ではなく tenantId で行う。)
 * slug から 2 回引き直すと、その 2 回の間にテナント設定が変わる隙間が生まれる。
 */
export interface ResolvedAuthjsConfig {
  readonly connection: TenantOidcConnection;
  readonly config: AuthjsConfig;
}

export interface ResolveAuthjsConfigOptions {
  /** route の設置位置。既定 `/api/auth`。顧客方式の basePath 組立にだけ使う。 */
  readonly basePathPrefix?: string;
  /**
   * 共有方式のときだけ呼ばれ、署名付き state を返す。顧客方式では**呼ばれない**。
   *
   * 文字列ではなく関数で受けるのは、state に焼く `tid` が接続を解決するまで分からないため。
   * 文字列で受ける形にすると、呼び出し側が「接続を引く → state を作る → もう一度引く」に
   * なり、2 回の間にテナント設定が変わる隙間ができる。
   */
  readonly sharedState?: (connection: TenantOidcConnection) => Promise<string>;
}

/**
 * テナント slug から Auth.js 設定を解決する。
 *
 * 解決できないときは **null を返して呼び出し側を落とす**。既定 provider へのフォールバックを置くと、
 * 未登録テナントが別テナントの IdP でログインできる経路になる (AD-5)。
 */
export async function resolveAuthjsConfig(
  deps: AuthjsConfigDeps,
  tenantSlug: string,
  options: ResolveAuthjsConfigOptions = {},
): Promise<AuthjsConfig | null> {
  const resolved = await resolveAuthjsConfigForTenant(deps, tenantSlug, options);
  return resolved === null ? null : resolved.config;
}

/** `resolveAuthjsConfig` と同じ解決を行い、接続情報も併せて返す。 */
export async function resolveAuthjsConfigForTenant(
  deps: AuthjsConfigDeps,
  tenantSlug: string,
  options: ResolveAuthjsConfigOptions = {},
): Promise<ResolvedAuthjsConfig | null> {
  const connection = await resolveTenantOidcConfig(deps.oidcConnections, tenantSlug);
  if (connection === null) return null;

  const clientSecret = await deps.clientSecretFor(connection);
  if (clientSecret === null || clientSecret.length === 0) return null;

  const isShared = connection.credentialMode === 'shared_google';
  const sharedState = isShared && options.sharedState !== undefined ? await options.sharedState(connection) : undefined;

  // exactOptionalPropertyTypes の下では `sharedState: undefined` を渡せない (キーを置かない = 未指定)
  const provider = buildOidcProvider(connection, clientSecret, sharedState === undefined ? {} : { sharedState });
  if (provider === null) return null;

  const prefix = options.basePathPrefix ?? '/api/auth';
  const config: AuthjsConfig = {
    providers: [provider],
    basePath: isShared ? `${prefix}/${SHARED_OIDC_PATH_SEGMENT}` : `${prefix}/${connection.tenantSlug}`,
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

  return { connection, config };
}
