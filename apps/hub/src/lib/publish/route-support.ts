/**
 * route が繰り返し必要とする組み立て。**12 経路で同じ書き方になる部分だけ**を置く。
 *
 * ここへ業務判断を置かない (それは `service.ts` の仕事)。ここにあるのは
 * 「認可済み context から scope を作る」「失敗 code を status へ写す」「本文を検証する」の 3 つで、
 * どれも route ごとに書くと 12 回書き写すことになり、1 箇所だけ違う実装が必ず生まれる。
 */

import type { ZodType } from 'zod';
import type { AuthzContext } from '../authz/index.js';

import { withIdempotency } from './idempotency.js';
import type { PublishScope } from './ports.js';
import { checkPublishRateLimit, rateLimitHeaders } from './rate-limit.js';
import { createPublishRuntime, type PublishRuntime } from './runtime.js';
import { PUBLISH_ERROR_STATUS, type PublishErrorCode, type PublishFailure } from './service.js';

/** JSON endpoint の本文上限。ZIP は inspection 側の 10 MiB 契約を使う。 */
export const PUBLISH_JSON_BODY_MAX_BYTES = 64 * 1024;

/**
 * Request 本文を上限までストリームで読む。
 *
 * `request.text()` / `request.arrayBuffer()` は Content-Length が無い chunked body を
 * 無制限にバッファする。上限を超えた時点で reader を cancel し、Worker のメモリを守る。
 */
export async function readRequestBodyBounded(
  request: Request,
  maxBytes: number,
): Promise<Uint8Array<ArrayBuffer> | null> {
  const declaredHeader = request.headers.get('content-length');
  if (declaredHeader !== null) {
    const declared = Number(declaredHeader);
    if (Number.isFinite(declared) && declared > maxBytes) return null;
  }

  if (request.body === null) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel('request body exceeds configured limit');
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/**
 * 認可済み context → DB スコープ。
 *
 * `tenantId` は **principal ではなく resource** から取る。`withAuthz` は既に越境を落としており、
 * ここまで来た resource.tenantId は「操作してよいと判定されたテナント」である。
 * principal 側から取ると provider-admin の正当な越境操作が自テナントへ書き込まれてしまう。
 */
export function publishScopeOf(authz: AuthzContext): PublishScope {
  return {
    tenantId: authz.resource.tenantId,
    workspaceId: authz.resource.workspaceId ?? undefined,
    actorId: authz.principal.userId,
  };
}

export function jsonOk(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

/** 業務失敗 → 応答。findings があれば返す (利用者が自分で直せる情報なので隠さない)。 */
export function jsonFailure(failure: PublishFailure): Response {
  const body =
    failure.findings === undefined ? { error: failure.code } : { error: failure.code, findings: failure.findings };
  return Response.json(body, {
    status: PUBLISH_ERROR_STATUS[failure.code],
    headers: { 'cache-control': 'no-store' },
  });
}

export function jsonError(code: PublishErrorCode | 'invalid_body' | 'invalid_query', status: number): Response {
  return Response.json({ error: code }, { status, headers: { 'cache-control': 'no-store' } });
}

/**
 * runtime の遅延生成。
 *
 * module 読み込み時に作らないのは、route file の import だけで環境変数と binding を要求してしまうと
 * 設定が足りない環境で**全ての** route が 500 になるため (認可の 401 すら返せなくなる)。
 */
let cached: Promise<PublishRuntime> | null = null;

export function publishRuntime(): Promise<PublishRuntime> {
  cached ??= createPublishRuntime();
  return cached;
}

/** テストが実体を差し替えるための口。本番経路からは呼ばない。 */
export function setPublishRuntimeForTest(runtime: PublishRuntime | null): void {
  cached = runtime === null ? null : Promise.resolve(runtime);
}

export interface MutationOptions<T> {
  readonly ledgerScope: string;
  readonly schema?: ZodType<T>;
}

/** 判定結果を応答へ載せる。応答は immutable なので header を足すには作り直すしかない。 */
export function withRateLimitHeaders(response: Response, headers: Record<string, string>): Response {
  const merged = new Headers(response.headers);
  for (const [name, value] of Object.entries(headers)) merged.set(name, value);
  // 本文を持てない status に本文を渡すと `new Response()` が TypeError になる。
  // `response.body` は元が bodyless なら null なので、そのまま渡せば両方の場合を満たす
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: merged });
}

/**
 * 変更系 route の共通殻: 上限判定 → 本文を 1 度だけ読む → 冪等性で包む → schema 検証 → handler。
 *
 * 上限判定を先頭に置くのは、拒否する要求に本文 (最大 10 MiB の ZIP) の転送と
 * 冪等台帳の読み取りを払わせないため。
 *
 * 本文を殻側で読むのは `Request` の body が 1 度しか読めないためで、
 * 冪等鍵の指紋計算と schema 検証の両方が同じ生文字列を必要とする。
 * handler へ `Request` を再度渡さないのは、そこで読み直して空になる事故を構造的に防ぐため。
 */
export async function withPublishMutation<T>(
  request: Request,
  authz: AuthzContext,
  options: MutationOptions<T>,
  handler: (input: T, runtime: PublishRuntime, scope: PublishScope) => Promise<Response>,
): Promise<Response> {
  const scope = publishScopeOf(authz);
  const runtime = await publishRuntime();

  const limit = checkPublishRateLimit(scope, options.ledgerScope, runtime.ports.clock);
  if (limit.rejection !== null) return limit.rejection;

  const rawBytes = await readRequestBodyBounded(request, PUBLISH_JSON_BODY_MAX_BYTES);
  if (rawBytes === null) return jsonError('invalid_body', 413);
  const rawBody = new TextDecoder().decode(rawBytes);

  const response = await withIdempotency(
    request,
    {
      ledgerScope: options.ledgerScope,
      deps: { idempotency: runtime.ports.idempotency, clock: runtime.ports.clock },
      scope,
      rawBody,
    },
    async () => {
      if (options.schema === undefined) return handler(undefined as T, runtime, scope);

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(rawBody);
      } catch {
        return jsonError('invalid_body', 400);
      }
      const parsed = options.schema.safeParse(parsedJson);
      if (!parsed.success) return jsonError('invalid_body', 400);
      return handler(parsed.data, runtime, scope);
    },
  );

  return withRateLimitHeaders(response, rateLimitHeaders(limit.decision, limit.nowMs));
}
