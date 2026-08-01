/**
 * publish pipeline の業務手順 (docs/backend-spec.md §5 / test-design.md T4・T5・T6)。
 *
 * **HTTP を知らない**。Request も Response も受け取らず、結果は `PublishOutcome` で返す。
 * route が薄いのはそのためで、ここに status code を書くと「同じ業務失敗が endpoint ごとに
 * 別の code になる」ずれが生まれる。対応表は `PUBLISH_ERROR_STATUS` 1 枚に閉じてある。
 *
 * 状態を進める箇所は必ず 2 段になっている:
 *   1. `state-machine.ts` の `transition()` で**遷移が許されるか**を判定する (純関数)
 *   2. `ports.requests.transition()` で**現在値が期待どおりか**を CAS で確かめて書く
 * 1 だけだと並行要求が両方通り、2 だけだと表に無い遷移が DB へ入る。両方要る。
 */

import type { PublishRequestState, PublishTarget, PublishVisibility } from '@harness-hub/schemas';

import { PUBLISH_AUDIT_ACTIONS, PUBLISH_AUDIT_ENTITIES } from './audit.js';
import { inspectPackageArchive } from './package-inspection.js';
import type { PublishRequestRecord, PublishScope, ReleaseRecord } from './ports.js';
import {
  publishFail as fail,
  publishOk as ok,
  type PublishOutcome,
  type PublishServiceDeps,
  recordPublishAudit as recordAudit,
} from './service-contract.js';
import { transition as nextState } from './state-machine.js';
import { allowsPublish, blocksPublish, FALLBACK_PUBLISH_VERDICT, inspectionEventFor } from './verdict.js';

export * from './release-service.js';
export {
  PUBLISH_ERROR_STATUS,
  type PublishErrorCode,
  type PublishFailure,
  type PublishOutcome,
  type PublishServiceDeps,
} from './service-contract.js';

/**
 * repository が投げる `ChannelBusyError` の判定。
 *
 * `instanceof` を使えないのは、この class が `@harness-hub/db` の公開入口から出ていないため
 * (subpath 直参照は共通層 detector が落とす)。`name` での判定は弱いが、
 * 「公開されていない型に依存しない」ほうが境界としては正しい。
 * follow-up: `packages/db` の index から `ChannelBusyError` を公開する提案。
 */
function isChannelBusy(error: unknown): boolean {
  return error instanceof Error && error.name === 'ChannelBusyError';
}

export interface CreatePublishRequestInput {
  readonly projectId: string;
  readonly target: PublishTarget;
  readonly visibility: PublishVisibility;
}

/**
 * 公開要求を起こす。channel は project と target から**サーバが決める** (§4.6)。
 * client に channel_id を選ばせると、他 project の channel を指す要求を作れてしまう。
 */
export async function createPublishRequest(
  deps: PublishServiceDeps,
  scope: PublishScope,
  input: CreatePublishRequestInput,
): Promise<PublishOutcome<PublishRequestRecord>> {
  if (scope.workspaceId === undefined) return fail('workspace_required');

  const channel = await deps.ports.channels.ensureForProjectTarget(scope, input.projectId, input.target);
  const record = await deps.ports.requests.create(scope, {
    workspaceId: scope.workspaceId,
    projectId: input.projectId,
    channelId: channel.id,
    requestedBy: scope.actorId,
  });

  // visibility は `publish_requests` に列が無い (AD-1 でスキーマを変更しない) ため監査へ残す。
  // 応答からも読めない値を「受け取ったが捨てた」状態にしないための最低限の痕跡
  await recordAudit(deps, scope, PUBLISH_AUDIT_ACTIONS.request, PUBLISH_AUDIT_ENTITIES.publishRequest, record.id, {
    project_id: input.projectId,
    channel_id: channel.id,
    target: input.target,
    visibility: input.visibility,
  });
  return ok(record);
}

export interface UploadedPackage {
  readonly contentHash: string;
  readonly sizeBytes: number;
}

