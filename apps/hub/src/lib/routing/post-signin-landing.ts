/**
 * サインイン後の着地先解決。既定着地はこのファイルが単一定数として持つ (画面ごとに散らさない)。
 *
 * 戻り先の検証は文字列の前方一致に頼らない。`URL` パーサーへ固定 origin を base として
 * 渡し、結果の origin が変わっていないかで判定する。`//evil.com` (protocol-relative) や
 * バックスラッシュを使ったホスト解釈トリックは、前方一致チェックだけでは見逃す場合があるため。
 */

export const DEFAULT_POST_SIGNIN_LANDING = '/sheets';

/** 判定用の内部 base origin。実在ホストと衝突しない予約済みドメインを使う (RFC 2606)。 */
const RESOLUTION_BASE_ORIGIN = 'http://post-signin-landing.invalid';

export function resolvePostSigninLanding(returnTo: string | null | undefined): string {
  if (typeof returnTo !== 'string' || returnTo.length === 0) {
    return DEFAULT_POST_SIGNIN_LANDING;
  }
  if (!isSameOriginRelativePath(returnTo)) {
    return DEFAULT_POST_SIGNIN_LANDING;
  }
  return returnTo;
}

function isSameOriginRelativePath(value: string): boolean {
  if (!value.startsWith('/')) return false;

  let parsed: URL;
  try {
    parsed = new URL(value, RESOLUTION_BASE_ORIGIN);
  } catch {
    return false;
  }
  return parsed.origin === RESOLUTION_BASE_ORIGIN;
}
