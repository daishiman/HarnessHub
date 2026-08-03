/**
 * JWT stateless session の発行と検証 (ADR AD-7)。
 * 署名処理そのものは jwt.ts が持ち、ここは「session としての claims 契約」だけを担う。
 */

import type { SessionClaims } from '@harness-hub/schemas';
import { sessionClaimsSchema } from '@harness-hub/schemas';

import { AUTH_NUMERIC_CONTRACT } from './config.js';
import { signJwt, verifyJwt } from './jwt.js';
import type { DirectoryUser } from './ports.js';

/** session token を受理しなかった理由。 */
export type SessionRejectionReason = 'malformed' | 'bad_signature' | 'bad_claims' | 'expired';

export type SessionVerification =
  | { readonly ok: true; readonly claims: SessionClaims }
  | { readonly ok: false; readonly reason: SessionRejectionReason };

/**
 * 利用者から session claims を作る。
 * role/status をここで焼き込むため、以後の認可判定は DB を引かずに済む。
 * 代償として最大 `updateAge` (15 分) 古くなる点は受容済み (緊急失効は別経路で担保する)。
 */
export function buildSessionClaims(user: DirectoryUser, nowSeconds: number): SessionClaims {
  return {
    sub: user.id,
    tenant_id: user.tenantId,
    role: user.role,
    status: user.status,
    workspace_ids: [...user.workspaceIds],
    iat: nowSeconds,
    exp: nowSeconds + AUTH_NUMERIC_CONTRACT.sessionMaxAgeSeconds,
  };
}

/**
 * `updateAge` を過ぎたら true。呼び出し側は role/status を読み直して session を再発行する。
 * 毎要求で読み直すと Turso の読取が session 検証と同数になるため、間隔を空けている。
 */
export function shouldRefreshSession(claims: SessionClaims, nowSeconds: number): boolean {
  return nowSeconds - claims.iat >= AUTH_NUMERIC_CONTRACT.sessionUpdateAgeSeconds;
}

export async function signSessionToken(claims: SessionClaims, secret: string): Promise<string> {
  return signJwt(claims, secret);
}

/**
 * 検証順は「署名 → claims の形 → 期限」。
 * 署名を確かめる前に claims を読んで分岐すると、未署名の値で処理を進めることになる。
 */
export async function verifySessionToken(
  token: string,
  secret: string,
  nowSeconds: number,
): Promise<SessionVerification> {
  const verified = await verifyJwt(token, secret);
  if (!verified.ok) return { ok: false, reason: verified.reason };

  const parsed = sessionClaimsSchema.safeParse(verified.payload);
  if (!parsed.success) return { ok: false, reason: 'bad_claims' };
  if (parsed.data.exp <= nowSeconds) return { ok: false, reason: 'expired' };

  return { ok: true, claims: parsed.data };
}

/** `Cookie` ヘッダから指定 cookie を取り出す。名前は完全一致で見る (前方一致だと別 cookie を拾う)。 */
export function readCookie(cookieHeader: string | null, name: string): string | null {
  if (cookieHeader === null) return null;
  for (const chunk of cookieHeader.split(';')) {
    const separator = chunk.indexOf('=');
    if (separator < 0) continue;
    if (chunk.slice(0, separator).trim() !== name) continue;
    const value = chunk.slice(separator + 1).trim();
    return value.length > 0 ? value : null;
  }
  return null;
}

/**
 * session への active workspace 束縛に使う cookie 名。
 * 値は「利用者がどの workspace を選んだか」という意思表示に過ぎず、認可上の正当性は
 * 毎回 `memberWorkspaceIds` (session 検証済みの所属一覧) に対して再検証するため、署名は不要。
 */
export const ACTIVE_WORKSPACE_COOKIE_NAME = 'hh_active_workspace';

/**
 * cookie 由来の active workspace を、principal の所属一覧で毎回再検証する (fail-closed)。
 * 所属を外れた値は握りつぶし、直前の cookie 値へフォールバックしない。
 * cookie が無い場合は、所属が単一 workspace のときだけ選択の余地がないため自動的に束縛する。
 */
export function resolveActiveWorkspaceId(
  cookieHeader: string | null,
  memberWorkspaceIds: readonly string[],
): string | null {
  const requested = readCookie(cookieHeader, ACTIVE_WORKSPACE_COOKIE_NAME);
  if (requested !== null) {
    return memberWorkspaceIds.includes(requested) ? requested : null;
  }
  return memberWorkspaceIds.length === 1 ? (memberWorkspaceIds[0] ?? null) : null;
}
