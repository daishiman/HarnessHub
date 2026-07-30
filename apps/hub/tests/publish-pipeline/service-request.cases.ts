/** 公開要求の作成・upload・submit と channel 直列化。 */

import { describe, expect, it } from 'vitest';

import { PUBLISH_AUDIT_ACTIONS } from '@/lib/publish/audit';
import { createPublishRequest, submitPublishRequest, uploadPublishPackage } from '@/lib/publish/service';

import { createPublishHarness } from './support/harness';
import { buildTestZip, buildValidPackage } from './support/zip';

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

describe('公開要求の作成', () => {
  it('channel は project と target からサーバが決める', async () => {
    const harness = createPublishHarness();

    const outcome = await createPublishRequest(harness.deps, harness.scope, {
      projectId: 'proj-1',
      target: 'skill',
      visibility: 'workspace',
    });

    expect(outcome.ok).toBe(true);
    const channels = harness.channelRows();
    expect(channels).toHaveLength(1);
    expect(outcome.ok && outcome.value.channelId).toBe(channels[0]?.id);
    expect(outcome.ok && outcome.value.status).toBe('draft');
  });

  it('同じ project + target なら channel を作り直さない', async () => {
    const harness = createPublishHarness();
    const input = { projectId: 'proj-1', target: 'skill' as const, visibility: 'workspace' as const };

    await createPublishRequest(harness.deps, harness.scope, input);
    await createPublishRequest(harness.deps, harness.scope, input);

    expect(harness.channelRows()).toHaveLength(1);
  });

  it('workspace が決まらない scope では作らせない', async () => {
    // workspace が無いまま作ると、どの workspace の成果物か決められない行が残る
    const harness = createPublishHarness({ workspaceId: undefined });

    const outcome = await createPublishRequest(harness.deps, harness.scope, {
      projectId: 'proj-1',
      target: 'skill',
      visibility: 'workspace',
    });

    expect(outcome).toEqual({ ok: false, code: 'workspace_required' });
    expect(harness.requestRows()).toHaveLength(0);
  });

  it('visibility は列が無いので監査へ残す', async () => {
    const harness = createPublishHarness();

    await createPublishRequest(harness.deps, harness.scope, {
      projectId: 'proj-1',
      target: 'skill',
      visibility: 'private',
    });

    const event = harness.auditEvents().find((row) => row.action === PUBLISH_AUDIT_ACTIONS.request);
    expect(event?.metadata).toMatchObject({ visibility: 'private', target: 'skill' });
  });
});

