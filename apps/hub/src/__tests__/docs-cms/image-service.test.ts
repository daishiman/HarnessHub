// DOCS-IMG-*: 画像アップロード/取得サービスの検証ロジックと R2 key 設計。
// route レベルの authz ゲート自体は authz-contract.test.ts の静的スキャン (DOCS-AUTHZ-007) が
// features/docs-cms 配下全体を対象にしており、新規 image-runtime/image-service もその対象に含まれる。

import { describe, expect, it } from 'vitest';

import type { DocsAssetsBucketLike } from '../../features/docs-cms/image-runtime.js';
import {
  createDocsImageService,
  detectImageType,
  docsImageR2Key,
  MAX_IMAGE_BYTES,
  validateImageUpload,
} from '../../features/docs-cms/image-service.js';

const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SIGNATURE = new Uint8Array([0xff, 0xd8, 0xff, 0xdb]);

function streamFromChunks(...chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}

describe('DOCS-IMG: validateImageUpload', () => {
  it('DOCS-IMG-001: 許可 MIME を受理して拡張子を返す', () => {
    const result = validateImageUpload('image/png', PNG_SIGNATURE.byteLength, PNG_SIGNATURE);
    expect(result).toEqual({ ok: true, ext: 'png', contentType: 'image/png' });
  });

  it('DOCS-IMG-002: 許可されていない MIME を拒否する', () => {
    const result = validateImageUpload('image/svg+xml', PNG_SIGNATURE.byteLength, PNG_SIGNATURE);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.error.code).toBe('unsupported_media_type');
  });

  it('DOCS-IMG-003: サイズ上限を超えたら拒否する', () => {
    const result = validateImageUpload('image/jpeg', MAX_IMAGE_BYTES + 1, JPEG_SIGNATURE);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.error.code).toBe('payload_too_large');
  });

  it('DOCS-IMG-004: charset 付き content-type も正しく解釈する', () => {
    const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    const result = validateImageUpload('image/webp; charset=binary', webp.byteLength, webp);
    expect(result).toEqual({ ok: true, ext: 'webp', contentType: 'image/webp' });
  });

  it('DOCS-IMG-010: Content-Type と magic bytes が違う偽装画像を拒否する', () => {
    const result = validateImageUpload('image/png', JPEG_SIGNATURE.byteLength, JPEG_SIGNATURE);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.error.code).toBe('unsupported_media_type');
  });

  it('DOCS-IMG-011: magic bytes から対応形式を判定する', () => {
    expect(detectImageType(PNG_SIGNATURE)).toEqual({ contentType: 'image/png', ext: 'png' });
    expect(detectImageType(new Uint8Array([1, 2, 3, 4]))).toBeNull();
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
      let data: Uint8Array;
      if (value instanceof ReadableStream) {
        const reader = value.getReader();
        const chunks: Uint8Array[] = [];
        let total = 0;
        while (true) {
          const next = await reader.read();
          if (next.done) break;
          chunks.push(next.value);
          total += next.value.byteLength;
        }
        data = new Uint8Array(total);
        let offset = 0;
        for (const chunk of chunks) {
          data.set(chunk, offset);
          offset += chunk.byteLength;
        }
      } else {
        data = value instanceof Uint8Array ? value : new Uint8Array(value);
      }
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
    async delete(key) {
      store.delete(key);
    },
  };
}

describe('DOCS-IMG: createDocsImageService', () => {
  it('DOCS-IMG-006: upload → fetch で同じ内容が読み戻せる', async () => {
    const bucket = fakeBucket();
    const service = createDocsImageService(bucket);
    const bytes = PNG_SIGNATURE;

    const uploaded = await service.upload('tenant-a', 'doc-1', 'image/png', streamFromChunks(bytes), bytes.byteLength);
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
    const result = await service.upload('tenant-a', 'doc-1', 'text/plain', streamFromChunks(new Uint8Array([1])));
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

  it('DOCS-IMG-012: Content-Length が無い stream でも上限超過を中断し R2 に確定しない', async () => {
    const bucket = fakeBucket();
    const service = createDocsImageService(bucket);
    const oversizedRemainder = new Uint8Array(MAX_IMAGE_BYTES);

    const result = await service.upload(
      'tenant-a',
      'doc-1',
      'image/png',
      streamFromChunks(PNG_SIGNATURE, oversizedRemainder),
    );

    expect(result).toMatchObject({ ok: false, error: { code: 'payload_too_large' } });
    expect(bucket.store.size).toBe(0);
  });

  it('DOCS-IMG-013: delete は document owner tenant の key だけを削除する', async () => {
    const bucket = fakeBucket();
    const service = createDocsImageService(bucket);
    const uploaded = await service.upload(
      'owner-tenant',
      'doc-1',
      'image/png',
      streamFromChunks(PNG_SIGNATURE),
      PNG_SIGNATURE.byteLength,
    );
    if (!uploaded.ok) throw new Error('upload must succeed');

    await expect(service.delete('viewer-tenant', 'doc-1', uploaded.imageId)).resolves.toBe(true);
    expect(bucket.store.size).toBe(1);
    await expect(service.delete('owner-tenant', 'doc-1', uploaded.imageId)).resolves.toBe(true);
    expect(bucket.store.size).toBe(0);
  });
});
