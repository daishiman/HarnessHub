/**
 * 認証・認可の数値契約の**単一正本** (ADR AD-9)。
 *
 * 正本の出所: docs/backend-spec.md §3.2 / docs/security-spec.md §2.1-2.2。
 * 実装もテストもここだけを参照する。数値が散ると「仕様書の値」と「コードの値」の一致を検査できなくなる。
 *
 * 注意: テスト側は**この定数を期待値に使わない**。仕様書のリテラル値を書いて突き合わせる。
 * 定数を参照するだけのテストは、定数を書き換えた瞬間に一緒に緑になってしまい値の誤りを検出できない。
 */

/** session cookie 名。`__Host-` 接頭辞は Path=/ かつ Secure かつ Domain 無しを UA 側に強制させる。 */
export const SESSION_COOKIE_NAME = '__Host-harness-hub.session';

/** 秒。可読性のため分・時・日から組み立てる。 */
const SECOND = 1;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export interface AuthNumericContract {
  /** session JWT の有効期間 (秒)。 */
  readonly sessionMaxAgeSeconds: number;
  /** session JWT を再発行して role/status を読み直す間隔 (秒)。 */
  readonly sessionUpdateAgeSeconds: number;
  /** device_code の有効期間 (秒)。 */
  readonly deviceCodeTtlSeconds: number;
  /** device token polling の最小間隔 (秒)。 */
  readonly devicePollIntervalSeconds: number;
  /** `slow_down` を返すたびに polling 間隔へ加算する秒数。 */
  readonly devicePollBackoffSeconds: number;
  /**
   * polling 間隔の上限 (秒)。`slow_down` を何回返しても、強制する間隔はこれを超えない。
   *
   * RFC 8628 §3.5 は加算幅しか定めていないため、上限が無いと間隔は単調増加し
   * `deviceCodeTtlSeconds` を追い越す。そうなると client は次に叩いてよい時刻の前に
   * code が失効し、自分の flow を詰ませる。出所は docs/security-spec.md §2.2
   * (qa-073 の R4-reopen で確定。起点は ADR 実装追補 §10.7)。
   */
  readonly devicePollMaxIntervalSeconds: number;
  /** user_code の桁数。 */
  readonly userCodeLength: number;
  /** user_code の照合失敗をこの回数まで許し、超えたら `denied` へ落とす。 */
  readonly userCodeMaxAttempts: number;
  /** access token の有効期間 (秒)。 */
  readonly accessTokenTtlSeconds: number;
  /** refresh token の有効期間 (秒)。 */
  readonly refreshTokenTtlSeconds: number;
  /** session_revocations 参照結果をキャッシュする秒数。 */
  readonly revocationCacheTtlSeconds: number;
  /**
   * 共通 Google OAuth client 方式で使う署名付き `state` の有効期間 (秒)。
   *
   * 出所は issues/sys-auth-tenancy-shared-google-oidc-20260729.md (受入条件 2)。
   * 「認可を開始してから Google の同意画面を終えて戻ってくるまで」の上限。
   * 長すぎると、盗まれた認可 URL を後から踏ませる窓が広がる。短すぎると
   * アカウント選択・2 段階認証を挟んだ正当な利用者が弾かれる。device_code と同じ 10 分に揃える。
   */
  readonly sharedOidcStateTtlSeconds: number;
}

/**
 * 確定値。
 * `updateAge` 15 分は「role 変更の反映が最大 15 分遅れる」ことの受容と表裏一体で、
 * 即時性が要る失効は `session_revocations` 側で担保する (ADR AD-7)。
 */
export const AUTH_NUMERIC_CONTRACT: AuthNumericContract = {
  sessionMaxAgeSeconds: 8 * HOUR,
  sessionUpdateAgeSeconds: 15 * MINUTE,
  deviceCodeTtlSeconds: 10 * MINUTE,
  devicePollIntervalSeconds: 5 * SECOND,
  devicePollBackoffSeconds: 5 * SECOND,
  devicePollMaxIntervalSeconds: 60 * SECOND,
  userCodeLength: 8,
  userCodeMaxAttempts: 5,
  accessTokenTtlSeconds: 15 * MINUTE,
  refreshTokenTtlSeconds: 90 * DAY,
  revocationCacheTtlSeconds: 60 * SECOND,
  sharedOidcStateTtlSeconds: 10 * MINUTE,
};

export interface SessionCookieAttributes {
  readonly httpOnly: true;
  readonly secure: true;
  readonly sameSite: 'Lax';
  readonly path: '/';
  readonly maxAgeSeconds: number;
}

/**
 * session cookie の属性。
 * `SameSite=Lax` にするのは、OIDC redirect (別サイトからの GET 遷移) で cookie を落とさないため。
 * `Strict` にすると IdP から戻った直後に未ログイン扱いになる。
 * その代わり state-changing 要求では Origin 検査を併用する (下の `isTrustedOrigin`)。
 */
export const SESSION_COOKIE_ATTRIBUTES: SessionCookieAttributes = {
  httpOnly: true,
  secure: true,
  sameSite: 'Lax',
  path: '/',
  maxAgeSeconds: AUTH_NUMERIC_CONTRACT.sessionMaxAgeSeconds,
};

