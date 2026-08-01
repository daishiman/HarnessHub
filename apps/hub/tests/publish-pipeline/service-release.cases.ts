/** 承認・Release・stable pointer・deployment・監査。 */

import { describe, expect, it } from 'vitest';

import { PUBLISH_AUDIT_ACTIONS } from '@/lib/publish/audit';
import {
  approvePublishRequest,
  cancelPublishRequest,
  promoteChannel,
  registerDeployment,
  rollbackChannel,
  submitPublishRequest,
  suspendRelease,
  uploadPublishPackage,
} from '@/lib/publish/service';

import { channelBusyError, createPublishHarness } from './support/harness';
import { buildTestZip, buildValidPackage, VALID_MANIFEST } from './support/zip';

/** submit まで進められる要求 (draft + 検査済み) を置く。 */
function readyToSubmit(
  harness: ReturnType<typeof createPublishHarness>,
  overrides: Parameters<ReturnType<typeof createPublishHarness>['putRequest']>[0],
) {
  harness.putChannel({ id: 'ch-0001' });
  return harness.putRequest({
    status: 'draft',
    verdict: 'green',
    payload: { contentHash: 'hash-1', findings: [] },
    ...overrides,
  });
}

describe('承認と公開 (T5)', () => {
  it('approved → publishing → published を経て Release を作る', async () => {
    const harness = createPublishHarness();
    const request = readyToSubmit(harness, { id: 'req-a', status: 'ready' });

    const outcome = await approvePublishRequest(harness.deps, harness.scope, request.id);

    expect(outcome.ok && outcome.value.status).toBe('published');
    expect(harness.transitionLog().map((row) => `${row.from}>${row.to}`)).toEqual([
      'ready>approved',
      'approved>publishing',
      'publishing>published',
    ]);
    const release = harness.releaseRows()[0];
    expect(release?.packageHash).toBe('hash-1');
    expect(outcome.ok && outcome.value.releaseId).toBe(release?.id);
    // stable pointer が新しい Release を指す
    expect(harness.channelRows()[0]?.stableReleaseId).toBe(release?.id);
  });

  it('Release の manifest に公開時点の事実を固定する', async () => {
    // Release は immutable。あとから要求側が変わっても、配布された内容の説明は変わらない
    const harness = createPublishHarness();
    const request = readyToSubmit(harness, { id: 'req-a', status: 'ready' });

    await approvePublishRequest(harness.deps, harness.scope, request.id);

    expect(JSON.parse(harness.releaseRows()[0]?.manifestJson ?? '{}')).toEqual({
      v: 1,
      publish_request_id: request.id,
      content_hash: 'hash-1',
      verdict: 'green',
      finding_count: 0,
    });
  });

  it('公開が途中で失敗したら failed へ落とし、stable pointer は触らない', async () => {
    // 何もしないことで旧 stable が生き残る。差し戻すより「変えない」ほうが安全
    const harness = createPublishHarness();
    const request = readyToSubmit(harness, { id: 'req-a', status: 'ready' });
    harness.putRelease({ id: 'rel-old' });
    // channel の初期化は readyToSubmit の後に置く (先に置くと stable を null へ戻される)。
    // 前提が崩れていると「触らなかった」ではなく「元から null」を見て緑になる
    harness.putChannel({ id: 'ch-0001', stableReleaseId: 'rel-old' });
    expect(harness.channelRows().find((row) => row.id === 'ch-0001')?.stableReleaseId).toBe('rel-old');
    harness.failNextReleaseCreate(new Error('R2 unavailable'));

    await expect(approvePublishRequest(harness.deps, harness.scope, request.id)).rejects.toThrow('R2 unavailable');

    expect(harness.requestRows().find((row) => row.id === request.id)?.status).toBe('failed');
    expect(harness.channelRows().find((row) => row.id === 'ch-0001')?.stableReleaseId).toBe('rel-old');
  });

  it('本体が無い要求は承認できない', async () => {
    const harness = createPublishHarness();
    const request = readyToSubmit(harness, {
      id: 'req-a',
      status: 'ready',
      payload: { contentHash: null, findings: [] },
    });

    const outcome = await approvePublishRequest(harness.deps, harness.scope, request.id);

    expect(outcome).toEqual({ ok: false, code: 'package_required' });
  });

  it('needs_fix の要求は承認できない', async () => {
    const harness = createPublishHarness();
    const request = readyToSubmit(harness, { id: 'req-a', status: 'needs_fix' });

    const outcome = await approvePublishRequest(harness.deps, harness.scope, request.id);

    expect(outcome).toEqual({ ok: false, code: 'illegal_transition' });
    expect(harness.releaseRows()).toHaveLength(0);
  });
});

