/**
 * OS 資格情報域 adapter の抽象契約 (AD-4 帰結: 「adapter 差異は auth/ 内に閉じ込め、
 * cli/・core/・deploy/ は adapter の抽象インターフェース (getToken()/clearToken()) のみに依存する」)。
 */
import type { PublisherCredentialRecord } from '@harness-hub/schemas';

export interface CredentialStoreAdapter {
  readonly platform: 'darwin' | 'win32' | 'linux';
  saveToken(record: PublisherCredentialRecord): Promise<void>;
  getToken(hubOrigin: string, tenantSlug: string): Promise<PublisherCredentialRecord | null>;
  clearToken(hubOrigin: string, tenantSlug: string): Promise<void>;
}
