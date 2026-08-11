/**
 * FL-HTTP-*: feedback route (`POST/GET /api/v1/feedback`, `GET/PATCH /api/v1/feedback/:id`) を
 * 実際に Request/Response として実行する受入契約。
 *
 * 既存 8 ファイルの静的検査 (`rest-zod-authz-mw.test.ts` / `status-transition-workspace-admin-audit.test.ts`
 * 等) は route.ts のソース文字列を検査するだけで、`withAuthz` を実際に通す・DB へ書く・監査を記録する
 * という実行結果は 1 件も検証していなかった。ここではその欠落を埋める。
 *
 * 認可判定 (`withAuthz` / `decide`) は本物を通し、`authRuntime()` の port だけを in-memory 実装へ
 * 差し替える (`apps/hub/src/__tests__/dual-catalog-web/marketplace-document.test.ts` と同じ形)。
 * `feedbackLoopRuntime()` は実 libSQL (一時ファイル) 上の `FeedbackRepository` へ差し替える
 * (`support/real-db.ts`)。DB を丸ごとモックすると tenant/workspace の WHERE 句注入・
 * transaction・CAS が「実行された体」で緑化してしまうため、実装は本物のまま port だけを絞る。
 */

import type { FeedbackDetail, FeedbackListResponse } from '@harness-hub/schemas';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FeedbackLoopRuntime } from '../../features/feedback-loop/runtime.js';
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

const feedbackRuntimeHolder = vi.hoisted(() => ({ current: null as FeedbackLoopRuntime | null }));

vi.mock('../../features/feedback-loop/runtime.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/feedback-loop/runtime.js')>();
  return {
    ...actual,
    feedbackLoopRuntime: () => {
      if (feedbackRuntimeHolder.current === null) throw new Error('テスト用 feedbackLoopRuntime が未設定です');
      return feedbackRuntimeHolder.current;
    },
  };
});

import { TENANT_A, WORKSPACE_A1 } from '../../../tests/auth-tenancy/support/in-memory-ports.js';
import {
  ALLOWED_ORIGIN,
  createTokenRouteHarness,
  sessionCookieFor,
  testUser,
} from '../../../tests/auth-tenancy/support/token-route-runtime.js';
import { GET as getItem, PATCH as patchItem } from '../../app/api/v1/feedback/[id]/route.js';
import { POST as createRoute, GET as listRoute } from '../../app/api/v1/feedback/route.js';
import { createFeedbackLoopRuntime } from '../../features/feedback-loop/runtime.js';
import { TENANT_HEADER, WORKSPACE_HEADER } from '../../middleware-contract.js';
import { createFeedbackDbHarness, type FeedbackDbHarness } from './support/real-db.js';

const MEMBER = testUser('user-member');
const ADMIN = testUser('user-admin', { role: 'workspace-admin' });

let dbHarness: FeedbackDbHarness;

beforeEach(async () => {
  dbHarness = await createFeedbackDbHarness();
  feedbackRuntimeHolder.current = createFeedbackLoopRuntime(dbHarness.repository, dbHarness.buildsRepository);
});

afterEach(() => {
  dbHarness.close();
  runtimeHolder.current = null;
  feedbackRuntimeHolder.current = null;
});

/**
 * token-route-runtime のデフォルト users (OWNER_ID/ADMIN_ID/STRANGER_ID) には
 * workspace-admin と member を明確に区別できる組が無いため、この file 専用の 2 人を追加する。
 */
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

const CREATE_BODY = {
  project_id: 'proj-1',
  type: 'improvement' as const,
  priority: 'medium' as const,
  body: '一覧画面の読み込みが遅いので改善してほしい。',
};

async function createFeedback(user = MEMBER): Promise<Response> {
  const headers = await headersFor(user);
  headers.set('content-type', 'application/json');
  return createRoute(
    new Request('https://hub.example.com/api/v1/feedback', {
      method: 'POST',
      headers,
      body: JSON.stringify(CREATE_BODY),
    }),
  );
}

