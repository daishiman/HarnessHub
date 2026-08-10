/**
 * DC-POLL-01..14: publish 状況ポーリングの契約 (qa-009 / qa-062 / ADR §2.2・§2.4)。
 *
 * 対象は `lib/catalog/polling.ts` の純関数。DOM も timer も使わないのは、
 * 「実際に 2 秒待つ」テストにすると遅くて不安定になり、結局 skip されて誰も守らなくなるため。
 */
import type { CatalogFailureKind, PublishRequestState } from '@harness-hub/schemas';
import { describe, expect, it } from 'vitest';

import { isTerminalCatalogFailure } from '../../lib/catalog/degradation.js';
import {
  INITIAL_POLL_INTERVAL_MS,
  isPollablePublishState,
  MAX_CONSECUTIVE_FAILURES,
  MAX_POLL_DURATION_MS,
  MAX_POLL_INTERVAL_MS,
  nextPollIntervalMs,
  type PollingState,
  parseRetryAfterSeconds,
  resolveRetryDelayMs,
  shouldContinuePolling,
  shouldResumeOnVisible,
} from '../../lib/catalog/polling.js';

/** 継続する状態の既定値。各ケースは検証したい 1 項目だけを差し替える。 */
function pollingState(overrides: Partial<PollingState> = {}): PollingState {
  return {
    status: 'validating',
    consecutiveFailures: 0,
    elapsedMs: 0,
    documentVisible: true,
    inFlight: false,
    lastFailureKind: null,
    ...overrides,
  };
}

