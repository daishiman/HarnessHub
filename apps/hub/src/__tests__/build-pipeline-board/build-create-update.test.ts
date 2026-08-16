/**
 * BPB-MUT-*: `POST /api/v1/builds` (手動復旧の起票) と `PATCH /api/v1/builds/:id` (カード編集) の
 * 受入契約 (SYS-BUILD-PIPELINE-BOARD-P05 / docs/backend-spec-api-state.md §4.4 / SEC2 / SEC6)。
 *
 * stage-transition-admin-audit.test.ts と同じ方針で、認可判定 (`withAuthz` / `decide`) は本物を通し、
 * DB も実 libSQL (一時ファイル) を使う。二重起票の防止は route の事前検査ではなく
 * DB の一意制約に置いてあるため、DB をモックすると「守ったつもり」で緑化してしまう。
 */

import type { BuildDetailResponse } from '@harness-hub/schemas';
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
import { PATCH as patchBuild } from '../../app/api/v1/builds/[id]/route.js';
import { POST as createBuild } from '../../app/api/v1/builds/route.js';
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

/** 監査 spy を張る先。route は `authRuntime()` 越しに台帳を触るので、harness ではなく差し替えた runtime を見る。 */
function currentRuntime(): AuthRuntime {
  if (runtimeHolder.current === null) throw new Error('テスト用 authRuntime が未設定です');
  return runtimeHolder.current;
}

async function headersFor(
  user = ADMIN,
  options: { readonly tenantId?: string | null; readonly workspaceId?: string | null } = {},
): Promise<Headers> {
  const headers = new Headers({ cookie: await sessionCookieFor(user), 'content-type': 'application/json' });
  const tenantId = options.tenantId === undefined ? TENANT_A : options.tenantId;
  if (tenantId !== null) headers.set(TENANT_HEADER, tenantId);
  const workspaceId = options.workspaceId === undefined ? WORKSPACE_A1 : options.workspaceId;
  if (workspaceId !== null) headers.set(WORKSPACE_HEADER, workspaceId);
  headers.set('origin', ALLOWED_ORIGIN);
  return headers;
}

async function postBuild(
  body: Record<string, unknown>,
  user = ADMIN,
  options: { readonly tenantId?: string | null; readonly workspaceId?: string | null } = {},
): Promise<Response> {
  return createBuild(
    new Request('https://hub.example.com/api/v1/builds', {
      method: 'POST',
      headers: await headersFor(user, options),
      body: JSON.stringify(body),
    }),
  );
}

async function patch(
  body: Record<string, unknown>,
  user = ADMIN,
  buildId = BUILD_ID,
  options: { readonly tenantId?: string | null } = {},
): Promise<Response> {
  return patchBuild(
    new Request(`https://hub.example.com/api/v1/builds/${buildId}`, {
      method: 'PATCH',
      headers: await headersFor(user, options),
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: buildId }) },
  );
}

async function seedDefaultBuild(overrides: { readonly sheetId?: string | null } = {}): Promise<void> {
  await dbHarness.seedBuild({
    id: BUILD_ID,
    tenantId: TENANT_A,
    workspaceId: WORKSPACE_A1,
    type: 'improvement',
    stage: 'design',
    ...overrides,
  });
}

describe('BPB-MUT: POST /api/v1/builds の手動復旧', () => {
  beforeEach(() => {
    harnessWithUsers();
  });

  it('BPB-MUT-001: workspace-admin は接続元付きで起票でき、初期工程が履歴の 1 件目として残る', async () => {
    const response = await postBuild({ type: 'hearing', stage: 'requirements', sheet_id: 'sheet-1' });

    expect(response.status).toBe(201);
    const body = (await response.json()) as BuildDetailResponse;
    expect(body).toMatchObject({ type: 'hearing', stage: 'requirements', sheet_id: 'sheet-1', feedback_id: null });
    expect(body).not.toHaveProperty('tenant_id');
    expect(body.stage_events).toHaveLength(1);
    expect(body.stage_events[0]).toMatchObject({ from_stage: null, to_stage: 'requirements' });
  });

  it('BPB-MUT-002: stage を省略すると先頭工程 (hearing) から始まる', async () => {
    const response = await postBuild({ type: 'bug', feedback_id: 'fb-1' });
    const body = (await response.json()) as BuildDetailResponse;
    expect(body.stage).toBe('hearing');
  });

  it('BPB-MUT-003: member は起票できない (SEC2 の admin 限定)', async () => {
    const response = await postBuild({ type: 'hearing', sheet_id: 'sheet-1' }, MEMBER);
    expect(response.status).toBe(403);
  });

  it('BPB-MUT-004: sheet_id と feedback_id の同時指定は 422 (接続元は片方だけ)', async () => {
    const response = await postBuild({ type: 'hearing', sheet_id: 'sheet-1', feedback_id: 'fb-1' });
    expect(response.status).toBe(422);
  });

  it('BPB-MUT-005: 接続元をどちらも指定しない要求は 422', async () => {
    const response = await postBuild({ type: 'hearing' });
    expect(response.status).toBe(422);
  });

  it('BPB-MUT-006: 同じ接続元の二重起票は 409 (DB の一意制約で閉じる)', async () => {
    await seedDefaultBuild({ sheetId: 'sheet-1' });
    const response = await postBuild({ type: 'hearing', sheet_id: 'sheet-1' });

    expect(response.status).toBe(409);
    const problem = (await response.json()) as { readonly title: string };
    expect(problem.title).toBe('この接続元の Build は既に存在します');
  });

  it('BPB-MUT-007: 成功後にだけ build.create を監査へ記録する (SEC6)', async () => {
    const recordSpy = vi.spyOn(currentRuntime().authz.audit, 'record');

    await postBuild({ type: 'hearing', sheet_id: 'sheet-1' }, MEMBER);
    expect(recordSpy).not.toHaveBeenCalledWith(expect.objectContaining({ action: 'build.create' }));

    await postBuild({ type: 'hearing', sheet_id: 'sheet-1' });
    expect(recordSpy).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'build.create', resourceType: 'build', tenantId: TENANT_A }),
    );
  });
});

