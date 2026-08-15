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
import { GET, PATCH } from '../../app/api/v1/docs/[id]/route.js';
import { POST } from '../../app/api/v1/docs/route.js';
import { TENANT_HEADER, WORKSPACE_HEADER } from '../../middleware-contract.js';
import { createDocsDbHarness, type DocsDbHarness } from './support/real-db.js';

const COLLECTION_URL = 'https://hub.example.com/api/v1/docs';
let db: DocsDbHarness;
let requestHeaders: Headers;
let authHarness: ReturnType<typeof createTokenRouteHarness>;

beforeEach(async () => {
  db = await createDocsDbHarness();
  docsHolder.current = { repository: db.repository };
  authHarness = createTokenRouteHarness();
  authHolder.current = authHarness.runtime;
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
  return postWithKey(body, crypto.randomUUID());
}

function postWithKey(body: Record<string, unknown>, idempotencyKey: string | null): Promise<Response> {
  const headers = new Headers(requestHeaders);
  if (idempotencyKey !== null) headers.set('idempotency-key', idempotencyKey);
  return POST(
    new Request(COLLECTION_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }),
  );
}

function patch(id: string, body: Record<string, unknown>, ifMatch: string | null): Promise<Response> {
  const headers = new Headers(requestHeaders);
  if (ifMatch !== null) headers.set('if-match', ifMatch);
  return PATCH(
    new Request(`${COLLECTION_URL}/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

describe('DOCS-SCHEDULE-HTTP: 予約公開route契約', () => {
  it('CARD-MUTATION-DOCS-HTTP-001: POST requires a UUID v4 Idempotency-Key', async () => {
    await expect(postWithKey({ scope: 'tenant', title: 'missing', body_markdown: '' }, null)).resolves.toMatchObject({
      status: 400,
    });
    await expect(
      postWithKey({ scope: 'tenant', title: 'invalid', body_markdown: '' }, 'not-a-uuid'),
    ).resolves.toMatchObject({ status: 400 });

    const oversizedHeaders = new Headers(requestHeaders);
    oversizedHeaders.set('idempotency-key', crypto.randomUUID());
    oversizedHeaders.set('content-length', '250001');
    const oversized = await POST(
      new Request(COLLECTION_URL, {
        method: 'POST',
        headers: oversizedHeaders,
        body: JSON.stringify({ scope: 'tenant', title: 'oversized', body_markdown: '' }),
      }),
    );
    expect(oversized.status).toBe(413);
    await expect(db.repository.listDocuments({ tenantId: TENANT_A }, { limit: 50 })).resolves.toMatchObject({
      items: [],
    });
  });

  it('CARD-MUTATION-DOCS-HTTP-002: concurrent same-key POST replays one exact representation', async () => {
    const key = crypto.randomUUID();
    const body = { scope: 'tenant', title: 'one document', body_markdown: '# body' };
    const [first, second] = await Promise.all([postWithKey(body, key), postWithKey(body, key)]);
    const [firstBody, secondBody] = await Promise.all([first.text(), second.text()]);

    expect([first.status, second.status]).toEqual([201, 201]);
    expect(firstBody).toBe(secondBody);
    expect(first.headers.get('etag')).toBe('"docs-1"');
    expect(second.headers.get('etag')).toBe('"docs-1"');
    expect([first.headers.get('idempotency-replayed'), second.headers.get('idempotency-replayed')].sort()).toEqual([
      'false',
      'true',
    ]);
    expect(first.headers.get('idempotency-key-expires-at')).toBe(second.headers.get('idempotency-key-expires-at'));
    await expect(db.repository.listDocuments({ tenantId: TENANT_A }, { limit: 50 })).resolves.toMatchObject({
      items: [expect.objectContaining({ title: 'one document', entityRevision: 1 })],
    });
    await expect(db.audit.read({ tenantId: TENANT_A }, { limit: 10 })).resolves.toEqual([
      expect.objectContaining({
        workspaceId: WORKSPACE_A1,
        actorId: adminUser().id,
        action: 'docs.create',
        entityType: 'document',
      }),
    ]);
  });

  it('CARD-MUTATION-DOCS-HTTP-003: same key with a different canonical payload is 422', async () => {
    const key = crypto.randomUUID();
    expect((await postWithKey({ scope: 'tenant', title: 'first', body_markdown: '' }, key)).status).toBe(201);
    expect((await postWithKey({ body_markdown: '', title: 'first', scope: 'tenant' }, key)).status).toBe(201);
    expect((await postWithKey({ scope: 'tenant', title: 'changed', body_markdown: '' }, key)).status).toBe(422);
  });

  it('CARD-MUTATION-DOCS-HTTP-003a: replay returns the initial wire snapshot after a later update', async () => {
    const key = crypto.randomUUID();
    const requestBody = { scope: 'tenant', title: 'initial wire', body_markdown: '' };
    const created = await postWithKey(requestBody, key);
    const initialBody = await created.clone().text();
    const document = (await created.json()) as DocumentDetail;

    expect((await patch(document.id, { title: 'later update' }, '"docs-1"')).status).toBe(200);
    const replayed = await postWithKey(requestBody, key);

    expect(replayed.status).toBe(201);
    expect(replayed.headers.get('etag')).toBe('"docs-1"');
    expect(replayed.headers.get('idempotency-replayed')).toBe('true');
    expect(await replayed.text()).toBe(initialBody);
  });

  it('CARD-MUTATION-DOCS-HTTP-003b: replay stays valid when publish_at passes inside the 24h TTL', async () => {
    const now = Date.now();
    const key = crypto.randomUUID();
    const body = {
      scope: 'tenant',
      title: 'scheduled replay',
      body_markdown: '',
      publish_at: now + 1_000,
    };
    const created = await postWithKey(body, key);
    expect(created.status).toBe(201);
    const originalBody = await created.text();

    vi.useFakeTimers();
    vi.setSystemTime(now + 2_000);
    try {
      const replayed = await postWithKey(body, key);
      expect(replayed.status).toBe(201);
      expect(await replayed.text()).toBe(originalBody);
      expect(replayed.headers.get('idempotency-replayed')).toBe('true');
    } finally {
      vi.useRealTimers();
    }
  });

  it('CARD-MUTATION-DOCS-HTTP-004: GET/POST expose ETag and PATCH returns current representation on stale CAS', async () => {
    const created = await post({ scope: 'tenant', title: 'first', body_markdown: '' });
    const body = (await created.json()) as DocumentDetail;
    expect(created.headers.get('etag')).toBe('"docs-1"');
    expect(body).toMatchObject({ revision: 1 });

    const fetched = await GET(new Request(`${COLLECTION_URL}/${body.id}`, { headers: requestHeaders }), {
      params: Promise.resolve({ id: body.id }),
    });
    expect(fetched.headers.get('etag')).toBe('"docs-1"');

    expect((await patch(body.id, { title: 'missing precondition' }, null)).status).toBe(428);
    expect((await patch(body.id, { title: 'wrong namespace' }, '"docs-import-1"')).status).toBe(400);
    const updated = await patch(body.id, { title: 'winner' }, '"docs-1"');
    expect(updated.status).toBe(200);
    expect(updated.headers.get('etag')).toBe('"docs-2"');
    const stale = await patch(body.id, { title: 'stale' }, '"docs-1"');
    expect(stale.status).toBe(412);
    expect(stale.headers.get('etag')).toBe('"docs-2"');
    await expect(stale.json()).resolves.toMatchObject({
      error: 'revision_conflict',
      current: { id: body.id, title: 'winner', revision: 2 },
    });
  });

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

    const response = await patch(doc.id, { status: 'published' }, created.headers.get('etag'));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: 'published', publish_at: null });
  });

  it('DOCS-SCHEDULE-HTTP-004: publishedとfuture publish_atの矛盾した同時指定を422で拒否する', async () => {
    const created = await post({ scope: 'tenant', title: '記事', body_markdown: '' });
    const doc = (await created.json()) as DocumentDetail;

    const response = await patch(
      doc.id,
      {
        status: 'published',
        publish_at: Date.now() + 60 * 60 * 1000,
      },
      created.headers.get('etag'),
    );
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

    const response = await patch(doc.id, { status: 'draft', publish_at: publishAt }, created.headers.get('etag'));
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

    const response = await patch(doc.id, { title: '変更後' }, created.headers.get('etag'));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ title: '変更後', status: 'draft', publish_at: null });
  });
});
