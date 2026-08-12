import type {
  NotionIntegrationRepo,
  NotionIntegrationRow,
  RepositoryContext,
  UpsertNotionIntegrationInput,
} from '@harness-hub/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthRuntime } from '../../lib/authz/runtime.js';

const authRuntimeHolder = vi.hoisted(() => ({ current: null as AuthRuntime | null }));

vi.mock('../../lib/authz/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/authz/index.js')>();
  return {
    ...actual,
    authRuntime: () => {
      if (authRuntimeHolder.current === null) throw new Error('テスト用 auth runtime が未設定です');
      return authRuntimeHolder.current;
    },
  };
});

const notionRuntimeHolder = vi.hoisted(() => ({
  current: null as import('../../features/notion-integration/runtime.js').NotionIntegrationRuntime | null,
}));

vi.mock('../../features/notion-integration/runtime.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/notion-integration/runtime.js')>();
  return {
    ...actual,
    notionIntegrationRuntime: () => {
      if (notionRuntimeHolder.current === null) throw new Error('テスト用 Notion runtime が未設定です');
      return notionRuntimeHolder.current;
    },
  };
});

import { TENANT_A, TENANT_B, WORKSPACE_A1, WORKSPACE_A2 } from '../../../tests/auth-tenancy/support/in-memory-ports.js';
import {
  ALLOWED_ORIGIN,
  createTokenRouteHarness,
  sessionCookieFor,
  testUser,
} from '../../../tests/auth-tenancy/support/token-route-runtime.js';
import { DELETE, GET, PUT } from '../../app/api/v1/me/notion-integration/route.js';
import { createNotionIntegrationRuntime } from '../../features/notion-integration/runtime.js';
import { TENANT_HEADER, WORKSPACE_HEADER } from '../../middleware-contract.js';

const MEMBER = testUser('notion-member');
const ADMIN = testUser('notion-admin', { role: 'workspace-admin' });
// secret scan に実キーと誤認させず、request/response 境界で同じ値を追跡できるダミー。
const API_KEY = ['notion', 'fixture', 'api', 'key', '1234'].join('_');

function createFakeRepository(): NotionIntegrationRepo {
  const rows = new Map<string, NotionIntegrationRow>();
  const plainApiKeys = new Map<string, string>();
  let sequence = 0;
  const keyOf = (context: RepositoryContext, workspaceId: string) => `${context.tenantId}:${workspaceId}`;

  return {
    async get(context, workspaceId) {
      return rows.get(keyOf(context, workspaceId)) ?? null;
    },
    async decryptApiKey(_context, row) {
      const plain = plainApiKeys.get(row.id);
      if (plain === undefined) throw new Error('API キーがありません');
      return plain;
    },
    async upsert(context, input: UpsertNotionIntegrationInput) {
      const storageKey = keyOf(context, input.workspaceId);
      const existing = rows.get(storageKey);
      const id = existing?.id ?? `notion-${++sequence}`;
      if (input.apiKey === null) plainApiKeys.delete(id);
      else if (input.apiKey !== undefined) plainApiKeys.set(id, input.apiKey);
      const hasApiKey = plainApiKeys.has(id);
      const row: NotionIntegrationRow = {
        id,
        tenantId: context.tenantId,
        workspaceId: input.workspaceId,
        mode: input.mode,
        pageUrl: input.pageUrl,
        apiKeyEnc: hasApiKey ? `encrypted:${id}` : null,
        encKeyVersion: hasApiKey ? 1 : null,
        createdAt: existing?.createdAt ?? 1,
        updatedAt: (existing?.updatedAt ?? 1) + 1,
      };
      rows.set(storageKey, row);
      return row;
    },
    async deleteIntegration(context, workspaceId) {
      const existing = rows.get(keyOf(context, workspaceId));
      if (existing !== undefined) plainApiKeys.delete(existing.id);
      rows.delete(keyOf(context, workspaceId));
    },
  };
}

