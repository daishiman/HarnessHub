/**
 * 公開 hearing share の **1 段目** rate limit (token 解決より前) の回帰 test。
 *
 * 守りたい不変条件は 2 つある。
 *
 * 1. **順序** — limiter は `resolveShareToken` (= DB read) より前に効く。ここが逆転すると、
 *    存在しない token を投げるだけで認証不要の経路から DB read を無制限に誘発でき、
 *    増幅型 DoS と token 総当たりが同時に通る。よって「429 が返る」だけでなく
 *    「`findValidByTokenHash` が呼ばれない」という**構造**を固定する。
 * 2. **oracle を作らない** — 鍵は client IP のみ。有効 token と無効 token で 429 の形が
 *    1 bit も違わないことを確かめる (違えば 429 の出方から token の存否を読めてしまう)。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hearingIntakeHolder = vi.hoisted(() => ({ current: null as unknown }));

vi.mock('../../src/features/hearing-intake/runtime.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/features/hearing-intake/runtime.js')>();
  return {
    ...actual,
    hearingIntakeRuntime: () => hearingIntakeHolder.current,
  };
});

import { GET as getShareRoute } from '../../src/app/api/hearing/[token]/route.js';
import { GET as getShareScreenshotRoute } from '../../src/app/api/hearing/[token]/screenshots/[screenshotId]/route.js';
import { sha256Hex } from '../../src/lib/auth/jwt.js';
import { setHearingShareRuntimeForTest } from '../../src/lib/hearing-share/index.js';
import {
  checkHearingSharePreResolveRateLimit,
  HEARING_SHARE_PRE_RESOLVE_RATE_LIMIT,
  hearingShareClientKey,
  setHearingSharePreResolveRateLimiterForTest,
  setHearingShareRateLimiterForTest,
} from '../../src/lib/hearing-share/rate-limit.js';
import {
  buildPublicRequest,
  buildSheetRow,
  createInMemoryHearingIntakeRuntime,
  createInMemoryHearingShareRuntime,
  type InMemoryHearingShareRuntime,
  params,
  TENANT_A,
  WORKSPACE_A1,
} from './support/handoff-route-context.js';

const NOW_MS = 1_800_000_000_000;
const VALID_TOKEN = 'A'.repeat(43);
const SCREENSHOT_ID = '550e8400-e29b-41d4-a716-446655440000';

let share: InMemoryHearingShareRuntime;
let findValidByTokenHash: ReturnType<typeof vi.fn>;

/** DB read の実行回数を数えられる runtime を立てる。数える対象は token 解決の唯一の seam。 */
function installRuntime(): void {
  share = createInMemoryHearingShareRuntime();
  findValidByTokenHash = vi.fn(share.shareTokens.findValidByTokenHash.bind(share.shareTokens));
  setHearingShareRuntimeForTest({
    ...share,
    shareTokens: { ...share.shareTokens, findValidByTokenHash },
  });
}

async function issueToken(): Promise<void> {
  await share.shareTokens.create(
    { tenantId: TENANT_A, workspaceId: WORKSPACE_A1, actorId: 'user-owner' },
    {
      id: 'token-1',
      workspaceId: WORKSPACE_A1,
      sheetId: 'sheet-1',
      audience: 'harness_creator',
      tokenHash: await sha256Hex(VALID_TOKEN),
      expiresAt: NOW_MS + 3_600_000,
      createdByUserId: 'user-owner',
    },
  );
}

/** 上限に達した状態を作る。実 limiter を使い、判定規則を test 側へ書き写さない。 */
function exhaustPreResolveBudget(request: Request): void {
  for (let count = 0; count < HEARING_SHARE_PRE_RESOLVE_RATE_LIMIT.maxRequests; count += 1) {
    expect(checkHearingSharePreResolveRateLimit(request, NOW_MS).rejection).toBeNull();
  }
}

