/**
 * 要求が申告したスコープから資源参照を組み立てる。
 *
 * テナント/Workspace の header 名は共通層 (`src/middleware`) が単一正本を持つ。
 * ここで文字列リテラルを再定義すると、header 名を変えたときに片方だけ直る事故になる。
 */

import { TENANT_HEADER, WORKSPACE_HEADER } from '../../middleware-contract.js';
import type { AuthzResourceRef } from './types.js';

export interface RequestScopedResourceInput {
  readonly type: string;
  readonly id?: string | null;
  /** header 申告より優先する Workspace (body で指定される場合など)。 */
  readonly workspaceId?: string | null;
  readonly ownerUserId?: string | null;
}

/**
 * 要求 header の申告テナントを資源の所属として読む。
 * テナント申告が無い要求は資源を確定できないので null (呼び出し側で 400)。
 *
 * **申告値をそのまま使う**のが要点。ここで principal のテナントに寄せると
 * 越境要求が「自テナントへの要求」に化けて検査をすり抜ける。
 */
export function requestScopedResource(request: Request, input: RequestScopedResourceInput): AuthzResourceRef | null {
  const tenantId = nonEmptyOrNull(request.headers.get(TENANT_HEADER));
  if (tenantId === null) return null;

  const workspaceId =
    input.workspaceId !== undefined ? input.workspaceId : nonEmptyOrNull(request.headers.get(WORKSPACE_HEADER));

  return {
    type: input.type,
    id: input.id ?? null,
    tenantId,
    workspaceId,
    ownerUserId: input.ownerUserId ?? null,
  };
}

function nonEmptyOrNull(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