async function request(
  method: 'GET' | 'PUT' | 'DELETE',
  user = MEMBER,
  body?: unknown,
  includeWorkspace = true,
  scope: { readonly tenantId: string; readonly workspaceId: string } = {
    tenantId: TENANT_A,
    workspaceId: WORKSPACE_A1,
  },
): Promise<Request> {
  const headers = new Headers({
    cookie: await sessionCookieFor(user),
    [TENANT_HEADER]: scope.tenantId,
    origin: ALLOWED_ORIGIN,
  });
  if (includeWorkspace) headers.set(WORKSPACE_HEADER, scope.workspaceId);
  if (body !== undefined) headers.set('content-type', 'application/json');
  return new Request('https://hub.example.com/api/v1/me/notion-integration', {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

beforeEach(() => {
  const auth = createTokenRouteHarness();
  auth.ports.users.put(MEMBER);
  auth.ports.users.put(ADMIN);
  authRuntimeHolder.current = auth.runtime;
  notionRuntimeHolder.current = createNotionIntegrationRuntime(createFakeRepository());
});

describe('Notion integration route boundary', () => {
  it('member は GET で読めるが PUT は 403 で拒否される', async () => {
    expect((await GET(await request('GET'))).status).toBe(200);
    expect(
      (await PUT(await request('PUT', MEMBER, { mode: 'url', page_url: 'https://www.notion.so/member' }))).status,
    ).toBe(403);
    expect(await (await GET(await request('GET'))).json()).toBeNull();
  });

  it('workspace-admin は API キーを保存できるが応答に平文を出さない', async () => {
    const response = await PUT(
      await request('PUT', ADMIN, {
        mode: 'api_key',
        page_url: 'https://team.notion.site/workspace',
        api_key: API_KEY,
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.api_key_masked).toBe('****1234');
    expect(JSON.stringify(body)).not.toContain(API_KEY);
    expect(body).not.toHaveProperty('api_key');
  });

  it('非 HTTPS や Notion 偽装 host は repository へ到達する前に 422 にする', async () => {
    const insecure = await PUT(await request('PUT', ADMIN, { mode: 'url', page_url: 'http://www.notion.so/insecure' }));
    const spoofed = await PUT(
      await request('PUT', ADMIN, { mode: 'url', page_url: 'https://notion.so.evil.example/page' }),
    );

    expect(insecure.status).toBe(422);
    expect(spoofed.status).toBe(422);
    expect(await (await GET(await request('GET', ADMIN))).json()).toBeNull();
  });

  it('workspace header の無い要求は読取りも変更も 400 で拒否する', async () => {
    expect((await GET(await request('GET', MEMBER, undefined, false))).status).toBe(400);
    expect(
      (await PUT(await request('PUT', ADMIN, { mode: 'url', page_url: 'https://www.notion.so/admin' }, false))).status,
    ).toBe(400);
  });

  it('別 tenant や未所属 workspace の登録状況を返さない', async () => {
    expect(
      (await GET(await request('GET', MEMBER, undefined, true, { tenantId: TENANT_B, workspaceId: WORKSPACE_A1 })))
        .status,
    ).toBe(404);
    expect(
      (await GET(await request('GET', MEMBER, undefined, true, { tenantId: TENANT_A, workspaceId: WORKSPACE_A2 })))
        .status,
    ).toBe(403);
  });

  it('workspace-admin の DELETE は登録を消し、member の DELETE は 403 のまま', async () => {
    await PUT(await request('PUT', ADMIN, { mode: 'url', page_url: 'https://www.notion.so/admin' }));
    expect((await DELETE(await request('DELETE', MEMBER))).status).toBe(403);
    expect((await DELETE(await request('DELETE', ADMIN))).status).toBe(204);
    expect(await (await GET(await request('GET'))).json()).toBeNull();
  });
});
