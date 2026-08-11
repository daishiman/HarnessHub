/**
 * BPB-HTTP-*: builds API (`GET /api/v1/builds`, `GET /api/v1/builds/:id`,
 * `POST /api/v1/builds/:id/stage`) を実際に Request/Response として実行する受入契約
 * (SYS-BUILD-PIPELINE-BOARD-P05 / SEC2 / SEC6 / §5.3 / D4)。
 *
 * 認可判定 (`withAuthz` / `decide`) は本物を通し、`authRuntime()` の port だけを in-memory 実装へ
 * 差し替える。`buildPipelineBoardRuntime()` は実 libSQL (一時ファイル) 上の `BuildStageRepository`
 * へ差し替える (`support/real-db.ts`)。DB をモックすると tenant の WHERE 句注入・CAS・
 * publish 前提の問い合わせが「実行された体」で緑化してしまうため、実装は本物のまま port だけを絞る
 * (feedback-loop の route-handler-execution.test.ts と同じ方針)。
 */

import type { BuildDetailResponse, BuildListResponse, BuildStageTransitionResponse } from '@harness-hub/schemas';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BuildPipelineBoardRuntime } from '../../features/build-pipeline-board/runtime.js';
import type { AuthRuntime } from '../../lib/authz/runtime.js';

const runtimeHolder = vi.hoisted(() => ({ current: null as AuthRuntime | null }));

vi.mock('../../lib/authz/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/authz/index.js')>();
  return {
    ...actual,
    authRuntime: () => {
      if (runtimeHolder.current === null) throw new Error('テスト用 authRuntime が未設定です');
      return runtimeHolder.current;
    },
  };
});

const boardRuntimeHolder = vi.hoisted(() => ({ current: null as BuildPipelineBoardRuntime | null }));

vi.mock('../../features/build-pipeline-board/runtime.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/build-pipeline-board/runtime.js')>();
  return {
    ...actual,
    buildPipelineBoardRuntime: () => {
      if (boardRuntimeHolder.current === null) throw new Error('テスト用 buildPipelineBoardRuntime が未設定です');
      return boardRuntimeHolder.current;
    },
  };
});

import { TENANT_A, TENANT_B, WORKSPACE_A1 } from '../../../tests/auth-tenancy/support/in-memory-ports.js';
import {
  ALLOWED_ORIGIN,
  createTokenRouteHarness,
  sessionCookieFor,
  testUser,
} from '../../../tests/auth-tenancy/support/token-route-runtime.js';
import { GET as getBuild } from '../../app/api/v1/builds/[id]/route.js';
import { POST as postStage } from '../../app/api/v1/builds/[id]/stage/route.js';
import { GET as listBuilds } from '../../app/api/v1/builds/route.js';
import { createBuildPipelineBoardRuntime } from '../../features/build-pipeline-board/runtime.js';
import { noSourceTitles } from '../../features/build-pipeline-board/service.js';
import { TENANT_HEADER, WORKSPACE_HEADER } from '../../middleware-contract.js';
import { type BuildBoardDbHarness, createBuildBoardDbHarness } from './support/real-db.js';

const MEMBER = testUser('user-member');
const ADMIN = testUser('user-admin', { role: 'workspace-admin' });

const BUILD_ID = 'build-01';

let dbHarness: BuildBoardDbHarness;

beforeEach(async () => {
  dbHarness = await createBuildBoardDbHarness();
  boardRuntimeHolder.current = createBuildPipelineBoardRuntime(dbHarness.repository, noSourceTitles);
});

afterEach(() => {
  dbHarness.close();
  runtimeHolder.current = null;
  boardRuntimeHolder.current = null;
});

function harnessWithUsers(): ReturnType<typeof createTokenRouteHarness> {
  const harness = createTokenRouteHarness();
  harness.ports.users.put(MEMBER);
  harness.ports.users.put(ADMIN);
  runtimeHolder.current = harness.runtime;
  return harness;
}

