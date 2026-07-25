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
