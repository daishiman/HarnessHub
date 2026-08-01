/**
 * publish endpoint のレート制限 (qa-037: 10 回/分、超過時は 429 + Retry-After)。
 *
 * 冪等鍵が守るのは「同じ要求を 2 回処理しない」であって、「違う要求を 100 回送らせない」ではない。
 * 公開要求は ZIP 展開と検査を伴うため 1 件あたりの費用が大きく、鍵を変えながら投げ続けられると
 * 検査だけで Worker の CPU 予算を使い切れる。ここはその上限を置く層である。
 *
 * ## 保存先について (重要な限界)
 *
 * infrastructure-spec §2 の binding 台帳に KV も Durable Object も無い。台帳へ binding を足すのは
 * feat-hub-foundation の責務であり、本 feature が独断で wrangler.jsonc を触るのは越境になる。
 * そのためカウンタは **isolate 内メモリ** に置いてある。結果として:
 *
 *   - 同一 isolate に載った要求列に対しては 10 回/分が正確に効く
 *   - isolate をまたぐと実効上限が (isolate 数 × 10) 回/分まで緩む
 *
 * これは「無制限」よりは確実に厳しく、「厳密な分散カウンタ」よりは緩い。
 * `runtime.ts` が禁じている in-memory 実装 (ADR AD-8) とは別種であることに注意:
 * AD-8 が禁じるのは**永続すべき業務状態**の in-memory 代替で、それは未結線を 200 応答で隠す。
 * レート制限のカウンタは本来 ephemeral (一時的) な値で、失われても業務状態は壊れない。
 * 厳密化は follow-up (Durable Object / KV binding の台帳追加) として扱う。
 */

import type { ClockPort, PublishScope } from './ports.js';

/** qa-037 の確定値。窓は 1 分、上限は 10 回。 */
export const PUBLISH_RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 60_000,
} as const;

/**
 * 応答 header。`retry-after` は qa-037 が名指ししている必須項目で、
 * `ratelimit-*` は IETF draft (RateLimit header fields) に合わせた観測用。
 * client が「あと何回いけるか」を 429 を踏まずに知れるよう、成功応答にも載せる。
 */
export const RATE_LIMIT_HEADERS = {
  retryAfter: 'retry-after',
  limit: 'ratelimit-limit',
  remaining: 'ratelimit-remaining',
  reset: 'ratelimit-reset',
} as const;

export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly limit: number;
  /** 残り回数。拒否されたときは 0。 */
  readonly remaining: number;
  /** 窓が明ける時刻 (epoch ms)。`Retry-After` はここから逆算する。 */
  readonly resetAtMs: number;
}

export interface RateLimitPort {
  /** 1 回消費して判定を返す。拒否したときは消費しない (拒否が窓を延ばさないように)。 */
  consume(bucket: string, nowMs: number): RateLimitDecision;
}

/**
 * 計数の単位。`(tenant, actor, endpoint)` で分ける。
 *
 * テナント単位にすると、1 人の暴走が同じテナントの他の利用者を巻き込む (巻き添え拒否)。
 * actor 単位だけにすると、endpoint をまたいだ合計で上限に当たり、
 * 「upload は詰まっていないのに submit が通らない」という読みにくい失敗になる。
 * `ledgerScope` は冪等台帳と同じ endpoint 識別子を使い回す — 2 つの概念に別名を作らないため。
 */
export function publishRateLimitBucket(scope: PublishScope, ledgerScope: string): string {
  return `${scope.tenantId}\n${scope.actorId}\n${ledgerScope}`;
}

/** 窓が明けるまでの秒数。0 秒 (= 今すぐ再送) を返さないよう最低 1 秒に切り上げる。 */
export function retryAfterSeconds(decision: RateLimitDecision, nowMs: number): number {
  return Math.max(1, Math.ceil((decision.resetAtMs - nowMs) / 1000));
}

/** 判定を応答 header へ写す。成功・拒否の両方で同じ形にする。 */
export function rateLimitHeaders(decision: RateLimitDecision, nowMs: number): Record<string, string> {
  return {
    [RATE_LIMIT_HEADERS.limit]: String(decision.limit),
    [RATE_LIMIT_HEADERS.remaining]: String(decision.remaining),
    [RATE_LIMIT_HEADERS.reset]: String(retryAfterSeconds(decision, nowMs)),
  };
}

