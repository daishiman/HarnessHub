/**
 * access token の確立 (AD-1 cli/, AD-4 帰結)。`publish`/`feedback` の両サブコマンドが共有する。
 *
 * access token は OS 資格情報域に保存しない (credential-record.ts 冒頭コメント) ため、
 * 1 回の実行ごとに必ず refresh token からの再取得 (2 回目以降) か device flow (初回) を行う —
 * 「前回の access token をそのまま使い回す」経路は設計上存在しない。
 */
import type { DeviceCodeResponse, PublisherTokenScope, TokenResponse } from '@harness-hub/schemas';

import {
  type CredentialStoreAdapter,
  decodeAccessTokenClaims,
  type PollTokenEndpoint,
  pollForToken,
  type RefreshTokenEndpoint,
  refreshOrClear,
  type Sleep,
  startDevicePoll,
} from '../auth/index.js';

export interface SessionDeps {
  /** refresh tokenの送信先を固定する、path無しのHTTPS origin。 */
  readonly hubOrigin: string;
  readonly credentialStore: CredentialStoreAdapter;
  readonly requestDeviceCode: (
    tenantSlug: string,
    scope: readonly PublisherTokenScope[],
  ) => Promise<DeviceCodeResponse>;
  readonly pollTokenEndpoint: PollTokenEndpoint;
  readonly refreshTokenEndpoint: RefreshTokenEndpoint;
  readonly sleep: Sleep;
  readonly now: () => number;
  readonly openVerificationUrl: (url: string) => void;
  readonly log: (message: string) => void;
}

export interface AccessTokenSession {
  readonly accessToken: string;
  readonly tenantId: string;
  readonly workspaceId: string;
}

async function loginWithDeviceFlow(
  deps: SessionDeps,
  tenantSlug: string,
  scope: readonly PublisherTokenScope[],
): Promise<TokenResponse> {
  const codeResponse = await deps.requestDeviceCode(tenantSlug, scope);
  deps.log(`ブラウザで次の URL を開いて認可してください: ${codeResponse.verification_uri_complete}`);
  deps.openVerificationUrl(codeResponse.verification_uri_complete);
  const state = startDevicePoll(codeResponse, deps.now());
  return pollForToken(state, { pollTokenEndpoint: deps.pollTokenEndpoint, sleep: deps.sleep, now: deps.now });
}

export async function obtainAccessToken(
  deps: SessionDeps,
  tenantSlug: string,
  scope: readonly PublisherTokenScope[],
): Promise<AccessTokenSession> {
  const stored = await deps.credentialStore.getToken(deps.hubOrigin, tenantSlug);
  if (stored !== null && stored.hub_origin !== deps.hubOrigin) {
    await deps.credentialStore.clearToken(deps.hubOrigin, tenantSlug);
    throw new Error('保存済みrefresh tokenのHub originが一致しません。再認可してください');
  }
  let token =
    stored === null
      ? await loginWithDeviceFlow(deps, tenantSlug, scope)
      : await refreshOrClear(
          deps.credentialStore,
          deps.hubOrigin,
          tenantSlug,
          stored.refresh_token,
          deps.refreshTokenEndpoint,
        );

  // refresh tokenのscopeは発行時から拡張されない。別command用の保存tokenを流用せず再認可する。
  if (!scope.every((required) => token.scope.includes(required))) {
    await deps.credentialStore.clearToken(deps.hubOrigin, tenantSlug);
    token = await loginWithDeviceFlow(deps, tenantSlug, scope);
  }

  const claims = decodeAccessTokenClaims(token.access_token);
  await deps.credentialStore.saveToken({
    hub_origin: deps.hubOrigin,
    tenant_slug: tenantSlug,
    workspace_id: claims.workspace_id,
    refresh_token: token.refresh_token,
    scope: token.scope,
    issued_at: deps.now(),
  });
  return { accessToken: token.access_token, tenantId: claims.tenant_id, workspaceId: claims.workspace_id };
}
