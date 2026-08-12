import type { ExternalDocumentSyncResponse } from '@harness-hub/schemas';
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
  ADMIN_ID,
  ALLOWED_ORIGIN,
  createTokenRouteHarness,
  issuePublisherToken,
} from '../../../tests/auth-tenancy/support/token-route-runtime.js';
import { GET, PUT } from '../../app/api/v1/docs/imports/[source]/[externalId]/route.js';
import { TENANT_HEADER, WORKSPACE_HEADER } from '../../middleware-contract.js';
import { createDocsDbHarness, type DocsDbHarness } from './support/real-db.js';

const SOURCE = 'claude-code';
const EXTERNAL_ID = 'a'.repeat(64);
const URL = `https://hub.example.com/api/v1/docs/imports/${SOURCE}/${EXTERNAL_ID}`;
const PARAMS = { params: Promise.resolve({ source: SOURCE, externalId: EXTERNAL_ID }) };

let db: DocsDbHarness;

beforeEach(async () => {
  db = await createDocsDbHarness();
  docsHolder.current = { repository: db.repository };
});

afterEach(() => {
  db.close();
  authHolder.current = null;
  docsHolder.current = null;
});

async function headers(scope: 'docs:write' | 'publish:write' = 'docs:write'): Promise<Headers> {
  const harness = createTokenRouteHarness();
  authHolder.current = harness.runtime;
  const token = await issuePublisherToken(harness, ADMIN_ID, WORKSPACE_A1, [scope]);
  return new Headers({
    authorization: `Bearer ${token.access_token}`,
    [TENANT_HEADER]: TENANT_A,
    [WORKSPACE_HEADER]: WORKSPACE_A1,
    origin: ALLOWED_ORIGIN,
    'content-type': 'application/json',
  });
}

function putRequest(requestHeaders: Headers, bodyMarkdown: string): Request {
  return new Request(URL, {
    method: 'PUT',
    headers: requestHeaders,
    body: JSON.stringify({ title: '外部設計書', body_markdown: bodyMarkdown }),
  });
}

describe('DOCS-EXT-HTTP: 外部Markdown同期route', () => {
  it('初回作成・冪等再送・ETag付き更新を実DB往復で行う', async () => {
    const requestHeaders = await headers();
    expect((await GET(new Request(URL, { headers: requestHeaders }), PARAMS)).status).toBe(404);

    const initialBody = '![表紙](https://example.com/cover.png)\n\n初版の説明です。';
    const created = await PUT(putRequest(requestHeaders, initialBody), PARAMS);
    expect(created.status).toBe(201);
    expect(created.headers.get('etag')).toBe('"docs-import-1"');
    const createdBody = (await created.json()) as ExternalDocumentSyncResponse;
    expect(createdBody).toMatchObject({
      outcome: 'created',
      revision: 1,
      sync_state: 'synced',
      document: {
        thumbnail_url: 'https://example.com/cover.png',
        excerpt: '初版の説明です。',
        asset_summary: { image_count: 1, has_table: false, has_code: false },
      },
    });

    const unchanged = await PUT(putRequest(requestHeaders, initialBody), PARAMS);
    expect(unchanged.status).toBe(200);
    expect((await unchanged.json()) as ExternalDocumentSyncResponse).toMatchObject({ outcome: 'unchanged' });

    const missingPrecondition = await PUT(putRequest(requestHeaders, '# 改訂'), PARAMS);
    expect(missingPrecondition.status).toBe(428);

    const current = await GET(new Request(URL, { headers: requestHeaders }), PARAMS);
    const etag = current.headers.get('etag');
    expect(etag).toBe('"docs-import-1"');
    requestHeaders.set('if-match', etag ?? 'missing');
    const updated = await PUT(putRequest(requestHeaders, '# 改訂'), PARAMS);
    expect(updated.status).toBe(200);
    expect((await updated.json()) as ExternalDocumentSyncResponse).toMatchObject({
      outcome: 'updated',
      revision: 2,
      document: { thumbnail_url: null, excerpt: '' },
    });
  });

  it('docs:writeの無いPublisher tokenは拒否する', async () => {
    const response = await GET(new Request(URL, { headers: await headers('publish:write') }), PARAMS);
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'missing_scope' });
  });

  it('外部repository相対画像は本文へ保持しつつauto thumbnailにはせず作成できる', async () => {
    const body = '![表紙](./assets/cover.png)\n\n相対画像を含む説明です。';
    const response = await PUT(putRequest(await headers(), body), PARAMS);
    expect(response.status).toBe(201);
    expect((await response.json()) as ExternalDocumentSyncResponse).toMatchObject({
      outcome: 'created',
      document: {
        body_markdown: body,
        thumbnail_url: null,
        excerpt: '相対画像を含む説明です。',
        asset_summary: { image_count: 1, has_table: false, has_code: false },
      },
    });
  });

  it('宣言されたJSONサイズが上限を超える場合はDBへ触れる前に413で拒否する', async () => {
    const requestHeaders = await headers();
    requestHeaders.set('content-length', '1250001');
    const response = await PUT(putRequest(requestHeaders, '# 小さい実体'), PARAMS);
    expect(response.status).toBe(413);
    expect(await db.repository.getExternalDocument({ tenantId: TENANT_A }, SOURCE, EXTERNAL_ID)).toBeNull();
  });
});
