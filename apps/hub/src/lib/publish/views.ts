/**
 * 内部 record → API 応答表現の変換。
 *
 * 変換を route ごとに書かないのは、同じ資源が endpoint によって違う形で出る事故を防ぐため。
 * epoch ミリ秒 → ISO8601 の変換もここに閉じる (列は INTEGER、契約は文字列)。
 *
 * 応答は必ず zod schema を通してから返す。型が合っていても値域は保証されない
 * (例: DB に残った未知の status)。契約に合わない値は**応答として出さず**例外にする —
 * 壊れた JSON を返すより、そこで気付くほうが被害が小さい。
 */

import type { DeploymentReferenceView, PublishRequestView, ReleaseView, TargetChannelView } from '@harness-hub/schemas';
import {
  deploymentReferenceSchema,
  publishRequestSchema,
  releaseSchema,
  targetChannelSchema,
} from '@harness-hub/schemas';

import type { ChannelRecord, DeploymentRecord, PublishRequestRecord, ReleaseRecord } from './ports.js';

/** epoch ミリ秒 → ISO8601。`serverNow()` と単位を揃えている前提 (秒ではない)。 */
function toIso(epochMs: number): string {
  return new Date(epochMs).toISOString();
}

export function toPublishRequestView(record: PublishRequestRecord): PublishRequestView {
  return publishRequestSchema.parse({
    id: record.id,
    project_id: record.projectId,
    channel_id: record.channelId,
    status: record.status,
    verdict: record.verdict,
    findings: record.payload.findings,
    release_id: record.releaseId,
    content_hash: record.payload.contentHash,
    requested_by: record.requestedBy,
    created_at: toIso(record.createdAt),
  });
}

export function toReleaseView(record: ReleaseRecord): ReleaseView {
  return releaseSchema.parse({
    id: record.id,
    project_id: record.projectId,
    channel_id: record.channelId,
    version: record.version,
    package_hash: record.packageHash,
    status: record.status,
    created_by: record.createdBy,
    created_at: toIso(record.createdAt),
  });
}

export function toChannelView(record: ChannelRecord): TargetChannelView {
  return targetChannelSchema.parse({
    id: record.id,
    project_id: record.projectId,
    target: record.target,
    stable_release_id: record.stableReleaseId,
  });
}

export function toDeploymentView(record: DeploymentRecord): DeploymentReferenceView {
  return deploymentReferenceSchema.parse({
    id: record.id,
    project_id: record.projectId,
    channel_id: record.channelId,
    release_id: record.releaseId,
    url: record.url,
    provider: record.provider,
    orphan_candidate: record.orphanCandidate,
    created_at: toIso(record.createdAt),
  });
}

/**
 * 一覧の次ページ鍵。最後の要素の id をそのまま使う (ULID が時系列単調なので順序鍵になる)。
 * 要求件数に満たなければ「次は無い」= null。
 */
export function nextCursorOf(items: readonly { readonly id: string }[], limit: number): string | null {
  if (items.length < limit) return null;
  return items[items.length - 1]?.id ?? null;
}