describe('パッケージのアップロード', () => {
  it('検査に通れば保管し、hash と findings を要求へ書く', async () => {
    const harness = createPublishHarness();
    const request = readyToSubmit(harness, {
      id: 'req-a',
      verdict: null,
      payload: { contentHash: null, findings: [] },
    });

    const outcome = await uploadPublishPackage(harness.deps, harness.scope, request.id, await buildValidPackage());

    expect(outcome.ok).toBe(true);
    expect(harness.storedPackages()).toHaveLength(1);
    const stored = harness.requestRows().find((row) => row.id === request.id);
    expect(stored?.verdict).toBe('green');
    expect(stored?.payload.contentHash).toBe(outcome.ok ? outcome.value.contentHash : null);
    // 状態は draft のまま。upload は状態遷移ではない
    expect(stored?.status).toBe('draft');
  });

  it('red のパッケージは保管しない', async () => {
    // 落ちると分かっている物を R2 へ置くと、どの Release からも参照されない孤児が溜まる
    const harness = createPublishHarness();
    const request = readyToSubmit(harness, {
      id: 'req-a',
      verdict: null,
      payload: { contentHash: null, findings: [] },
    });

    const outcome = await uploadPublishPackage(
      harness.deps,
      harness.scope,
      request.id,
      await buildTestZip([{ path: '../escape', content: 'x' }]),
    );

    expect(outcome.ok).toBe(false);
    expect(!outcome.ok && outcome.code).toBe('package_rejected');
    expect(!outcome.ok && (outcome.findings?.length ?? 0)).toBeGreaterThan(0);
    expect(harness.storedPackages()).toHaveLength(0);
  });

  it('red でも直前の合格分の contentHash は消さない', async () => {
    // 消すと「一度通した物」まで失われ、直すまで公開経路が塞がる
    const harness = createPublishHarness();
    const request = readyToSubmit(harness, { id: 'req-a', payload: { contentHash: 'previous', findings: [] } });

    await uploadPublishPackage(
      harness.deps,
      harness.scope,
      request.id,
      await buildTestZip([{ path: '../escape', content: 'x' }]),
    );

    expect(harness.requestRows().find((row) => row.id === request.id)?.payload.contentHash).toBe('previous');
  });

  it('draft 以外の要求へは差し替えられない', async () => {
    // 検査した物と公開する物が食い違うのを防ぐ
    const harness = createPublishHarness();
    const request = readyToSubmit(harness, { id: 'req-a', status: 'ready' });

    const outcome = await uploadPublishPackage(harness.deps, harness.scope, request.id, await buildValidPackage());

    expect(outcome).toEqual({ ok: false, code: 'illegal_transition' });
    expect(harness.storedPackages()).toHaveLength(0);
  });

  it('他テナントの要求は見つからない', async () => {
    const harness = createPublishHarness();
    const request = readyToSubmit(harness, { id: 'req-a' });

    const outcome = await uploadPublishPackage(
      harness.deps,
      harness.otherTenantScope,
      request.id,
      await buildValidPackage(),
    );

    expect(outcome).toEqual({ ok: false, code: 'request_not_found' });
  });
});

