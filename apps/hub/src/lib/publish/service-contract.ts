import type { PublishFinding } from '@harness-hub/schemas';
import type { AuditLogger } from '../../shared/audit/index.js';

import type { PublishPorts, PublishScope } from './ports.js';

export type PublishErrorCode =
  | 'workspace_required'
  | 'request_not_found'
  | 'channel_not_found'
  | 'release_not_found'
  | 'release_not_in_channel'
  | 'release_is_stable'
  | 'rollback_unavailable'
  | 'package_unavailable'
  | 'package_required'
  | 'package_rejected'
  | 'illegal_transition'
  | 'transition_conflict'
  | 'channel_busy';

/**
 * 業務失敗 → HTTP status の唯一の対応表。
 *
 * 409 が 3 つあるのは偶然ではない。`transition_conflict` / `channel_busy` /
 * `illegal_transition` はどれも「今の状態では受け付けられない」であり、
 * client の正しい反応は同じ (状態を読み直してからやり直す)。
 * 422 は「入力は理解できたが業務上成立しない」に限る。
 */
export const PUBLISH_ERROR_STATUS: Readonly<Record<PublishErrorCode, number>> = {
  workspace_required: 400,
  request_not_found: 404,
  channel_not_found: 404,
  release_not_found: 404,
  release_not_in_channel: 422,
  release_is_stable: 422,
  rollback_unavailable: 409,
  package_unavailable: 422,
  package_required: 422,
  package_rejected: 422,
  illegal_transition: 409,
  transition_conflict: 409,
  channel_busy: 409,
};

export interface PublishFailure {
  readonly ok: false;
  readonly code: PublishErrorCode;
  /** 検査で落ちた場合のみ。利用者が直せるように理由を返す。 */
  readonly findings?: readonly PublishFinding[];
}

export type PublishOutcome<T> = { readonly ok: true; readonly value: T } | PublishFailure;

export interface PublishServiceDeps {
  readonly ports: PublishPorts;
  readonly audit: AuditLogger;
}

export function publishFail(code: PublishErrorCode, findings?: readonly PublishFinding[]): PublishFailure {
  return findings === undefined ? { ok: false, code } : { ok: false, code, findings };
}

export function publishOk<T>(value: T): { readonly ok: true; readonly value: T } {
  return { ok: true, value };
}

export async function recordPublishAudit(
  deps: PublishServiceDeps,
  scope: PublishScope,
  action: string,
  resourceType: string,
  resourceId: string,
  metadata: Readonly<Record<string, string | number | boolean | null>>,
): Promise<void> {
  await deps.audit.record({
    actorSubject: scope.actorId,
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId ?? null,
    action,
    resourceType,
    resourceId,
    metadata,
  });
}