/**
 * パッケージ本体を受け取り、検査して保管する。
 *
 * **検査はここで行い、結果を要求へ保存する**。submit 時ではなく upload 時なのは、
 * バイト列が存在するのがこの瞬間だけだからで、submit で再検査するには R2 から
 * 読み戻す必要がある (往復ぶんの遅延と費用がかかるうえ、読み戻し失敗という新しい失敗経路が増える)。
 * 代償として「upload 後にルールを更新すると保存済み verdict が古くなる」ずれが残る。
 * follow-up: ルール版数を payload に含めて submit 時に照合する。
 *
 * red のときは**保管しない**。落ちると分かっている物を R2 へ置く理由が無く、
 * 置けば孤児 (どの Release からも参照されない object) が溜まる。
 */
export async function uploadPublishPackage(
  deps: PublishServiceDeps,
  scope: PublishScope,
  requestId: string,
  bytes: Uint8Array,
): Promise<PublishOutcome<UploadedPackage>> {
  const record = await deps.ports.requests.findById(scope, requestId);
  if (record === null) return fail('request_not_found');
  // draft 以外は「作者が編集してよい状態」ではない。検査中や公開済みの要求の中身が
  // 差し替わると、検査した物と公開する物が食い違う
  if (record.status !== 'draft') return fail('illegal_transition');

  const inspection = await inspectPackageArchive(bytes);

  if (blocksPublish(inspection.verdict)) {
    await deps.ports.requests.transition(scope, requestId, {
      from: 'draft',
      to: 'draft',
      verdict: inspection.verdict,
      // contentHash は据え置き。今回の物は保管していないので、直前の合格分があるなら残す
      payload: { contentHash: record.payload.contentHash, findings: inspection.findings },
    });
    await recordAudit(
      deps,
      scope,
      PUBLISH_AUDIT_ACTIONS.packageUpload,
      PUBLISH_AUDIT_ENTITIES.publishRequest,
      requestId,
      { verdict: inspection.verdict, finding_count: inspection.findings.length, stored: false },
    );
    return fail('package_rejected', inspection.findings);
  }

  const stored = await deps.ports.packages.store(bytes);
  // 状態は draft のまま。`to: 'draft'` は状態遷移ではなく「現在値が draft であることを
  // 確かめながら付随列を書く」CAS であり、状態機械には問い合わせない (対応するイベントが無いため)
  await deps.ports.requests.transition(scope, requestId, {
    from: 'draft',
    to: 'draft',
    verdict: inspection.verdict,
    payload: { contentHash: stored.contentHash, findings: inspection.findings },
  });
  await recordAudit(
    deps,
    scope,
    PUBLISH_AUDIT_ACTIONS.packageUpload,
    PUBLISH_AUDIT_ENTITIES.publishRequest,
    requestId,
    {
      verdict: inspection.verdict,
      finding_count: inspection.findings.length,
      content_hash: stored.contentHash,
      size_bytes: stored.sizeBytes,
      stored: true,
    },
  );
  return ok({ contentHash: stored.contentHash, sizeBytes: stored.sizeBytes });
}

/**
 * 検査へ送る。
 *
 * Green は MVP の policy 自動承認により
 * `draft → validating → ready → approved → publishing → published` まで進める。
 * Yellow / Red は `needs_fix` で止める。`ready` で止めて人の approve を待つのは
 * Stage 2 の Approval Pending フローであり、MVP の Green 自動公開契約とは別である。
 *
 * 直列化は 2 段構え (test-design.md T4-A / T4-B):
 *   A. 先読み (`findActiveByChannel`) — 明らかに塞がっていれば書く前に断る
 *   B. partial UNIQUE index — 先読みの直後に割り込まれた場合はここで落ちる (**こちらが正本**)
 * A だけでは競合を防げず、B だけだと無駄な書込が走る。A は最適化、B は保証。
 */
