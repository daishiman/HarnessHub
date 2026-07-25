/**
 * `/api/auth/*` の実処理 — `@auth/core` の `Auth()` をテナント別設定で駆動する (ADR AD-2 / AD-5)。
 *
 * **Auth.js への依存はこのディレクトリの中だけ**。外へ出るのは
 * `(request: Request) => Promise<Response>` という Web 標準の関数型 1 つで、Auth.js 由来の型は漏らさない
 * (`scripts/check-auth-adapter-boundary.mjs` の T-BND-01 / T-BND-02)。
 *
 * 設計上の要点が 3 つある。
 *
 * 1. **テナントは path で運ぶ**
 *    `basePath` を `/api/auth/{tenant_slug}` にすると、Auth.js が組み立てる callback URL に slug が入る。
 *    IdP へ飛んで戻ってくる間もテナントが URL に残るので、「テナントを cookie へ退避する」追加状態が要らない。
 *    退避状態を持つと、その cookie が落ちた/差し替えられた場合の分岐が増え、テナント混線の面になる。
 *
 * 2. **session cookie は Auth.js 形式ではなく本 feature の `SessionClaims` JWT**
 *    `jwt.encode` / `jwt.decode` を差し替え、`signSessionToken` / `verifySessionToken` へ委譲する。
 *    結果、Auth.js が書く cookie と edge middleware (`createSessionAuthProvider`) が読む cookie が
 *    **同一の値・同一の検証関数**になる。「Auth.js の session」と「独自 claims」を別経路にすると、
 *    どちらかにだけ効く失効・どちらかにだけ通る改竄が生まれる。
 *
 * 3. **Host ヘッダは使わない**
 *    Auth.js の `trustHost: false` は「Host を検証する」ではなく **常に UntrustedHost で落とす** 挙動
 *    (`@auth/core/lib/utils/assert`)。そこで要求 URL の origin を先に正規値へ差し替え、Auth.js には
 *    `trustHost: true` を渡す。差し替え済みなので Auth.js が Host を読む余地は無く、
 *    `AuthjsConfig.trustHost: false` が表す意図 (Host 偽装で callback URL を差し替えられない) は保たれる。
 */

import type { AuthConfig } from '@auth/core';
import { Auth } from '@auth/core';
import type { JWT } from '@auth/core/jwt';
import type { Provider } from '@auth/core/providers';
import type { SessionClaims } from '@harness-hub/schemas';
import { sessionClaimsSchema, tenantSlugSchema } from '@harness-hub/schemas';

import { AUTH_NUMERIC_CONTRACT, SESSION_COOKIE_ATTRIBUTES, SESSION_COOKIE_NAME } from '../config.js';
import type { AuthClock, UserDirectoryPort } from '../ports.js';
import { shouldRefreshSession, signSessionToken, verifySessionToken } from '../session.js';
import { type AuthjsConfigDeps, type ResolvedAuthjsConfig, resolveAuthjsConfigForTenant } from './authjs-config.js';
import { resolveSignIn, type SignInOutcome, sessionClaimsForUser } from './callbacks.js';

/** route handler の型。Auth.js の型を境界の外へ出さないため Web 標準の形だけを公開する。 */
export type AuthRouteHandler = (request: Request) => Promise<Response>;

/** Auth.js の token へ `SessionClaims` を載せるキー。`sub` 等の予約名と衝突しない名前にする。 */
const CLAIMS_KEY = 'harness_hub_claims';

/** `/api/auth` 配下であることの前提。route の実ファイル位置と対応する。 */
const DEFAULT_BASE_PATH_PREFIX = '/api/auth';

export interface AuthjsHandlerDeps {
  /** テナント別 OIDC 設定の解決元 (接続 port と client_secret の取得)。 */
  readonly config: AuthjsConfigDeps;
  readonly users: UserDirectoryPort;
  readonly clock: AuthClock;
  /** session JWT の署名鍵。edge middleware と**同じ鍵**でなければ橋渡しが成立しない。 */
  readonly sessionSecret: string;
  /**
   * この Hub の正規 origin (`https://hub.example.com`)。
   * 要求 URL の origin をこの値へ差し替えてから Auth.js に渡す (上の要点 3)。
   */
  readonly canonicalOrigin: string;
  /** 初回ログインで利用者を作るか。既定 true (テナント設定で閉じられるようにしてある)。 */
  readonly allowJitProvisioning?: boolean;
  /** route の設置位置。既定 `/api/auth`。 */
  readonly basePathPrefix?: string;
}

function jsonError(status: number, error: string, description: string): Response {
  return Response.json({ error, error_description: description }, { status, headers: { 'cache-control': 'no-store' } });
}

