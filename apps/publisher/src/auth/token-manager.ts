/**
 * refresh token の rotation と、reuse-detection 失敗時の family 失効反映 (AD-4)。
 *
 * reuse-detection そのもの (同一 family の全 token を失効させる判定) は Hub 側の責務。
 * client 側の責務は「refresh が失敗したら、盗用検知か単なる失効か区別せず、
 * 手元の OS 資格情報域を必ずクリアして再ログインを要求する」ことだけ。
 * Hub が invalid_grant/access_denied を区別せず返すのは窃取側に情報を与えないためであり、
 * client 側も区別せず同じ動作に倒すのが正しい (二値を分けても client にできることは無い)。
 */
import { type TokenResponse, tokenResponseSchema } from '@harness-hub/schemas';

import type { CredentialStoreAdapter } from './types.js';

export type RefreshTokenEndpoint = (
  refreshToken: string,
) => Promise<{ readonly status: number; readonly body: unknown }>;

export async function refreshOrClear(
  store: CredentialStoreAdapter,
  hubOrigin: string,
  tenantSlug: string,
  refreshToken: string,
  endpoint: RefreshTokenEndpoint,
): Promise<TokenResponse> {
  const response = await endpoint(refreshToken);
  if (response.status !== 200) {
    await store.clearToken(hubOrigin, tenantSlug);
    throw new Error('refresh token が無効です。publish を再実行して再ログインしてください');
  }
  return tokenResponseSchema.parse(response.body);
}
