// 認可 middleware 層の公開 API 入口 (shared-layer registry の owner_package: apps/hub/src/middleware)
// Next.js の実行エントリは src/middleware.ts。ここは判定ロジックの公開面を 1 箇所に集約するためのもの
export {
  type AuthzDecision,
  type AuthzInput,
  authorize,
  type DenyReason,
  isPublicPath,
  PUBLIC_PATH_PREFIXES,
} from './authz.js';

export {
  type RequestedScope,
  resolveRequestedScope,
  type ScopeResolution,
  scopeFromHeaders,
  scopeFromPath,
  TENANT_HEADER,
  WORKSPACE_HEADER,
} from './scope.js';
