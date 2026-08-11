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
  /**
   * 表示名 (氏名、無ければメールアドレス)。ヘッダーに「誰としてサインインしているか」を
   * 人が読める語で出すためだけに載せる。認可の判定には**使わない**。
   *
   * **optional にするのは必須**。`users.name` / `users.email` はどちらも空文字を取り得るため
   * (JIT provisioning が `name: ''` で作る)、人が読める名前が 1 つも無い利用者が実在する。
   * 必須にすると、その利用者の session が claims の検証で落ちてサインインできなくなる。
   * 既に発行済みの session (この claim を持たない) も同じ理由で受理し続ける必要がある。
   */
  name: z.string().min(1).optional(),
  /**
   * 所属 Workspace の表示名 (識別子 → 名前)。**表示専用**。
   *
   * 到達可否は `workspace_ids` だけが決める。ここに載っているかどうかで到達を判定しないこと
   * (名前が未設定の Workspace はキーごと欠けるため、判定に使うと名前の有無が権限になる)。
   *
   * `workspace_ids` と同じ理由で optional。この claim を足す前に発行された session、および
   * 名前が 1 つも引けない利用者では欠ける。欠けたら識別子を識別子として出す。
   * 名前の変更は `workspace_ids` の変更と同じく再発行まで反映されない (陳腐化の等級は同じ)。
   */
  workspace_names: z.record(z.string().min(1), z.string().min(1)).optional(),
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