describe('FL-HTTP: POST/GET /api/v1/feedback の実行', () => {
  beforeEach(() => {
    harnessWithUsers();
  });

  it('FL-HTTP-001: member session で作成すると 201 で FR コードと status=open を返す', async () => {
    const response = await createFeedback();
    expect(response.status).toBe(201);
    const body = (await response.json()) as { id: string; code: string; status: string };
    expect(body.code).toMatch(/^FR-\d{4,}$/);
    expect(body.status).toBe('open');
  });

  it('FL-HTTP-002: 作成した feedback が一覧へ現れる (実 DB 往復)', async () => {
    await createFeedback();
    const headers = await headersFor();
    const response = await listRoute(new Request('https://hub.example.com/api/v1/feedback?limit=25', { headers }));
    expect(response.status).toBe(200);
    const body = (await response.json()) as FeedbackListResponse;
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({ project_id: 'proj-1', type: 'improvement', status: 'open' });
    // tenant_id/workspace_id が wire へ漏れない (FL-D4-001/002 の実行版)
    expect(body.items[0]).not.toHaveProperty('tenant_id');
    expect(body.items[0]).not.toHaveProperty('workspace_id');
  });

  it('FL-HTTP-003: テナント申告が無い要求は 400 で資源を確定しない (resolveResource が null)', async () => {
    const headers = await headersFor(MEMBER, { tenantId: null });
    headers.set('content-type', 'application/json');
    const response = await createRoute(
      new Request('https://hub.example.com/api/v1/feedback', {
        method: 'POST',
        headers,
        body: JSON.stringify(CREATE_BODY),
      }),
    );
    expect(response.status).toBe(400);
  });

  it('FL-HTTP-004: 未認証 (cookie 無し) は 401', async () => {
    const headers = new Headers({ [TENANT_HEADER]: TENANT_A, [WORKSPACE_HEADER]: WORKSPACE_A1 });
    const response = await listRoute(new Request('https://hub.example.com/api/v1/feedback', { headers }));
    expect(response.status).toBe(401);
  });

  it('FL-HTTP-005: Origin 未申告の state-changing 要求は拒否される (untrusted_origin)', async () => {
    const headers = await headersFor(MEMBER, { origin: null });
    headers.set('content-type', 'application/json');
    const response = await createRoute(
      new Request('https://hub.example.com/api/v1/feedback', {
        method: 'POST',
        headers,
        body: JSON.stringify(CREATE_BODY),
      }),
    );
    expect(response.ok).toBe(false);
  });

  it('FL-HTTP-006: x-harness-workspace-id が無い POST は 400 (Workspace を指定してください)', async () => {
    const headers = await headersFor(MEMBER, { workspaceId: null });
    headers.set('content-type', 'application/json');
    const response = await createRoute(
      new Request('https://hub.example.com/api/v1/feedback', {
        method: 'POST',
        headers,
        body: JSON.stringify(CREATE_BODY),
      }),
    );
    expect(response.status).toBe(400);
  });

  it('FL-HTTP-007: x-harness-workspace-id が無い GET も 400 (Workspace を指定してください)', async () => {
    const headers = await headersFor(MEMBER, { workspaceId: null });
    const response = await listRoute(new Request('https://hub.example.com/api/v1/feedback', { headers }));
    expect(response.status).toBe(400);
  });

  it('FL-HTTP-008: 不正なクエリ (status が値域外) は zod エラーの problem details で 422 になる', async () => {
    const headers = await headersFor();
    const response = await listRoute(
      new Request('https://hub.example.com/api/v1/feedback?status=not-a-status', { headers }),
    );
    expect(response.status).toBe(422);
    const body = (await response.json()) as { title: string };
    expect(body.title).toBeDefined();
  });
});

describe('FL-HTTP: GET /api/v1/feedback/:id の can_manage', () => {
  beforeEach(() => {
    harnessWithUsers();
  });

  it('FL-HTTP-101: member は can_manage=false、workspace-admin は can_manage=true で詳細を読める', async () => {
    const created = (await (await createFeedback()).json()) as { id: string };

    const memberHeaders = await headersFor(MEMBER);
    const memberResponse = await getItem(
      new Request(`https://hub.example.com/api/v1/feedback/${created.id}`, { headers: memberHeaders }),
      {
        params: Promise.resolve({ id: created.id }),
      },
    );
    expect(memberResponse.status).toBe(200);
    const memberBody = (await memberResponse.json()) as FeedbackDetail;
    expect(memberBody.can_manage).toBe(false);
    expect(memberBody.body).toBe(CREATE_BODY.body);

    const adminHeaders = await headersFor(ADMIN);
    const adminResponse = await getItem(
      new Request(`https://hub.example.com/api/v1/feedback/${created.id}`, { headers: adminHeaders }),
      {
        params: Promise.resolve({ id: created.id }),
      },
    );
    const adminBody = (await adminResponse.json()) as FeedbackDetail;
    expect(adminBody.can_manage).toBe(true);
  });

  it('FL-HTTP-102: 存在しない id は 404 (存在秘匿と同じ形の応答)', async () => {
    const headers = await headersFor(MEMBER);
    const response = await getItem(new Request('https://hub.example.com/api/v1/feedback/missing', { headers }), {
      params: Promise.resolve({ id: 'missing' }),
    });
    expect(response.status).toBe(404);
  });
});