/**
 * `/api/auth/{slug}/{action}` の slug を取り出す。
 * **`{action}` まで揃っていることを要求する**のが要点で、`/api/auth/session` のような
 * テナント無し要求を「slug=session」と誤解釈しない。
 */
function tenantSlugFrom(pathname: string, prefix: string): string | null {
  if (!pathname.startsWith(`${prefix}/`)) return null;
  const segments = pathname
    .slice(prefix.length + 1)
    .split('/')
    .filter((segment) => segment.length > 0);
  if (segments.length < 2) return null;
  return segments[0] ?? null;
}

/**
 * 要求 URL の origin を正規値へ差し替えた Request を作る。
 *
 * body を読み直して渡している (stream をそのまま移すと `duplex: 'half'` 指定が必要になり、
 * ランタイム差で落ちる)。Auth.js が扱う POST は form 1 件ぶんなので読み切りで問題ない。
 */
async function pinCanonicalOrigin(request: Request, canonicalOrigin: string): Promise<Request> {
  const requested = new URL(request.url);
  const pinned = new URL(`${requested.pathname}${requested.search}`, canonicalOrigin);
  if (pinned.toString() === request.url) return request;

  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD') {
    return new Request(pinned.toString(), { method, headers: request.headers });
  }
  const body = await request.arrayBuffer();
  return new Request(pinned.toString(), { method, headers: request.headers, body });
}

/** token に載っている `SessionClaims` を取り出す。形が合わなければ null (推測で補完しない)。 */
function readClaims(token: JWT): SessionClaims | null {
  const parsed = sessionClaimsSchema.safeParse(token[CLAIMS_KEY]);
  return parsed.success ? parsed.data : null;
}

