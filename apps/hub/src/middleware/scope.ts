// 要求された Tenant/Workspace スコープの抽出。path と header の 2 経路を単一の解釈に正規化する

/** 要求スコープ。tenantId が取れない要求は認可層で拒否される */
export interface RequestedScope {
  readonly tenantId: string | null;
  readonly workspaceId: string | null;
}

export type ScopeResolution =
  | { readonly ok: true; readonly scope: RequestedScope }
  /** path と header が食い違うなど、スコープを一意に決められない状態 */
  | { readonly ok: false; readonly reason: 'ambiguous_scope' };

export const TENANT_HEADER = 'x-harness-tenant-id';
export const WORKSPACE_HEADER = 'x-harness-workspace-id';

/** `/t/{tenantId}/w/{workspaceId}/...` 形式の path からスコープを読む */
export function scopeFromPath(pathname: string): RequestedScope {
  const segments = pathname.split('/').filter((segment) => segment.length > 0);
  return {
    tenantId: valueAfter(segments, 't'),
    workspaceId: valueAfter(segments, 'w'),
  };
}

export function scopeFromHeaders(headers: ReadonlyMap<string, string>): RequestedScope {
  return {
    tenantId: nonEmptyOrNull(headers.get(TENANT_HEADER)),
    workspaceId: nonEmptyOrNull(headers.get(WORKSPACE_HEADER)),
  };
}

/**
 * path 由来と header 由来を突き合わせる。
 * 両方あって値が違う場合は「どちらが正か」を推測せず ambiguous として拒否側へ回す。
 */
export function resolveRequestedScope(pathname: string, headers: ReadonlyMap<string, string>): ScopeResolution {
  const fromPath = scopeFromPath(pathname);
  const fromHeader = scopeFromHeaders(headers);

  const tenantId = merge(fromPath.tenantId, fromHeader.tenantId);
  const workspaceId = merge(fromPath.workspaceId, fromHeader.workspaceId);
  if (tenantId === CONFLICT || workspaceId === CONFLICT) {
    return { ok: false, reason: 'ambiguous_scope' };
  }

  return { ok: true, scope: { tenantId, workspaceId } };
}

const CONFLICT = Symbol('conflict');

function merge(a: string | null, b: string | null): string | null | typeof CONFLICT {
  if (a !== null && b !== null && a !== b) return CONFLICT;
  return a ?? b;
}

function valueAfter(segments: readonly string[], marker: string): string | null {
  const index = segments.indexOf(marker);
  if (index < 0) return null;
  return nonEmptyOrNull(segments[index + 1]);
}

function nonEmptyOrNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
