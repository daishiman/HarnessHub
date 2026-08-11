/** ローカル検証用 session を、本番と同じ HS256 形式で発行するための共有部品。 */

export const SESSION_COOKIE_NAME = '__Host-harness-hub.session';
/** apps/hub の AUTH_NUMERIC_CONTRACT.sessionMaxAgeSeconds と同じ 8 時間。 */
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * 手元だけを指しているか。ホスト名を完全一致で見るため
 * `localhost.example.com` や TLS 越しの remote endpoint は通さない。
 */
export function isLocalDatabaseUrl(url: string): boolean {
  if (url.startsWith('file:')) return true;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'ws:') return false;
    return (
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === 'localhost' ||
      parsed.hostname === '::1' ||
      parsed.hostname === '[::1]'
    );
  } catch {
    return false;
  }
}

/** apps/hub/src/lib/auth/jwt.ts と同じ HS256 compact JWT。 */
export async function signLocalSessionJwt(payload: unknown, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const head = base64Url(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = base64Url(encoder.encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret) as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, encoder.encode(`${head}.${body}`) as BufferSource),
  );
  return `${head}.${body}.${base64Url(signature)}`;
}
