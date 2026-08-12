/**
 * 公開 hearing share の token 単位 rate limit。
 *
 * token 平文を bucket key に残さず、検証後の DB row ID だけを使う。固定窓の挙動と
 * 429 header は publish の共通実装を再利用し、別のカウンタ実装を作らない。
 */
import {
  createFixedWindowRateLimiter,
  type RateLimitDecision,
  type RateLimitPort,
  tooManyRequests,
} from '../publish/rate-limit.js';

export const HEARING_SHARE_RATE_LIMITS = {
  payload: { maxRequests: 120, windowMs: 60_000 },
  screenshot: { maxRequests: 60, windowMs: 60_000 },
} as const;

export type HearingShareRateLimitScope = keyof typeof HEARING_SHARE_RATE_LIMITS;

const limiters: Record<HearingShareRateLimitScope, RateLimitPort> = {
  payload: createFixedWindowRateLimiter(HEARING_SHARE_RATE_LIMITS.payload),
  screenshot: createFixedWindowRateLimiter(HEARING_SHARE_RATE_LIMITS.screenshot),
};

/** テスト差し替え口。null で scope の既定 limiter へ戻す。 */
export function setHearingShareRateLimiterForTest(
  scope: HearingShareRateLimitScope,
  replacement: RateLimitPort | null,
): void {
  limiters[scope] = replacement ?? createFixedWindowRateLimiter(HEARING_SHARE_RATE_LIMITS[scope]);
}

export function checkHearingShareRateLimit(
  tokenId: string,
  scope: HearingShareRateLimitScope,
  nowMs: number,
): { readonly rejection: Response | null; readonly decision: RateLimitDecision } {
  const decision = limiters[scope].consume(`${tokenId}\n${scope}`, nowMs);
  return { rejection: decision.allowed ? null : tooManyRequests(decision, nowMs), decision };
}