export async function submitPublishRequest(
  deps: PublishServiceDeps,
  scope: PublishScope,
  requestId: string,
): Promise<PublishOutcome<PublishRequestRecord>> {
  const record = await deps.ports.requests.findById(scope, requestId);
  if (record === null) return fail('request_not_found');
  // Red は R2 に保管しないため content hash が無くても、保存済み verdict を状態機械へ流して
  // needs_fix へ差し戻せる。Green (公開可能) や未検査は本体なしで先へ進めない。
  if (record.payload.contentHash === null && (record.verdict === null || allowsPublish(record.verdict))) {
    return fail('package_required');
  }

  const submitted = nextState(record.status, 'submit');
  if (!submitted.ok) return fail('illegal_transition');
  // 表には `ready --submit--> approval_pending` もあるが、これは Stage 2 用の辺である。
  // MVP でここを通すと approval_pending へ入ったあと inspection イベントを受け付けられず
  // (表に無い組) 要求がその状態で固まる。到達不能を**表ではなく入口で**保証する (test-design T1-D)。
  if (submitted.state !== 'validating') return fail('illegal_transition');

  const active = await deps.ports.requests.findActiveByChannel(scope, record.channelId);
  if (active !== null && active.id !== record.id) return fail('channel_busy');

  let validating: PublishRequestRecord | null;
  try {
    validating = await deps.ports.requests.transition(scope, requestId, {
      from: record.status,
      to: submitted.state,
    });
  } catch (error) {
    if (isChannelBusy(error)) return fail('channel_busy');
    throw error;
  }
  if (validating === null) return fail('transition_conflict');

  // verdict は upload 時に確定済み。null は「本体があるのに検査結果が無い」= 起こりえない組合せなので
  // 安全側 (red) へ倒す。ここで検査をやり直さないのは uploadPublishPackage の注記のとおり
  const verdict = validating.verdict ?? FALLBACK_PUBLISH_VERDICT;
  const judged = nextState(validating.status, inspectionEventFor(verdict));
  if (!judged.ok) return fail('illegal_transition');

  const settled = await deps.ports.requests.transition(scope, requestId, {
    from: validating.status,
    to: judged.state,
    verdict,
  });
  if (settled === null) return fail('transition_conflict');

  await recordAudit(deps, scope, PUBLISH_AUDIT_ACTIONS.submit, PUBLISH_AUDIT_ENTITIES.publishRequest, requestId, {
    verdict,
    from: record.status,
    to: settled.status,
  });

  // MVP は Green のみ policy が自動承認する。状態機械の `ready → approved` を飛ばさず、
  // 手動承認と同じ公開処理を再利用することで Release 作成・stable pointer・監査を一経路に保つ。
  if (settled.status === 'ready') return approvePublishRequest(deps, scope, requestId);
  return ok(settled);
}

/** Release に載せる manifest。Release は immutable なので、公開時点の事実をここへ固定する。 */
function manifestFor(record: PublishRequestRecord, contentHash: string): string {
  return JSON.stringify({
    v: 1,
    publish_request_id: record.id,
    content_hash: contentHash,
    verdict: record.verdict,
    finding_count: record.payload.findings.length,
  });
}

/**
 * 承認し、そのまま公開まで進める (approved → publishing → published)。
 *
 * MVP では承認と公開を 1 操作にまとめている。分けると approved のまま放置された要求が
 * channel を占有し続け、他の公開が通らなくなる (直列化の副作用)。
 *
 * 公開の途中で失敗したときは `failed` へ落とす。**stable pointer は触らない** —
 * 何もしないことで旧 stable がそのまま生き残り、利用者から見た配布物は変わらない。
 */
