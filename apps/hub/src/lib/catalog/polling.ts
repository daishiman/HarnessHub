/**
 * publish 状況ポーリングの間隔計算と停止判定 (qa-009 / qa-062, ADR §2.2 / §2.4)。
 *
 * **React に依存しない純関数だけを置く**。hook 側は返り値どおりに `setTimeout` を張り直すだけにする。
 * こうしておくと、将来 TanStack Query を導入したときも同じ関数を `refetchInterval` に渡すだけで移行でき、
 * かつ全分岐を DOM なしの単体テストで検証できる (test-design DC-POLL-01..11)。
 */
import type { CatalogFailureKind, PublishRequestState } from '@harness-hub/schemas';

import { isTerminalCatalogFailure } from './degradation.js';

/** 初回間隔。qa-062 が定める 2 秒。 */
export const INITIAL_POLL_INTERVAL_MS = 2_000;
/** 間隔の上限。これ以上は伸ばさない。 */
export const MAX_POLL_INTERVAL_MS = 30_000;
/** 連続失敗の上限。到達したら自動ポーリングを止め、明示的な再試行導線へ倒す (ADR §2.4)。 */
export const MAX_CONSECUTIVE_FAILURES = 5;
/** 総試行時間の上限 15 分。滞留した PublishRequest を永久に叩き続けない (ADR §2.4)。 */
export const MAX_POLL_DURATION_MS = 15 * 60 * 1_000;

/**
 * ポーリング対象の状態。
 *
 * **「非終端」ではなく「サーバ側が自動で次へ進める状態」だけを選ぶ**。
 * `needs_fix` / `ready` / `approval_pending` は人の操作を待つ状態であり、
 * 叩き続けても状態は変わらない (無駄な負荷にしかならない)。
 * 値域は `publishRequestStateSchema` の 9 状態が正本。
 */
const POLLABLE_PUBLISH_STATES: ReadonlySet<PublishRequestState> = new Set<PublishRequestState>([
  'validating',
  'approved',
  'publishing',
]);

/** その状態を叩き続ける意味があるか。 */
export function isPollablePublishState(status: PublishRequestState): boolean {
  return POLLABLE_PUBLISH_STATES.has(status);
}

/**
 * 次回ポーリングまでの待ち時間。`2s → ×2 → 30s 上限` の数列。
 *
 * 全域関数にしてある (負値・小数・巨大値・NaN でも例外を投げない)。
 * 呼び出し側の attempt 管理がずれたときに画面が落ちるより、間隔が既定値に落ちる方が安全なため。
 */
export function nextPollIntervalMs(attempt: number): number {
  const normalized = Number.isFinite(attempt) ? Math.max(0, Math.floor(attempt)) : 0;
  // 2 ** n は n が大きいと Infinity になる。指数側を先に頭打ちさせてから掛ける
  const exponent = Math.min(normalized, 32);
  return Math.min(INITIAL_POLL_INTERVAL_MS * 2 ** exponent, MAX_POLL_INTERVAL_MS);
}

/** 停止判定の入力。UI の都合 (可視性・多重送信) も含めてここに集約する。 */
export interface PollingState {
  status: PublishRequestState;
  /** 連続失敗回数 (成功でリセットする)。 */
  consecutiveFailures: number;
  /** ポーリング開始からの経過時間。 */
  elapsedMs: number;
  /** `document.visibilityState === 'visible'` の結果。 */
  documentVisible: boolean;
  /** 前回のリクエストが未完了か。 */
  inFlight: boolean;
  /**
   * 直近の失敗種別。成功していれば null。
   *
   * 連続失敗回数と分けて持つのは、両者が測っている対象が違うため。
   * 回数は「一過性の失敗がどれだけ続いたか」、種別は「そもそも再試行に意味があるか」を表す。
   */
  lastFailureKind: CatalogFailureKind | null;
}

/**
 * ポーリングを続けるべきか。
 *
 * 停止条件を 1 箇所に集めているのは、条件が hook 内に散ると
 * 「片方の条件だけ直して、もう片方が残る」形の退行が起きるため。
 */
export function shouldContinuePolling(state: PollingState): boolean {
  if (!isPollablePublishState(state.status)) return false;
  // 終端失敗は回数上限を待たずに即時停止する。401/403/契約不正は、
  // 同じ資格情報で同じ要求を繰り返す限り決定的に同じ答えが返るため、
  // 残り 4 回を消費すること自体が無駄な通信でしかない
  if (state.lastFailureKind !== null && isTerminalCatalogFailure(state.lastFailureKind)) return false;
  if (state.inFlight) return false;
  if (!state.documentVisible) return false;
  if (state.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) return false;
  if (state.elapsedMs >= MAX_POLL_DURATION_MS) return false;
  return true;
}

/**
 * 不可視で止まったポーリングを、可視復帰時に再開してよいか。
 *
 * **`shouldContinuePolling` に `documentVisible: true` を与えて問い直すだけ**にしてある。
 * 「再開してよい条件」を独立に書くと、停止条件との間に必ず乖離が生まれる —
 * 例えば終端失敗の判定を停止側にだけ足すと、可視復帰のたびに 401 を叩き直す穴が開く。
 *
 * 可視性以外の停止事由 (終端状態・終端失敗・回数上限・時間上限) が立っていれば false を返す。
 */
export function shouldResumeOnVisible(state: PollingState): boolean {
  return shouldContinuePolling({ ...state, documentVisible: true });
}

/**
 * `Retry-After` ヘッダの秒数解釈。
 * 数値形式のみ受け付け、HTTP-date 形式や不正値は null (= backoff 数列に従う) とする。
 */
export function parseRetryAfterSeconds(headerValue: string | null | undefined): number | null {
  if (headerValue === null || headerValue === undefined) return null;
  const trimmed = headerValue.trim();
  // 空文字は `Number('')` が 0 になる。0 秒指示 (即再試行) と空ヘッダを同じ扱いにすると、
  // 壊れたヘッダを受けた瞬間に 429 を出したサーバへ間を置かず投げ返すことになる
  if (trimmed === '') return null;
  const seconds = Number(trimmed);
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return seconds;
}

/**
 * 次回待ち時間の最終決定。
 *
 * **サーバが `Retry-After` を返したらそれを優先する** — client の backoff 数列が
 * サーバ側のレート制御を上書きしてはいけない。ただし異常値で実質停止しないよう総試行上限でクランプする。
 */
export function resolveRetryDelayMs(attempt: number, retryAfterSeconds: number | null): number {
  if (retryAfterSeconds === null) return nextPollIntervalMs(attempt);
  return Math.min(Math.ceil(retryAfterSeconds * 1_000), MAX_POLL_DURATION_MS);
}
