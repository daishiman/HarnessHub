/**
 * ランディング (`/`) からテナント別サインイン (`/{tenant_slug}/signin`) への橋渡し。
 *
 * URL の組み立てと slug の検証をこの 1 ファイルに閉じる。画面側と route handler が
 * それぞれ独自に文字列を組むと、片方だけ正規化を忘れた版が残り、
 * 「大文字で入力すると 404」のような差が生まれるため。
 */

import { tenantSlugSchema } from '@harness-hub/schemas';

/** ランディングのフォームが GET で叩く受け口。 */
export const SIGNIN_ENTRY_PATH = '/signin';

/** フォームの input 名 = query 名。 */
export const TENANT_QUERY_PARAM = 'tenant';

/** slug の形が不正だったことだけをランディングへ戻すための印。入力値そのものは戻さない。 */
export const TENANT_ERROR_QUERY_PARAM = 'tenant_error';

/**
 * この端末で最後に選んだテナント。次回以降 `/` に直リンクを出すためだけに使う。
 * 認可には一切使わない (使うと cookie の書き換えでテナントを詐称できてしまう)。
 */
export const LAST_TENANT_COOKIE_NAME = 'hh_last_tenant';

/** 記憶の有効期間 (90 日)。認証情報ではないため長めで構わない。 */
export const LAST_TENANT_COOKIE_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

/**
 * 入力を slug として受理できるかを判定する。受理できない値は必ず `null` にする。
 *
 * 前後の空白除去と小文字化まではこちらで吸収する (人が手で打つ値なので、
 * `Harness-Hub` と打っただけで弾くのは事故を増やすだけで安全性には寄与しない)。
 * 一方で文字集合そのものは緩めない — この値は path segment になるため、
 * `..` や `/` を通すと遷移先を作り替えられる。
 */
export function readTenantSlug(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const normalized = raw.trim().toLowerCase();
  const parsed = tenantSlugSchema.safeParse(normalized);
  return parsed.success ? parsed.data : null;
}

/** テナント別サインイン画面の path。 */
export function tenantSigninPath(slug: string): string {
  return `/${slug}/signin`;
}

/** slug が不正だったときにランディングへ戻す path。入力値は載せない。 */
export function signinEntryErrorPath(): string {
  return `/?${TENANT_ERROR_QUERY_PARAM}=1`;
}

export type SigninEntryResolution =
  | { readonly ok: true; readonly slug: string; readonly location: string }
  | { readonly ok: false; readonly location: string };

/** `/signin?tenant=...` の遷移先を決める。 */
export function resolveSigninEntry(raw: string | null | undefined): SigninEntryResolution {
  const slug = readTenantSlug(raw);
  if (slug === null) return { ok: false, location: signinEntryErrorPath() };
  return { ok: true, slug, location: tenantSigninPath(slug) };
}