function stringField(source: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = source?.[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * 本 feature の抽象 provider 設定を Auth.js の provider へ翻訳する。
 * `checks` は読み取り専用 tuple なので複製する (Auth.js 側は可変配列を要求する)。
 */
function toAuthjsProvider(resolved: ResolvedAuthjsConfig): Provider | null {
  const provider = resolved.config.providers[0];
  if (provider === undefined) return null;
  return {
    id: provider.id,
    name: provider.name,
    type: 'oidc',
    issuer: provider.issuer,
    clientId: provider.clientId,
    clientSecret: provider.clientSecret,
    checks: [...provider.checks],
    authorization: { params: { ...provider.authorization.params } },
  };
}

export function createAuthjsHandler(deps: AuthjsHandlerDeps): AuthRouteHandler {
  const prefix = deps.basePathPrefix ?? DEFAULT_BASE_PATH_PREFIX;
  const allowJitProvisioning = deps.allowJitProvisioning ?? true;

  return async function handle(request: Request): Promise<Response> {
    const requested = new URL(request.url);
    const rawSlug = tenantSlugFrom(requested.pathname, prefix);
    if (rawSlug === null) {
      return jsonError(
        400,
        'tenant_slug_required',
        `認証 endpoint は ${prefix}/{tenant_slug}/{action} の形で呼び出してください。`,
      );
    }
    const slug = tenantSlugSchema.safeParse(rawSlug);
    if (!slug.success) {
      return jsonError(400, 'tenant_slug_invalid', 'テナント slug の形式が不正です。');
    }

    const resolved = await resolveAuthjsConfigForTenant(deps.config, slug.data);
    // 既定 provider へ落とさない。落とすと未登録テナントが他テナントの IdP で入れてしまう (AD-5)
    if (resolved === null) {
      return jsonError(404, 'tenant_oidc_not_configured', 'このテナントの OIDC 接続は解決できません。');
    }
    const provider = toAuthjsProvider(resolved);
    if (provider === null) {
      return jsonError(404, 'tenant_oidc_not_configured', 'このテナントの OIDC provider が空です。');
    }

    const tenantId = resolved.connection.tenantId;

    /**
     * 同一要求内で `signIn` と `jwt` の両方から呼ばれるため、`sub` 単位で 1 回に畳む。
     * 畳まないと同じ要求で 2 回 DB を引き、JIT provisioning が二重に走る余地も生まれる。
     * Map は要求ごとに作る (跨ぐと利用者の状態変化が反映されなくなる)。
     */
    const pending = new Map<string, Promise<SignInOutcome>>();
    const signInOnce = (idpSubject: string, email: string | null): Promise<SignInOutcome> => {
      const cached = pending.get(idpSubject);
      if (cached !== undefined) return cached;
      const outcome = resolveSignIn({ users: deps.users, tenantId, idpSubject, email, allowJitProvisioning });
      pending.set(idpSubject, outcome);
      return outcome;
    };

    const authConfig: AuthConfig = {
      basePath: `${prefix}/${slug.data}`,
      // CSRF token の導出にも使われるため設定必須。session JWT の署名鍵と同一で問題ない
      secret: deps.sessionSecret,
      // origin は pinCanonicalOrigin で差し替え済み。Host ヘッダはここまで届かない
      trustHost: true,
      providers: [provider],
      session: {
        strategy: 'jwt',
        maxAge: resolved.config.session.maxAge,
        updateAge: resolved.config.session.updateAge,
      },
      cookies: {
        sessionToken: {
          name: SESSION_COOKIE_NAME,
          options: {
            httpOnly: SESSION_COOKIE_ATTRIBUTES.httpOnly,
            secure: SESSION_COOKIE_ATTRIBUTES.secure,
            // Auth.js の cookie 直列化は小文字を要求する。値の意味は config.ts の 'Lax' と同じ
            sameSite: 'lax',
            path: SESSION_COOKIE_ATTRIBUTES.path,
            maxAge: SESSION_COOKIE_ATTRIBUTES.maxAgeSeconds,
          },
        },
      },
      pages: { signIn: resolved.config.pages.signIn, error: resolved.config.pages.error },
      jwt: {
        maxAge: AUTH_NUMERIC_CONTRACT.sessionMaxAgeSeconds,
        /**
         * cookie へ書く値を本 feature の session JWT にする。
         * claims が無い token は **署名しない**。ここで例外にすると Auth.js は error ページへ
         * 落ちるだけで cookie を書かないので、拒否側 (fail-closed) に倒れる。
         */
        encode: async ({ token }) => {
          const claims = token === undefined ? null : readClaims(token);
          if (claims === null) {
            throw new Error('session claims が未解決のため session token を発行できません');
          }
          return signSessionToken(claims, deps.sessionSecret);
        },
        /** edge middleware と**同じ** `verifySessionToken` を通す。これが橋渡しの本体。 */
        decode: async ({ token }) => {
          if (token === undefined || token.length === 0) return null;
          const verified = await verifySessionToken(token, deps.sessionSecret, deps.clock.nowSeconds());
          if (!verified.ok) return null;
          return { sub: verified.claims.sub, [CLAIMS_KEY]: verified.claims };
        },
      },
      callbacks: {
        /** IdP 認証が通っても Hub 側で受理しない利用者はここで止める (cookie を書かせない)。 */
        signIn: async ({ profile }) => {
          const idpSubject = stringField(profile, 'sub');
          if (idpSubject === null) return false;
          const outcome = await signInOnce(idpSubject, stringField(profile, 'email'));
          return outcome.ok;
        },

        jwt: async ({ token, profile, trigger }) => {
          const existing = readClaims(token);

          if (existing !== null && trigger !== 'signIn') {
            // updateAge を過ぎるまでは DB を引かない (毎要求で引くと session 検証と同数の読取になる)
            if (!shouldRefreshSession(existing, deps.clock.nowSeconds())) return token;
            const fresh = await deps.users.findById(existing.tenant_id, existing.sub);
            if (fresh === null || fresh.status !== 'active') {
              // 再発行の時点で受理できない利用者。claims を作らず例外にする =
              // 新しい session token は生まれない。即時失効は session_revocations 側 (AD-7)
              throw new Error('session の再発行時点で利用者を受理できません');
            }
            return { ...token, [CLAIMS_KEY]: sessionClaimsForUser(fresh, deps.clock.nowSeconds()) };
          }

          const idpSubject = stringField(profile, 'sub') ?? stringField(token, 'sub');
          if (idpSubject === null) return token;
          const outcome = await signInOnce(idpSubject, stringField(profile, 'email'));
          if (!outcome.ok) return token;
          return {
            ...token,
            // sub は IdP の sub ではなく Hub の user id。claims と一致させる
            sub: outcome.user.id,
            [CLAIMS_KEY]: sessionClaimsForUser(outcome.user, deps.clock.nowSeconds()),
          };
        },

        /**
         * `/session` の応答へ claims を載せる。既定は email/name/image しか返さないため、
         * client が role/所属を知るには明示的に足す必要がある。
         */
        session: async ({ session, token }) => {
          const claims = readClaims(token);
          if (claims === null) return session;
          return Object.assign(session, {
            harnessHub: {
              userId: claims.sub,
              tenantId: claims.tenant_id,
              role: claims.role,
              status: claims.status,
              workspaceIds: claims.workspace_ids,
            },
          });
        },
      },
    };

    return Auth(await pinCanonicalOrigin(request, deps.canonicalOrigin), authConfig);
  };
}
