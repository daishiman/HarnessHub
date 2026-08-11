/**
 * HS256 の compact JWT 署名・検証。
 * session token と access token の 2 用途があるため、claims の意味を知らない層としてここに切り出す。
 *
 * Cloudflare Workers と Node の双方で同じ実装が動くよう `crypto.subtle` だけを使う
 * (`node:crypto` や `Buffer` に依存すると Workers ランタイムで動かない)。
 */

/** header は固定。token 側が申告する `alg` は一切見ない (`alg: none` を受け入れないため)。 */
const JWT_HEADER = { alg: 'HS256', typ: 'JWT' } as const;

/**
 * payload 以外に必ず付く文字数 = header + 区切りの `.` 2 個 + 署名。
 *
 * cookie に載るサイズの上限を計算する側が使う。定数を書き写すのではなく実際の
 * 直列化から数えるのは、header や署名方式を変えたときに上限の計算だけが古くなるのを防ぐため。
 */
export const JWT_ENVELOPE_CHARS =
  base64UrlEncode(new TextEncoder().encode(JSON.stringify(JWT_HEADER))).length +
  2 +
  // HS256 の署名は 32 バイト固定。base64url では 43 文字 (padding は落とす)
  base64UrlEncode(new Uint8Array(32)).length;

export type JwtRejectionReason = 'malformed' | 'bad_signature';

export type JwtVerification =
  | { readonly ok: true; readonly payload: unknown }
  | { readonly ok: false; readonly reason: JwtRejectionReason };

export async function signJwt(payload: unknown, secret: string): Promise<string> {
  const head = base64UrlEncode(utf8(JSON.stringify(JWT_HEADER)));
  const body = base64UrlEncode(utf8(JSON.stringify(payload)));
  const signature = await hmacSha256(secret, `${head}.${body}`);
  return `${head}.${body}.${base64UrlEncode(signature)}`;
}

/**
 * 署名を確かめてから payload を返す。
 * 期限や claims の妥当性は**呼び出し側の責務**にしてある (用途ごとに契約が違うため)。
 */
export async function verifyJwt(token: string, secret: string): Promise<JwtVerification> {
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'malformed' };

  const [head, body, signature] = parts as [string, string, string];
  const expected = await hmacSha256(secret, `${head}.${body}`);
  if (!timingSafeEqual(signature, base64UrlEncode(expected))) {
    return { ok: false, reason: 'bad_signature' };
  }

  try {
    return { ok: true, payload: JSON.parse(new TextDecoder().decode(base64UrlDecode(body))) };
  } catch {
    return { ok: false, reason: 'malformed' };
  }
}

/** SHA-256 の 16 進表現。device_code / refresh token の保存形 (平文は保存しない)。 */
export async function sha256Hex(value: string): Promise<string> {
  // `as BufferSource` は Uint8Array の buffer 型が SharedArrayBuffer を含みうるための narrowing
  // (packages/db/repository/crypto.ts と同じ扱い)
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', utf8(value) as BufferSource));
  let hex = '';
  for (const byte of digest) hex += byte.toString(16).padStart(2, '0');
  return hex;
}

function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

async function hmacSha256(secret: string, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    utf8(secret) as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, utf8(message) as BufferSource));
}

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

/**
 * 署名比較。長さが違っても早期 return せず全走査してから結果を返す。
 * 早期 return すると比較時間から一致文字数が推測できてしまう (タイミング攻撃)。
 */
function timingSafeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    diff |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return diff === 0;
}
