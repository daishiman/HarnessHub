/**
 * docs-cms 画像アセットの composition root。
 *
 * `lib/publish/runtime.ts` と同型のパターン (Cloudflare context → binding、
 * ローカル/テストは process.env フォールバック、`put`/`get` が関数かどうかの実行時チェック) を
 * 踏襲する。publish 系のファイル自体は変更しない。
 *
 * 画像は非公開ドキュメントと同じ認証保護下に置く前提なので、この binding には
 * 署名なしの直接公開 URL を発行しない (常に API route 経由でストリームする)。
 */

/** Cloudflare R2Bucket 互換の最小型。docs 画像は content-type を保持する必要があるため、
 * packages/db の R2BucketLike (put/get/head のみ) より広い形を独自に持つ。 */
export interface DocsAssetsBucketLike {
  put(
    key: string,
    value: ArrayBuffer | Uint8Array | ReadableStream<Uint8Array>,
    options?: { readonly httpMetadata?: { readonly contentType?: string } },
  ): Promise<unknown>;
  get(key: string): Promise<{
    readonly body: ReadableStream<Uint8Array>;
    readonly httpMetadata?: { readonly contentType?: string };
    readonly size?: number;
  } | null>;
  delete(key: string): Promise<void>;
}

export interface DocsImagesRuntime {
  readonly bucket: DocsAssetsBucketLike;
}

export interface DocsImagesRuntimeEnv {
  readonly DOCS_ASSETS_BUCKET?: unknown;
  readonly [key: string]: unknown;
}

function isRuntimeEnv(value: unknown): value is DocsImagesRuntimeEnv {
  return value !== null && typeof value === 'object';
}

/**
 * Workers 上では Cloudflare context から、ローカル/テストは process.env から読む。
 * 動的 import が失敗しても「binding が無い」という扱える失敗に落とす (route ごと死なせない)。
 */
export async function readDocsImagesRuntimeEnv(): Promise<DocsImagesRuntimeEnv> {
  try {
    const mod = await import('@opennextjs/cloudflare');
    const env: unknown = mod.getCloudflareContext().env;
    if (!isRuntimeEnv(env)) throw new Error('Cloudflare runtime env が object ではありません');
    return env;
  } catch {
    return process.env as unknown as DocsImagesRuntimeEnv;
  }
}

function requireBucket(env: DocsImagesRuntimeEnv): DocsAssetsBucketLike {
  const bucket = env.DOCS_ASSETS_BUCKET;
  if (
    bucket === null ||
    typeof bucket !== 'object' ||
    typeof (bucket as { put?: unknown }).put !== 'function' ||
    typeof (bucket as { get?: unknown }).get !== 'function' ||
    typeof (bucket as { delete?: unknown }).delete !== 'function'
  ) {
    throw new Error('R2 binding DOCS_ASSETS_BUCKET が未設定です (wrangler.jsonc の r2_buckets を確認してください)');
  }
  return bucket as DocsAssetsBucketLike;
}

/**
 * binding が isolate ごとに与えられる値なのでキャッシュしない (publish/runtime.ts と同じ理由)。
 */
export async function docsImagesRuntime(): Promise<DocsImagesRuntime> {
  const env = await readDocsImagesRuntimeEnv();
  return { bucket: requireBucket(env) };
}
