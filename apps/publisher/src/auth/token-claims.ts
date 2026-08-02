/**
 * access token (JWT) の claims 復元 (AD-4 帰結)。
 *
 * `x-harness-tenant-id`/`x-harness-workspace-id` ヘッダに渡す実体 id は device flow の
 * どの応答にも含まれず、access token 自身の claims (`tenant_id`/`workspace_id`) にしかない。
 * 署名検証はしない — 検証は Hub 側が行い、ここは自分が受け取った token を読むだけなので、
 * 改ざんされていても Hub が Bearer 検証で弾く (client 側で検証してもセキュリティ上の意味がない)。
 */
import { type AccessTokenClaims, accessTokenClaimsSchema } from '@harness-hub/schemas';

export function decodeAccessTokenClaims(accessToken: string): AccessTokenClaims {
  const payload = accessToken.split('.')[1];
  if (payload === undefined) {
    throw new Error('access token の形式が不正です (JWT の 2 番目のセグメントがありません)');
  }
  const json = Buffer.from(payload, 'base64url').toString('utf-8');
  return accessTokenClaimsSchema.parse(JSON.parse(json));
}
