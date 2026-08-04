/**
 * `/device` が表示に使う session の最小断面。
 *
 * ページは公開経路だが、署名と緊急失効を確認した session から得た
 * tenant / workspace だけを承認フォームへ渡す。
 * 実際の承認可否は POST /api/v1/device/approve の withAuthz が再判定する。
 */

import { readCookie, SESSION_COOKIE_NAME, verifySessionToken } from '../../lib/auth/index.js';

export type DeviceApprovalSession =
  | { readonly status: 'authenticated'; readonly tenantId: string; readonly workspaceIds: readonly string[] }
  | { readonly status: 'unauthenticated' }
  | { readonly status: 'unavailable' };

export interface DeviceApprovalSessionDeps {
  readonly sessionSecret: string;
  readonly nowSeconds: number;
  readonly isRevoked: (tenantId: string, userId: string, issuedAtSeconds: number) => Promise<boolean>;
}

export async function resolveDeviceApprovalSession(
  cookieHeader: string | null,
  deps: DeviceApprovalSessionDeps,
): Promise<DeviceApprovalSession> {
  const token = readCookie(cookieHeader, SESSION_COOKIE_NAME);
  if (token === null) return { status: 'unauthenticated' };

  const verified = await verifySessionToken(token, deps.sessionSecret, deps.nowSeconds);
  if (!verified.ok || verified.claims.status !== 'active') return { status: 'unauthenticated' };

  const revoked = await deps.isRevoked(verified.claims.tenant_id, verified.claims.sub, verified.claims.iat);
  if (revoked) return { status: 'unauthenticated' };

  return {
    status: 'authenticated',
    tenantId: verified.claims.tenant_id,
    workspaceIds: [...verified.claims.workspace_ids],
  };
}
