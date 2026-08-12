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

interface DetectedImageType {
  readonly contentType: string;
  readonly ext: string;
}

function hasPrefix(bytes: Uint8Array, expected: readonly number[], offset = 0): boolean {
  return expected.every((byte, index) => bytes[offset + index] === byte);
}

/** 拡張子や自己申告 Content-Type ではなく、先頭 magic bytes から画像形式を判定する。 */
export function detectImageType(bytes: Uint8Array): DetectedImageType | null {
  if (bytes.length >= 8 && hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { contentType: 'image/png', ext: 'png' };
  }
  if (bytes.length >= 3 && hasPrefix(bytes, [0xff, 0xd8, 0xff])) {
    return { contentType: 'image/jpeg', ext: 'jpg' };
  }
  if (
    bytes.length >= 6 &&
    (hasPrefix(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) || hasPrefix(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))
  ) {
    return { contentType: 'image/gif', ext: 'gif' };
  }
  if (
    bytes.length >= 12 &&
    hasPrefix(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    hasPrefix(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return { contentType: 'image/webp', ext: 'webp' };
  }
  return null;
}

export function validateImageUpload(
  contentType: string | null,
  sizeBytes: number,
  signatureBytes: Uint8Array,
):
  | { readonly ok: true; readonly ext: string; readonly contentType: string }
  | { readonly ok: false; readonly error: ImageValidationError } {
  const normalized = (contentType ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
  if (ALLOWED_IMAGE_MIME_TYPES[normalized] === undefined) {
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
  const detected = detectImageType(signatureBytes);
  if (detected === null || detected.contentType !== normalized) {
    return {
      ok: false,
      error: {
        code: 'unsupported_media_type',
        message: '画像の実データ形式が Content-Type と一致しません',
      },
    };
  }
  return { ok: true, ext: detected.ext, contentType: detected.contentType };
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
    body: ReadableStream<Uint8Array>,
    declaredSizeBytes?: number | undefined,
  ): Promise<
    { readonly ok: true; readonly imageId: string } | { readonly ok: false; readonly error: ImageValidationError }
  >;
  fetch(
    tenantId: string,
    documentId: string,
    imageId: string,
  ): Promise<{ readonly body: ReadableStream<Uint8Array>; readonly contentType: string } | null>;
  delete(tenantId: string, documentId: string, imageId: string): Promise<boolean>;
}

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

const SIGNATURE_BYTES = 12;

class ImageBodyLimitError extends Error {
  constructor() {
    super('image body exceeded configured limit');
    this.name = 'ImageBodyLimitError';
  }
}

function tooLargeError(): ImageValidationError {
  return {
    code: 'payload_too_large',
    message: `画像サイズが上限 (${MAX_IMAGE_BYTES / (1024 * 1024)}MB) を超えています`,
  };
}

async function prepareUploadStream(
  contentType: string,
  body: ReadableStream<Uint8Array>,
  declaredSizeBytes: number | undefined,
): Promise<
  | {
      readonly ok: true;
      readonly stream: ReadableStream<Uint8Array>;
      readonly ext: string;
      readonly contentType: string;
      readonly exceededSizeLimit: () => boolean;
    }
  | { readonly ok: false; readonly error: ImageValidationError }
> {
  if (declaredSizeBytes !== undefined && declaredSizeBytes > MAX_IMAGE_BYTES) {
    await body.cancel();
    return { ok: false, error: tooLargeError() };
  }

  const reader = body.getReader();
  const buffered: Uint8Array[] = [];
  const signature = new Uint8Array(SIGNATURE_BYTES);
  let signatureLength = 0;
  let totalBytes = 0;
  let inputDone = false;
  let sizeLimitExceeded = false;

  while (signatureLength < SIGNATURE_BYTES && !inputDone) {
    const next = await reader.read();
    inputDone = next.done;
    if (next.done) break;
    totalBytes += next.value.byteLength;
    if (totalBytes > MAX_IMAGE_BYTES) {
      await reader.cancel();
      return { ok: false, error: tooLargeError() };
    }
    buffered.push(next.value);
    const copyLength = Math.min(next.value.byteLength, SIGNATURE_BYTES - signatureLength);
    signature.set(next.value.subarray(0, copyLength), signatureLength);
    signatureLength += copyLength;
  }

  const validated = validateImageUpload(contentType, totalBytes, signature.subarray(0, signatureLength));
  if (!validated.ok) {
    await reader.cancel();
    return { ok: false, error: validated.error };
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of buffered) controller.enqueue(chunk);
      if (inputDone) controller.close();
    },
    async pull(controller) {
      if (inputDone) return;
      try {
        const next = await reader.read();
        inputDone = next.done;
        if (next.done) {
          controller.close();
          return;
        }
        totalBytes += next.value.byteLength;
        if (totalBytes > MAX_IMAGE_BYTES) {
          sizeLimitExceeded = true;
          await reader.cancel();
          controller.error(new ImageBodyLimitError());
          return;
        }
        controller.enqueue(next.value);
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel(reason) {
      await reader.cancel(reason);
    },
  });

  return {
    ok: true,
    stream,
    ext: validated.ext,
    contentType: validated.contentType,
    exceededSizeLimit: () => sizeLimitExceeded,
  };
}

function validImageId(imageId: string): boolean {
  return /^[A-Za-z0-9-]+\.(?:png|jpg|webp|gif)$/.test(imageId);
}

export function createDocsImageService(bucket: DocsAssetsBucketLike): DocsImageService {
  return {
    async upload(tenantId, documentId, contentType, body, declaredSizeBytes) {
      const prepared = await prepareUploadStream(contentType, body, declaredSizeBytes);
      if (!prepared.ok) return { ok: false, error: prepared.error };
      const imageId = newImageId(prepared.ext);
      const objectKey = docsImageR2Key(tenantId, documentId, imageId);
      try {
        await bucket.put(objectKey, prepared.stream, {
          httpMetadata: { contentType: prepared.contentType },
        });
        // R2 は stream error で put を reject する契約だが、binding 実装が error を
        // ラップ／吸収しても oversized object を確定させないよう明示的に後検査する。
        if (prepared.exceededSizeLimit()) {
          await bucket.delete(objectKey);
          return { ok: false, error: tooLargeError() };
        }
      } catch (error) {
        if (error instanceof ImageBodyLimitError || prepared.exceededSizeLimit()) {
          // put は stream error 時に atomic に失敗するが、binding 実装差に対する防御としても削除する。
          await bucket.delete(objectKey);
          return { ok: false, error: tooLargeError() };
        }
        throw error;
      }
      return { ok: true, imageId };
    },

    async fetch(tenantId, documentId, imageId) {
      // imageId に経路要素 (`/`, `..`) が混じっていると key が document 境界を越えうるので拒否する。
      if (!validImageId(imageId)) return null;
      const object = await bucket.get(docsImageR2Key(tenantId, documentId, imageId));
      if (object === null) return null;
      const ext = imageId.split('.').pop() ?? '';
      const contentType = object.httpMetadata?.contentType ?? CONTENT_TYPE_BY_EXT[ext] ?? 'application/octet-stream';
      return { body: object.body, contentType };
    },

    async delete(tenantId, documentId, imageId) {
      if (!validImageId(imageId)) return false;
      await bucket.delete(docsImageR2Key(tenantId, documentId, imageId));
      return true;
    },
  };
}