describe('submit と直列化 (T4)', () => {
  it('green は policy 自動承認で published まで進み、Release と stable pointer を作る', async () => {
    const harness = createPublishHarness();
    const request = readyToSubmit(harness, { id: 'req-a' });

    const outcome = await submitPublishRequest(harness.deps, harness.scope, request.id);

    expect(outcome.ok && outcome.value.status).toBe('published');
    // 自動公開でも状態機械の中間状態を飛ばさない
    expect(harness.transitionLog().map((row) => `${row.from}>${row.to}`)).toEqual([
      'draft>validating',
      'validating>ready',
      'ready>approved',
      'approved>publishing',
      'publishing>published',
    ]);
    const release = harness.releaseRows()[0];
    expect(release).toBeDefined();
    expect(harness.channelRows()[0]?.stableReleaseId).toBe(release?.id);
  });

  it('yellow は needs_fix へ差し戻す', async () => {
    const harness = createPublishHarness();
    const request = readyToSubmit(harness, { id: 'req-a', verdict: 'yellow' });

    const outcome = await submitPublishRequest(harness.deps, harness.scope, request.id);

    expect(outcome.ok && outcome.value.status).toBe('needs_fix');
  });

  it('red も needs_fix へ差し戻す (MVP では yellow と同じ扱い)', async () => {
    const harness = createPublishHarness();
    // Red の本体は R2 へ保管しないため content hash は無いが、判定結果は状態機械へ流せる。
    const request = readyToSubmit(harness, {
      id: 'req-a',
      verdict: 'red',
      payload: { contentHash: null, findings: [] },
    });

    const outcome = await submitPublishRequest(harness.deps, harness.scope, request.id);

    expect(outcome.ok && outcome.value.status).toBe('needs_fix');
  });

  it('verdict が空なら安全側 (red) に倒す', async () => {
    // 「本体はあるのに検査結果が無い」は起こりえない組合せ。
    // 通す側へ倒すと、検査を経ていない物が ready になる経路ができる
    const harness = createPublishHarness();
    const request = readyToSubmit(harness, { id: 'req-a', verdict: null });

    const outcome = await submitPublishRequest(harness.deps, harness.scope, request.id);

    expect(outcome.ok && outcome.value.status).toBe('needs_fix');
    expect(outcome.ok && outcome.value.verdict).toBe('red');
  });

  it('本体が無い要求は submit できない', async () => {
    const harness = createPublishHarness();
    const request = readyToSubmit(harness, { id: 'req-a', payload: { contentHash: null, findings: [] } });

    const outcome = await submitPublishRequest(harness.deps, harness.scope, request.id);

    expect(outcome).toEqual({ ok: false, code: 'package_required' });
    expect(harness.transitionLog()).toEqual([]);
  });

  it('ready からの submit は入口で断る (T1-D)', async () => {
    // 表には `ready --submit--> approval_pending` があるが Stage 2 用の辺。
    // MVP で通すと approval_pending から先へ進めず要求が固まる
    const harness = createPublishHarness();
    const request = readyToSubmit(harness, { id: 'req-a', status: 'ready' });

    const outcome = await submitPublishRequest(harness.deps, harness.scope, request.id);

    expect(outcome).toEqual({ ok: false, code: 'illegal_transition' });
    expect(harness.requestRows().find((row) => row.id === request.id)?.status).toBe('ready');
    expect(harness.transitionLog()).toEqual([]);
  });

  it('同じ channel に未完了の要求があれば断る (T4-A: 先読み)', async () => {
    const harness = createPublishHarness();
    readyToSubmit(harness, { id: 'req-a', status: 'ready' });
    const second = readyToSubmit(harness, { id: 'req-b' });

    const outcome = await submitPublishRequest(harness.deps, harness.scope, second.id);

    expect(outcome).toEqual({ ok: false, code: 'channel_busy' });
    // 先読みで断ったので 1 度も書いていない
    expect(harness.transitionLog()).toEqual([]);
  });

  it('先読みの直後に割り込まれても UNIQUE 制約で落ちる (T4-B: 正本)', async () => {
    // 先読みは最適化にすぎない。保証しているのは partial UNIQUE index のほう
    const harness = createPublishHarness();
    const request = readyToSubmit(harness, { id: 'req-a' });
    const original = harness.ports.requests.findActiveByChannel;
    // 先読みだけを「空いている」と嘘をつかせ、書込時に競合させる
    harness.putRequest({ id: 'req-rival', status: 'ready' });
    Object.assign(harness.ports.requests, { findActiveByChannel: async () => null });

    const outcome = await submitPublishRequest(harness.deps, harness.scope, request.id);
    Object.assign(harness.ports.requests, { findActiveByChannel: original });

    expect(outcome).toEqual({ ok: false, code: 'channel_busy' });
  });

  it('CAS が不成立なら transition_conflict', async () => {
    // 状態を読んでから書くまでの間に他が進めた場合。競合は異常ではないので例外にしない
    const harness = createPublishHarness();
    const request = readyToSubmit(harness, { id: 'req-a' });
    Object.assign(harness.ports.requests, { transition: async () => null });

    const outcome = await submitPublishRequest(harness.deps, harness.scope, request.id);

    expect(outcome).toEqual({ ok: false, code: 'transition_conflict' });
  });

  it('ChannelBusyError 以外の例外はそのまま投げ直す', async () => {
    // 握り潰すと DB 障害が「channel が混んでいます」として利用者に見え、原因調査が始まらない
    const harness = createPublishHarness();
    const request = readyToSubmit(harness, { id: 'req-a' });
    Object.assign(harness.ports.requests, {
      transition: async () => {
        throw new Error('database is locked');
      },
    });

    await expect(submitPublishRequest(harness.deps, harness.scope, request.id)).rejects.toThrow('database is locked');
  });

  it('自分自身が占有中でも submit を通す', async () => {
    // 先読みが自分の行を拾って自分を塞ぐ事故を防ぐ。
    // ここでは validating (占有状態) から draft へ戻して再 submit する経路は無いので、
    // 「見つかった active が自分」の場合だけ通す形になっているのを確かめる
    const harness = createPublishHarness();
    const request = readyToSubmit(harness, { id: 'req-a' });
    Object.assign(harness.ports.requests, {
      findActiveByChannel: async () => harness.requestRows().find((row) => row.id === request.id) ?? null,
    });

    const outcome = await submitPublishRequest(harness.deps, harness.scope, request.id);

    expect(outcome.ok).toBe(true);
  });
});
