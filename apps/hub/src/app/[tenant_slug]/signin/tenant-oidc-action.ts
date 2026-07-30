/**
 * テナント先行確定済みの Auth.js sign-in endpoint を組み立てる。
 *
 * handler の契約は `/api/auth/{tenant_slug}/{action}`。tenant を query に置く旧形式へ
 * 戻ると handler が `signin` を tenant slug と誤認するため、ページから分離して回帰検査する。
 */
export function tenantOidcSigninAction(tenantSlug: string): string {
  return `/api/auth/${encodeURIComponent(tenantSlug)}/signin/tenant-oidc`;
}

/** form POST と同じ tenant basePath の CSRF endpoint。別 slug の cookie/token を混ぜない。 */
export function tenantOidcCsrfAction(tenantSlug: string): string {
  return `/api/auth/${encodeURIComponent(tenantSlug)}/csrf`;
}
