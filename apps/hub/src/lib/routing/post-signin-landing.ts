/**
 * サインイン成功後の遷移先解決。(spec: harness-hub-post-signin-workspace-scope-addendum §B)
 * `/` は非業務のステータス画面のため、既定着地は業務画面 (`/sheets`) に固定する。
 */

export const DEFAULT_LANDING_PATH = '/sheets';

/**
 * 相対 path だけを許可する。絶対URL・スキーム付き・protocol-relative (`//`)・
 * ブラウザが `/\` を `//` と同一視する正規化トリックは外部遷移につながるため弾く。
 */
export function isSafeRelativePath(value: string): boolean {
  if (!value.startsWith('/')) return false;
  if (value.startsWith('//')) return false;
  if (value.startsWith('/\\')) return false;
  return true;
}

/** 戻り先候補が安全な相対 path でなければ既定着地へ落とす。 */
export function resolvePostSigninLanding(returnTo: string | null | undefined): string {
  if (typeof returnTo === 'string' && isSafeRelativePath(returnTo)) return returnTo;
  return DEFAULT_LANDING_PATH;
}
