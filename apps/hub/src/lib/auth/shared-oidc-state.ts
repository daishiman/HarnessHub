/**
 * 共通 callback へテナントを運ぶ署名付き `state` (issue-auth-tenancy-shared-google-oidc-20260729)。
 *
 * ## なぜ必要か
 *
 * テナント別 client 方式では、テナントは **URL の path** に載っていた
 * (`/api/auth/{slug}/callback` を Google 側に redirect URI として登録していたため)。
 * 共通 client 方式では redirect URI を 1 本に固定するので、callback の URL からテナントが消える。
 * ID token 側にも手掛かりは無い — `aud` は全テナント共通の client_id だから。
 *
 * 残る運び手は `state` だけ。ただし `state` は攻撃者が自由に組み立てられる URL パラメータなので、
 * **署名しない限りテナント識別子として使えない**。ここが本モジュールの存在理由。
 *
 * ## 2 つの独立した保証
 *
 *   1. **改竄不能なテナント束縛** — HS256 署名。`tid` を書き換えると署名が壊れる。
 *   2. **ログイン CSRF 対策 (double submit)** — 認可開始時に乱数を作り、
 *      平文を `HttpOnly` cookie へ、SHA-256 を state へ入れる。callback で両者を突き合わせる。
 *      攻撃者が自分の認可 URL を被害者に踏ませても、cookie は攻撃者のブラウザにしか無いので落ちる。
 *
 * 1 だけでは「攻撃者アカウントへのサイレントログイン」を防げず、2 だけではテナントを確定できない。
 * この issue のリスク欄が言う「片側だけの実装ではテナント混線を防げない」はこの関係を指す。
 *
 * 署名処理は `jwt.ts` を再利用する (`alg` を token 側から読まない実装が既にそこにある)。
 */

import type { SharedOidcStateClaims } from '@harness-hub/schemas';
import { sharedOidcStateClaimsSchema } from '@harness-hub/schemas';

import { AUTH_NUMERIC_CONTRACT, sharedOidcCsrfCookieName } from './config.js';
import { type RandomBytes, systemRandomBytes } from './device-flow/index.js';
import { sha256Hex, signJwt, verifyJwt } from './jwt.js';
import { readCookie } from './session.js';

/** state を受理しなかった理由。すべて「拒否」であり、警告付き受理は存在しない。 */
export type SharedOidcStateRejectionReason =
  | 'malformed'
  | 'bad_signature'
  | 'bad_claims'
  | 'expired'
  /** binding cookie が要求に付いていない (別ブラウザ / 別セッションで開始された認可)。 */
  | 'csrf_missing'
  /** binding cookie の値が state に焼かれた hash と一致しない。 */
  | 'csrf_mismatch';

export type SharedOidcStateVerification =
  | { readonly ok: true; readonly claims: SharedOidcStateClaims }
  | { readonly ok: false; readonly reason: SharedOidcStateRejectionReason };

/** 認可開始時に作る 2 点セット。**両方を同じ応答で返さないと double submit が成立しない**。 */
export interface IssuedSharedOidcState {
  /** 認可要求の `state` パラメータへ載せる署名済み値。 */
  readonly state: string;
  /** `Set-Cookie` で返す binding 値の平文。URL には絶対に載せない。 */
  readonly csrfBinding: string;
}

export interface IssueSharedOidcStateInput {
  readonly tenantId: string;
  readonly tenantSlug: string;
  readonly nowSeconds: number;
  /** 署名鍵。session JWT と同じ鍵で構わない (`typ` が経路の取り違えを防ぐ)。 */
  readonly secret: string;
  /** 既定は CSPRNG。テストは決定論的な源を注入して形だけを検査する。 */
  readonly randomBytes?: RandomBytes;
}

/**
 * 署名付き state と binding 値を発行する。
 *
 * binding 値は 256bit の不透明値。意味を持たせない (テナント名等を埋めない) ので、
 * 万一 cookie が観測されても、そこからテナントや利用者を推測されない。
 */