describe('FL-HTTP / SEC6 / SEC2: PATCH /api/v1/feedback/:id の status 遷移と監査', () => {
  beforeEach(() => {
    harnessWithUsers();
  });

  it('FL-HTTP-201: member (workspace-admin 未満) の PATCH は 403 で拒否される', async () => {
    const created = (await (await createFeedback()).json()) as { id: string };
    const headers = await headersFor(MEMBER);
    headers.set('content-type', 'application/json');
    const response = await patchItem(
      new Request(`https://hub.example.com/api/v1/feedback/${created.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'in_progress' }),
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(response.status).toBe(403);
  });

  it('FL-HTTP-202: workspace-admin の隣接遷移 (open→in_progress) は 200 で反映され、監査 feedback.status_change が 1 件記録される', async () => {
    const created = (await (await createFeedback()).json()) as { id: string };
    const harness = runtimeHolder.current;
    if (harness === null) throw new Error('runtime not set');
    const recordSpy = vi.spyOn(harness.authz.audit, 'record');

    const headers = await headersFor(ADMIN);
    headers.set('content-type', 'application/json');
    const response = await patchItem(
      new Request(`https://hub.example.com/api/v1/feedback/${created.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'in_progress' }),
      }),
      { params: Promise.resolve({ id: created.id }) },
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as FeedbackDetail;
    expect(body.status).toBe('in_progress');
    expect(body.can_manage).toBe(true);

    expect(recordSpy).toHaveBeenCalledTimes(1);
    expect(recordSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'feedback.status_change',
        resourceType: 'feedback',
        resourceId: created.id,
        metadata: expect.objectContaining({ status: 'in_progress' }),
      }),
    );
  });

  it('FL-HTTP-203: workspace-admin でもスキップ遷移 (open→resolved) は 422 を返し、監査を記録しない', async () => {
    const created = (await (await createFeedback()).json()) as { id: string };
    const harness = runtimeHolder.current;
    if (harness === null) throw new Error('runtime not set');
    const recordSpy = vi.spyOn(harness.authz.audit, 'record');

    const headers = await headersFor(ADMIN);
    headers.set('content-type', 'application/json');
    const response = await patchItem(
      new Request(`https://hub.example.com/api/v1/feedback/${created.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'resolved' }),
      }),
      { params: Promise.resolve({ id: created.id }) },
    );

    expect(response.status).toBe(422);
    expect(recordSpy).not.toHaveBeenCalled();
  });

  it('FL-HTTP-204: open→in_progress→resolved まで進めると resolved 通知経路 (service/notification) が実行される', async () => {
    const created = (await (await createFeedback()).json()) as { id: string };
    const headers = await headersFor(ADMIN);
    headers.set('content-type', 'application/json');

    const toInProgress = await patchItem(
      new Request(`https://hub.example.com/api/v1/feedback/${created.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'in_progress' }),
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(toInProgress.status).toBe(200);

    // 通知 transport は未接続 (delivered=false) の想定経路であり、console.error のログ出力だけを伴う
    // fire-and-forget であることを確認する (主操作の成功自体は失われない)。
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const toResolved = await patchItem(
      new Request(`https://hub.example.com/api/v1/feedback/${created.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'resolved' }),
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(toResolved.status).toBe(200);
    const body = (await toResolved.json()) as FeedbackDetail;
    expect(body.status).toBe('resolved');
    expect(errorSpy).toHaveBeenCalledWith(
      '[feedback-loop] resolved 通知の一部送出に失敗しました',
      expect.objectContaining({ feedbackId: created.id }),
    );
    errorSpy.mockRestore();
  });
});
