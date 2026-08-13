import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HomeSummaryResponse } from '../../features/home-dashboard/dto.js';
import type { HomeDashboardRuntime } from '../../features/home-dashboard/runtime.js';
import type { AuthRuntime } from '../../lib/authz/runtime.js';

const authHolder = vi.hoisted(() => ({ current: null as AuthRuntime | null }));
vi.mock('../../lib/authz/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/authz/index.js')>();
  return { ...actual, authRuntime: () => authHolder.current as AuthRuntime };
});

const dashboardHolder = vi.hoisted(() => ({ current: null as HomeDashboardRuntime | null }));
vi.mock('../../features/home-dashboard/runtime.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/home-dashboard/runtime.js')>();
  return { ...actual, homeDashboardRuntime: () => dashboardHolder.current as HomeDashboardRuntime };
});

import { TENANT_A, TENANT_B, WORKSPACE_A1, WORKSPACE_A2 } from '../../../tests/auth-tenancy/support/in-memory-ports.js';
import {
  createTokenRouteHarness,
  sessionCookieFor,
  testUser,
} from '../../../tests/auth-tenancy/support/token-route-runtime.js';
import { GET } from '../../app/api/v1/dashboard/summary/route.js';
import { TENANT_HEADER, WORKSPACE_HEADER } from '../../middleware-contract.js';

const MEMBER = testUser('landing-member');
const ADMIN = testUser('landing-admin', { role: 'workspace-admin' });
const emptySummary: HomeSummaryResponse = {
  sheets: { visible: false, actionable_count: 0, recent_items: [] },
  feedback: { visible: false, actionable_count: 0, recent_items: [] },
  builds: { visible: false, actionable_count: 0, recent_items: [] },
};
const getSummary = vi.fn(async () => emptySummary);

beforeEach(() => {
  vi.clearAllMocks();
  const harness = createTokenRouteHarness();
  harness.ports.users.put(MEMBER);
  harness.ports.users.put(ADMIN);
  authHolder.current = harness.runtime;
  dashboardHolder.current = { service: { getSummary } };
});

async function request(user = MEMBER, tenantId = TENANT_A, workspaceId: string | null = WORKSPACE_A1) {
  const headers = new Headers({ cookie: await sessionCookieFor(user), [TENANT_HEADER]: tenantId });
  if (workspaceId !== null) headers.set(WORKSPACE_HEADER, workspaceId);
  return new Request('https://hub.example.com/api/v1/dashboard/summary', { headers });
}

describe('GET /api/v1/dashboard/summary', () => {
  it('未認証は401、tenant欠落は400でserviceを呼ばない', async () => {
    const unauthenticated = await GET(
      new Request('https://hub.example.com/api/v1/dashboard/summary', {
        headers: { [TENANT_HEADER]: TENANT_A, [WORKSPACE_HEADER]: WORKSPACE_A1 },
      }),
    );
    expect(unauthenticated.status).toBe(401);

    const missingTenantHeaders = new Headers({
      cookie: await sessionCookieFor(MEMBER),
      [WORKSPACE_HEADER]: WORKSPACE_A1,
    });
    expect(
      (await GET(new Request('https://hub.example.com/api/v1/dashboard/summary', { headers: missingTenantHeaders })))
        .status,
    ).toBe(400);
    expect(getSummary).not.toHaveBeenCalled();
  });

  it('workspace欠落は400、未所属workspaceは403、別tenantは404でserviceを呼ばない', async () => {
    expect((await GET(await request(MEMBER, TENANT_A, null))).status).toBe(400);
    expect((await GET(await request(MEMBER, TENANT_A, WORKSPACE_A2))).status).toBe(403);
    expect((await GET(await request(MEMBER, TENANT_B, WORKSPACE_A1))).status).toBe(404);
    expect(getSummary).not.toHaveBeenCalled();
  });

  it('memberはown、workspace-adminはallの要対応範囲で、recentのactorは常に本人', async () => {
    expect((await GET(await request(MEMBER))).status).toBe(200);
    expect(getSummary).toHaveBeenLastCalledWith(
      expect.objectContaining({
        actorUserId: MEMBER.id,
        workspaceId: WORKSPACE_A1,
        visibility: expect.objectContaining({ sheets: true, sheetsReadAll: false }),
      }),
    );

    expect((await GET(await request(ADMIN))).status).toBe(200);
    expect(getSummary).toHaveBeenLastCalledWith(
      expect.objectContaining({
        actorUserId: ADMIN.id,
        visibility: expect.objectContaining({ sheets: true, sheetsReadAll: true }),
      }),
    );
  });
});
