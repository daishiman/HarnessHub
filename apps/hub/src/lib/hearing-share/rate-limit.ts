/**
 * 公開 hearing share の rate limit。**2 段構え**である。
 *
 * ## 1 段目: token に依存しない pre-DB limiter (`checkHearingSharePreResolveRateLimit`)
 *
 * token を解決する前に効く層。鍵は client IP だけで、**token 平文も token row ID も含めない**。
 * これが無いと、存在しない token を投げるだけで 1 要求 = 1 回の DB read を無制限に誘発できる
 * (`resolveShareToken` が先に走り、rate limit はその後だったため):
 *
 *   - 増幅型 DoS — 認証不要の経路から libSQL の read 予算を食い潰せる
 *   - 総当たり — token 空間への試行が実質無制限になり、時間さえかければ当てられる
 *
 * 鍵に token を含めない点が本質である。含めると「429 が返る = その token は前にも来た」と
 * 観測でき、下の 2 段目が避けている oracle をこちらで作ってしまう。IP だけなら、有効・無効の
 * どちらの token でも同じ条件で数えるので、応答から token の存否は読めない。
 *
 * 上限は payload 120 + screenshot 60 の合計を通せる 240 req/min に置く。正当な利用
 * (1 枚の共有リンクを開いて添付を順に取る) は 1 段目に当たらず、2 段目の scope 別上限で律速する。
 *
 * ## 2 段目: token 単位 limiter (`checkHearingShareRateLimit`)
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

/** token 解決より前に効く層。scope をまたいだ合計で数える (payload 120 + screenshot 60 + 余白)。 */
export const HEARING_SHARE_PRE_RESOLVE_RATE_LIMIT = { maxRequests: 240, windowMs: 60_000 } as const;

let preResolveLimiter: RateLimitPort = createFixedWindowRateLimiter(HEARING_SHARE_PRE_RESOLVE_RATE_LIMIT);

/** テスト差し替え口。null で既定 limiter へ戻す。 */
export function setHearingSharePreResolveRateLimiterForTest(replacement: RateLimitPort | null): void {
  preResolveLimiter = replacement ?? createFixedWindowRateLimiter(HEARING_SHARE_PRE_RESOLVE_RATE_LIMIT);
}

/**
 * client IP を 1 つに決める。Cloudflare が付ける `cf-connecting-ip` を最優先し、
 * 無ければ `x-forwarded-for` の**先頭**を使う。
 *
 * 末尾ではなく先頭を採るのは、この app の前段が Cloudflare だけだからである。末尾は
 * 直近 proxy の IP になり、全 client が 1 つの bucket へ潰れて限界が意味を失う。
 * 逆に header が一切無い直叩き (ローカル開発・内部疎通) は、bucket を分けずに
 * 単一の `unknown` へ寄せる — 分けようとすると偽の header を足すだけで回避できてしまう。
 */
export function hearingShareClientKey(request: Request): string {
  const cloudflareIp = request.headers.get('cf-connecting-ip')?.trim();
  if (cloudflareIp !== undefined && cloudflareIp !== '') return cloudflareIp;

  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwardedFor !== undefined && forwardedFor !== '') return forwardedFor;

  return 'unknown';
}

/**
 * token を解決する**前**の上限判定。許可なら `rejection === null`。
 *
 * 呼び出し側は必ず `resolveShareToken` より前に置くこと。後ろに置くと DB read が先に走り、
 * この層が防ごうとしている増幅と総当たりがそのまま残る。
 */
export function checkHearingSharePreResolveRateLimit(
  request: Request,
  nowMs: number,
): { readonly rejection: Response | null; readonly decision: RateLimitDecision } {
  const decision = preResolveLimiter.consume(`${hearingShareClientKey(request)}\npre-resolve`, nowMs);
  return { rejection: decision.allowed ? null : tooManyRequests(decision, nowMs), decision };
}

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