export async function issueSharedOidcState(input: IssueSharedOidcStateInput): Promise<IssuedSharedOidcState> {
  const randomBytes = input.randomBytes ?? systemRandomBytes;
  const csrfBinding = toHex(randomBytes(32));

  const claims: SharedOidcStateClaims = {
    typ: 'shared_oidc_state',
    tid: input.tenantId,
    slug: input.tenantSlug,
    csrf: await sha256Hex(csrfBinding),
    iat: input.nowSeconds,
    exp: input.nowSeconds + AUTH_NUMERIC_CONTRACT.sharedOidcStateTtlSeconds,
  };

  return { state: await signJwt(claims, input.secret), csrfBinding };
}

export interface VerifySharedOidcStateInput {
  /** callback で返ってきた `state`。欠落は null。 */
  readonly state: string | null;
  /**
   * 要求の `Cookie` ヘッダ全体。欠落は null。
   *
   * binding の値そのものではなくヘッダを受け取るのは、**cookie 名がテナント slug を含む**ため。
   * slug は state の中にしか無く、その state は署名を確かめるまで信用できない。
   * 「先に cookie を特定してから state を検証する」順序が作れないので、
   * 名前の解決をこの関数の内側 (slug 確定後) へ置く。
   */
  readonly cookieHeader: string | null;
  readonly nowSeconds: number;
  readonly secret: string;
}

/**
 * state を検証してテナントを確定する。
 *
 * 検証順は「署名 → claims の形 → 期限 → binding」。
 * 署名を確かめる前に `tid` を読んで DB を引くと、攻撃者が指定した任意のテナントで
 * 問い合わせを走らせられる (存在するテナントかどうかを応答時間で探れる)。
 * binding を最後に置くのは、そこが唯一「要求元のブラウザ」に依存する検査であり、
 * 前段の静的な検査をすべて通った要求にだけ適用すればよいため。
 */
export async function verifySharedOidcState(input: VerifySharedOidcStateInput): Promise<SharedOidcStateVerification> {
  if (input.state === null || input.state.length === 0) return { ok: false, reason: 'malformed' };

  const verified = await verifyJwt(input.state, input.secret);
  if (!verified.ok) return { ok: false, reason: verified.reason };

  const parsed = sharedOidcStateClaimsSchema.safeParse(verified.payload);
  // `typ` が literal なので、session token / access token をここへ提示しても形で落ちる
  if (!parsed.success) return { ok: false, reason: 'bad_claims' };
  if (parsed.data.exp <= input.nowSeconds) return { ok: false, reason: 'expired' };

  // 署名を通った state の slug なので、ここで初めて cookie 名を組み立ててよい
  const binding = readCookie(input.cookieHeader, sharedOidcCsrfCookieName(parsed.data.slug));
  if (binding === null || binding.length === 0) {
    return { ok: false, reason: 'csrf_missing' };
  }
  const presented = await sha256Hex(binding);
  // hash 同士の比較。長さが揃った 16 進文字列なので、jwt.ts の署名比較と同じ性質で扱える
  if (!timingSafeEqualHex(presented, parsed.data.csrf)) {
    return { ok: false, reason: 'csrf_mismatch' };
  }

  return { ok: true, claims: parsed.data };
}

/** binding 値の表現。cookie に載せるので base64url ではなく 16 進 (cookie 値の特殊文字を避ける)。 */
function toHex(bytes: Uint8Array): string {
  let hex = '';
  for (const byte of bytes) hex += byte.toString(16).padStart(2, '0');
  return hex;
}

/**
 * 16 進文字列の定数時間比較。
 * 早期 return すると、一致した文字数が比較時間から推測できる。
 * binding は 1 要求限りの値だが、比較の書き方をここだけ緩めない (jwt.ts と同じ姿勢)。
 */
function timingSafeEqualHex(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    diff |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return diff === 0;
}