describe('DC-POLL / ポーリング間隔の数列', () => {
  it('DC-POLL-01: 初回間隔は 2000ms', () => {
    expect(nextPollIntervalMs(0)).toBe(2_000);
    expect(INITIAL_POLL_INTERVAL_MS).toBe(2_000);
  });

  it('DC-POLL-02: ×2 で増え 30000ms で頭打ちになる', () => {
    expect([1, 2, 3, 4].map((attempt) => nextPollIntervalMs(attempt))).toEqual([4_000, 8_000, 16_000, 30_000]);
    // 頭打ち後は単調に 30_000。指数が overflow して Infinity/NaN に化けないことも含めて確認する
    for (const attempt of [5, 10, 32, 64, 1_000, Number.MAX_SAFE_INTEGER]) {
      expect(nextPollIntervalMs(attempt)).toBe(MAX_POLL_INTERVAL_MS);
    }
  });

  it('DC-POLL-03: 負値・非整数・巨大値でも 2000..30000 に収まる', () => {
    for (const attempt of [-1, -100, 0.5, 2.7, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const interval = nextPollIntervalMs(attempt);
      expect(Number.isFinite(interval)).toBe(true);
      expect(interval).toBeGreaterThanOrEqual(INITIAL_POLL_INTERVAL_MS);
      expect(interval).toBeLessThanOrEqual(MAX_POLL_INTERVAL_MS);
    }
  });
});

describe('DC-POLL / 停止条件', () => {
  it('DC-POLL-04: 終端 status では継続しない', () => {
    // published・failed は終端。draft・needs_fix・ready・approval_pending は人の操作待ちで、
    // 叩き続けても状態は変わらない (ADR §2.2 の「サーバが自動で進める状態だけを叩く」)
    const stopStates: readonly PublishRequestState[] = [
      'published',
      'failed',
      'draft',
      'needs_fix',
      'ready',
      'approval_pending',
    ];
    for (const status of stopStates) {
      expect(isPollablePublishState(status)).toBe(false);
      expect(shouldContinuePolling(pollingState({ status }))).toBe(false);
    }
  });

  it('DC-POLL-05: 非終端 status では継続する', () => {
    const continueStates: readonly PublishRequestState[] = ['validating', 'approved', 'publishing'];
    for (const status of continueStates) {
      expect(isPollablePublishState(status)).toBe(true);
      expect(shouldContinuePolling(pollingState({ status }))).toBe(true);
    }
  });

  it('DC-POLL-06: 連続失敗 5 回で停止する', () => {
    expect(MAX_CONSECUTIVE_FAILURES).toBe(5);
    expect(shouldContinuePolling(pollingState({ consecutiveFailures: 4 }))).toBe(true);
    expect(shouldContinuePolling(pollingState({ consecutiveFailures: MAX_CONSECUTIVE_FAILURES }))).toBe(false);
  });

  it('DC-POLL-07: 総試行 15 分で停止する', () => {
    expect(MAX_POLL_DURATION_MS).toBe(15 * 60 * 1_000);
    expect(shouldContinuePolling(pollingState({ elapsedMs: MAX_POLL_DURATION_MS - 1 }))).toBe(true);
    expect(shouldContinuePolling(pollingState({ elapsedMs: MAX_POLL_DURATION_MS }))).toBe(false);
  });

  it('DC-POLL-08: 不可視タブでは継続しない', () => {
    expect(shouldContinuePolling(pollingState({ documentVisible: false }))).toBe(false);
  });

  it('DC-POLL-11: in-flight があれば次を張らない', () => {
    expect(shouldContinuePolling(pollingState({ inFlight: true }))).toBe(false);
  });

  it('DC-POLL-12: 終端失敗 (401/403/契約不正) は回数上限を待たず 1 回で停止する', () => {
    const terminalKinds: readonly CatalogFailureKind[] = ['unauthorized', 'forbidden', 'fatal'];
    for (const kind of terminalKinds) {
      expect(isTerminalCatalogFailure(kind)).toBe(true);
      // 失敗 1 回目 (回数上限 5 には遠い) でも継続しない
      expect(shouldContinuePolling(pollingState({ consecutiveFailures: 1, lastFailureKind: kind }))).toBe(false);
      // 可視復帰でも再開しない — 401 を叩き直す穴を塞ぐ
      expect(shouldResumeOnVisible(pollingState({ documentVisible: false, lastFailureKind: kind }))).toBe(false);
    }
  });

  it('DC-POLL-13: 一過性失敗 (degraded) は従来どおり回数上限まで継続する', () => {
    expect(isTerminalCatalogFailure('degraded')).toBe(false);
    expect(shouldContinuePolling(pollingState({ consecutiveFailures: 4, lastFailureKind: 'degraded' }))).toBe(true);
    expect(
      shouldContinuePolling(
        pollingState({ consecutiveFailures: MAX_CONSECUTIVE_FAILURES, lastFailureKind: 'degraded' }),
      ),
    ).toBe(false);
  });

  it('DC-POLL-14: 可視復帰の判定は「可視性以外の停止事由が無い」ときだけ true', () => {
    // 可視性だけが理由 → 再開する
    expect(shouldResumeOnVisible(pollingState({ documentVisible: false }))).toBe(true);
    // 可視性以外の事由が同時に立っていれば再開しない
    expect(shouldResumeOnVisible(pollingState({ documentVisible: false, status: 'published' }))).toBe(false);
    expect(
      shouldResumeOnVisible(pollingState({ documentVisible: false, consecutiveFailures: MAX_CONSECUTIVE_FAILURES })),
    ).toBe(false);
    expect(shouldResumeOnVisible(pollingState({ documentVisible: false, elapsedMs: MAX_POLL_DURATION_MS }))).toBe(
      false,
    );
  });
});

describe('DC-POLL / レート制御 (Retry-After)', () => {
  it('DC-POLL-09: 429 + Retry-After はサーバ指示を優先する', () => {
    expect(parseRetryAfterSeconds('7')).toBe(7);
    // attempt=0 の backoff は 2000 だが、サーバ指示の 7000 が勝つ
    expect(resolveRetryDelayMs(0, parseRetryAfterSeconds('7'))).toBe(7_000);
    // 実質停止 (1 日待つ) にならないよう、異常値は総試行上限でクランプする
    expect(resolveRetryDelayMs(0, 86_400)).toBe(MAX_POLL_DURATION_MS);
  });

  it('DC-POLL-10: 429 で Retry-After が無ければ backoff 数列に従う', () => {
    for (const header of [null, undefined, '', 'Wed, 21 Oct 2026 07:28:00 GMT', '-1', 'abc']) {
      expect(parseRetryAfterSeconds(header)).toBeNull();
      expect(resolveRetryDelayMs(2, parseRetryAfterSeconds(header))).toBe(nextPollIntervalMs(2));
    }
  });
});
