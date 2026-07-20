// 認可 middleware 層の公開 API 入口 (shared-layer registry の owner_package: apps/hub/src/middleware)
// Next.js の実行エントリは src/middleware.ts。ここは判定ロジックの公開面を 1 箇所に集約するためのもの
export {
  PUBLIC_PATH_PREFIXES,
  authorize,
  isPublicPath,
  type AuthzDecision,
  type AuthzInput,
  type DenyReason,
} from './authz.js';

export {
  TENANT_HEADER,
  WORKSPACE_HEADER,
  resolveRequestedScope,
  scopeFromHeaders,
  scopeFromPath,
  type RequestedScope,
  type ScopeResolution,
} from './scope.js';
