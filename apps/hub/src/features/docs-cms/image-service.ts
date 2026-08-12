/**
 * docs-cms 画像アセットのアップロード/取得ロジック。
 *
 * R2 キーは `docs/{tenantId}/{docId}/{ulid}.{ext}` で衝突しない形式にする。
 * サイズ上限・許可 MIME はここで一元的にサーバ側検証する (クライアント側の検証は信頼しない)。
 */
import type { DocsAssetsBucketLike } from './image-runtime.js';

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB

export const ALLOWED_IMAGE_MIME_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export interface ImageValidationError {
  readonly code: 'unsupported_media_type' | 'payload_too_large';
  readonly message: string;
}

export function validateImageUpload(
  contentType: string | null,
  sizeBytes: number,
): { readonly ok: true; readonly ext: string } | { readonly ok: false; readonly error: ImageValidationError } {
  const normalized = (contentType ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
  const ext = ALLOWED_IMAGE_MIME_TYPES[normalized];
  if (ext === undefined) {
    return {
      ok: false,
      error: {
        code: 'unsupported_media_type',
        message: `許可されていない画像形式です (png/jpeg/webp/gif のみ): ${contentType ?? '(不明)'}`,
      },
    };
  }
  if (sizeBytes > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      error: {
        code: 'payload_too_large',
        message: `画像サイズが上限 (${MAX_IMAGE_BYTES / (1024 * 1024)}MB) を超えています`,
      },
    };
  }
  return { ok: true, ext };
}

export function docsImageR2Key(tenantId: string, documentId: string, imageId: string): string {
  return `docs/${tenantId}/${documentId}/${imageId}`;
}

export function newImageId(ext: string): string {
  return `${crypto.randomUUID()}.${ext}`;
}

export interface DocsImageService {
  upload(
    tenantId: string,
    documentId: string,
    contentType: string,
    bytes: Uint8Array,
  ): Promise<
    { readonly ok: true; readonly imageId: string } | { readonly ok: false; readonly error: ImageValidationError }
  >;
  fetch(
    tenantId: string,
    documentId: string,
    imageId: string,
  ): Promise<{ readonly body: ReadableStream<Uint8Array>; readonly contentType: string } | null>;
}

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

export function createDocsImageService(bucket: DocsAssetsBucketLike): DocsImageService {
  return {
    async upload(tenantId, documentId, contentType, bytes) {
      const validated = validateImageUpload(contentType, bytes.byteLength);
      if (!validated.ok) return { ok: false, error: validated.error };
      const imageId = newImageId(validated.ext);
      await bucket.put(docsImageR2Key(tenantId, documentId, imageId), bytes, {
        httpMetadata: { contentType },
      });
      return { ok: true, imageId };
    },

    async fetch(tenantId, documentId, imageId) {
      // imageId に経路要素 (`/`, `..`) が混じっていると key が document 境界を越えうるので拒否する。
      if (!/^[A-Za-z0-9-]+\.[A-Za-z0-9]+$/.test(imageId)) return null;
      const object = await bucket.get(docsImageR2Key(tenantId, documentId, imageId));
      if (object === null) return null;
      const ext = imageId.split('.').pop() ?? '';
      const contentType = object.httpMetadata?.contentType ?? CONTENT_TYPE_BY_EXT[ext] ?? 'application/octet-stream';
      return { body: object.body, contentType };
    },
  };
}
