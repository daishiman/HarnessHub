/**
 * 認可判定の語彙 (ADR AD-3 / AD-4)。
 *
 * **role の順序関係を知ってよいのは lib/authz だけ**という制約を置いている。
 * `ROLE_ORDER` や 'provider-admin' 等のリテラルがこの外に漏れると、判定が二箇所に分かれ、
 * 片方だけ直す事故が起きる。この制約は `apps/hub/scripts/check-single-authz-middleware.mjs` が機械検査する。
 */

import type { PublisherTokenScope, SessionRole, UserStatus } from '@harness-hub/schemas';

/** `users.role` が取り得る値。DB に格納される 3 値。 */
export type BaseRole = SessionRole;

/**
 * 判定時に合成される実効 role。`owner` だけは DB の列値ではなく
 * 「資源との関係 (`projects.owner_user_id` が自分)」から導かれる。
 */
export type EffectiveRole = BaseRole | 'owner';

/**
 * 弱い順に並んだ全順序。`atLeast` はこの並びの添字で比較する。
 * 単調 (monotone) にしてあるので「上位 role は下位 role の権限を必ず含む」が構造的に保証される。
 */
export const ROLE_ORDER: readonly EffectiveRole[] = ['member', 'owner', 'workspace-admin', 'provider-admin'];

export function roleRank(role: EffectiveRole): number {
  return ROLE_ORDER.indexOf(role);
}

/** `actual` が `required` 以上か。未知の role は -1 になり、必ず false 側へ落ちる。 */
export function atLeast(actual: EffectiveRole, required: EffectiveRole): boolean {
  const actualRank = roleRank(actual);
  if (actualRank < 0) return false;
  return actualRank >= roleRank(required);
}

/**
 * 判定対象の主体。
 * session (ブラウザ) 由来と access token (CLI) 由来の両方をこの 1 つの型に正規化する。
 * 正規化しないと「token 経路だけ判定が緩い」といった非対称が生まれる。
 */
export interface AuthzPrincipal {
  readonly userId: string;
  readonly tenantId: string;
  readonly role: BaseRole;
  readonly status: UserStatus;
  /** session/token の発行時刻 (epoch 秒)。緊急失効の判定基準。 */
  readonly issuedAtSeconds: number;
  readonly workspaceIds: readonly string[];
  /**
   * access token に紐づく scope。session 経由 (ブラウザ) は `null`。
   * `null` は「scope 制限なし」ではなく「scope 概念の外」を意味する。
   * session/token のどちらを許すかは ActionRule.credential が明示する。
   */
  readonly scope: readonly PublisherTokenScope[] | null;
  /** 主体の由来。監査記録に残す。 */
  readonly credential: 'session' | 'access_token' | 'cwv_probe';
  /** access token の保存行 ID。session では null。AI job の claim 者照合に使う。 */
  readonly tokenId?: string | null;
}

/** 判定対象の資源。所有者と所属 Workspace を資源側の事実として渡す。 */
export interface AuthzResourceRef {
  readonly type: string;
  readonly id: string | null;
  readonly tenantId: string;
  readonly workspaceId: string | null;
  /** 所有者 (例: `projects.owner_user_id`)。所有概念が無い資源は null。 */
  readonly ownerUserId: string | null;
}

export type AuthzDenyReason =
  /** action が規則表に無い。未定義 action を許可側へ落とさないための既定拒否。 */
  | 'no_rule'
  | 'inactive_user'
  | 'revoked_session'
  | 'credential_not_allowed'
  | 'missing_scope'
  | 'tenant_mismatch'
  | 'workspace_not_member'
  | 'not_owner'
  | 'insufficient_role';

export type AuthzOutcome =
  | { readonly allowed: true; readonly effectiveRole: EffectiveRole }
  | { readonly allowed: false; readonly reason: AuthzDenyReason };
