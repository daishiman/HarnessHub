/**
 * `/api/auth/*` の実処理 — `@auth/core` の `Auth()` をテナント別設定で駆動する (ADR AD-2 / AD-5)。
 *
 * **Auth.js への依存はこのディレクトリの中だけ**。外へ出るのは
 * `(request: Request) => Promise<Response>` という Web 標準の関数型 1 つで、Auth.js 由来の型は漏らさない
 * (`scripts/check-auth-adapter-boundary.mjs` の T-BND-01 / T-BND-02)。
 *
 * 設計上の要点が 4 つある。
 *
 * 1. **テナントは path で運ぶ (顧客持ち込み client 方式)**
 *    `basePath` を `/api/auth/{tenant_slug}` にすると、Auth.js が組み立てる callback URL に slug が入る。
 *    IdP へ飛んで戻ってくる間もテナントが URL に残るので、「テナントを cookie へ退避する」追加状態が要らない。
 *    退避状態を持つと、その cookie が落ちた/差し替えられた場合の分岐が増え、テナント混線の面になる。
 *
 * 2. **共有 client 方式だけは state で運ぶ** (issue-auth-tenancy-shared-google-oidc-20260729)
 *    Google Cloud Console へ登録する redirect URI を 1 本にするため、callback は
 *    `/api/auth/shared/callback/tenant-oidc` に固定する。URL からテナントが消えるので、
 *    署名付き state (`shared-oidc-state.ts`) が唯一の運び手になる。
 *    **認可の開始はテナント別 path のまま**でよい — Console に登録するのは redirect URI だけだから。
 *    開始要求は Auth.js へ渡す直前に共通 basePath へ書き換える (`rewriteTenantSegment`)。
 *
 * 3. **session cookie は Auth.js 形式ではなく本 feature の `SessionClaims` JWT**
 *    `jwt.encode` / `jwt.decode` を差し替え、`signSessionToken` / `verifySessionToken` へ委譲する。
 *    結果、Auth.js が書く cookie と edge middleware (`createSessionAuthProvider`) が読む cookie が
 *    **同一の値・同一の検証関数**になる。「Auth.js の session」と「独自 claims」を別経路にすると、
 *    どちらかにだけ効く失効・どちらかにだけ通る改竄が生まれる。
 *
 * 4. **Host ヘッダは使わない**
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

import {
  AUTH_NUMERIC_CONTRACT,
  SESSION_COOKIE_ATTRIBUTES,
  SESSION_COOKIE_NAME,
  SHARED_OIDC_PATH_SEGMENT,
  SHARED_OIDC_PROVIDER_ID,
  serializeClearedSharedOidcCsrfCookie,
  serializeSharedOidcCsrfCookie,
} from '../config.js';
import { verifyWorkspaceDomain } from '../oidc.js';
import type { AuthClock, TenantOidcConnection, UserDirectoryPort } from '../ports.js';
import { shouldRefreshSession, signSessionToken, verifySessionToken } from '../session.js';
import { issueSharedOidcState, verifySharedOidcState } from '../shared-oidc-state.js';
import { type AuthjsConfigDeps, type ResolvedAuthjsConfig, resolveAuthjsConfigForTenant } from './authjs-config.js';
import { resolveSignIn, type SignInOutcome, sessionClaimsForUser } from './callbacks.js';

/** route handler の型。Auth.js の型を境界の外へ出さないため Web 標準の形だけを公開する。 */
export type AuthRouteHandler = (request: Request) => Promise<Response>;

/** Auth.js の token へ `SessionClaims` を載せるキー。`sub` 等の予約名と衝突しない名前にする。 */
const CLAIMS_KEY = 'harness_hub_claims';

/** `/api/auth` 配下であることの前提。route の実ファイル位置と対応する。 */
const DEFAULT_BASE_PATH_PREFIX = '/api/auth';

/** 認可開始時に発行した CSRF binding。応答へ cookie として載せるまでの持ち回り。 */
interface SharedCsrfBinding {
  readonly slug: string;
  readonly value: string;
}

