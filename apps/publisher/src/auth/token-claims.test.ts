import { describe, expect, it } from 'vitest';

import { decodeAccessTokenClaims } from './token-claims.js';

function base64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

const CLAIMS = {
  typ: 'access' as const,
  sub: 'user_1',
  tenant_id: 'tenant_123',
  workspace_id: 'workspace_456',
  token_id: 'tok_1',
  role: 'member' as const,
  scope: ['publish:write' as const],
  iat: 1_700_000_000,
  exp: 1_700_000_900,
};

describe('decodeAccessTokenClaims', () => {
  it('JWT の 2 番目のセグメントを base64url decode して claims を返す (署名検証はしない)', () => {
    const token = `${base64url({ alg: 'none' })}.${base64url(CLAIMS)}.sig`;
    expect(decodeAccessTokenClaims(token)).toEqual(CLAIMS);
  });

  it('JWT の形式でない (ドットで区切られていない) 文字列はエラーにする', () => {
    expect(() => decodeAccessTokenClaims('not-a-jwt')).toThrow(/JWT の 2 番目のセグメント/);
  });

  it('accessTokenClaimsSchema を満たさない payload は zod のエラーで拒否する', () => {
    const token = `${base64url({ alg: 'none' })}.${base64url({ typ: 'refresh' })}.sig`;
    expect(() => decodeAccessTokenClaims(token)).toThrow();
  });
});