describe('BPB-MUT: PATCH /api/v1/builds/:id のカード編集', () => {
  beforeEach(async () => {
    harnessWithUsers();
    await seedDefaultBuild();
  });

  it('BPB-MUT-010: 上書きは実効値と override の両方に現れ、他の項目を巻き込まない', async () => {
    const first = await patch({ title: '請求書チェックの作り直し', assignee_user_id: 'user-admin' });
    expect(first.status).toBe(200);
    const created = (await first.json()) as BuildDetailResponse;
    expect(created).toMatchObject({
      title: '請求書チェックの作り直し',
      title_override: '請求書チェックの作り直し',
      assignee_user_id: 'user-admin',
      note: null,
    });

    // note だけを送っても、前回入れた担当者は消えない (省略 = 不変)。
    const second = await patch({ note: '来週レビュー' });
    const updated = (await second.json()) as BuildDetailResponse;
    expect(updated).toMatchObject({ note: '来週レビュー', assignee_user_id: 'user-admin' });
  });

  it('BPB-MUT-011: null は上書きの解除で、題名は接続元由来の算出値へ戻る', async () => {
    await patch({ title: '手入力の見出し' });
    const response = await patch({ title: null });
    const body = (await response.json()) as BuildDetailResponse;

    expect(body.title_override).toBeNull();
    expect(body.title).not.toBe('手入力の見出し');
  });

  it('BPB-MUT-012: risk の上書きは算出値より優先される', async () => {
    const response = await patch({ risk: 'blocked' });
    const body = (await response.json()) as BuildDetailResponse;
    expect(body).toMatchObject({ risk: 'blocked', risk_override: 'blocked' });
  });

  it('BPB-MUT-013: stage は PATCH から動かせない (状態機械の迂回口を作らない)', async () => {
    const response = await patch({ stage: 'build' });
    expect(response.status).toBe(422);
  });

  it('BPB-MUT-014: 変更項目が空の要求は 422', async () => {
    const response = await patch({});
    expect(response.status).toBe(422);
  });

  it('BPB-MUT-015: member は編集できない (SEC2 の admin 限定)', async () => {
    const response = await patch({ note: 'メモ' }, MEMBER);
    expect(response.status).toBe(403);
  });

  it('BPB-MUT-016: 別テナントからは 404 で存在を秘匿する', async () => {
    const response = await patch({ note: 'メモ' }, ADMIN, BUILD_ID, { tenantId: TENANT_B });
    expect(response.status).toBe(404);
  });

  it('BPB-MUT-017: 存在しない Build の編集は 404', async () => {
    const response = await patch({ note: 'メモ' }, ADMIN, 'missing-build');
    expect(response.status).toBe(404);
  });

  it('BPB-MUT-018: 成功後にだけ build.update を、触れた項目名だけを添えて監査へ記録する (SEC6)', async () => {
    const recordSpy = vi.spyOn(currentRuntime().authz.audit, 'record');

    await patch({ note: '個人名を含むかもしれないメモ' });
    expect(recordSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'build.update',
        resourceId: BUILD_ID,
        metadata: expect.objectContaining({ fields: 'note' }),
      }),
    );
    // 台帳は改ざん検知が目的で、本文の第二の保管庫ではない。
    expect(JSON.stringify(recordSpy.mock.calls)).not.toContain('個人名を含むかもしれないメモ');
  });
});
