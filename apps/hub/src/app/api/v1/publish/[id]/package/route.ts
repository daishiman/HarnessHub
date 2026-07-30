/**
 * `PUT /api/v1/publish/{id}/package` — パッケージ本体 (ZIP) のアップロード。
 *
 * 本文が JSON ではない唯一の経路。冪等鍵の指紋には**バイト列の SHA-256** を使う。
 * 生バイトを文字列化して渡すと不正な UTF-8 が置換文字へ潰れ、
 * 「中身が違うのに同じ指紋」が起こりうる (= 別のパッケージが再生されてしまう)。
 *
 * サイズ・構造の検査は service (→ `inspectPackageArchive`) が行う。ここでは
 * 「読み込む前に Content-Length で明らかな超過を弾く」だけを担う — 上限超えの本文を
 * 最後まで読み切ってから断るのは、断る理由そのものと矛盾する。
 */

import { ARCHIVE_LIMITS } from '@harness-hub/inspection';
import { packageUploadResponseSchema } from '@harness-hub/schemas';

import { authRuntime, withAuthz } from '../../../../../../lib/authz/index.js';
import {
  checkPublishRateLimit,
  jsonFailure,
  jsonOk,
  publishRuntime,
  publishScopeOf,
  rateLimitHeaders,
  readRequestBodyBounded,
  resolvePublishRequestResource,
  uploadPublishPackage,
  withIdempotency,
  withRateLimitHeaders,
} from '../../../../../../lib/publish/index.js';

interface PackageRouteParams {
  readonly id: string;
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export const PUT = withAuthz<PackageRouteParams>(
  {
    action: 'publish.write',
    deps: () => authRuntime().authz,
    resolveResource: async (request, params, principal) => resolvePublishRequestResource(request, params.id, principal),
  },
  async (request, authz, params) => {
    const scope = publishScopeOf(authz);
    const runtime = await publishRuntime();
    const limit = checkPublishRateLimit(scope, 'publish.package', runtime.ports.clock);
    if (limit.rejection !== null) return limit.rejection;

    const finish = (response: Response) =>
      withRateLimitHeaders(response, rateLimitHeaders(limit.decision, limit.nowMs));

    const bytes = await readRequestBodyBounded(request, ARCHIVE_LIMITS.maxCompressedBytes);
    if (bytes === null) {
      return finish(
        Response.json({ error: 'package_rejected' }, { status: 413, headers: { 'cache-control': 'no-store' } }),
      );
    }

    const fingerprint = toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)));

    return finish(
      await withIdempotency(
        request,
        {
          ledgerScope: 'publish.package',
          deps: { idempotency: runtime.ports.idempotency, clock: runtime.ports.clock },
          scope,
          rawBody: fingerprint,
        },
        async () => {
          const result = await uploadPublishPackage(runtime, scope, params.id, bytes);
          if (!result.ok) return jsonFailure(result);
          return jsonOk(
            packageUploadResponseSchema.parse({
              content_hash: result.value.contentHash,
              size_bytes: result.value.sizeBytes,
            }),
          );
        },
      ),
    );
  },
);
