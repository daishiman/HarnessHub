/**
 * 公開経路のレート制限 (qa-037: 10 回/分、超過時は 429 + Retry-After)。
 *
 * ここで確かめるのは計数器そのものの振る舞いで、route へ差さった状態の確認は
 * `routes-auth.cases.ts` の「上限」節が持つ。分けているのは、計数の境界条件を
 * HTTP の殻 (認可・冪等・schema) 越しに書くと、失敗したとき原因がどの層か読めなくなるため。
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  checkPublishRateLimit,
  createFixedWindowRateLimiter,
  PUBLISH_RATE_LIMIT,
  publishRateLimitBucket,
  RATE_LIMIT_HEADERS,
  type RateLimitPort,
  setPublishRateLimiterForTest,
} from '../../src/lib/publish/index.js';
import type { ClockPort, PublishScope } from '../../src/lib/publish/ports.js';

const T0 = Date.UTC(2026, 0, 1, 0, 0, 0);
const BUCKET = 'tenant-a\nuser-1\npublish.create';

const SCOPE: PublishScope = { tenantId: 'tenant-a', workspaceId: 'ws-a1', actorId: 'user-1' };

/** 時刻を手で進める clock。実時間に依存させると窓境界のテストが不安定になる。 */
function fixedClock(startMs: number): ClockPort & { set: (ms: number) => void } {
  let now = startMs;
  return {
    nowMs: () => now,
    set: (ms: number) => {
      now = ms;
    },
  };
}

/** 上限まで消費する。戻り値は最後の判定。 */
function drain(limiter: RateLimitPort, bucket: string, nowMs: number, times: number) {
  let last = limiter.consume(bucket, nowMs);
  for (let i = 1; i < times; i += 1) last = limiter.consume(bucket, nowMs);
  return last;
}

