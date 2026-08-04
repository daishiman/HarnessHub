/**
 * OS 資格情報域 (macOS Keychain / Windows Credential Manager) へ保存する token record の形 (AD-4)。
 *
 * `packages/schemas/auth-tenancy/token.ts` の冒頭コメントが明言するとおり、保存 API は
 * auth-tenancy に存在しない — 保存形式そのものを定義するのが本 feature の責務。
 * access_token を保存しないのは、900 秒 (15 分) で失効する短命な値を保存する意味が無く、
 * 保存対象が増えるほど漏洩時の被害範囲が広がるため (refresh のたびに access_token は再取得する)。
 */
import { z } from 'zod';

import {
  epochSecondsSchema,
  publisherTokenScopeSchema,
  refreshTokenSchema,
  tenantSlugSchema,
} from '../auth-tenancy/index.js';

export const publisherCredentialRecordSchema = z.object({
  tenant_slug: tenantSlugSchema,
  workspace_id: z.string().min(1),
  refresh_token: refreshTokenSchema,
  scope: z.array(publisherTokenScopeSchema),
  issued_at: epochSecondsSchema,
});
export type PublisherCredentialRecord = z.output<typeof publisherCredentialRecordSchema>;