export async function approvePublishRequest(
  deps: PublishServiceDeps,
  scope: PublishScope,
  requestId: string,
): Promise<PublishOutcome<PublishRequestRecord>> {
  const record = await deps.ports.requests.findById(scope, requestId);
  if (record === null) return fail('request_not_found');
  const contentHash = record.payload.contentHash;
  if (contentHash === null) return fail('package_required');

  const approved = nextState(record.status, 'approve');
  if (!approved.ok) return fail('illegal_transition');
  const approvedRecord = await deps.ports.requests.transition(scope, requestId, {
    from: record.status,
    to: approved.state,
  });
  if (approvedRecord === null) return fail('transition_conflict');

  const publishing = nextState(approvedRecord.status, 'start_publishing');
  if (!publishing.ok) return fail('illegal_transition');
  const publishingRecord = await deps.ports.requests.transition(scope, requestId, {
    from: approvedRecord.status,
    to: publishing.state,
  });
  if (publishingRecord === null) return fail('transition_conflict');

  try {
    const { release } = await deps.ports.releases.create(scope, {
      projectId: record.projectId,
      channelId: record.channelId,
      packageHash: contentHash,
      manifestJson: manifestFor(record, contentHash),
      createdBy: scope.actorId,
    });
    await deps.ports.channels.setStableRelease(scope, record.channelId, release.id);

    const succeeded = nextState(publishingRecord.status, 'publish_succeeded');
    if (!succeeded.ok) return fail('illegal_transition');
    const published = await deps.ports.requests.transition(scope, requestId, {
      from: publishingRecord.status,
      to: succeeded.state,
      releaseId: release.id,
    });
    if (published === null) return fail('transition_conflict');

    await recordAudit(deps, scope, PUBLISH_AUDIT_ACTIONS.approve, PUBLISH_AUDIT_ENTITIES.publishRequest, requestId, {
      release_id: release.id,
      version: release.version,
      content_hash: contentHash,
    });
    return ok(published);
  } catch (error) {
    const failedState = nextState(publishingRecord.status, 'publish_failed');
    if (failedState.ok) {
      await deps.ports.requests.transition(scope, requestId, {
        from: publishingRecord.status,
        to: failedState.state,
      });
    }
    throw error;
  }
}

/** 取消。needs_fix / ready / approval_pending / approved から draft へ戻す (publishing 中は不可)。 */
export async function cancelPublishRequest(
  deps: PublishServiceDeps,
  scope: PublishScope,
  requestId: string,
): Promise<PublishOutcome<PublishRequestRecord>> {
  const record = await deps.ports.requests.findById(scope, requestId);
  if (record === null) return fail('request_not_found');

  const cancelled = nextState(record.status, 'cancel');
  if (!cancelled.ok) return fail('illegal_transition');

  const updated = await deps.ports.requests.transition(scope, requestId, {
    from: record.status,
    to: cancelled.state,
  });
  if (updated === null) return fail('transition_conflict');

  await recordAudit(deps, scope, PUBLISH_AUDIT_ACTIONS.cancel, PUBLISH_AUDIT_ENTITIES.publishRequest, requestId, {
    from: record.status,
  });
  return ok(updated);
}

export interface ListPublishRequestsInput {
  readonly projectId?: string | undefined;
  readonly channelId?: string | undefined;
  readonly status?: PublishRequestState | undefined;
  readonly cursor?: string | undefined;
  readonly limit: number;
}

export async function listPublishRequests(
  deps: PublishServiceDeps,
  scope: PublishScope,
  input: ListPublishRequestsInput,
): Promise<readonly PublishRequestRecord[]> {
  return deps.ports.requests.list(scope, input);
}

export async function getPublishRequest(
  deps: PublishServiceDeps,
  scope: PublishScope,
  requestId: string,
): Promise<PublishOutcome<PublishRequestRecord>> {
  const record = await deps.ports.requests.findById(scope, requestId);
  return record === null ? fail('request_not_found') : ok(record);
}

export async function listProjectReleases(
  deps: PublishServiceDeps,
  scope: PublishScope,
  projectId: string,
): Promise<readonly ReleaseRecord[]> {
  return deps.ports.releases.listByProject(scope, projectId);
}
