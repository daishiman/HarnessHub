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
  const stored = await deps.credentialStore.getToken(tenantSlug);
  const token =
    stored === null
      ? await loginWithDeviceFlow(deps, tenantSlug, scope)
      : await refreshOrClear(deps.credentialStore, tenantSlug, stored.refresh_token, deps.refreshTokenEndpoint);

  const claims = decodeAccessTokenClaims(token.access_token);
  await deps.credentialStore.saveToken({
    tenant_slug: tenantSlug,
    workspace_id: claims.workspace_id,
    refresh_token: token.refresh_token,
    scope: token.scope,
    issued_at: deps.now(),
  });
  return { accessToken: token.access_token, tenantId: claims.tenant_id, workspaceId: claims.workspace_id };
}