async function headersFor(
  user = MEMBER,
  options: {
    readonly origin?: string | null;
    readonly tenantId?: string | null;
    readonly workspaceId?: string | null;
  } = {},
): Promise<Headers> {
  const headers = new Headers({ cookie: await sessionCookieFor(user) });
  const tenantId = options.tenantId === undefined ? TENANT_A : options.tenantId;
  if (tenantId !== null) headers.set(TENANT_HEADER, tenantId);
  const workspaceId = options.workspaceId === undefined ? WORKSPACE_A1 : options.workspaceId;
  if (workspaceId !== null) headers.set(WORKSPACE_HEADER, workspaceId);
  const origin = options.origin === undefined ? ALLOWED_ORIGIN : options.origin;
  if (origin !== null) headers.set('origin', origin);
  return headers;
}

async function seedDefaultBuild(stage = 'design'): Promise<void> {
  await dbHarness.seedBuild({
    id: BUILD_ID,
    tenantId: TENANT_A,
    workspaceId: WORKSPACE_A1,
    type: 'improvement',
    stage,
  });
}

async function transition(
  body: Record<string, unknown>,
  user = ADMIN,
  buildId = BUILD_ID,
  options: { readonly tenantId?: string | null } = {},
): Promise<Response> {
  const headers = await headersFor(user, options);
  headers.set('content-type', 'application/json');
  return postStage(
    new Request(`https://hub.example.com/api/v1/builds/${buildId}/stage`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: buildId }) },
  );
}