describe('取消', () => {
  it('needs_fix から draft へ戻せる', async () => {
    const harness = createPublishHarness();
    const request = readyToSubmit(harness, { id: 'req-a', status: 'needs_fix' });

    const outcome = await cancelPublishRequest(harness.deps, harness.scope, request.id);

    expect(outcome.ok && outcome.value.status).toBe('draft');
  });

  it('publishing 中は取り消せない', async () => {
    // 取り消せると、Release を作った直後に「無かったこと」にできてしまう
    const harness = createPublishHarness();
    const request = readyToSubmit(harness, { id: 'req-a', status: 'publishing' });

    const outcome = await cancelPublishRequest(harness.deps, harness.scope, request.id);

    expect(outcome).toEqual({ ok: false, code: 'illegal_transition' });
  });

  it('draft へ戻すと channel の占有が解ける', async () => {
    const harness = createPublishHarness();
    const blocked = readyToSubmit(harness, { id: 'req-a', status: 'ready' });
    const waiting = readyToSubmit(harness, { id: 'req-b' });

    await cancelPublishRequest(harness.deps, harness.scope, blocked.id);
    const outcome = await submitPublishRequest(harness.deps, harness.scope, waiting.id);

    expect(outcome.ok).toBe(true);
  });
});

describe('stable pointer の切替 (promote / rollback)', () => {
  async function withReleases() {
    const harness = createPublishHarness();
    const stored = await harness.ports.packages.store(await buildValidPackage());
    harness.putChannel({ id: 'ch-0001', stableReleaseId: 'rel-1' });
    harness.putRelease({ id: 'rel-1', version: 'v1', packageHash: stored.contentHash });
    harness.putRelease({ id: 'rel-2', version: 'v2', packageHash: stored.contentHash });
    return harness;
  }

  it('promote は stable を差し替える', async () => {
    const harness = await withReleases();

    const outcome = await promoteChannel(harness.deps, harness.scope, 'ch-0001', 'rel-2');

    expect(outcome.ok && outcome.value.stableReleaseId).toBe('rel-2');
  });

  it('rollback は 2 版目以降で旧パッケージを再検査し、監査を残して stable を戻す', async () => {
    const harness = await withReleases();

    await promoteChannel(harness.deps, harness.scope, 'ch-0001', 'rel-2');
    await rollbackChannel(harness.deps, harness.scope, 'ch-0001', 'rel-1');

    expect(harness.channelRows()[0]?.stableReleaseId).toBe('rel-1');
    expect(harness.auditEvents().map((row) => row.action)).toEqual([
      PUBLISH_AUDIT_ACTIONS.promote,
      PUBLISH_AUDIT_ACTIONS.rollback,
    ]);
  });

  it('切替の監査には切替前の値も残す', async () => {
    // 「どこから戻したのか」が無いと、事故のあとに元へ戻せない
    const harness = await withReleases();

    await promoteChannel(harness.deps, harness.scope, 'ch-0001', 'rel-2');

    expect(harness.auditEvents()[0]?.metadata).toMatchObject({
      release_id: 'rel-2',
      previous_release_id: 'rel-1',
      version: 'v2',
    });
  });

  it('他 channel の Release は据えられない', async () => {
    // id を渡せるからといって許すと、購読者へ別 project の成果物が配られる
    const harness = await withReleases();
    harness.putChannel({ id: 'ch-other' });
    harness.putRelease({ id: 'rel-other', channelId: 'ch-other' });

    const outcome = await promoteChannel(harness.deps, harness.scope, 'ch-0001', 'rel-other');

    expect(outcome).toEqual({ ok: false, code: 'release_not_in_channel' });
    expect(harness.channelRows().find((row) => row.id === 'ch-0001')?.stableReleaseId).toBe('rel-1');
  });

  it('存在しない channel / release は 404 相当で断る', async () => {
    const harness = await withReleases();

    expect(await promoteChannel(harness.deps, harness.scope, 'ch-missing', 'rel-1')).toEqual({
      ok: false,
      code: 'channel_not_found',
    });
    expect(await promoteChannel(harness.deps, harness.scope, 'ch-0001', 'rel-missing')).toEqual({
      ok: false,
      code: 'release_not_found',
    });
  });

  it('Release が 1 版しか無い channel では rollback できない', async () => {
    const harness = createPublishHarness();
    const stored = await harness.ports.packages.store(await buildValidPackage());
    harness.putChannel({ id: 'ch-0001', stableReleaseId: null });
    harness.putRelease({ id: 'rel-1', packageHash: stored.contentHash });

    const outcome = await rollbackChannel(harness.deps, harness.scope, 'ch-0001', 'rel-1');

    expect(outcome).toEqual({ ok: false, code: 'rollback_unavailable' });
    expect(harness.channelRows()[0]?.stableReleaseId).toBeNull();
  });

  it('rollback 先が現行検査に通らなければ 422 相当で stable を維持する', async () => {
    const harness = createPublishHarness();
    const rejected = await harness.ports.packages.store(
      await buildTestZip([
        { path: 'plugin.json', content: VALID_MANIFEST },
        { path: '../escape.md', content: 'x' },
      ]),
    );
    const current = await harness.ports.packages.store(await buildValidPackage());
    harness.putChannel({ id: 'ch-0001', stableReleaseId: 'rel-2' });
    harness.putRelease({ id: 'rel-1', version: 'v1', packageHash: rejected.contentHash });
    harness.putRelease({ id: 'rel-2', version: 'v2', packageHash: current.contentHash });

    const outcome = await rollbackChannel(harness.deps, harness.scope, 'ch-0001', 'rel-1');

    expect(outcome.ok).toBe(false);
    expect(!outcome.ok && outcome.code).toBe('package_rejected');
    expect(harness.channelRows()[0]?.stableReleaseId).toBe('rel-2');
    expect(harness.auditEvents()).toHaveLength(0);
  });
});

