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
  return connection;
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
