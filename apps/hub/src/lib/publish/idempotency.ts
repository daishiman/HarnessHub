/**
 * Idempotency-Key の検査・記録・再生 (ADR AD-10)。
 *
 * 「同じ鍵で 2 回目が来たら 1 回目の応答をそのまま返す」を **1 箇所に閉じる**。
 * route ごとに書くと、記録し忘れた route が 1 つあるだけで、そこだけ二重公開が起きる。
 *
 * 3 つの結果を区別する:
 *   - 鍵が無い          → 400。既定値を与えて通すと、再試行安全性が「client 次第」になる
 *   - 鍵が同じ + 内容も同じ → 1 回目の応答を再生 (再実行しない)
 *   - 鍵が同じ + 内容が違う → 422。同じ鍵で別の要求を通すと、鍵が識別子として機能しなくなる
 */

import { idempotencyKeySchema } from '@harness-hub/schemas';

import type { ClockPort, IdempotencyPort, PublishScope } from './ports.js';

/** RFC 準拠の慣行に合わせた header 名。fetch の header 名は大小無視で引ける。 */
export const IDEMPOTENCY_HEADER = 'idempotency-key';

/** 再生済み応答であることの印。client が「本当に今作られたのか」を判別できるようにする。 */
export const IDEMPOTENCY_REPLAY_HEADER = 'idempotency-replayed';

/**
 * 台帳の保持期間。24 時間。
 * 短いと正当な再試行 (ネットワーク断からの復帰) が「新規要求」に化けて二重公開になる。
 * 長すぎると、鍵を使い回す client の誤りが何日も 422 として残る。
 */
export const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * 本文を持てない status (fetch 仕様の null body status)。
 *
 * ここへ本文を渡すと `new Response()` の構築自体が TypeError になる。空文字も「本文あり」扱いなので、
 * 記録した本文をそのまま渡す実装だと 204 を返す endpoint に本 wrapper を付けた瞬間に 500 になる。
 * 「今そういう endpoint が無い」ことに依存させないため、ここで明示的に落とす。
 */
const NULL_BODY_STATUSES: ReadonlySet<number> = new Set([101, 103, 204, 205, 304]);

export interface IdempotencyDeps {
  readonly idempotency: IdempotencyPort;
  readonly clock: ClockPort;
}

export interface WithIdempotencyOptions {
  /** 台帳の scope。`(tenant, endpoint)` 単位で分ける — 別 endpoint の鍵と衝突させないため。 */
  readonly ledgerScope: string;
  readonly deps: IdempotencyDeps;
  readonly scope: PublishScope;
  /** 要求本文 (既に読み終えたもの)。Request を 2 回読めないため呼び出し側から渡す。 */
  readonly rawBody: string;
}

/** 要求内容の指紋。method と path も含めるのは、同じ鍵で別 endpoint を叩く誤用を検出するため。 */
async function requestFingerprint(request: Request, rawBody: string): Promise<string> {
  const canonical = `${request.method}\n${new URL(request.url).pathname}\n${rawBody}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function errorResponse(status: number, error: string): Response {
  return Response.json({ error }, { status, headers: { 'cache-control': 'no-store' } });
}

/**
 * 冪等性で包む。
 *
 * 記録するのは **2xx のみ**。失敗応答まで記録すると、原因を直して同じ鍵で再送しても
 * 失敗が再生され続け、client は鍵を変えるしかなくなる (= 冪等鍵の意味が失われる)。
 */
export async function withIdempotency(
  request: Request,
  options: WithIdempotencyOptions,
  handler: () => Promise<Response>,
): Promise<Response> {
  const rawKey = request.headers.get(IDEMPOTENCY_HEADER);
  const key = idempotencyKeySchema.safeParse(rawKey?.trim() ?? '');
  if (!key.success) return errorResponse(400, 'idempotency_key_required');

  const fingerprint = await requestFingerprint(request, options.rawBody);
  const existing = await options.deps.idempotency.get(options.scope, options.ledgerScope, key.data);

  if (existing !== null && existing.expiresAt > options.deps.clock.nowMs()) {
    if (existing.requestHash !== fingerprint) return errorResponse(422, 'idempotency_key_reused');
    const bodyless = NULL_BODY_STATUSES.has(existing.responseStatus);
    return new Response(bodyless ? null : existing.responseBodyJson, {
      status: existing.responseStatus,
      headers: {
        // 本文が無い応答に content-type を付けない。付けると「空の JSON がある」と読める
        ...(bodyless ? {} : { 'content-type': 'application/json' }),
        'cache-control': 'no-store',
        [IDEMPOTENCY_REPLAY_HEADER]: 'true',
      },
    });
  }

  const response = await handler();
  if (response.status < 200 || response.status >= 300) return response;

  // 応答本文は 1 度しか読めないので複製してから読む
  const body = await response.clone().text();
  await options.deps.idempotency.put(options.scope, options.ledgerScope, key.data, {
    requestHash: fingerprint,
    responseStatus: response.status,
    responseBodyJson: body,
    // 並行する同一鍵要求の敗者は onConflictDoNothing で捨てられる。両者とも同じ要求内容なので、
    // 記録が勝者のものになっても再生結果は変わらない
    expiresAt: options.deps.clock.nowMs() + IDEMPOTENCY_TTL_MS,
  });
  return response;
}
