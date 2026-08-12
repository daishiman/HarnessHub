import type { DocsCmsRepository, DocumentRow, RepositoryContext } from '@harness-hub/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DocsImagesRuntime } from '../../features/docs-cms/image-runtime.js';
import type { DocsCmsRuntime } from '../../features/docs-cms/runtime.js';
import type { AuthRuntime } from '../../lib/authz/runtime.js';

const authHolder = vi.hoisted(() => ({ current: null as AuthRuntime | null }));
const docsHolder = vi.hoisted(() => ({ current: null as DocsCmsRuntime | null }));
const imagesHolder = vi.hoisted(() => ({ current: null as DocsImagesRuntime | null }));

vi.mock('../../lib/authz/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/authz/index.js')>();
  return {
    ...actual,
    authRuntime: () => {
      if (authHolder.current === null) throw new Error('テスト用 authRuntime が未設定です');
      return authHolder.current;
    },
  };
});

vi.mock('../../features/docs-cms/runtime.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/docs-cms/runtime.js')>();
  return {
    ...actual,
    docsCmsRuntime: () => {
      if (docsHolder.current === null) throw new Error('テスト用 docs runtime が未設定です');
      return docsHolder.current;
    },
  };
});

vi.mock('../../features/docs-cms/image-runtime.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/docs-cms/image-runtime.js')>();
  return {
    ...actual,
    docsImagesRuntime: async () => {
      if (imagesHolder.current === null) throw new Error('テスト用 image runtime が未設定です');
      return imagesHolder.current;
    },
  };
});

import { TENANT_A, TENANT_B } from '../../../tests/auth-tenancy/support/in-memory-ports.js';
import {
  createTokenRouteHarness,
  sessionCookieFor,
  testUser,
} from '../../../tests/auth-tenancy/support/token-route-runtime.js';
import { GET } from '../../app/api/v1/docs/[id]/images/[imageId]/route.js';
import type { DocsAssetsBucketLike } from '../../features/docs-cms/image-runtime.js';

const VIEWER = testUser('tenant-b-viewer', { tenantId: TENANT_B, workspaceIds: [] });
const COMMON_DOC: DocumentRow = {
  id: 'doc-common',
  tenantId: TENANT_A,
  scope: 'common',
  title: '共通ガイド',
  bodyMarkdown: '![図](/api/v1/docs/doc-common/images/asset.png)',
  status: 'published',
  externalSource: null,
  externalDocumentId: null,
  externalContentHash: null,
  externalRevision: null,
  createdBy: 'provider',
  updatedBy: 'provider',
  createdAt: 1,
  updatedAt: 1,
  category: null,
  tags: null,
  thumbnailUrl: null,
  thumbnailSource: 'auto',
  excerpt: null,
  excerptSource: 'auto',
  assetSummary: null,
  publishAt: null,
};

function repositoryFor(row: DocumentRow | null, contexts: RepositoryContext[]): DocsCmsRepository {
  const unsupported = async (): Promise<never> => {
    throw new Error('このテストでは呼ばれない repository method です');
  };
  return {
    listDocuments: unsupported,
    async getDocument(context) {
      contexts.push(context);
      return row;
    },
    createDocument: unsupported,
    updateDocument: unsupported,
    publishDueDocuments: unsupported,
    getExternalDocument: unsupported,
    syncExternalDocument: unsupported,
    claimNextDocDraftJob: unsupported,
    completeDocDraftJob: unsupported,
    failDocDraftJob: unsupported,
    enqueueDocDraft: unsupported,
  };
}

function bucketThatRecords(readKeys: string[]): DocsAssetsBucketLike {
  return {
    async put() {
      throw new Error('GET では put しません');
    },
    async get(key) {
      readKeys.push(key);
      return {
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
            controller.close();
          },
        }),
        httpMetadata: { contentType: 'image/png' },
      };
    },
    async delete() {
      throw new Error('GET では delete しません');
    },
  };
}

describe('DOCS-IMG-HTTP: browser subresource auth', () => {
  beforeEach(() => {
    const harness = createTokenRouteHarness();
    harness.ports.users.put(VIEWER);
    authHolder.current = harness.runtime;
  });

  afterEach(() => {
    authHolder.current = null;
    docsHolder.current = null;
    imagesHolder.current = null;
  });

  it('DOCS-IMG-HTTP-001: tenant header 無しの img GET は session tenant で可視性を判定し owner tenant の R2 key を読む', async () => {
    const contexts: RepositoryContext[] = [];
    const readKeys: string[] = [];
    docsHolder.current = { repository: repositoryFor(COMMON_DOC, contexts) };
    imagesHolder.current = { bucket: bucketThatRecords(readKeys) };

    const response = await GET(
      new Request('https://hub.example.com/api/v1/docs/doc-common/images/asset.png', {
        headers: { cookie: await sessionCookieFor(VIEWER) },
      }),
      { params: Promise.resolve({ id: COMMON_DOC.id, imageId: 'asset.png' }) },
    );

    expect(response.status).toBe(200);
    expect(contexts.map((context) => context.tenantId)).toStrictEqual([TENANT_B]);
    expect(readKeys).toStrictEqual([`docs/${TENANT_A}/${COMMON_DOC.id}/asset.png`]);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('DOCS-IMG-HTTP-002: session が無い image GET は 401 で R2 を読まない', async () => {
    const contexts: RepositoryContext[] = [];
    const readKeys: string[] = [];
    docsHolder.current = { repository: repositoryFor(COMMON_DOC, contexts) };
    imagesHolder.current = { bucket: bucketThatRecords(readKeys) };

    const response = await GET(new Request('https://hub.example.com/api/v1/docs/doc-common/images/asset.png'), {
      params: Promise.resolve({ id: COMMON_DOC.id, imageId: 'asset.png' }),
    });

    expect(response.status).toBe(401);
    expect(contexts).toStrictEqual([]);
    expect(readKeys).toStrictEqual([]);
  });
});
