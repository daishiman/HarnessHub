import { beforeEach, describe, expect, it } from 'vitest';

import {
  checkHearingShareRateLimit,
  setHearingShareRateLimiterForTest,
} from '../../src/lib/hearing-share/rate-limit.js';

const NOW_MS = 1_800_000_000_000;

beforeEach(() => {
  setHearingShareRateLimiterForTest('payload', null);
  setHearingShareRateLimiterForTest('screenshot', null);
});

describe('公開 hearing share の token 単位 rate limit', () => {
  it.each([
    ['payload', 120],
    ['screenshot', 60],
  ] as const)('%s は %i req/min まで許可し、次を 429 にする', (scope, allowedRequests) => {
    for (let count = 0; count < allowedRequests; count += 1) {
      expect(checkHearingShareRateLimit('token-row-1', scope, NOW_MS).rejection).toBeNull();
    }

    const rejection = checkHearingShareRateLimit('token-row-1', scope, NOW_MS).rejection;
    expect(rejection?.status).toBe(429);
    expect(rejection?.headers.get('cache-control')).toBe('no-store');
    expect(rejection?.headers.get('retry-after')).toBe('60');
    expect(rejection?.headers.get('ratelimit-limit')).toBe(String(allowedRequests));
  });

  it('一つの token の超過が別 token や別 endpoint scope を巻き込まない', () => {
    for (let count = 0; count < 120; count += 1) {
      checkHearingShareRateLimit('token-row-1', 'payload', NOW_MS);
    }

    expect(checkHearingShareRateLimit('token-row-1', 'payload', NOW_MS).rejection?.status).toBe(429);
    expect(checkHearingShareRateLimit('token-row-2', 'payload', NOW_MS).rejection).toBeNull();
    expect(checkHearingShareRateLimit('token-row-1', 'screenshot', NOW_MS).rejection).toBeNull();
  });
});
