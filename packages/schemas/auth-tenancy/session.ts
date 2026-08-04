/**
 * session (JWT stateless) と OIDC ID token の claims 契約。
 * 認可 MW が DB 往復なしで判定できる最小集合に絞る (backend-spec §3.2 / ADR AD-7)。
 */
import { z } from 'zod';

import { epochSecondsSchema, sessionRoleSchema, tenantSlugSchema, userStatusSchema } from './primitives.js';

/**
 * Hub が発行する session JWT の claims。
 * `role`/`status` を載せるのは認可判定で DB を引かないため。代償として最大 `updateAge` (15 分) 古くなる。
 * 緊急失効はこの陳腐化を回避するために `iat` と `session_revocations.revoked_at` を比較する。
 */
export const sessionClaimsSchema = z.object({
  /** Hub 内部の users.id。IdP の sub をそのまま使わない (IdP 変更に耐えるため)。 */
  sub: z.string().min(1),
  tenant_id: z.string().min(1),
  role: sessionRoleSchema,
  status: userStatusSchema,
  /**
   * 所属 Workspace。edge の認可 MW が Workspace 越境を DB 往復なしで弾くために載せる
   * (docs/security-spec.md §2.1 = qa-072 で確定。起点は AD-7 追補)。
   * 載せない場合、edge が membership を判定できず全 Workspace スコープ要求が落ちる。
   * 代償: cookie が所属数に比例して膨らむ / membership 変更が最大 `updateAge` (15 分) 反映されない。
   */
  workspace_ids: z.array(z.string().min(1)),
  /** 発行時刻 (epoch 秒)。緊急失効の判定基準になるので必須。 */
  iat: epochSecondsSchema,
  /** 失効時刻 (epoch 秒)。 */
  exp: epochSecondsSchema,
});
export type SessionClaims = z.output<typeof sessionClaimsSchema>;

/**
 * IdP が返す ID token の claims のうち、Hub が検証・利用するもの。
 * **`role` 相当の claim は意図的に含めない** — 権限を IdP に委譲しないため (ADR AD-5 / T-OIDC-17)。
 */
export const oidcIdTokenClaimsSchema = z.object({
  iss: z.string().min(1),
  /** RFC 7519 §4.1.3: 単一値と配列の両方を許す。 */
  aud: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
  /** 配列 aud のときの発行先クライアント。 */
  azp: z.string().min(1).optional(),
  sub: z.string().min(1),
  iat: epochSecondsSchema,
  exp: epochSecondsSchema,
  /** リプレイ防止。**欠落は検査省略ではなく拒否**として扱う。 */
  nonce: z.string().min(1).optional(),
  email: z.string().min(1).optional(),
  /** `true` 以外 (false / 欠落) は受理しない。 */
  email_verified: z.boolean().optional(),
  name: z.string().min(1).optional(),
  /**
   * Google Workspace のホストドメイン (Google 固有 claim)。
   *
   * 共通 OAuth client 方式では `aud` が全テナント共通になるため、`aud` はテナント識別子として
   * 機能しない。そこで「どの Workspace の利用者か」を **ID token 側で**確かめる唯一の手掛かりが `hd` になる。
   *
   * schema では optional にする — 個人 Google アカウントは `hd` を持たないため、
   * 「型として無い」ことと「あるべきなのに欠落している」ことは別の層で判定する。
   * 後者 (許可 Workspace domain を持つテナントでの欠落) は `verifyOidcIdToken` が拒否する。
   *
   * 注意: 認可要求の `hd` **パラメータ**はアカウント選択画面のヒントに過ぎず境界ではない。
   * 境界になるのは ID token に載って署名されたこの claim だけ。
   */
  hd: z.string().min(1).optional(),
});
export type OidcIdTokenClaims = z.output<typeof oidcIdTokenClaimsSchema>;

/** `/{tenant_slug}/signin` の route params。 */
export const signinRouteParamsSchema = z.object({
  tenant_slug: tenantSlugSchema,
});
export type SigninRouteParams = z.output<typeof signinRouteParamsSchema>;