describe('Release の停止', () => {
  it('stable でない Release は停止できる', async () => {
    const harness = createPublishHarness();
    harness.putChannel({ id: 'ch-0001', stableReleaseId: 'rel-1' });
    harness.putRelease({ id: 'rel-2' });

    const outcome = await suspendRelease(harness.deps, harness.scope, 'rel-2');

    expect(outcome.ok && outcome.value.status).toBe('suspended');
  });

  it('現在の stable は停止できない', async () => {
    // 止めると配布物が「停止済みの Release」を指したままになる。先に rollback するのが正しい順序
    const harness = createPublishHarness();
    harness.putChannel({ id: 'ch-0001', stableReleaseId: 'rel-1' });
    harness.putRelease({ id: 'rel-1' });

    const outcome = await suspendRelease(harness.deps, harness.scope, 'rel-1');

    expect(outcome).toEqual({ ok: false, code: 'release_is_stable' });
    expect(harness.releaseRows()[0]?.status).toBe('available');
  });
});

describe('deployment の登録', () => {
  function withDeployTarget() {
    const harness = createPublishHarness();
    harness.putChannel({ id: 'ch-0001', projectId: 'proj-1' });
    harness.putRelease({ id: 'rel-1', channelId: 'ch-0001', projectId: 'proj-1' });
    return harness;
  }

  const input = {
    projectId: 'proj-1',
    channelId: 'ch-0001',
    releaseId: 'rel-1',
    url: 'https://demo.example.workers.dev',
    provider: 'cloudflare' as const,
    exitCode: 0,
  };

  it('登録すると deployment 行が残る', async () => {
    const harness = withDeployTarget();

    const outcome = await registerDeployment(harness.deps, harness.scope, input);

    expect(outcome.ok).toBe(true);
    expect(harness.deploymentRows()).toHaveLength(1);
  });

  it('失敗した deploy も orphan_candidate として登録し、exit_code を監査へ残す', async () => {
    // 記録しないと、実際には公開されてしまった deployment が Hub から見えない孤児になる
    const harness = withDeployTarget();

    const outcome = await registerDeployment(harness.deps, harness.scope, { ...input, exitCode: 1 });

    expect(outcome.ok).toBe(true);
    expect(harness.deploymentRows()[0]?.orphanCandidate).toBe(true);
    expect(harness.auditEvents()[0]?.metadata).toMatchObject({ exit_code: 1 });
  });

  it('channel の project と一致しない登録は断る', async () => {
    const harness = withDeployTarget();

    const outcome = await registerDeployment(harness.deps, harness.scope, { ...input, projectId: 'proj-other' });

    expect(outcome).toEqual({ ok: false, code: 'release_not_in_channel' });
    expect(harness.deploymentRows()).toHaveLength(0);
  });
});

