/**
 * サインイン確定処理 (JIT provisioning と session claims の組み立て)。
 *
 * Auth.js の callback から呼ばれることを想定しているが、**Auth.js の型に依存しない純関数**にしてある。
 * ライブラリを Better Auth へ差し替えても、ここの契約 (誰を受理し、どんな claims を焼くか) は残る。
 */

import type { SessionClaims } from '@harness-hub/schemas';
import type { DirectoryUser, UserDirectoryPort } from '../ports.js';
import { buildSessionClaims } from '../session.js';

export type SignInRejection = 'user_inactive' | 'provisioning_disabled';

export type SignInOutcome =
  | { readonly ok: true; readonly user: DirectoryUser; readonly provisioned: boolean }
  | { readonly ok: false; readonly reason: SignInRejection };

export interface SignInInput {
  readonly users: UserDirectoryPort;
  readonly tenantId: string;
  /** 検証済み ID token の `sub`。email ではない (AD-5: email は識別子に使わない)。 */
  readonly idpSubject: string;
  readonly email: string | null;
  /** 未知の利用者を初回ログインで作るか。テナント設定で閉じられる。 */
  readonly allowJitProvisioning: boolean;
}

/**
 * 検証済み OIDC 結果から利用者を確定する。
 *
 * 既存利用者の role を IdP claims で**上書きしない**のが要点。
 * IdP が渡してくる group/role を信じると、IdP 側の設定変更がそのまま Hub の権限昇格になる。
 */
export async function resolveSignIn(input: SignInInput): Promise<SignInOutcome> {
  const existing = await input.users.findByIdpSubject(input.tenantId, input.idpSubject);

  if (existing !== null) {
    // 無効化された利用者は IdP 側で認証が通っても Hub には入れない
    if (existing.status !== 'active') return { ok: false, reason: 'user_inactive' };
    return { ok: true, user: existing, provisioned: false };
  }

  if (!input.allowJitProvisioning) return { ok: false, reason: 'provisioning_disabled' };

  const created = await input.users.createFromOidc({
    tenantId: input.tenantId,
    idpSubject: input.idpSubject,
    email: input.email,
  });
  return { ok: true, user: created, provisioned: true };
}

/**
 * session claims を作る。
 * `buildSessionClaims` へ委譲するだけだが、adapter 側の入口を 1 本にしておくことで
 * 「Auth.js の session callback が独自に claims を組み立てる」経路が生まれないようにする。
 */
export function sessionClaimsForUser(user: DirectoryUser, nowSeconds: number): SessionClaims {
  return buildSessionClaims(user, nowSeconds);
}