/** 上限超過の応答。本文の code は他の失敗と同じ `{ error }` の形に揃える。 */
export function tooManyRequests(decision: RateLimitDecision, nowMs: number): Response {
  return Response.json(
    { error: 'rate_limited' },
    {
      status: 429,
      headers: {
        'cache-control': 'no-store',
        [RATE_LIMIT_HEADERS.retryAfter]: String(retryAfterSeconds(decision, nowMs)),
        ...rateLimitHeaders(decision, nowMs),
      },
    },
  );
}

export interface FixedWindowOptions {
  readonly maxRequests?: number;
  readonly windowMs?: number;
  /**
   * 掃除を始める bucket 数。窓が明けた記録を捨てないと、テナント数 × 利用者数 × endpoint 数だけ
   * Map が伸び続ける。isolate は再利用されるので「そのうち作り直される」に頼れない。
   */
  readonly sweepThreshold?: number;
}

/**
 * 固定窓 (fixed window) の計数器。
 *
 * 滑走窓 (sliding window) ではなく固定窓なのは、実装が 1 変数で済み、
 * 「いつ窓が明けるか」を client へ正確に伝えられるため (滑走窓の残量は連続的で Retry-After にしにくい)。
 *
 * 窓の起点は **壁時計の 1 分境界ではなく、その bucket の最初の消費時刻** である。
 * `floor(now / windowMs)` で切る実装とは明けるタイミングが違うので、変更時は注意すること。
 * 代償として、窓の境界では短時間に **(2 × 上限 − 1) 回** 通せる
 * (起点で 1 回 + 窓末尾に 上限−1 回 + 次の窓頭に 上限 回)。既定値なら 19 回。
 * qa-037 の狙いは費用の暴走を止めることなので、この回数は許容範囲と判断した。
 * 実際の回数は `rate-limit.test.ts` の「境界の burst」で固定してある。
 */
export function createFixedWindowRateLimiter(options: FixedWindowOptions = {}): RateLimitPort {
  const maxRequests = options.maxRequests ?? PUBLISH_RATE_LIMIT.maxRequests;
  const windowMs = options.windowMs ?? PUBLISH_RATE_LIMIT.windowMs;
  const sweepThreshold = options.sweepThreshold ?? 1024;

  const counters = new Map<string, { windowStartMs: number; count: number }>();

  function sweep(nowMs: number): void {
    for (const [bucket, entry] of counters) {
      if (nowMs - entry.windowStartMs >= windowMs) counters.delete(bucket);
    }
  }

  return {
    consume(bucket, nowMs) {
      if (counters.size > sweepThreshold) sweep(nowMs);

      const current = counters.get(bucket);
      const inWindow = current !== undefined && nowMs - current.windowStartMs < windowMs;
      const entry = inWindow ? current : { windowStartMs: nowMs, count: 0 };
      const resetAtMs = entry.windowStartMs + windowMs;

      if (entry.count >= maxRequests) {
        // 拒否時は数えない。数えると攻撃側の再送が窓を押し広げ、正当な利用者の復帰が遅れる
        return { allowed: false, limit: maxRequests, remaining: 0, resetAtMs };
      }

      entry.count += 1;
      counters.set(bucket, entry);
      return { allowed: true, limit: maxRequests, remaining: maxRequests - entry.count, resetAtMs };
    },
  };
}

/**
 * 既定の計数器。route から使う実体。
 *
 * module 変数に置くのは `route-support.ts` の `cached` と同じ理由で、
 * isolate 内で 1 つを共有しないと計数の意味が消えるため。テストは差し替え口から入れ替える。
 */
let limiter: RateLimitPort = createFixedWindowRateLimiter();

export function publishRateLimiter(): RateLimitPort {
  return limiter;
}

/** テストが実体を差し替えるための口。null で既定へ戻す。本番経路からは呼ばない。 */
export function setPublishRateLimiterForTest(replacement: RateLimitPort | null): void {
  limiter = replacement ?? createFixedWindowRateLimiter();
}

/**
 * 変更系 route の上限判定。許可なら null、超過なら 429 応答を返す。
 *
 * 判定を本文読み取りより前に置くのは、拒否する要求に ZIP の転送費用を払わせないため。
 */
export function checkPublishRateLimit(
  scope: PublishScope,
  ledgerScope: string,
  clock: ClockPort,
): { readonly rejection: Response | null; readonly decision: RateLimitDecision; readonly nowMs: number } {
  const nowMs = clock.nowMs();
  const decision = limiter.consume(publishRateLimitBucket(scope, ledgerScope), nowMs);
  return {
    rejection: decision.allowed ? null : tooManyRequests(decision, nowMs),
    decision,
    nowMs,
  };
}