describe('監査 (T6)', () => {
  it('状態を変える操作はすべて監査へ残る', async () => {
    const harness = createPublishHarness();
    const request = readyToSubmit(harness, { id: 'req-a' });

    await uploadPublishPackage(harness.deps, harness.scope, request.id, await buildValidPackage());
    await submitPublishRequest(harness.deps, harness.scope, request.id);
    await approvePublishRequest(harness.deps, harness.scope, request.id);

    expect(harness.auditEvents().map((row) => row.action)).toEqual([
      PUBLISH_AUDIT_ACTIONS.packageUpload,
      PUBLISH_AUDIT_ACTIONS.submit,
      PUBLISH_AUDIT_ACTIONS.approve,
    ]);
  });

  it('監査には actor と tenant が必ず入る', async () => {
    // 誰がやったか分からない記録は、監査としては存在しないのと同じ
    const harness = createPublishHarness({ tenantId: 'tenant-x', actorId: 'user-9' });
    const request = readyToSubmit(harness, { id: 'req-a', tenantId: 'tenant-x' });

    await submitPublishRequest(harness.deps, harness.scope, request.id);

    expect(harness.auditEvents()[0]).toMatchObject({
      actorSubject: 'user-9',
      tenantId: 'tenant-x',
      workspaceId: 'ws-1',
      resourceType: 'publish_request',
      resourceId: request.id,
    });
  });

  it('拒否されたアップロードも監査へ残す (stored: false)', async () => {
    // 「何も起きなかった」と「拒否された」は別物。後者が残らないと攻撃の痕跡が消える
    const harness = createPublishHarness();
    const request = readyToSubmit(harness, { id: 'req-a' });

    await uploadPublishPackage(
      harness.deps,
      harness.scope,
      request.id,
      await buildTestZip([{ path: '../escape', content: VALID_MANIFEST }]),
    );

    expect(harness.auditEvents()[0]?.metadata).toMatchObject({ verdict: 'red', stored: false });
  });

  it('業務失敗で終わった操作は監査へ残さない', async () => {
    // 「起きなかったこと」を記録すると、監査ログから事実を読めなくなる
    const harness = createPublishHarness();
    readyToSubmit(harness, { id: 'req-a', status: 'ready' });
    const second = readyToSubmit(harness, { id: 'req-b' });

    await submitPublishRequest(harness.deps, harness.scope, second.id);

    expect(harness.auditEvents()).toEqual([]);
  });
});

describe('repository 例外の識別', () => {
  it('name が ChannelBusyError なら channel_busy として扱う', async () => {
    // `@harness-hub/db` の公開入口から class が出ていないため instanceof が使えない。
    // 「公開されていない型に依存しない」ほうが境界としては正しいので name で見る
    const harness = createPublishHarness();
    const request = readyToSubmit(harness, { id: 'req-a' });
    Object.assign(harness.ports.requests, {
      findActiveByChannel: async () => null,
      transition: async () => {
        throw channelBusyError('ch-0001');
      },
    });

    const outcome = await submitPublishRequest(harness.deps, harness.scope, request.id);

    expect(outcome).toEqual({ ok: false, code: 'channel_busy' });
  });
});
