/**
 * テナント別 OIDC の解決と ID token 検証契約 (ADR AD-5)。
 *
 * **Auth.js に依存しない純関数**として実装する。理由は 2 つ:
 *   1. IdP を立てずに全分岐を単体テストで網羅できる (E2E は最小経路のみ、という方針と整合)
 *   2. Better Auth へ移行しても検証契約が失われない (adapter 差し替えの影響範囲を狭める)
 */

import type { OidcIdTokenClaims } from '@harness-hub/schemas';
import { tenantSlugSchema } from '@harness-hub/schemas';

import type { TenantOidcConnection, TenantOidcConnectionPort } from './ports.js';

/** ID token を受理しなかった理由。すべて「拒否」であり、警告付き受理は存在しない。 */
export type OidcRejectionReason =
  | 'unknown_tenant'
  | 'state_mismatch'
  | 'pkce_required'
  | 'issuer_mismatch'
  | 'audience_mismatch'
  /** 共有 credential 方式なのに許可 Workspace ドメインが設定されていない (設定不備 / fail-closed)。 */
  | 'workspace_domain_unconfigured'
  /** 許可 Workspace ドメインを持つテナントで `hd` claim が欠落している (個人 Google アカウント等)。 */
  | 'workspace_domain_missing'
  /** `hd` claim が許可 Workspace ドメインのどれとも一致しない (別 Workspace / 別テナント)。 */
  | 'workspace_domain_mismatch'
  | 'nonce_mismatch'
  | 'token_expired'
  | 'email_unverified'
  | 'subject_missing';

export interface OidcVerificationInput {
  readonly claims: OidcIdTokenClaims;
  readonly connection: TenantOidcConnection;
  /** discovery document から読んだ issuer。設定値と二重に照合する。 */
  readonly discoveredIssuer: string;
  /** 認可要求時に生成し保存しておいた nonce。 */
  readonly expectedNonce: string;
  /** 認可要求時に生成し保存しておいた state。 */
  readonly expectedState: string;
  /** callback で返ってきた state。欠落は null。 */
  readonly receivedState: string | null;
  /** 認可要求で使った PKCE method。`S256` 以外は受理しない。 */
  readonly codeChallengeMethod: string | null;
  readonly nowSeconds: number;
}

export type OidcVerification =
  | { readonly ok: true; readonly tenantId: string; readonly idpSubject: string; readonly email: string | null }
  | { readonly ok: false; readonly reason: OidcRejectionReason };

/**
 * slug からテナントの OIDC 接続を解決する。
 * 解決できない場合に「既定の provider」へ落とさない — それをやると未登録テナントが
 * 別テナントの IdP でログインできてしまう。
 */
export async function resolveTenantOidcConfig(
  port: TenantOidcConnectionPort,
  tenantSlug: string,
): Promise<TenantOidcConnection | null> {
  const parsed = tenantSlugSchema.safeParse(tenantSlug);
  if (!parsed.success) return null;

  const connection = await port.findByTenantSlug(parsed.data);
  if (connection === null || !connection.enabled) return null;
  if (!isCredentialModeUsable(connection)) return null;
  return connection;
}

/**
 * credential mode ごとの「この接続を使ってよいか」。
 *
 * 共有方式は `aud` (共通 client_id) がテナントを特定しないため、`hd` が唯一のテナント帰属証明になる。
 * 許可 Workspace ドメインが空の共有接続は「Google アカウントを持つ誰でも入れる接続」なので、
 * **認可を開始する前に**閉じる。検証段階まで持ち越さないのは、認可要求を出してしまうと
 * 利用者から見て「ログインできたのに弾かれる」体験になり、設定不備が運用上見えにくくなるため。
 *
 * 顧客方式は従来どおり許可ドメイン未設定でも使える (既存テナントの認証境界を変えない / 受入条件 5)。
 */
function isCredentialModeUsable(connection: TenantOidcConnection): boolean {
  switch (connection.credentialMode) {
    case 'shared_google':
      return connection.allowedWorkspaceDomains.length > 0;
    case 'customer_google':
      return true;
    default:
      // 未知の mode を既定 (共有) へ落とさない。列挙を増やしたのに分岐を足し忘れた場合も拒否側へ倒れる
      return false;
  }
}

/**
 * ID token の検証契約。
 *
 * 判定順は「要求の真正性 (state/PKCE) → 発行元の真正性 (issuer/aud) → リプレイ (nonce) →
 * 有効期限 → 本人性 (email_verified/sub)」。
 * 外側の検査から先に落とすことで、攻撃者が持ち込んだ token の中身を無駄に信用しない。
 */
