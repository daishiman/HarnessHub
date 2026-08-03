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
 * 「今 session が束縛している workspace」を運ぶ cookie 名。
 * JWT session claims (`SessionClaims`) には含めない。claims を跨いだ再発行なしに
 * workspace 切替を即時反映させたいのと、claims schema の変更を避けるため。
 */
export const ACTIVE_WORKSPACE_COOKIE_NAME = 'hh_active_workspace';

/**
 * cookie の workspace id は自己申告 (改ざん可能) なので、そのまま信用せず
 * 呼び出し時点の principal の所属 (`memberWorkspaceIds`) に含まれる場合だけ採用する。
 * 所属を外れた workspace は無条件で null (未選択) に落とす。
 */
export function resolveActiveWorkspace(
  cookieHeader: string | null,
  memberWorkspaceIds: readonly string[],
): string | null {
  const candidate = readCookie(cookieHeader, ACTIVE_WORKSPACE_COOKIE_NAME);
  if (candidate === null) return null;
  return memberWorkspaceIds.includes(candidate) ? candidate : null;
}