describe('固定窓の計数器', () => {
  it('上限までは通し、超えた分だけを拒否する', () => {
    const limiter = createFixedWindowRateLimiter({ maxRequests: 3, windowMs: 60_000 });

    expect(limiter.consume(BUCKET, T0)).toMatchObject({ allowed: true, remaining: 2 });
    expect(limiter.consume(BUCKET, T0)).toMatchObject({ allowed: true, remaining: 1 });
    expect(limiter.consume(BUCKET, T0)).toMatchObject({ allowed: true, remaining: 0 });
    expect(limiter.consume(BUCKET, T0)).toMatchObject({ allowed: false, remaining: 0 });
  });

  it('窓の起点は最初の 1 回であり、その後の要求で動かない', () => {
    const limiter = createFixedWindowRateLimiter({ maxRequests: 3, windowMs: 60_000 });

    const first = limiter.consume(BUCKET, T0);
    // 30 秒後に消費しても窓の終わりは動かない (滑走窓ではない)
    const later = limiter.consume(BUCKET, T0 + 30_000);
    expect(later.resetAtMs).toBe(first.resetAtMs);
    expect(first.resetAtMs).toBe(T0 + 60_000);
  });

  it('拒否は数えない — 再送を続けても窓が延びない', () => {
    const limiter = createFixedWindowRateLimiter({ maxRequests: 2, windowMs: 60_000 });
    drain(limiter, BUCKET, T0, 2);

    // 拒否された要求が窓を押し広げると、攻撃側の再送が正当な利用者の復帰を遅らせる
    const rejected = limiter.consume(BUCKET, T0 + 50_000);
    const rejectedAgain = limiter.consume(BUCKET, T0 + 59_000);
    expect(rejected.allowed).toBe(false);
    expect(rejectedAgain.resetAtMs).toBe(T0 + 60_000);

    // 窓が明ければ復帰する
    expect(limiter.consume(BUCKET, T0 + 60_000)).toMatchObject({ allowed: true, remaining: 1 });
  });

  it('bucket が違えば計数は独立している', () => {
    const limiter = createFixedWindowRateLimiter({ maxRequests: 1, windowMs: 60_000 });
    const other = 'tenant-a\nuser-2\npublish.create';

    expect(limiter.consume(BUCKET, T0).allowed).toBe(true);
    expect(limiter.consume(BUCKET, T0).allowed).toBe(false);
    // 別の利用者は巻き添えにならない
    expect(limiter.consume(other, T0).allowed).toBe(true);
  });

  it('窓が明けた bucket は掃除され、Map が伸び続けない', () => {
    const limiter = createFixedWindowRateLimiter({ maxRequests: 1, windowMs: 60_000, sweepThreshold: 2 });

    limiter.consume('a', T0);
    limiter.consume('b', T0);
    limiter.consume('c', T0);
    // 掃除が起きても計数の意味は変わらない: 窓内の 'a' は依然として上限に当たったまま
    expect(limiter.consume('a', T0).allowed).toBe(false);
    // 窓が明けた後は掃除の有無に関わらず通る
    expect(limiter.consume('a', T0 + 60_000).allowed).toBe(true);
  });

  it('既定値は qa-037 の 10 回/分', () => {
    expect(PUBLISH_RATE_LIMIT).toEqual({ maxRequests: 10, windowMs: 60_000 });

    const limiter = createFixedWindowRateLimiter();
    const last = drain(limiter, BUCKET, T0, PUBLISH_RATE_LIMIT.maxRequests);
    expect(last).toMatchObject({ allowed: true, remaining: 0 });
    expect(limiter.consume(BUCKET, T0).allowed).toBe(false);
  });

  it('窓は壁時計の 1 分境界ではなく最初の 1 回に紐づく', () => {
    const limiter = createFixedWindowRateLimiter({ maxRequests: 3, windowMs: 60_000 });

    // 起点は「最初の消費時刻」なので、窓は [T0+59_000, T0+119_000) になる
    expect(drain(limiter, BUCKET, T0 + 59_000, 3)).toMatchObject({
      allowed: true,
      remaining: 0,
      resetAtMs: T0 + 119_000,
    });

    // 壁時計の 1 分境界 (T0 + 60_000) を跨いでも明けない。
    // 窓を floor(now / windowMs) で切る実装ならここが通ってしまう — 実装差がここに出る
    expect(limiter.consume(BUCKET, T0 + 60_000)).toMatchObject({ allowed: false, remaining: 0 });
    expect(limiter.consume(BUCKET, T0 + 118_999)).toMatchObject({ allowed: false, remaining: 0 });

    // 起点から windowMs 経ってはじめて明ける
    expect(limiter.consume(BUCKET, T0 + 119_000)).toMatchObject({
      allowed: true,
      remaining: 2,
      resetAtMs: T0 + 179_000,
    });
  });

  it('境界の burst は (2 × 上限 − 1) 回 — 許容した上で数値を固定する', () => {
    const limiter = createFixedWindowRateLimiter({ maxRequests: 3, windowMs: 60_000 });

    // 窓を立てる 1 回だけ起点に置き、残り 2 回は窓の最後の 1 ms に寄せる
    expect(limiter.consume(BUCKET, T0)).toMatchObject({ allowed: true, remaining: 2 });
    expect(limiter.consume(BUCKET, T0 + 59_999)).toMatchObject({ allowed: true, remaining: 1 });
    expect(limiter.consume(BUCKET, T0 + 59_999)).toMatchObject({ allowed: true, remaining: 0 });
    expect(limiter.consume(BUCKET, T0 + 59_999)).toMatchObject({ allowed: false });

    // その 1 ms 後に窓が明け、また上限まで通る。実質 1 ms のあいだに 2 + 3 = 5 回 = 2 × 3 − 1。
    // 起点の 1 回は必ず窓の頭で消えるので、素朴な「2 倍」ではなく 1 回少ない。
    // qa-037 の狙いは費用の暴走を止めることなので、この回数は許容と判断した (P09 §2-5)。
    // 数値を固定しておくのは、滑走窓や epoch 揃えへ黙って変えたときに落とすため。
    expect(drain(limiter, BUCKET, T0 + 60_000, 3)).toMatchObject({ allowed: true, remaining: 0 });
    expect(limiter.consume(BUCKET, T0 + 60_000)).toMatchObject({ allowed: false, remaining: 0 });
  });
});

