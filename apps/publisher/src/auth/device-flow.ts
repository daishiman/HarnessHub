/**
 * OAuth Device Authorization Flow (RFC 8628) クライアント (AD-4)。
 * `POST /api/v1/device/code` → `POST /api/v1/device/token` の polling を実装する。
 *
 * 数値契約 (apps/hub の AUTH_NUMERIC_CONTRACT と同じ値) はここに独立して保持する。
 * Hub 側の定数は export されておらず (Hub 内部設定)、wire 契約はサーバ応答の
 * expires_in/interval で伝わるため、client 側は「backoff 増分」と「増加の上限」だけを
 * 固定値として持てば足りる。
 */
import {
  type DeviceCodeResponse,
  deviceErrorResponseSchema,
  type TokenResponse,
  tokenResponseSchema,
} from '@harness-hub/schemas';

export const DEVICE_POLL_BACKOFF_SECONDS = 5;
export const DEVICE_POLL_MAX_INTERVAL_SECONDS = 60;
/** refresh token の rotation 対象判定に使う (Hub の AUTH_NUMERIC_CONTRACT.refreshTokenTtlSeconds と同値)。 */
export const REFRESH_TOKEN_ROTATION_SECONDS = 90 * 24 * 60 * 60;
/** access token の失効判定に使う (Hub の AUTH_NUMERIC_CONTRACT.accessTokenTtlSeconds と同値)。 */
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

export interface DevicePollState {
  readonly deviceCode: string;
  readonly intervalSeconds: number;
  readonly issuedAtEpochSeconds: number;
  readonly expiresInSeconds: number;
}

export function startDevicePoll(response: DeviceCodeResponse, nowEpochSeconds: number): DevicePollState {
  return {
    deviceCode: response.device_code,
    intervalSeconds: response.interval,
    issuedAtEpochSeconds: nowEpochSeconds,
    expiresInSeconds: response.expires_in,
  };
}

export function isExpired(issuedAtEpochSeconds: number, ttlSeconds: number, nowEpochSeconds: number): boolean {
  return nowEpochSeconds >= issuedAtEpochSeconds + ttlSeconds;
}

export function isDeviceCodeExpired(state: DevicePollState, nowEpochSeconds: number): boolean {
  return isExpired(state.issuedAtEpochSeconds, state.expiresInSeconds, nowEpochSeconds);
}

export type PollOutcome =
  | { readonly kind: 'pending'; readonly nextState: DevicePollState }
  | { readonly kind: 'slow_down'; readonly nextState: DevicePollState }
  | { readonly kind: 'approved'; readonly token: TokenResponse }
  | { readonly kind: 'expired' }
  | { readonly kind: 'denied' }
  | { readonly kind: 'error'; readonly code: string };

/**
 * 1 回の polling 応答を状態遷移へ写像する。
 * `slow_down` の増分と上限をここに固定するのが、この関数の唯一の業務判断。
 */
export function applyPollResponse(
  state: DevicePollState,
  response: { readonly status: number; readonly body: unknown },
): PollOutcome {
  if (response.status === 200) {
    return { kind: 'approved', token: tokenResponseSchema.parse(response.body) };
  }
  const error = deviceErrorResponseSchema.parse(response.body);
  switch (error.error) {
    case 'authorization_pending':
      return { kind: 'pending', nextState: state };
    case 'slow_down': {
      const increased = Math.min(state.intervalSeconds + DEVICE_POLL_BACKOFF_SECONDS, DEVICE_POLL_MAX_INTERVAL_SECONDS);
      return { kind: 'slow_down', nextState: { ...state, intervalSeconds: increased } };
    }
    case 'expired_token':
      return { kind: 'expired' };
    case 'access_denied':
      return { kind: 'denied' };
    default:
      return { kind: 'error', code: error.error };
  }
}

export type PollTokenEndpoint = (deviceCode: string) => Promise<{ readonly status: number; readonly body: unknown }>;
export type Sleep = (ms: number) => Promise<void>;

/** 実際の polling loop。状態遷移そのものは `applyPollResponse` (純関数) に委ねる。 */
export async function pollForToken(
  initial: DevicePollState,
  deps: { readonly pollTokenEndpoint: PollTokenEndpoint; readonly sleep: Sleep; readonly now: () => number },
): Promise<TokenResponse> {
  let state = initial;
  for (;;) {
    if (isDeviceCodeExpired(state, deps.now())) {
      throw new Error('device_code の有効期限が切れました。最初からやり直してください');
    }
    await deps.sleep(state.intervalSeconds * 1000);
    const response = await deps.pollTokenEndpoint(state.deviceCode);
    const outcome = applyPollResponse(state, response);
    switch (outcome.kind) {
      case 'approved':
        return outcome.token;
      case 'pending':
        continue;
      case 'slow_down':
        state = outcome.nextState;
        continue;
      case 'expired':
        throw new Error('device_code の有効期限が切れました');
      case 'denied':
        throw new Error('認可が拒否されました');
      case 'error':
        throw new Error(`device token 交換に失敗しました: ${outcome.code}`);
    }
  }
}
