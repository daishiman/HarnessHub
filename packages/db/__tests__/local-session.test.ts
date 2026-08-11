import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { isLocalDatabaseUrl, signLocalSessionJwt } from '../scripts/local-session';

describe('local session helpers', () => {
  it.each([
    'file:/tmp/hub.db',
    'http://127.0.0.1:8081',
    'http://localhost:8081',
    'http://[::1]:8081',
    'ws://localhost:8081',
  ])('allows local database URL: %s', (url) => {
    expect(isLocalDatabaseUrl(url)).toBe(true);
  });

  it.each(['https://localhost:8081', 'libsql://example.turso.io', 'http://localhost.example:8081', 'not-a-url'])(
    'rejects non-local database URL: %s',
    (url) => expect(isLocalDatabaseUrl(url)).toBe(false),
  );

  it('signs an HS256 token whose signature and payload can be independently verified', async () => {
    const payload = { sub: 'user-local', exp: 123456 };
    const token = await signLocalSessionJwt(payload, 'local-secret');
    const [head, body, signature] = token.split('.');
    const expected = createHmac('sha256', 'local-secret').update(`${head}.${body}`).digest('base64url');

    expect(signature).toBe(expected);
    expect(JSON.parse(Buffer.from(body ?? '', 'base64url').toString('utf8'))).toEqual(payload);
  });
});