export function verifyOidcIdToken(input: OidcVerificationInput): OidcVerification {
  const { claims, connection } = input;

  // CSRF: state は「あれば比較」ではなく必須。欠落を許すと省略するだけで検査を外せる
  if (input.receivedState === null || input.receivedState !== input.expectedState) {
    return { ok: false, reason: 'state_mismatch' };
  }

  // 認可コード横取り対策。plain は S256 と同等の保護を与えないので受理しない
  if (input.codeChallengeMethod !== 'S256') {
    return { ok: false, reason: 'pkce_required' };
  }

  // 設定値・discovery・token の 3 者が一致して初めて発行元を信用する
  if (claims.iss !== connection.issuer || input.discoveredIssuer !== connection.issuer) {
    return { ok: false, reason: 'issuer_mismatch' };
  }

  if (!isAudienceAccepted(claims, connection.clientId)) {
    return { ok: false, reason: 'audience_mismatch' };
  }

  // テナント帰属。共通 client では aud が全テナント共通なので、aud を通っただけでは
  // 「このテナント向けの token」と言えない。hd はその隙間を埋める唯一の署名済み手掛かり
  const workspaceDomain = verifyWorkspaceDomain(claims.hd, connection);
  if (workspaceDomain !== null) return { ok: false, reason: workspaceDomain };

  // リプレイ防止。nonce も欠落を拒否する
  if (claims.nonce === undefined || claims.nonce !== input.expectedNonce) {
    return { ok: false, reason: 'nonce_mismatch' };
  }

  if (claims.exp <= input.nowSeconds) {
    return { ok: false, reason: 'token_expired' };
  }

  // email は識別子に使わないが、未検証 email を持つアカウントは受理しない。
  // 未検証 email を通すと、IdP 側で他人の email を騙ったアカウントが作れる場合に紐付けを誤る
  if (claims.email !== undefined && claims.email_verified !== true) {
    return { ok: false, reason: 'email_unverified' };
  }

  if (claims.sub.length === 0) {
    return { ok: false, reason: 'subject_missing' };
  }

  return {
    ok: true,
    tenantId: connection.tenantId,
    idpSubject: claims.sub,
    // email は表示用にのみ持ち回る。一意識別は (tenantId, idpSubject) で行う
    email: claims.email ?? null,
  };
}

/**
 * aud の判定。
 * 単一値なら一致、配列なら「自分の client_id を含む」かつ「azp が自分」を要求する。
 * 配列 aud で azp を見ないと、他クライアント向けに発行された token を流用できてしまう (RFC 7519 §4.1.3)。
 */
function isAudienceAccepted(claims: OidcIdTokenClaims, clientId: string): boolean {
  if (typeof claims.aud === 'string') return claims.aud === clientId;
  if (!claims.aud.includes(clientId)) return false;
  return claims.azp === clientId;
}

/**
 * Google `hd` claim と許可 Workspace ドメインの照合。拒否理由を返す (受理なら null)。
 *
 * 3 つの判断がここに集約されている。
 *
 *   1. **共有方式で許可ドメインが空なら拒否**。`resolveTenantOidcConfig` が同じ条件で
 *      認可開始を止めているが、検証側にも置く。解決を経ずに検証だけ呼ばれる経路
 *      (テスト・将来の別 adapter) で保護が抜けないようにするため。「片側だけの実装では
 *      テナント混線を防げない」はこの issue のリスク欄に明記された失敗様式そのもの。
 *   2. **許可ドメインを持つなら `hd` は必須**。欠落を「検査対象外」として通すと、
 *      個人 Google アカウント (hd を持たない) が Workspace 限定テナントへ JIT provisioning される。
 *   3. **比較は小文字化した完全一致**。サブドメイン一致 (`endsWith`) にしない —
 *      `evil-example.com` が `example.com` を含む形の値で通ってしまう余地を作らない。
 *      許可側は保存時点で小文字に縛ってあるが、`hd` は IdP 由来なのでここで正規化する。
 *
 * claims 全体ではなく `hd` 単体を受け取るのは、**Auth.js adapter からも同じ判定を通すため**。
 * adapter 側が持つのは Auth.js が復号した `profile` (緩い Record) であって `OidcIdTokenClaims` ではない。
 * ここで claims 型を要求すると adapter 側が独自に同等の照合を書くことになり、
 * 「2 箇所にある帰属判定の片方だけが直る」という、この issue が最も避けたい形になる。
 */
export function verifyWorkspaceDomain(
  hd: string | null | undefined,
  connection: TenantOidcConnection,
): OidcRejectionReason | null {
  const allowed = connection.allowedWorkspaceDomains;

  if (allowed.length === 0) {
    // 共有方式は hd 無しでは受理しようがない (aud がテナントを特定しないため)
    return connection.credentialMode === 'shared_google' ? 'workspace_domain_unconfigured' : null;
  }

  if (hd === undefined || hd === null || hd.length === 0) return 'workspace_domain_missing';

  const normalized = hd.toLowerCase();
  return allowed.some((domain) => domain.toLowerCase() === normalized) ? null : 'workspace_domain_mismatch';
}