describe('計数の単位', () => {
  it('テナント・利用者・endpoint の 3 つで分かれる', () => {
    const base = publishRateLimitBucket(SCOPE, 'publish.create');

    expect(publishRateLimitBucket({ ...SCOPE, tenantId: 'tenant-b' }, 'publish.create')).not.toBe(base);
    expect(publishRateLimitBucket({ ...SCOPE, actorId: 'user-2' }, 'publish.create')).not.toBe(base);
    expect(publishRateLimitBucket(SCOPE, 'publish.submit')).not.toBe(base);
  });

  it('workspace は単位に含めない — workspace を変えても上限は共有される', () => {
    // workspace ごとに分けると、workspace を作り替えるだけで上限を回避できてしまう
    expect(publishRateLimitBucket({ ...SCOPE, workspaceId: 'ws-a2' }, 'publish.create')).toBe(
      publishRateLimitBucket(SCOPE, 'publish.create'),
    );
  });
});

describe('route から見た判定', () => {
  beforeEach(() => {
    setPublishRateLimiterForTest(null);
  });

  it('上限内なら rejection は null で、残り回数が減っていく', () => {
    const clock = fixedClock(T0);

    const first = checkPublishRateLimit(SCOPE, 'publish.create', clock);
    expect(first.rejection).toBeNull();
    expect(first.decision.remaining).toBe(PUBLISH_RATE_LIMIT.maxRequests - 1);
    expect(first.nowMs).toBe(T0);

    const second = checkPublishRateLimit(SCOPE, 'publish.create', clock);
    expect(second.decision.remaining).toBe(PUBLISH_RATE_LIMIT.maxRequests - 2);
  });

  it('超過すると 429 と Retry-After を返す', async () => {
    const clock = fixedClock(T0);
    for (let i = 0; i < PUBLISH_RATE_LIMIT.maxRequests; i += 1) checkPublishRateLimit(SCOPE, 'publish.create', clock);

    // 窓の途中まで進めてから超過させる: Retry-After が残り時間から計算されることを見る
    clock.set(T0 + 20_000);
    const limited = checkPublishRateLimit(SCOPE, 'publish.create', clock);

    expect(limited.rejection).not.toBeNull();
    const response = limited.rejection as Response;
    expect(response.status).toBe(429);
    expect(response.headers.get(RATE_LIMIT_HEADERS.retryAfter)).toBe('40');
    expect(response.headers.get(RATE_LIMIT_HEADERS.limit)).toBe(String(PUBLISH_RATE_LIMIT.maxRequests));
    expect(response.headers.get(RATE_LIMIT_HEADERS.remaining)).toBe('0');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ error: 'rate_limited' });
  });

  it('Retry-After は 0 秒にならない (即時再送を促さない)', () => {
    const clock = fixedClock(T0);
    for (let i = 0; i < PUBLISH_RATE_LIMIT.maxRequests; i += 1) checkPublishRateLimit(SCOPE, 'publish.create', clock);

    // 窓が明ける 1 ミリ秒前。切り上げないと 0 になり、client が休まず再送する
    clock.set(T0 + 59_999);
    const limited = checkPublishRateLimit(SCOPE, 'publish.create', clock);
    expect(limited.rejection?.headers.get(RATE_LIMIT_HEADERS.retryAfter)).toBe('1');
  });

  it('endpoint が違えば別々に数える', () => {
    const clock = fixedClock(T0);
    for (let i = 0; i < PUBLISH_RATE_LIMIT.maxRequests; i += 1) checkPublishRateLimit(SCOPE, 'publish.create', clock);

    expect(checkPublishRateLimit(SCOPE, 'publish.create', clock).rejection).not.toBeNull();
    // upload が詰まっても submit は通る (逆も同じ)
    expect(checkPublishRateLimit(SCOPE, 'publish.submit', clock).rejection).toBeNull();
  });

  it('差し替え口は既定の計数器へ戻せる', () => {
    const stub: RateLimitPort = {
      consume: () => ({ allowed: false, limit: 1, remaining: 0, resetAtMs: T0 + 1_000 }),
    };
    setPublishRateLimiterForTest(stub);
    expect(checkPublishRateLimit(SCOPE, 'publish.create', fixedClock(T0)).rejection).not.toBeNull();

    setPublishRateLimiterForTest(null);
    expect(checkPublishRateLimit(SCOPE, 'publish.create', fixedClock(T0)).rejection).toBeNull();
  });
});
