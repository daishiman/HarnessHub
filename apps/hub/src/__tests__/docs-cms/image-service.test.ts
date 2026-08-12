// DOCS-IMG-*: 画像アップロード/取得サービスの検証ロジックと R2 key 設計。
// route レベルの authz ゲート自体は authz-contract.test.ts の静的スキャン (DOCS-AUTHZ-007) が
// features/docs-cms 配下全体を対象にしており、新規 image-runtime/image-service もその対象に含まれる。

import { describe, expect, it } from 'vitest';

import type { DocsAssetsBucketLike } from '../../features/docs-cms/image-runtime.js';
import {
  createDocsImageService,
  docsImageR2Key,
  MAX_IMAGE_BYTES,
  validateImageUpload,
} from '../../features/docs-cms/image-service.js';

describe('DOCS-IMG: validateImageUpload', () => {
  it('DOCS-IMG-001: 許可 MIME を受理して拡張子を返す', () => {
    const result = validateImageUpload('image/png', 1024);
    expect(result).toEqual({ ok: true, ext: 'png' });
  });

  it('DOCS-IMG-002: 許可されていない MIME を拒否する', () => {
    const result = validateImageUpload('image/svg+xml', 1024);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.error.code).toBe('unsupported_media_type');
  });

  it('DOCS-IMG-003: サイズ上限を超えたら拒否する', () => {
    const result = validateImageUpload('image/jpeg', MAX_IMAGE_BYTES + 1);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.error.code).toBe('payload_too_large');
  });

  it('DOCS-IMG-004: charset 付き content-type も正しく解釈する', () => {
    const result = validateImageUpload('image/webp; charset=binary', 1024);
    expect(result).toEqual({ ok: true, ext: 'webp' });
  });
});

describe('DOCS-IMG: docsImageR2Key', () => {
  it('DOCS-IMG-005: docs/{tenantId}/{docId}/{imageId} を組み立てる', () => {
    expect(docsImageR2Key('tenant-a', 'doc-1', 'abc.png')).toBe('docs/tenant-a/doc-1/abc.png');
  });
});

function fakeBucket(): DocsAssetsBucketLike & {
  readonly store: Map<string, { data: Uint8Array; contentType: string }>;
} {
  const store = new Map<string, { data: Uint8Array; contentType: string }>();
  return {
    store,
    async put(key, value, options) {
      const data = value instanceof Uint8Array ? value : new Uint8Array(value);
      store.set(key, { data, contentType: options?.httpMetadata?.contentType ?? 'application/octet-stream' });
      return undefined;
    },
    async get(key) {
      const entry = store.get(key);
      if (entry === undefined) return null;
      return {
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(entry.data);
            controller.close();
          },
        }),
        httpMetadata: { contentType: entry.contentType },
      };
    },
  };
}

describe('DOCS-IMG: createDocsImageService', () => {
  it('DOCS-IMG-006: upload → fetch で同じ内容が読み戻せる', async () => {
    const bucket = fakeBucket();
    const service = createDocsImageService(bucket);
    const bytes = new Uint8Array([1, 2, 3, 4]);

    const uploaded = await service.upload('tenant-a', 'doc-1', 'image/png', bytes);
    expect(uploaded.ok).toBe(true);
    if (!uploaded.ok) throw new Error('unreachable');
    expect(uploaded.imageId).toMatch(/\.png$/);

    const fetched = await service.fetch('tenant-a', 'doc-1', uploaded.imageId);
    expect(fetched).not.toBeNull();
    expect(fetched?.contentType).toBe('image/png');
  });

  it('DOCS-IMG-007: 不正な MIME はアップロードを拒否し bucket へ書き込まない', async () => {
    const bucket = fakeBucket();
    const service = createDocsImageService(bucket);
    const result = await service.upload('tenant-a', 'doc-1', 'text/plain', new Uint8Array([1]));
    expect(result.ok).toBe(false);
    expect(bucket.store.size).toBe(0);
  });

  it('DOCS-IMG-008: 経路要素を含む imageId は拒否する (別 document の key を組み立てさせない)', async () => {
    const bucket = fakeBucket();
    const service = createDocsImageService(bucket);
    const fetched = await service.fetch('tenant-a', 'doc-1', '../../doc-2/secret.png');
    expect(fetched).toBeNull();
  });

  it('DOCS-IMG-009: 存在しない imageId は null を返す', async () => {
    const bucket = fakeBucket();
    const service = createDocsImageService(bucket);
    const fetched = await service.fetch('tenant-a', 'doc-1', 'not-found.png');
    expect(fetched).toBeNull();
  });
});
