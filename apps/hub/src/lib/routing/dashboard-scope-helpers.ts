/**
 * Client / Server 両方可の scope ヘルパー。
 *
 * `next/headers` や session 検証はここへ置かない。client component
 * (docs/[id] 等) が import してもビルドが壊れないよう、純粋関数と型だけを持つ。
 * session からの解決は server-only の `dashboard-scope.ts` を使う。
 */

export interface DashboardScope {
  readonly tenantId: string | null;
  readonly workspaceId: string | null;
}

/**
 * `query.tenant ?? scope.tenantId ?? ''` を各 page.tsx へコピーする代わりにここへ集約する。
 * フォールバック順序 (URL クエリ優先) を変える場合はここ 1 箇所を直せばよい。
 */
export function tenantIdFromQuery(query: { readonly tenant?: string }, scope: DashboardScope): string {
  return query.tenant ?? scope.tenantId ?? '';
}

export function scopeFromQuery(
  query: { readonly tenant?: string; readonly workspace?: string },
  scope: DashboardScope,
): { readonly tenantId: string; readonly workspaceId: string } {
  return {
    tenantId: tenantIdFromQuery(query, scope),
    workspaceId: query.workspace ?? scope.workspaceId ?? '',
  };
}