describe('BPB-HTTP: GET /api/v1/builds の一覧', () => {
  beforeEach(() => {
    harnessWithUsers();
  });

  it('BPB-HTTP-001: member session で workspace 内の Build を返し、テナント識別子を wire へ出さない (D4)', async () => {
    await seedDefaultBuild();
    const response = await listBuilds(
      new Request('https://hub.example.com/api/v1/builds?limit=25', { headers: await headersFor() }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as BuildListResponse;
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({ id: BUILD_ID, stage: 'design', type: 'improvement' });
    expect(body.items[0]).not.toHaveProperty('tenant_id');
  });

  it('BPB-HTTP-002: stage クエリで工程を絞り込める', async () => {
    await seedDefaultBuild();
    await dbHarness.seedBuild({
      id: 'build-02',
      tenantId: TENANT_A,
      workspaceId: WORKSPACE_A1,
      type: 'bug',
      stage: 'test',
    });

    const response = await listBuilds(
      new Request('https://hub.example.com/api/v1/builds?stage=test', { headers: await headersFor() }),
    );
    const body = (await response.json()) as BuildListResponse;
    expect(body.items.map((item) => item.id)).toEqual(['build-02']);
  });

  it('BPB-HTTP-003: workspace_id クエリがヘッダーの scope と食い違う要求は 400 (scope の抜け道を作らない)', async () => {
    const response = await listBuilds(
      new Request('https://hub.example.com/api/v1/builds?workspace_id=ws-a2', { headers: await headersFor() }),
    );
    expect(response.status).toBe(400);
  });

  it('BPB-HTTP-004: x-harness-workspace-id が無い要求は 400', async () => {
    const response = await listBuilds(
      new Request('https://hub.example.com/api/v1/builds', {
        headers: await headersFor(MEMBER, { workspaceId: null }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it('BPB-HTTP-005: 未認証 (cookie 無し) は 401', async () => {
    const response = await listBuilds(
      new Request('https://hub.example.com/api/v1/builds', {
        headers: new Headers({ [TENANT_HEADER]: TENANT_A, [WORKSPACE_HEADER]: WORKSPACE_A1 }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it('BPB-HTTP-006: 値域外の stage クエリは 422 (problem+json)', async () => {
    const response = await listBuilds(
      new Request('https://hub.example.com/api/v1/builds?stage=not-a-stage', { headers: await headersFor() }),
    );
    expect(response.status).toBe(422);
  });

  it('BPB-HTTP-007: 存在しない cursor は先頭ページに戻さず 422 を返す', async () => {
    await seedDefaultBuild();
    const response = await listBuilds(
      new Request('https://hub.example.com/api/v1/builds?cursor=missing-build', { headers: await headersFor() }),
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ title: '一覧の続き位置が無効です' });
  });
});

describe('BPB-D4: テナント分離', () => {
  beforeEach(() => {
    harnessWithUsers();
  });

  it('BPB-D4-001: 他テナントを申告した要求は 404 で存在を伏せる (tenant_mismatch)', async () => {
    await seedDefaultBuild();
    const response = await listBuilds(
      new Request('https://hub.example.com/api/v1/builds', {
        headers: await headersFor(MEMBER, { tenantId: TENANT_B }),
      }),
    );
    expect(response.status).toBe(404);
  });

  it('BPB-D4-002: 別テナントの Build は同 id でも詳細を読めない (404)', async () => {
    await dbHarness.seedBuild({
      id: BUILD_ID,
      tenantId: TENANT_B,
      workspaceId: WORKSPACE_A1,
      type: 'improvement',
      stage: 'design',
    });

    const response = await getBuild(
      new Request(`https://hub.example.com/api/v1/builds/${BUILD_ID}`, { headers: await headersFor() }),
      { params: Promise.resolve({ id: BUILD_ID }) },
    );
    expect(response.status).toBe(404);
  });

  it('BPB-D4-003: 他テナントの Build へは工程遷移できない (404 で存在を伏せる)', async () => {
    await dbHarness.seedBuild({
      id: BUILD_ID,
      tenantId: TENANT_B,
      workspaceId: WORKSPACE_A1,
      type: 'improvement',
      stage: 'design',
    });

    const response = await transition({ to_stage: 'build', expected_stage: 'design' }, ADMIN);
    expect(response.status).toBe(404);
  });
});

describe('BPB-HTTP: GET /api/v1/builds/:id の can_manage', () => {
  beforeEach(() => {
    harnessWithUsers();
  });

  it('BPB-HTTP-101: member は can_manage=false、workspace-admin は can_manage=true', async () => {
    await seedDefaultBuild();

    const memberResponse = await getBuild(
      new Request(`https://hub.example.com/api/v1/builds/${BUILD_ID}`, { headers: await headersFor(MEMBER) }),
      { params: Promise.resolve({ id: BUILD_ID }) },
    );
    expect(memberResponse.status).toBe(200);
    expect(((await memberResponse.json()) as BuildDetailResponse).can_manage).toBe(false);

    const adminResponse = await getBuild(
      new Request(`https://hub.example.com/api/v1/builds/${BUILD_ID}`, { headers: await headersFor(ADMIN) }),
      { params: Promise.resolve({ id: BUILD_ID }) },
    );
    expect(((await adminResponse.json()) as BuildDetailResponse).can_manage).toBe(true);
  });

  it('BPB-HTTP-102: 存在しない id は 404', async () => {
    const response = await getBuild(
      new Request('https://hub.example.com/api/v1/builds/missing', { headers: await headersFor() }),
      { params: Promise.resolve({ id: 'missing' }) },
    );
    expect(response.status).toBe(404);
  });

  it('BPB-HTTP-103: Workspace ヘッダーが無い詳細取得は 400 (テナントだけでは範囲が決まらない)', async () => {
    await seedDefaultBuild();
    const response = await getBuild(
      new Request(`https://hub.example.com/api/v1/builds/${BUILD_ID}`, {
        headers: await headersFor(MEMBER, { workspaceId: null }),
      }),
      { params: Promise.resolve({ id: BUILD_ID }) },
    );

    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toContain('problem+json');
  });
});

describe('BPB-SEC2/SEC6: POST /api/v1/builds/:id/stage の admin 限定・隣接遷移・監査', () => {
  beforeEach(() => {
    harnessWithUsers();
  });

  it('BPB-SEC2-001: member (workspace-admin 未満) の工程遷移は 403 で拒否される', async () => {
    await seedDefaultBuild();
    const harness = runtimeHolder.current;
    if (harness === null) throw new Error('runtime not set');
    const recordSpy = vi.spyOn(harness.authz.audit, 'record');

    const response = await transition({ to_stage: 'build', expected_stage: 'design' }, MEMBER);

    expect(response.status).toBe(403);
    expect(recordSpy).not.toHaveBeenCalled();
  });

  it('BPB-SEC6-001: workspace-admin の隣接遷移は 200 で反映され、build.stage_change が 1 件記録される', async () => {
    await seedDefaultBuild();
    const harness = runtimeHolder.current;
    if (harness === null) throw new Error('runtime not set');
    const recordSpy = vi.spyOn(harness.authz.audit, 'record');

    const response = await transition({ to_stage: 'build', expected_stage: 'design', reason: '設計レビュー完了' });

    expect(response.status).toBe(200);
    const body = (await response.json()) as BuildStageTransitionResponse;
    expect(body.build.stage).toBe('build');
    expect(body.event).toMatchObject({ from_stage: 'design', to_stage: 'build', reason: '設計レビュー完了' });

    expect(recordSpy).toHaveBeenCalledTimes(1);
    expect(recordSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'build.stage_change',
        resourceType: 'build',
        resourceId: BUILD_ID,
        metadata: expect.objectContaining({ from_stage: 'design', to_stage: 'build' }),
      }),
    );
  });

  it('BPB-SEC6-002: 工程履歴 (build_stage_events) が詳細応答へ現れる', async () => {
    await seedDefaultBuild();
    await transition({ to_stage: 'build', expected_stage: 'design' });

    const response = await getBuild(
      new Request(`https://hub.example.com/api/v1/builds/${BUILD_ID}`, { headers: await headersFor(ADMIN) }),
      { params: Promise.resolve({ id: BUILD_ID }) },
    );
    const detail = (await response.json()) as BuildDetailResponse;
    expect(detail.stage).toBe('build');
    expect(detail.stage_events).toHaveLength(1);
    expect(detail.stage_events[0]).toMatchObject({ from_stage: 'design', to_stage: 'build' });
  });

  it('BPB-SM-001: 非隣接遷移 (design→publish) は 422 を返し、監査を記録しない', async () => {
    await seedDefaultBuild();
    const harness = runtimeHolder.current;
    if (harness === null) throw new Error('runtime not set');
    const recordSpy = vi.spyOn(harness.authz.audit, 'record');

    const response = await transition({ to_stage: 'publish', expected_stage: 'design' });

    expect(response.status).toBe(422);
    expect(recordSpy).not.toHaveBeenCalled();
  });

  it('BPB-SM-002: 同一工程への遷移 (design→design) も 422 で拒否される', async () => {
    await seedDefaultBuild();
    const response = await transition({ to_stage: 'design', expected_stage: 'design' });
    expect(response.status).toBe(422);
  });

  it('BPB-SM-003: expected_stage が実際とずれていれば 409 (CAS 敗北) で、監査を記録しない', async () => {
    await seedDefaultBuild('design');
    const harness = runtimeHolder.current;
    if (harness === null) throw new Error('runtime not set');
    const recordSpy = vi.spyOn(harness.authz.audit, 'record');

    // 隣接判定は「申告された expected_stage → to_stage」に対して先に行われるため、
    // CAS 敗北を観測するには **隣接する組** を申告したうえで実際の工程とずらす必要がある
    // (test→build は隣接。実際の工程は design なので CAS で落ちる)。
    const response = await transition({ to_stage: 'build', expected_stage: 'test' });

    expect(response.status).toBe(409);
    expect(recordSpy).not.toHaveBeenCalled();
  });

  it('BPB-SM-004: expected_stage を省いた要求は 422 (CAS の期待値は必須)', async () => {
    await seedDefaultBuild();
    const response = await transition({ to_stage: 'build' });
    expect(response.status).toBe(422);
  });

  it('BPB-B4-001: PublishRequest 未接続のまま publish へ進めようとすると 409 で拒否される', async () => {
    await seedDefaultBuild('review');
    const harness = runtimeHolder.current;
    if (harness === null) throw new Error('runtime not set');
    const recordSpy = vi.spyOn(harness.authz.audit, 'record');

    const response = await transition({ to_stage: 'publish', expected_stage: 'review' });

    expect(response.status).toBe(409);
    expect(recordSpy).not.toHaveBeenCalled();
  });

  it('BPB-B4-002: 接続済み PublishRequest が published でなければ publish へ進めない (409)', async () => {
    await dbHarness.seedPublishRequest({
      id: 'pr-pending',
      tenantId: TENANT_A,
      workspaceId: WORKSPACE_A1,
      status: 'pending_review',
    });
    await dbHarness.seedBuild({
      id: BUILD_ID,
      tenantId: TENANT_A,
      workspaceId: WORKSPACE_A1,
      type: 'improvement',
      stage: 'review',
      publishRequestId: 'pr-pending',
    });

    const response = await transition({ to_stage: 'publish', expected_stage: 'review' });
    expect(response.status).toBe(409);
  });

  it('BPB-B4-003: PublishRequest が published なら publish へ進め、監査が記録される', async () => {
    await dbHarness.seedPublishRequest({
      id: 'pr-done',
      tenantId: TENANT_A,
      workspaceId: WORKSPACE_A1,
      status: 'published',
    });
    await dbHarness.seedBuild({
      id: BUILD_ID,
      tenantId: TENANT_A,
      workspaceId: WORKSPACE_A1,
      type: 'improvement',
      stage: 'review',
      publishRequestId: 'pr-done',
    });
    const harness = runtimeHolder.current;
    if (harness === null) throw new Error('runtime not set');
    const recordSpy = vi.spyOn(harness.authz.audit, 'record');

    const response = await transition({ to_stage: 'publish', expected_stage: 'review' });

    expect(response.status).toBe(200);
    expect(((await response.json()) as BuildStageTransitionResponse).build.stage).toBe('publish');
    expect(recordSpy).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ to_stage: 'publish' }) }),
    );
  });

  it('BPB-SEC2-002: Origin 未申告の state-changing 要求は拒否される (untrusted_origin)', async () => {
    await seedDefaultBuild();
    const headers = await headersFor(ADMIN, { origin: null });
    headers.set('content-type', 'application/json');
    const response = await postStage(
      new Request(`https://hub.example.com/api/v1/builds/${BUILD_ID}/stage`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ to_stage: 'build', expected_stage: 'design' }),
      }),
      { params: Promise.resolve({ id: BUILD_ID }) },
    );
    expect(response.ok).toBe(false);
  });

  it('BPB-SEC2-003: workspace 申告が無い遷移要求は 400 (scope を推測して補完しない)', async () => {
    await seedDefaultBuild();
    const headers = await headersFor(ADMIN, { workspaceId: null });
    headers.set('content-type', 'application/json');
    const response = await postStage(
      new Request(`https://hub.example.com/api/v1/builds/${BUILD_ID}/stage`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ to_stage: 'build', expected_stage: 'design' }),
      }),
      { params: Promise.resolve({ id: BUILD_ID }) },
    );
    expect(response.status).toBe(400);
  });

  it('BPB-SM-005: 逆行遷移 (build→design) は隣接なので許可される (差し戻しは通常運用)', async () => {
    await seedDefaultBuild('build');
    const response = await transition({ to_stage: 'design', expected_stage: 'build' });
    expect(response.status).toBe(200);
  });
});
