/**
 * tenant-data endpoint のレート制限 (AD-4 確定値)。
 *
 * `lib/publish/rate-limit.ts` の `createFixedWindowRateLimiter` (固定窓カウンタ) をそのまま再利用する。
 * 実装をここへ複製しないのは、複製すると「境界の burst 挙動」の保証 (rate-limit.test.ts で固定) が
 * 2 箇所で乖離しうるため。保存先の限界 (isolate 内メモリ) も publish と同じなので同じ注記を繰り返さない。
 */

import { createFixedWindowRateLimiter, type RateLimitDecision, type RateLimitPort } from '../publish/rate-limit.js';

/** AD-4 で確定した endpoint 別の上限 (req/min/principal)。 */
export const TENANT_DATA_RATE_LIMITS = {
  upload: { maxRequests: 20, windowMs: 60_000 },
  list: { maxRequests: 120, windowMs: 60_000 },
  read: { maxRequests: 120, windowMs: 60_000 },
  readContent: { maxRequests: 60, windowMs: 60_000 },
  delete: { maxRequests: 20, windowMs: 60_000 },
} as const;

export type TenantDataRateLimitScope = keyof typeof TENANT_DATA_RATE_LIMITS;

/** `(tenant, actor, endpoint)` で分ける。理由は `publishRateLimitBucket` と同じ。 */
export function tenantDataRateLimitBucket(tenantId: string, actorId: string, scope: TenantDataRateLimitScope): string {
  return `${tenantId}\n${actorId}\n${scope}`;
}

const limiters: Record<TenantDataRateLimitScope, RateLimitPort> = {
  upload: createFixedWindowRateLimiter(TENANT_DATA_RATE_LIMITS.upload),
  list: createFixedWindowRateLimiter(TENANT_DATA_RATE_LIMITS.list),
  read: createFixedWindowRateLimiter(TENANT_DATA_RATE_LIMITS.read),
  readContent: createFixedWindowRateLimiter(TENANT_DATA_RATE_LIMITS.readContent),
  delete: createFixedWindowRateLimiter(TENANT_DATA_RATE_LIMITS.delete),
};

/** テストが実体を差し替えるための口。本番経路からは呼ばない。 */
export function setTenantDataRateLimiterForTest(
  scope: TenantDataRateLimitScope,
  replacement: RateLimitPort | null,
): void {
  limiters[scope] = replacement ?? createFixedWindowRateLimiter(TENANT_DATA_RATE_LIMITS[scope]);
}

/** 429 応答。header は `rate-limit.ts` の `RATE_LIMIT_HEADERS` と同じ語彙に揃える。 */
function tooManyRequests(decision: RateLimitDecision, nowMs: number): Response {
  const retryAfterSeconds = Math.max(1, Math.ceil((decision.resetAtMs - nowMs) / 1000));
  return Response.json(
    { error: 'rate_limited' },
    {
      status: 429,
      headers: {
        'cache-control': 'no-store',
        'retry-after': String(retryAfterSeconds),
        'ratelimit-limit': String(decision.limit),
        'ratelimit-remaining': String(decision.remaining),
        'ratelimit-reset': String(retryAfterSeconds),
      },
    },
  );
}

/** 変更・読み取り系 route の共通上限判定。許可なら null、超過なら 429 応答を返す。 */
export function checkTenantDataRateLimit(
  tenantId: string,
  actorId: string,
  scope: TenantDataRateLimitScope,
  nowMs: number,
): { readonly rejection: Response | null; readonly decision: RateLimitDecision } {
  const decision = limiters[scope].consume(tenantDataRateLimitBucket(tenantId, actorId, scope), nowMs);
  return { rejection: decision.allowed ? null : tooManyRequests(decision, nowMs), decision };
}