beforeEach(() => {
  hearingIntakeHolder.current = createInMemoryHearingIntakeRuntime([buildSheetRow({ id: 'sheet-1' })]);
  installRuntime();
  setHearingSharePreResolveRateLimiterForTest(null);
  setHearingShareRateLimiterForTest('payload', null);
  setHearingShareRateLimiterForTest('screenshot', null);
  process.env.AUTH_SESSION_SECRET = 'session-secret';
  process.env.AUTH_ACCESS_TOKEN_SECRET = 'access-secret';
  process.env.AUTH_ALLOWED_ORIGINS = 'https://hub.example.com';
  process.env.AUTH_DEVICE_VERIFICATION_URI = 'https://hub.example.com/device';
  process.env.AUTH_CANONICAL_ORIGIN = 'https://hub.example.com';
  vi.useFakeTimers();
  vi.setSystemTime(NOW_MS);
});

afterEach(() => {
  hearingIntakeHolder.current = null;
  setHearingShareRuntimeForTest(null);
  setHearingSharePreResolveRateLimiterForTest(null);
  setHearingShareRateLimiterForTest('payload', null);
  setHearingShareRateLimiterForTest('screenshot', null);
  delete process.env.AUTH_SESSION_SECRET;
  delete process.env.AUTH_ACCESS_TOKEN_SECRET;
  delete process.env.AUTH_ALLOWED_ORIGINS;
  delete process.env.AUTH_DEVICE_VERIFICATION_URI;
  delete process.env.AUTH_CANONICAL_ORIGIN;
  vi.useRealTimers();
});

describe('hearingShareClientKey', () => {
  it('cf-connecting-ip を x-forwarded-for より優先する', () => {
    const request = buildPublicRequest('/api/hearing/x', {
      'cf-connecting-ip': '203.0.113.9',
      'x-forwarded-for': '198.51.100.1, 203.0.113.9',
    });

    expect(hearingShareClientKey(request)).toBe('203.0.113.9');
  });

  it('x-forwarded-for は末尾 (直近 proxy) ではなく先頭を採る', () => {
    const request = buildPublicRequest('/api/hearing/x', { 'x-forwarded-for': '198.51.100.1, 203.0.113.9' });

    expect(hearingShareClientKey(request)).toBe('198.51.100.1');
  });

  it('header が無い / 空白だけの場合は単一の unknown へ寄せる', () => {
    expect(hearingShareClientKey(buildPublicRequest('/api/hearing/x'))).toBe('unknown');
    expect(hearingShareClientKey(buildPublicRequest('/api/hearing/x', { 'cf-connecting-ip': '   ' }))).toBe('unknown');
  });
});

describe('checkHearingSharePreResolveRateLimit', () => {
  it('IP あたり 240 req/min まで許可し、次を 429 + 再試行 header にする', () => {
    const request = buildPublicRequest('/api/hearing/x', { 'cf-connecting-ip': '203.0.113.9' });
    exhaustPreResolveBudget(request);

    const rejection = checkHearingSharePreResolveRateLimit(request, NOW_MS).rejection;
    expect(rejection?.status).toBe(429);
    expect(rejection?.headers.get('cache-control')).toBe('no-store');
    expect(rejection?.headers.get('retry-after')).toBe('60');
    expect(rejection?.headers.get('ratelimit-limit')).toBe('240');
  });

  it('ある IP の超過が別 IP を巻き込まない', () => {
    exhaustPreResolveBudget(buildPublicRequest('/api/hearing/x', { 'cf-connecting-ip': '203.0.113.9' }));

    const other = buildPublicRequest('/api/hearing/x', { 'cf-connecting-ip': '203.0.113.10' });
    expect(checkHearingSharePreResolveRateLimit(other, NOW_MS).rejection).toBeNull();
  });

  it('窓が明けたら回復する', () => {
    const request = buildPublicRequest('/api/hearing/x', { 'cf-connecting-ip': '203.0.113.9' });
    exhaustPreResolveBudget(request);
    expect(checkHearingSharePreResolveRateLimit(request, NOW_MS).rejection?.status).toBe(429);

    const next = NOW_MS + HEARING_SHARE_PRE_RESOLVE_RATE_LIMIT.windowMs;
    expect(checkHearingSharePreResolveRateLimit(request, next).rejection).toBeNull();
  });
});

