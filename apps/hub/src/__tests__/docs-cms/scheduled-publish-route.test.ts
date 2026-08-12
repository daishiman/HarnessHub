import type { DocumentDetail } from '@harness-hub/schemas';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DocsCmsRuntime } from '../../features/docs-cms/runtime.js';
import type { AuthRuntime } from '../../lib/authz/runtime.js';

const authHolder = vi.hoisted(() => ({ current: null as AuthRuntime | null }));
const docsHolder = vi.hoisted(() => ({ current: null as DocsCmsRuntime | null }));

vi.mock('../../lib/authz/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/authz/index.js')>();
  return {
    ...actual,
    authRuntime: () => {
      if (authHolder.current === null) throw new Error('テスト用authRuntimeが未設定です');
      return authHolder.current;
    },
  };
});

vi.mock('../../features/docs-cms/runtime.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/docs-cms/runtime.js')>();
  return {
    ...actual,
    docsCmsRuntime: () => {
      if (docsHolder.current === null) throw new Error('テスト用docsCmsRuntimeが未設定です');
      return docsHolder.current;
    },
  };
});

import { TENANT_A, WORKSPACE_A1 } from '../../../tests/auth-tenancy/support/in-memory-ports.js';
import {
  ALLOWED_ORIGIN,
  adminUser,
  createTokenRouteHarness,
  sessionCookieFor,
} from '../../../tests/auth-tenancy/support/token-route-runtime.js';
import { PATCH } from '../../app/api/v1/docs/[id]/route.js';
import { POST } from '../../app/api/v1/docs/route.js';
import { TENANT_HEADER, WORKSPACE_HEADER } from '../../middleware-contract.js';
import { createDocsDbHarness, type DocsDbHarness } from './support/real-db.js';

const COLLECTION_URL = 'https://hub.example.com/api/v1/docs';
let db: DocsDbHarness;
let requestHeaders: Headers;

beforeEach(async () => {
  db = await createDocsDbHarness();
  docsHolder.current = { repository: db.repository };
  const harness = createTokenRouteHarness();
  authHolder.current = harness.runtime;
  requestHeaders = new Headers({
    cookie: await sessionCookieFor(adminUser()),
    origin: ALLOWED_ORIGIN,
    'content-type': 'application/json',
    [TENANT_HEADER]: TENANT_A,
    [WORKSPACE_HEADER]: WORKSPACE_A1,
  });
});

afterEach(() => {
  db.close();
  authHolder.current = null;
  docsHolder.current = null;
});

function post(body: Record<string, unknown>): Promise<Response> {
  return POST(
    new Request(COLLECTION_URL, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(body),
    }),
  );
}

function patch(id: string, body: Record<string, unknown>): Promise<Response> {
  return PATCH(
    new Request(`${COLLECTION_URL}/${id}`, {
      method: 'PATCH',
      headers: requestHeaders,
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

describe('DOCS-SCHEDULE-HTTP: 予約公開route契約', () => {
  it('DOCS-SCHEDULE-HTTP-001: future publish_atをdraftとして保存しDTOへ返す', async () => {
    const publishAt = Date.now() + 60 * 60 * 1000;
    const response = await post({
      scope: 'tenant',
      title: '予約記事',
      body_markdown: '# 本文',
      publish_at: publishAt,
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ status: 'draft', publish_at: publishAt });
  });

  it('DOCS-SCHEDULE-HTTP-002: past publish_atを422 problem+jsonで拒否する', async () => {
    const response = await post({
      scope: 'tenant',
      title: '過去の予約',
      body_markdown: '',
      publish_at: Date.now() - 1_000,
    });

    expect(response.status).toBe(422);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
  });

  it('DOCS-SCHEDULE-HTTP-003: 手動publishは予約を解除する', async () => {
    const created = await post({
      scope: 'tenant',
      title: '手動公開する記事',
      body_markdown: '',
      publish_at: Date.now() + 60 * 60 * 1000,
    });
    const doc = (await created.json()) as DocumentDetail;

    const response = await patch(doc.id, { status: 'published' });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: 'published', publish_at: null });
  });

  it('DOCS-SCHEDULE-HTTP-004: publishedとfuture publish_atの矛盾した同時指定を422で拒否する', async () => {
    const created = await post({ scope: 'tenant', title: '記事', body_markdown: '' });
    const doc = (await created.json()) as DocumentDetail;

    const response = await patch(doc.id, {
      status: 'published',
      publish_at: Date.now() + 60 * 60 * 1000,
    });
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      errors: [
        expect.objectContaining({
          field: 'publish_at',
          message: 'status=published と未来の publish_at は同時に指定できません',
        }),
      ],
    });
  });

  it('DOCS-SCHEDULE-HTTP-005: PATCHのfuture publish_atをrepository契約どおりdraft予約へ導出する', async () => {
    const created = await post({ scope: 'tenant', title: '後から予約する記事', body_markdown: '' });
    const doc = (await created.json()) as DocumentDetail;
    const publishAt = Date.now() + 60 * 60 * 1000;

    const response = await patch(doc.id, { status: 'draft', publish_at: publishAt });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: 'draft', publish_at: publishAt });
  });

  it('DOCS-SCHEDULE-HTTP-006: 実際のtitle変更で既存予約を解除する', async () => {
    const created = await post({
      scope: 'tenant',
      title: '変更前',
      body_markdown: '',
      publish_at: Date.now() + 60 * 60 * 1000,
    });
    const doc = (await created.json()) as DocumentDetail;

    const response = await patch(doc.id, { title: '変更後' });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ title: '変更後', status: 'draft', publish_at: null });
  });
});