/** `Set-Cookie` ヘッダ値を組み立てる。属性の書き忘れを起こさないため文字列連結はここだけで行う。 */
export function serializeSessionCookie(value: string, attributes: SessionCookieAttributes = SESSION_COOKIE_ATTRIBUTES) {
  const parts = [
    `${SESSION_COOKIE_NAME}=${value}`,
    `Path=${attributes.path}`,
    `Max-Age=${attributes.maxAgeSeconds}`,
    `SameSite=${attributes.sameSite}`,
  ];
  if (attributes.httpOnly) parts.push('HttpOnly');
  if (attributes.secure) parts.push('Secure');
  return parts.join('; ');
}

/** 失効させるための `Set-Cookie`。値を空にし Max-Age=0 で即時削除させる。 */
export function serializeClearedSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly; Secure`;
}

// ---------------------------------------------------------------------------
// 共通 Google OAuth client 方式 (issue-auth-tenancy-shared-google-oidc-20260729)
// ---------------------------------------------------------------------------

/**
 * テナント slug の位置に置く固定セグメント。
 *
 * **テナント slug の予約語**でもある。テナントがこの slug を取ると
 * `/api/auth/shared/...` が共通 callback とテナント経路のどちらにも読めてしまい、
 * そのテナントは他テナントの callback を受け取れる位置に立つ。route 側で明示的に弾く。
 */
export const SHARED_OIDC_PATH_SEGMENT = 'shared';

/** 共通 callback を駆動するときの Auth.js basePath。テナント slug を含まない固定値。 */
export const SHARED_OIDC_BASE_PATH = `/api/auth/${SHARED_OIDC_PATH_SEGMENT}`;

/**
 * provider id。全テナント共通 (テナントの出し分けは設定解決の時点で終わっている)。
 *
 * callback path に現れる値なので config 側に置く。adapter 側のリテラルと二重管理にすると、
 * 片方を変えたときに Google Cloud Console へ登録済みの URI と食い違う。
 */
export const SHARED_OIDC_PROVIDER_ID = 'tenant-oidc';

/**
 * 全テナント共通の callback path。**この 1 本だけ**を Google Cloud Console の
 * 「承認済みのリダイレクト URI」へ登録する。テナントを増やすたびに URI を足す必要が無くなる、
 * というのがこの issue の目的そのもの。
 *
 * 形は Auth.js の規約 `{basePath}/callback/{providerId}` に従う。
 * 逆に言えば **この path を変えると全共有テナントが一斉に落ちる**ので、
 * 変更時は Console 側の登録更新と同時に出す (runbook 参照)。
 */
export const SHARED_OIDC_CALLBACK_PATH = `${SHARED_OIDC_BASE_PATH}/callback/${SHARED_OIDC_PROVIDER_ID}`;

/**
 * CSRF binding cookie 名の接頭辞。実際の名前はテナント slug を後置した
 * `__Host-harness-hub.shared-oidc-csrf.{slug}` になる。
 *
 * テナントごとに別 cookie にするのは、複数テナントへ並行にログインしようとしたとき
 * 片方の binding がもう片方を上書きして無言で失敗するのを避けるため。
 * `__Host-` 接頭辞は Path=/ を強制するので、path でテナントを分ける手は使えない。
 */
export const SHARED_OIDC_CSRF_COOKIE_PREFIX = '__Host-harness-hub.shared-oidc-csrf';

export function sharedOidcCsrfCookieName(tenantSlug: string): string {
  return `${SHARED_OIDC_CSRF_COOKIE_PREFIX}.${tenantSlug}`;
}

/**
 * CSRF binding cookie の `Set-Cookie`。
 *
 * `SameSite=Lax` は必須。`Strict` にすると Google からの redirect (別サイトからの top-level GET) で
 * cookie が送られず、正当な callback が必ず binding 不一致で落ちる。
 * 寿命は state の TTL と同じ — cookie だけが生き残っても照合相手の state が失効しているため意味が無い。
 */
export function serializeSharedOidcCsrfCookie(tenantSlug: string, value: string): string {
  return [
    `${sharedOidcCsrfCookieName(tenantSlug)}=${value}`,
    'Path=/',
    `Max-Age=${AUTH_NUMERIC_CONTRACT.sharedOidcStateTtlSeconds}`,
    'SameSite=Lax',
    'HttpOnly',
    'Secure',
  ].join('; ');
}

/** 使い捨て後に消すための `Set-Cookie`。1 回の認可で 1 回しか使わせない。 */
export function serializeClearedSharedOidcCsrfCookie(tenantSlug: string): string {
  return `${sharedOidcCsrfCookieName(tenantSlug)}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly; Secure`;
}

/** 状態を変える HTTP メソッド。GET/HEAD/OPTIONS は Origin 検査の対象外。 */
export const STATE_CHANGING_METHODS: readonly string[] = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * CSRF 対策の Origin 検査。
 * `origin` が欠落している場合も**拒否**する。「無ければ検査を飛ばす」実装は、
 * 攻撃者が Origin を送らないだけで検査を無効化できてしまう。
 */
export function isTrustedOrigin(method: string, origin: string | null, allowedOrigins: readonly string[]): boolean {
  if (!STATE_CHANGING_METHODS.includes(method.toUpperCase())) return true;
  if (origin === null || origin.length === 0) return false;
  return allowedOrigins.includes(origin);
}
