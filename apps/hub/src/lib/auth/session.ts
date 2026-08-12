/**
 * JWT stateless session の発行と検証 (ADR AD-7)。
 * 署名処理そのものは jwt.ts が持ち、ここは「session としての claims 契約」だけを担う。
 */

import type { SessionClaims } from '@harness-hub/schemas';
import { sessionClaimsSchema } from '@harness-hub/schemas';

import { AUTH_NUMERIC_CONTRACT, serializeSessionCookie } from './config.js';
import { resolveAccountDisplayName } from './display-name.js';
import { JWT_ENVELOPE_CHARS, signJwt, verifyJwt } from './jwt.js';
import type { DirectoryUser } from './ports.js';

/**
 * cookie 1 個の上限 (RFC 6265 が求める最小値で、主要ブラウザの実装値でもある)。
 *
 * **超えたときブラウザはエラーを返さず、黙って cookie を捨てる。** サインインは成功して
 * `Set-Cookie` も返るのに保存されないため、次の要求で未ログインとしてサインイン画面へ戻る。
 * 利用者から見ると「サインインしても何も起きずログイン画面に戻り続ける」で、
 * 画面にもログにも理由が出ない。
 */
const COOKIE_BYTE_LIMIT = 4096;

/**
 * 上限に対して空けておく余白。
 * 上限ぴったりまで使うと、経路上の proxy が付ける差分や将来の claim 追加で越える。
 */
const COOKIE_SAFETY_MARGIN_BYTES = 256;

/**
 * claims の JSON に許すバイト数。**定数を書かず、実際の cookie とトークンの形から逆算する。**
 * cookie 名や属性、署名方式が変わったときに、この上限だけが古いまま残るのを防ぐ。
 *
 * base64url は 3 バイトを 4 文字にするので、文字数から戻すときは 3/4 を掛ける。
 */
const CLAIMS_JSON_BUDGET_BYTES = Math.floor(
  ((COOKIE_BYTE_LIMIT - COOKIE_SAFETY_MARGIN_BYTES - serializeSessionCookie('').length - JWT_ENVELOPE_CHARS) * 3) / 4,
);

function jsonByteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

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
  // 人が読める名前が 1 つも無い利用者は実在する (JIT provisioning 直後)。
  // その場合は claim ごと載せない。空文字を載せると「名前がある」と読めてしまい、
  // 受け手が「空の名前」を氏名の位置へそのまま描いてしまう。
  const displayName = resolveAccountDisplayName(user);
  // 名前が 1 件も引けないときは claim ごと載せない (空の対応表を載せても読み手の分岐が増えるだけ)。
  const workspaceNames = user.workspaceNames ?? {};
  const hasWorkspaceNames = Object.keys(workspaceNames).length > 0;

  // 所属数に比例して伸びるのは `workspace_names` だけ。ここだけが cookie を上限へ押し上げる
  // (`workspace_ids` は 1 件 30 バイト弱、`name` は 1 件だけ)
  const base: SessionClaims = {
    sub: user.id,
    tenant_id: user.tenantId,
    role: user.role,
    status: user.status,
    workspace_ids: [...user.workspaceIds],
    ...(displayName === undefined ? {} : { name: displayName }),
    iat: nowSeconds,
    exp: nowSeconds + AUTH_NUMERIC_CONTRACT.sessionMaxAgeSeconds,
  };
  if (!hasWorkspaceNames) return base;

  const withNames: SessionClaims = { ...base, workspace_names: { ...workspaceNames } };

  /*
   * 入り切らないときは **名前だけを捨てる**。
   *
   * 名前は表示のためだけの情報なので、落としても到達できる範囲は 1 つも変わらない
   * (画面は識別子の表示へ戻るだけ)。逆に `workspace_ids` を削ると「入れる場所が消える」ので、
   * サイズを理由に削ってよい claim ではない。**この非対称性がここの要点。**
   *
   * 一部だけ載せる案は採らない。同じ画面で名前が出る Workspace と出ない Workspace が混ざり、
   * しかもどれが出るかが所属の増減で変わるため、利用者からは不具合にしか見えない。
   */
  return jsonByteLength(withNames) <= CLAIMS_JSON_BUDGET_BYTES ? withNames : base;
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
