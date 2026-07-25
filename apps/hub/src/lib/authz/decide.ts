/**
 * 認可判定の本体 (ADR AD-4)。
 *
 * **同期の純関数**にしてある。DB 参照 (緊急失効) は呼び出し側で先に解決し、
 * 結果を `sessionRevoked` として渡す契約。判定の中に I/O を混ぜると、
 * 「どの分岐でどのクエリが飛ぶか」が判定表と絡んで読めなくなる。
 */

import { findActionRule } from './rules.js';
import { type AuthzOutcome, type AuthzPrincipal, type AuthzResourceRef, atLeast, type EffectiveRole } from './types.js';

export interface AuthzDecisionInput {
  readonly action: string;
  readonly principal: AuthzPrincipal;
  readonly resource: AuthzResourceRef;
  /** 緊急失効の判定結果。ポート例外時は呼び出し側が `true` (拒否側) を渡す (fail-closed)。 */
  readonly sessionRevoked: boolean;
}

export type RoleResolution =
  | { readonly ok: true; readonly role: EffectiveRole }
  | { readonly ok: false; readonly reason: 'tenant_mismatch' | 'workspace_not_member' };

/**
 * 実効 role を求める。
 *
 * `owner` を合成するのは `member` のときだけ。`workspace-admin` に対して owner を合成すると
 * 順序上の格下げ (workspace-admin > owner) になり、自分の資源にだけ権限が下がる逆転が起きる。
 */
export function resolveEffectiveRole(principal: AuthzPrincipal, resource: AuthzResourceRef): RoleResolution {
  // provider-admin だけがテナント境界を越えられる (security-spec §3.1.3)。
  // 越境を全面禁止すると IdP 設定登録・AiJob pull・顧客サポートが成立しない。
  // 代わりに越境は必ず監査へ落ちる (`withAuthz` が呼び出し側の善意に依存せず記録する)。
  // Workspace 所属も問わない — provider-admin はテナントの外側に立つ主体だから
  if (principal.role === 'provider-admin') {
    return { ok: true, role: 'provider-admin' };
  }

  if (principal.tenantId !== resource.tenantId) {
    return { ok: false, reason: 'tenant_mismatch' };
  }

  if (resource.workspaceId !== null && !principal.workspaceIds.includes(resource.workspaceId)) {
    return { ok: false, reason: 'workspace_not_member' };
  }

  if (principal.role === 'workspace-admin') {
    return { ok: true, role: 'workspace-admin' };
  }

  if (resource.ownerUserId !== null && resource.ownerUserId === principal.userId) {
    return { ok: true, role: 'owner' };
  }

  return { ok: true, role: 'member' };
}

/**
 * 判定順は「規則の存在 → 主体の生死 → session の失効 → 資格情報種別 → scope
 * → テナント/Workspace → 所有 → role 強度」。
 *
 * 外側 (主体そのものが無効) から順に落とすことで、無効な主体に対して
 * 資源の存在有無を含む詳しい理由を返してしまうのを防いでいる。
 */
export function decide(input: AuthzDecisionInput): AuthzOutcome {
  const rule = findActionRule(input.action);
  if (rule === null) return { allowed: false, reason: 'no_rule' };

  if (input.principal.status !== 'active') return { allowed: false, reason: 'inactive_user' };

  if (input.sessionRevoked) return { allowed: false, reason: 'revoked_session' };

  if (rule.credential !== 'either' && input.principal.credential !== rule.credential) {
    return { allowed: false, reason: 'credential_not_allowed' };
  }

  if (input.principal.credential === 'access_token' && rule.requiredScope !== null) {
    // token principal は role ∧ scope の両方を満たす (security-spec §2.2 / §3.5)。
    // session は scope の概念外であり、資格情報種別は上の credential 規則で制限する。
    const granted = input.principal.scope;
    if (granted === null || !granted.includes(rule.requiredScope)) {
      return { allowed: false, reason: 'missing_scope' };
    }
  }

  const resolved = resolveEffectiveRole(input.principal, input.resource);
  if (!resolved.ok) return { allowed: false, reason: resolved.reason };

  const effectiveRole = resolved.role;

  // 自分の資源に限る action。管理 role は他人の資源にも及ぶ
  if (rule.selfOnly && input.resource.ownerUserId !== input.principal.userId) {
    if (!atLeast(effectiveRole, 'workspace-admin')) {
      return { allowed: false, reason: 'not_owner' };
    }
  }

  if (!atLeast(effectiveRole, rule.minRole)) {
    return { allowed: false, reason: 'insufficient_role' };
  }

  return { allowed: true, effectiveRole };
}