describe('公開 route での pre-resolve 上限', () => {
  it('上限超過後は無効 token でも DB read を発生させない (増幅と総当たりの遮断)', async () => {
    const headers = { 'cf-connecting-ip': '203.0.113.9' };
    exhaustPreResolveBudget(buildPublicRequest('/api/hearing/x', headers));

    const response = await getShareRoute(
      buildPublicRequest('/api/hearing/does-not-exist', headers),
      params({ token: 'does-not-exist' }),
    );

    expect(response.status).toBe(429);
    expect(findValidByTokenHash).not.toHaveBeenCalled();
  });

  it('screenshot 中継も同じ層で止まり、DB read へ落ちない', async () => {
    const headers = { 'cf-connecting-ip': '203.0.113.9' };
    exhaustPreResolveBudget(buildPublicRequest('/api/hearing/x', headers));

    const response = await getShareScreenshotRoute(
      buildPublicRequest(`/api/hearing/does-not-exist/screenshots/${SCREENSHOT_ID}`, headers),
      params({ token: 'does-not-exist', screenshotId: SCREENSHOT_ID }),
    );

    expect(response.status).toBe(429);
    expect(findValidByTokenHash).not.toHaveBeenCalled();
  });

  it('上限内なら従来どおり DB read まで進み、無効 token は 404 のまま', async () => {
    const response = await getShareRoute(
      buildPublicRequest('/api/hearing/does-not-exist', { 'cf-connecting-ip': '203.0.113.9' }),
      params({ token: 'does-not-exist' }),
    );

    expect(response.status).toBe(404);
    expect(findValidByTokenHash).toHaveBeenCalledTimes(1);
  });

  it('payload と screenshot は同じ bucket を共有する (scope で分けない)', async () => {
    const consumedKeys: string[] = [];
    setHearingSharePreResolveRateLimiterForTest({
      consume: (key) => {
        consumedKeys.push(key);
        return { allowed: true, limit: 240, remaining: 239, resetAtMs: NOW_MS + 60_000 };
      },
    });
    const headers = { 'cf-connecting-ip': '203.0.113.9' };

    await getShareRoute(buildPublicRequest('/api/hearing/t', headers), params({ token: 't' }));
    await getShareScreenshotRoute(
      buildPublicRequest(`/api/hearing/t/screenshots/${SCREENSHOT_ID}`, headers),
      params({ token: 't', screenshotId: SCREENSHOT_ID }),
    );

    expect(consumedKeys).toHaveLength(2);
    expect(consumedKeys[0]).toBe(consumedKeys[1]);
  });

  it('bucket key に token を含めない (429 が token 存否の oracle にならない)', async () => {
    const consumedKeys: string[] = [];
    setHearingSharePreResolveRateLimiterForTest({
      consume: (key) => {
        consumedKeys.push(key);
        return { allowed: true, limit: 240, remaining: 239, resetAtMs: NOW_MS + 60_000 };
      },
    });
    await issueToken();
    const headers = { 'cf-connecting-ip': '203.0.113.9' };

    await getShareRoute(buildPublicRequest(`/api/hearing/${VALID_TOKEN}`, headers), params({ token: VALID_TOKEN }));
    await getShareRoute(
      buildPublicRequest('/api/hearing/does-not-exist', headers),
      params({ token: 'does-not-exist' }),
    );

    expect(consumedKeys[0]).toBe(consumedKeys[1]);
    for (const key of consumedKeys) expect(key).not.toContain(VALID_TOKEN);
  });

  it('有効 token と無効 token の 429 応答が完全に一致する', async () => {
    await issueToken();
    const headers = { 'cf-connecting-ip': '203.0.113.9' };
    exhaustPreResolveBudget(buildPublicRequest('/api/hearing/x', headers));

    const valid = await getShareRoute(
      buildPublicRequest(`/api/hearing/${VALID_TOKEN}`, headers),
      params({ token: VALID_TOKEN }),
    );
    const invalid = await getShareRoute(
      buildPublicRequest('/api/hearing/does-not-exist', headers),
      params({ token: 'does-not-exist' }),
    );

    expect(valid.status).toBe(invalid.status);
    expect([...valid.headers].sort()).toStrictEqual([...invalid.headers].sort());
    expect(await valid.text()).toBe(await invalid.text());
  });
});
