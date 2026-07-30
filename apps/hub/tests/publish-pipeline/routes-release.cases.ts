/** publish route の公開・Release・channel 配線。共通 runtime は support/route-context.ts。 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthRuntime } from '../../src/lib/authz/runtime.js';

const runtimeHolder = vi.hoisted(() => ({ current: null as AuthRuntime | null }));

vi.mock('../../src/lib/authz/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/authz/index.js')>();
  return {
    ...actual,
    authRuntime: () => {
      if (runtimeHolder.current === null) throw new Error('テスト用 runtime が未設定です');
      return runtimeHolder.current;
    },
  };
});

import {
  approveRoute,
  auth,
  bodyOf,
  buildRequest,
  buildValidPackage,
  cancelRoute,
  deploymentRoute,
  IDEMPOTENCY_KEY,
  IDEMPOTENCY_REPLAY_HEADER,
  OWNER_ID,
  ownerBearer,
  params,
  projectReleasesRoute,
  promoteRoute,
  publish,
  rollbackRoute,
  sessionCookieFor,
  submitRoute,
  suspendRoute,
  testUser,
} from './support/route-context.js';

beforeEach(() => {
  runtimeHolder.current = auth.runtime;
});

afterEach(() => {
  runtimeHolder.current = null;
});

describe('POST /publish/{id}/submit: 検査へ送る', () => {
  it('green の要求は policy 自動承認で published まで進む', async () => {
    publish.putChannel({ id: 'ch-0001' });
    publish.putRequest({ id: 'req-a', verdict: 'green', payload: { contentHash: 'hash-1', findings: [] } });

    const response = await submitRoute(await buildRequest('POST', '/publish/req-a/submit'), params({ id: 'req-a' }));

    expect(response.status).toBe(200);
    expect(await bodyOf(response)).toMatchObject({ status: 'published', release_id: expect.any(String) });
    expect(publish.channelRows()[0]?.stableReleaseId).toBe(publish.releaseRows()[0]?.id);
  });

  it('本体の無い要求は 422 package_required', async () => {
    publish.putRequest({ id: 'req-a' });

    const response = await submitRoute(await buildRequest('POST', '/publish/req-a/submit'), params({ id: 'req-a' }));

    expect(response.status).toBe(422);
    expect(await bodyOf(response)).toEqual({ error: 'package_required' });
  });

  it('channel が塞がっていれば 409 channel_busy', async () => {
    publish.putRequest({ id: 'req-a', verdict: 'green', payload: { contentHash: 'hash-1', findings: [] } });
    publish.putRequest({ id: 'req-rival', status: 'ready' });

    const response = await submitRoute(await buildRequest('POST', '/publish/req-a/submit'), params({ id: 'req-a' }));

    expect(response.status).toBe(409);
    expect(await bodyOf(response)).toEqual({ error: 'channel_busy' });
  });

  it('本文を持たない route でも冪等鍵は効く', async () => {
    publish.putChannel({ id: 'ch-0001' });
    publish.putRequest({ id: 'req-a', verdict: 'green', payload: { contentHash: 'hash-1', findings: [] } });

    const send = async () =>
      submitRoute(
        await buildRequest('POST', '/publish/req-a/submit', { idempotencyKey: IDEMPOTENCY_KEY }),
        params({ id: 'req-a' }),
      );

    const first = await send();
    const second = await send();

    expect(first.status).toBe(200);
    expect(second.headers.get(IDEMPOTENCY_REPLAY_HEADER)).toBe('true');
    // 再生なので 2 度目の遷移は起きていない
    expect(publish.transitionLog().filter((entry) => entry.to === 'validating')).toHaveLength(1);
  });
});

describe('POST /publish/{id}/approve と /cancel', () => {
  it('承認すると published になり、stable pointer が新しい Release を指す', async () => {
    publish.putChannel({ id: 'ch-0001' });
    publish.putRequest({
      id: 'req-a',
      status: 'ready',
      verdict: 'green',
      payload: { contentHash: 'hash-1', findings: [] },
    });

    const response = await approveRoute(await buildRequest('POST', '/publish/req-a/approve'), params({ id: 'req-a' }));
    const body = await bodyOf(response);

    expect(response.status).toBe(200);
    expect(body.status).toBe('published');
    expect(body.release_id).not.toBeNull();
    expect(publish.channelRows().find((row) => row.id === 'ch-0001')?.stableReleaseId).toBe(body.release_id);
  });

  it('draft の要求は承認できない — 409 illegal_transition', async () => {
    publish.putRequest({ id: 'req-a', payload: { contentHash: 'hash-1', findings: [] } });

    const response = await approveRoute(await buildRequest('POST', '/publish/req-a/approve'), params({ id: 'req-a' }));

    expect(response.status).toBe(409);
    expect(await bodyOf(response)).toEqual({ error: 'illegal_transition' });
  });

  it('取消は draft へ戻す', async () => {
    publish.putRequest({ id: 'req-a', status: 'needs_fix', verdict: 'red' });

    const response = await cancelRoute(
      await buildRequest('POST', '/publish/req-a/cancel', { bearer: await ownerBearer() }),
      params({ id: 'req-a' }),
    );

    expect(response.status).toBe(200);
    expect((await bodyOf(response)).status).toBe('draft');
  });

  it('所有関係を証明できない要求 ID の取消は業務処理へ入る前に拒否する', async () => {
    const response = await cancelRoute(
      await buildRequest('POST', '/publish/req-x/cancel', { bearer: await ownerBearer() }),
      params({ id: 'req-x' }),
    );

    expect(response.status).toBe(403);
    expect(await bodyOf(response)).toEqual({ error: 'insufficient_role' });
  });
});

describe('channel の stable pointer と Release の停止', () => {
  beforeEach(async () => {
    const stored = await publish.ports.packages.store(await buildValidPackage());
    publish.putChannel({ id: 'ch-0001', stableReleaseId: 'rel-old' });
    publish.putRelease({ id: 'rel-old', channelId: 'ch-0001', version: 'v1', packageHash: stored.contentHash });
    publish.putRelease({ id: 'rel-new', channelId: 'ch-0001', version: 'v2', packageHash: stored.contentHash });
  });

  it('promote は pointer を進める', async () => {
    const request = await buildRequest('POST', '/channels/ch-0001/promote', {
      cookie: await sessionCookieFor(testUser(OWNER_ID)),
      json: { release_id: 'rel-new' },
    });
    const response = await promoteRoute(request, params({ id: 'ch-0001' }));

    expect(response.status).toBe(200);
    expect(await bodyOf(response)).toMatchObject({ id: 'ch-0001', stable_release_id: 'rel-new' });
  });

  it('rollback は pointer を戻す (実装は同じで、認可 action と監査だけが違う)', async () => {
    publish.putChannel({ id: 'ch-0001', stableReleaseId: 'rel-new' });

    const request = await buildRequest('POST', '/channels/ch-0001/rollback', {
      cookie: await sessionCookieFor(testUser(OWNER_ID)),
      json: { release_id: 'rel-old' },
    });
    const response = await rollbackRoute(request, params({ id: 'ch-0001' }));

    expect(response.status).toBe(200);
    expect(await bodyOf(response)).toMatchObject({ stable_release_id: 'rel-old' });
    expect(publish.auditEvents().at(-1)?.action).toBe('channel.rollback');
  });

  it('別 channel の Release を stable にはできない — 422', async () => {
    publish.putChannel({ id: 'ch-0002', projectId: 'proj-2' });
    publish.putRelease({ id: 'rel-other', channelId: 'ch-0002', projectId: 'proj-2' });

    const request = await buildRequest('POST', '/channels/ch-0001/promote', {
      cookie: await sessionCookieFor(testUser(OWNER_ID)),
      json: { release_id: 'rel-other' },
    });
    const response = await promoteRoute(request, params({ id: 'ch-0001' }));

    expect(response.status).toBe(422);
    expect(await bodyOf(response)).toEqual({ error: 'release_not_in_channel' });
  });

  it('release_id の無い本文は 400 (strict schema)', async () => {
    const request = await buildRequest('POST', '/channels/ch-0001/promote', {
      cookie: await sessionCookieFor(testUser(OWNER_ID)),
      json: {},
    });
    const response = await promoteRoute(request, params({ id: 'ch-0001' }));

    expect(response.status).toBe(400);
    expect(await bodyOf(response)).toEqual({ error: 'invalid_body' });
  });

  it('現在 stable の Release は停止できない — 先に rollback するのが正しい順序', async () => {
    const request = await buildRequest('POST', '/releases/rel-old/suspend', {
      cookie: await sessionCookieFor(testUser(OWNER_ID)),
    });
    const response = await suspendRoute(request, params({ id: 'rel-old' }));

    expect(response.status).toBe(422);
    expect(await bodyOf(response)).toEqual({ error: 'release_is_stable' });
  });

  it('stable でない Release は停止できる', async () => {
    const request = await buildRequest('POST', '/releases/rel-new/suspend', {
      cookie: await sessionCookieFor(testUser(OWNER_ID)),
    });
    const response = await suspendRoute(request, params({ id: 'rel-new' }));

    expect(response.status).toBe(200);
    expect(await bodyOf(response)).toMatchObject({ id: 'rel-new', status: 'suspended' });
  });
});

describe('project 配下: deployment 登録と Release 一覧', () => {
  beforeEach(() => {
    publish.putChannel({ id: 'ch-0001', projectId: 'proj-1', target: 'web_app' });
    publish.putRelease({ id: 'rel-1', channelId: 'ch-0001', projectId: 'proj-1' });
  });

  it('deploy が失敗していても 201 で登録する — 記録しないと孤児になる', async () => {
    const request = await buildRequest('POST', '/projects/proj-1/deployment', {
      bearer: await ownerBearer(),
      json: {
        channel_id: 'ch-0001',
        release_id: 'rel-1',
        url: 'https://demo.example.com',
        provider: 'cloudflare',
        exit_code: 1,
      },
    });
    const response = await deploymentRoute(request, params({ id: 'proj-1' }));

    expect(response.status).toBe(201);
    expect(await bodyOf(response)).toMatchObject({
      project_id: 'proj-1',
      release_id: 'rel-1',
      orphan_candidate: true,
    });
    // exit_code は応答に出ない列なので、痕跡は監査にだけ残る
    expect(publish.auditEvents().at(-1)?.metadata).toMatchObject({ exit_code: 1 });
  });

  it('URL の形でない値は 400', async () => {
    const request = await buildRequest('POST', '/projects/proj-1/deployment', {
      bearer: await ownerBearer(),
      json: { channel_id: 'ch-0001', release_id: 'rel-1', url: 'not-a-url', provider: 'cloudflare', exit_code: 0 },
    });
    const response = await deploymentRoute(request, params({ id: 'proj-1' }));

    expect(response.status).toBe(400);
    expect(await bodyOf(response)).toEqual({ error: 'invalid_body' });
  });

  it('別 project の channel を指す登録は 422', async () => {
    publish.putProject({ id: 'proj-9', ownerUserId: OWNER_ID });
    const request = await buildRequest('POST', '/projects/proj-9/deployment', {
      bearer: await ownerBearer(),
      json: {
        channel_id: 'ch-0001',
        release_id: 'rel-1',
        url: 'https://demo.example.com',
        provider: 'cloudflare',
        exit_code: 0,
      },
    });
    const response = await deploymentRoute(request, params({ id: 'proj-9' }));

    expect(response.status).toBe(422);
    expect(await bodyOf(response)).toEqual({ error: 'release_not_in_channel' });
  });

  it('Release 一覧は member でも読める (何が配られているかは権限の外)', async () => {
    const request = await buildRequest('GET', '/projects/proj-1/releases', {
      cookie: await sessionCookieFor(testUser(OWNER_ID)),
    });
    const response = await projectReleasesRoute(request, params({ id: 'proj-1' }));
    const body = await bodyOf(response);

    expect(response.status).toBe(200);
    expect((body.items as { id: string }[]).map((item) => item.id)).toEqual(['rel-1']);
    // channel を跨いで集めた結果なので分割しない。契約上必須のキーは null で明示する
    expect(body.next_cursor).toBeNull();
  });
});