export interface AuthjsHandlerDeps {
  /** テナント別 OIDC 設定の解決元 (接続 port と client_secret の取得)。 */
  readonly config: AuthjsConfigDeps;
  readonly users: UserDirectoryPort;
  readonly clock: AuthClock;
  /** session JWT の署名鍵。edge middleware と**同じ鍵**でなければ橋渡しが成立しない。 */
  readonly sessionSecret: string;
  /**
   * この Hub の正規 origin (`https://hub.example.com`)。
   * 要求 URL の origin をこの値へ差し替えてから Auth.js に渡す (上の要点 4)。
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

/** `/api/auth/{slug}/{action}` の `{action}` (第 2 セグメント)。 */
function actionFrom(pathname: string, prefix: string): string | null {
  if (!pathname.startsWith(`${prefix}/`)) return null;
  const segments = pathname
    .slice(prefix.length + 1)
    .split('/')
    .filter((segment) => segment.length > 0);
  return segments[1] ?? null;
}

/**
 * `{prefix}/{slug}/...` の slug 部分を共通セグメントへ差し替える。
 *
 * 共有方式では Auth.js の `basePath` が `{prefix}/shared` になるので、要求 URL の pathname も
 * 揃えないと Auth.js が action を読み取れない (basePath より後ろを action として切り出すため)。
 * テナントは既に解決済みで provider 設定に反映されているので、ここで slug を捨ててよい。
 */
function rewriteTenantSegment(pathname: string, prefix: string, slug: string): string {
  const head = `${prefix}/${slug}`;
  if (!pathname.startsWith(head)) return pathname;
  return `${prefix}/${SHARED_OIDC_PATH_SEGMENT}${pathname.slice(head.length)}`;
}

/**
 * Auth.js へ渡す Request を作る。origin を正規値へ固定し、pathname を差し替える。
 *
 * `Request` 自体を init に使うことで body stream を保つ。ここは未認証で到達できる入口なので、
 * `arrayBuffer()` で全量をメモリへ展開してはならない。
 */
function toAuthjsRequest(request: Request, canonicalOrigin: string, pathname: string): Request {
  const requested = new URL(request.url);
  const pinned = new URL(`${pathname}${requested.search}`, canonicalOrigin);
  if (pinned.toString() === request.url) return request;
  return new Request(pinned.toString(), request);
}

/**
 * 応答へ `Set-Cookie` を 1 本足す。
 *
 * `Headers` を複製してから `append` する。既存ヘッダを上書きする `set` は使わない —
 * Auth.js は同じ応答で PKCE / nonce の cookie を既に載せており、上書きするとそれらが消えて
 * 認可が必ず失敗する。204/304 は body を持てないので null を渡す。
 */
function withAppendedCookie(response: Response, cookie: string): Response {
  const headers = new Headers(response.headers);
  headers.append('set-cookie', cookie);
  const body = response.status === 204 || response.status === 304 ? null : response.body;
  return new Response(body, { status: response.status, statusText: response.statusText, headers });
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
 * `checks` は読み取り専用配列なので複製する (Auth.js 側は可変配列を要求する)。
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
  const sharedCallbackPath = `${prefix}/${SHARED_OIDC_PATH_SEGMENT}/callback/${SHARED_OIDC_PROVIDER_ID}`;

  /**
   * 解決済み設定で Auth.js を駆動する。テナント path 経路と共通 callback 経路で共有する。
   * ここに認可判定は無い — 判定は `resolveAuthjsConfigForTenant` と callbacks 側で終わっている。
   */
  const runAuth = async (request: Request, resolved: ResolvedAuthjsConfig, pathname: string): Promise<Response> => {
    const provider = toAuthjsProvider(resolved);
    if (provider === null) {
      return jsonError(404, 'tenant_oidc_not_configured', 'このテナントの OIDC provider が空です。');
    }

    const tenantId = resolved.connection.tenantId;

    /**
     * 同一要求内で `signIn` と `jwt` の両方から呼ばれるため、`sub` 単位で 1 回に畳む。
     * 畳まないと同じ要求で 2 回 DB を引き、JIT provisioning が二重に走る余地も生まれる。
     * Map は要求ごとに作る (跨ぐと利用者の状態変化が反映されなくなる)。
     *
     * Workspace 帰属 (`hd`) の判定を**この中**に置くのが要点。`signIn` 側にだけ置くと、
     * `jwt` 経路が独自に `resolveSignIn` を呼べてしまい、帰属を確かめない道が 1 本残る。
     * 入口を 1 つに畳んであるので、ここを通らずに利用者が確定することはない。
     */
    const pending = new Map<string, Promise<SignInOutcome>>();
    const signInOnce = (idpSubject: string, email: string | null, hd: string | null): Promise<SignInOutcome> => {
      const cached = pending.get(idpSubject);
      if (cached !== undefined) return cached;

      // 帰属の判定は利用者を作る**前**。順序を逆にすると、拒否するはずの利用者が
      // JIT provisioning で先に作られ、行だけが残る
      const rejection = verifyWorkspaceDomain(hd, resolved.connection);
      const outcome: Promise<SignInOutcome> =
        rejection === null
          ? resolveSignIn({ users: deps.users, tenantId, idpSubject, email, allowJitProvisioning })
          : Promise.resolve({ ok: false, reason: 'workspace_domain_rejected' });
      pending.set(idpSubject, outcome);
      return outcome;
    };

    const authConfig: AuthConfig = {
      // 顧客方式は `{prefix}/{slug}`、共有方式は `{prefix}/shared`。callback URL がこれで決まる
      basePath: resolved.config.basePath,
      // CSRF token の導出にも使われるため設定必須。session JWT の署名鍵と同一で問題ない
      secret: deps.sessionSecret,
      // origin は toAuthjsRequest で差し替え済み。Host ヘッダはここまで届かない
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
          const outcome = await signInOnce(idpSubject, stringField(profile, 'email'), stringField(profile, 'hd'));
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
          const outcome = await signInOnce(idpSubject, stringField(profile, 'email'), stringField(profile, 'hd'));
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

    return Auth(toAuthjsRequest(request, deps.canonicalOrigin, pathname), authConfig);
  };

  /**
   * 共通 callback (`/api/auth/shared/callback/tenant-oidc`)。
   *
   * URL にテナントが無いので、**まず state を検証してテナントを確定する**。
   * 確定してから接続を引き、その接続が本当に共有方式かを確かめる。
   * 「state を信じて DB を引く」順序を逆にすると、署名を確かめる前に攻撃者指定の値で
   * 問い合わせが走る。
   */
  const handleSharedCallback = async (request: Request, requested: URL): Promise<Response> => {
    const state = requested.searchParams.get('state');
    const verified = await verifySharedOidcState({
      state,
      cookieHeader: request.headers.get('cookie'),
      nowSeconds: deps.clock.nowSeconds(),
      secret: deps.sessionSecret,
    });
    if (!verified.ok) {
      // 拒否理由は応答本文へ出さない。state 改竄の試行に対して、
      // どの検査で落ちたか (署名か期限か binding か) を教えると総当たりの手掛かりになる
      return jsonError(400, 'shared_oidc_state_rejected', '認可要求の状態を確認できませんでした。');
    }

    // `verified.ok` の時点で state は非 null (null は `malformed` で既に落ちている)。
    // 型の上ではそこまで辿れないので、空文字へ倒す。空文字なら provider が組めず 404 になるだけで、
    // 検証を迂回した設定が生まれることはない
    const verifiedState = state ?? '';

    const resolved = await resolveAuthjsConfigForTenant(deps.config, verified.claims.slug, {
      basePathPrefix: prefix,
      // callback では認可要求を組み直さないが、共有方式の provider は state 必須なので
      // 検証済みの値をそのまま返す (この設定で認可 URL を作ることはない)
      sharedState: async () => verifiedState,
    });
    if (resolved === null) {
      return jsonError(404, 'tenant_oidc_not_configured', 'このテナントの OIDC 接続は解決できません。');
    }

    // slug の再割り当て (テナント A が手放した slug をテナント B が取得) の窓を塞ぐ。
    // state は tid と slug の両方を運んでいるので、両者が同じテナントを指すことを要求する
    if (resolved.connection.tenantId !== verified.claims.tid) {
      return jsonError(400, 'shared_oidc_state_rejected', '認可要求の状態を確認できませんでした。');
    }

    // 顧客方式のテナントへ共通 callback を向けない。向けられると、そのテナントの認可が
    // 共有 client の callback を経由することになり、方式の境界が崩れる
    if (resolved.connection.credentialMode !== 'shared_google') {
      return jsonError(404, 'tenant_oidc_not_configured', 'このテナントは共通 callback を使いません。');
    }

    const response = await runAuth(request, resolved, requested.pathname);
    // binding は 1 回の認可で使い切る。残すと同じ cookie で別の state を通せる窓が残る
    return withAppendedCookie(response, serializeClearedSharedOidcCsrfCookie(verified.claims.slug));
  };

  return async function handle(request: Request): Promise<Response> {
    const requested = new URL(request.url);

    // 共通 callback の判定を先に置く。後にすると slug='shared' として解釈されてしまう
    if (requested.pathname === sharedCallbackPath) {
      return handleSharedCallback(request, requested);
    }

    const rawSlug = tenantSlugFrom(requested.pathname, prefix);
    if (rawSlug === null) {
      return jsonError(
        400,
        'tenant_slug_required',
        `認証 endpoint は ${prefix}/{tenant_slug}/{action} の形で呼び出してください。`,
      );
    }
    // 予約セグメント。テナントがこの slug を取ると共通 callback と経路が重なる
    if (rawSlug === SHARED_OIDC_PATH_SEGMENT) {
      return jsonError(400, 'tenant_slug_reserved', `"${SHARED_OIDC_PATH_SEGMENT}" は予約された slug です。`);
    }
    const slug = tenantSlugSchema.safeParse(rawSlug);
    if (!slug.success) {
      return jsonError(400, 'tenant_slug_invalid', 'テナント slug の形式が不正です。');
    }

    /**
     * 共有方式なら認可開始時に state と binding を発行する。
     * `resolveAuthjsConfigForTenant` が接続を解決した直後に呼ぶので、テナントを 2 回引かずに済む。
     * 顧客方式ではこの callback 自体が呼ばれない (= binding cookie も発行されない)。
     *
     * 可変ボックスにしてあるのは型推論の都合。`let` + closure 内代入だと、
     * TypeScript の制御フロー解析が代入を追えず後段で `never` に潰れる。
     */
    const issued: { binding: SharedCsrfBinding | null } = { binding: null };
    const resolved = await resolveAuthjsConfigForTenant(deps.config, slug.data, {
      basePathPrefix: prefix,
      sharedState: async (connection: TenantOidcConnection) => {
        const state = await issueSharedOidcState({
          tenantId: connection.tenantId,
          tenantSlug: connection.tenantSlug,
          nowSeconds: deps.clock.nowSeconds(),
          secret: deps.sessionSecret,
        });
        issued.binding = { slug: connection.tenantSlug, value: state.csrfBinding };
        return state.state;
      },
    });
    // 既定 provider へ落とさない。落とすと未登録テナントが他テナントの IdP で入れてしまう (AD-5)
    if (resolved === null) {
      return jsonError(404, 'tenant_oidc_not_configured', 'このテナントの OIDC 接続は解決できません。');
    }

    const isShared = resolved.connection.credentialMode === 'shared_google';

    // 共有方式の callback は共通 path でしか受けない。テナント path 側にも口を開けると、
    // 「state 検証を通らない callback 経路」が 1 本増える
    if (isShared && actionFrom(requested.pathname, prefix) === 'callback') {
      return jsonError(404, 'shared_oidc_callback_path', '共通 client 方式の callback は共通 path で受けます。');
    }

    // 共有方式は Auth.js の basePath が `{prefix}/shared` なので pathname も揃える
    const pathname = isShared ? rewriteTenantSegment(requested.pathname, prefix, slug.data) : requested.pathname;
    const response = await runAuth(request, resolved, pathname);

    // state と binding は対で 1 つの応答に載せる。片方だけ返すと double submit が成立しない
    const binding = issued.binding;
    if (binding === null) return response;
    return withAppendedCookie(response, serializeSharedOidcCsrfCookie(binding.slug, binding.value));
  };
}
