import type { DeploymentProvider } from '@harness-hub/schemas';

import { PUBLISH_AUDIT_ACTIONS, PUBLISH_AUDIT_ENTITIES } from './audit.js';
import { inspectPackageArchive } from './package-inspection.js';
import type { ChannelRecord, DeploymentRecord, PublishScope, ReleaseRecord } from './ports.js';
import {
  type PublishOutcome,
  type PublishServiceDeps,
  publishFail,
  publishOk,
  recordPublishAudit,
} from './service-contract.js';
import { allowsPublish } from './verdict.js';

async function resolveChannelRelease(
  deps: PublishServiceDeps,
  scope: PublishScope,
  channelId: string,
  releaseId: string,
): Promise<PublishOutcome<{ channel: ChannelRecord; release: ReleaseRecord }>> {
  const channel = await deps.ports.channels.findById(scope, channelId);
  if (channel === null) return publishFail('channel_not_found');
  const release = await deps.ports.releases.findById(scope, releaseId);
  if (release === null) return publishFail('release_not_found');
  // 他 channel の Release を stable に据えると、その channel の購読者へ
  // まったく別 project の成果物が配られる。id を渡せるからといって許してはいけない
  if (release.channelId !== channelId) return publishFail('release_not_in_channel');
  return publishOk({ channel, release });
}

/**
 * stable pointer の切替。promote と rollback は**同じ操作**で、違うのは意図と認可 action だけ。
 * 実装を共有しつつ入口を分けているのは、監査ログで両者を区別するため。
 */
async function movePointer(
  deps: PublishServiceDeps,
  scope: PublishScope,
  channelId: string,
  releaseId: string,
  action: string,
): Promise<PublishOutcome<ChannelRecord>> {
  const resolved = await resolveChannelRelease(deps, scope, channelId, releaseId);
  if (!resolved.ok) return resolved;

  const previous = resolved.value.channel.stableReleaseId;
  const channel = await deps.ports.channels.setStableRelease(scope, channelId, releaseId);
  await recordPublishAudit(deps, scope, action, PUBLISH_AUDIT_ENTITIES.channel, channelId, {
    release_id: releaseId,
    previous_release_id: previous,
    version: resolved.value.release.version,
  });
  return publishOk(channel);
}

export async function promoteChannel(
  deps: PublishServiceDeps,
  scope: PublishScope,
  channelId: string,
  releaseId: string,
): Promise<PublishOutcome<ChannelRecord>> {
  return movePointer(deps, scope, channelId, releaseId, PUBLISH_AUDIT_ACTIONS.promote);
}

export async function rollbackChannel(
  deps: PublishServiceDeps,
  scope: PublishScope,
  channelId: string,
  releaseId: string,
): Promise<PublishOutcome<ChannelRecord>> {
  const resolved = await resolveChannelRelease(deps, scope, channelId, releaseId);
  if (!resolved.ok) return resolved;
  if (resolved.value.channel.stableReleaseId === releaseId) return publishFail('release_is_stable');

  // 初回公開だけの channel には「戻す先」が無い。rollback は 2 版目以降に限定する。
  const releases = await deps.ports.releases.listByChannel(scope, channelId);
  if (releases.length < 2) return publishFail('rollback_unavailable');

  // 公開当時の判定を盲信せず、R2 の immutable 本体を現行ルールで再検査する。
  // ルール更新後に危険と判明した旧版へ戻す経路を塞ぐためである。
  const bytes = await deps.ports.packages.load(resolved.value.release.packageHash);
  if (bytes === null) return publishFail('package_unavailable');
  const inspection = await inspectPackageArchive(bytes);
  if (!allowsPublish(inspection.verdict)) return publishFail('package_rejected', inspection.findings);

  const previous = resolved.value.channel.stableReleaseId;
  const channel = await deps.ports.channels.setStableRelease(scope, channelId, releaseId);
  await recordPublishAudit(deps, scope, PUBLISH_AUDIT_ACTIONS.rollback, PUBLISH_AUDIT_ENTITIES.channel, channelId, {
    release_id: releaseId,
    previous_release_id: previous,
    version: resolved.value.release.version,
  });
  return publishOk(channel);
}

/**
 * Release の停止。
 *
 * 現在の stable を停止させようとしたら断る。止めた瞬間に配布物が「停止済みの Release」を
 * 指したままになり、利用者から見て取得できるのか分からない状態になるため。
 * 先に rollback で別 Release へ切り替えるのが正しい順序 (runbook 参照)。
 */
export async function suspendRelease(
  deps: PublishServiceDeps,
  scope: PublishScope,
  releaseId: string,
): Promise<PublishOutcome<ReleaseRecord>> {
  const release = await deps.ports.releases.findById(scope, releaseId);
  if (release === null) return publishFail('release_not_found');

  const channel = await deps.ports.channels.findById(scope, release.channelId);
  if (channel !== null && channel.stableReleaseId === releaseId) return publishFail('release_is_stable');

  const updated = await deps.ports.releases.updateStatus(scope, releaseId, 'suspended');
  await recordPublishAudit(deps, scope, PUBLISH_AUDIT_ACTIONS.suspend, PUBLISH_AUDIT_ENTITIES.release, releaseId, {
    channel_id: release.channelId,
    version: release.version,
  });
  return publishOk(updated);
}

export interface RegisterDeploymentInput {
  readonly projectId: string;
  readonly channelId: string;
  readonly releaseId: string;
  readonly url: string;
  readonly provider: DeploymentProvider;
  /** deploy コマンドの終了コード。0 以外でも登録する (§4.6 の注記)。 */
  readonly exitCode: number;
}

/**
 * web_app の deploy 結果を登録する。
 *
 * **失敗した deploy も登録する**。「失敗したから記録しない」にすると、
 * 実際には公開されてしまった deployment が Hub から見えない孤児になる。
 * exit_code は監査へ残し、突合 job の判断材料にする。
 */
export async function registerDeployment(
  deps: PublishServiceDeps,
  scope: PublishScope,
  input: RegisterDeploymentInput,
): Promise<PublishOutcome<DeploymentRecord>> {
  const resolved = await resolveChannelRelease(deps, scope, input.channelId, input.releaseId);
  if (!resolved.ok) return resolved;
  if (resolved.value.channel.projectId !== input.projectId) return publishFail('release_not_in_channel');

  const record = await deps.ports.deployments.register(scope, {
    projectId: input.projectId,
    channelId: input.channelId,
    releaseId: input.releaseId,
    url: input.url,
    provider: input.provider,
    // deploy command が失敗しても外部側だけ作成済みの可能性があるため、照合対象として残す。
    orphanCandidate: input.exitCode !== 0,
    registeredBy: scope.actorId,
  });

  await recordPublishAudit(
    deps,
    scope,
    PUBLISH_AUDIT_ACTIONS.registerDeployment,
    PUBLISH_AUDIT_ENTITIES.deployment,
    record.id,
    { project_id: input.projectId, release_id: input.releaseId, provider: input.provider, exit_code: input.exitCode },
  );
  return publishOk(record);
}
