// 第 2 consumer 系統による認可 middleware 層 (apps/hub/src/middleware) の利用。
// 認可判定はこの層以外に書かない規約なので、fixture 側でも判定を再実装せず公開 API を呼ぶだけにする。
import {
  type AuthzDecision,
  authorize,
  isPublicPath,
  PUBLIC_PATH_PREFIXES,
  resolveRequestedScope,
  TENANT_HEADER,
  WORKSPACE_HEADER,
} from '../../../src/middleware/index.js';
import type { Principal } from '../../../src/shared/auth/index.js';

export const boundAuthorize = authorize;
export const boundIsPublicPath = isPublicPath;
export const boundResolveRequestedScope = resolveRequestedScope;
export const boundPublicPathPrefixes = PUBLIC_PATH_PREFIXES;

export const samplePrincipal: Principal = {
  subject: 'user-1',
  tenantId: 'tenant-a',
  workspaceIds: ['workspace-1'],
  roles: ['member'],
};

export function scopedHeaders(tenantId: string, workspaceId: string): ReadonlyMap<string, string> {
  return new Map([
    [TENANT_HEADER, tenantId],
    [WORKSPACE_HEADER, workspaceId],
  ]);
}

/** 未認証要求 */
export function decideAnonymous(pathname: string): AuthzDecision {
  return authorize({ pathname, headers: new Map(), principal: null });
}

/** 自テナント・自 Workspace への要求 */
export function decideInScope(pathname: string): AuthzDecision {
  return authorize({
    pathname,
    headers: scopedHeaders('tenant-a', 'workspace-1'),
    principal: samplePrincipal,
  });
}

/** 越境要求 (他テナントのスコープを名乗る) */
export function decideCrossTenant(pathname: string): AuthzDecision {
  return authorize({
    pathname,
    headers: scopedHeaders('tenant-b', 'workspace-1'),
    principal: samplePrincipal,
  });
}
