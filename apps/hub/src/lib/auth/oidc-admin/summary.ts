/** DB 行を secret 非露出の管理 API 表現へ変換する。 */

import type { IdpConnectionRow } from '@harness-hub/db';
import {
  type OidcConnectionSummary,
  RESOLVABLE_OIDC_CREDENTIAL_STATUS,
  type WorkspaceDomain,
} from '@harness-hub/schemas';

import { parseAllowedWorkspaceDomains } from '../db-ports.js';

/** epoch ミリ秒 → ISO8601。NULL は「未実施」のまま保つ。 */
const toIso = (millis: number | null): string | null => (millis === null ? null : new Date(millis).toISOString());

/** 暗号文列を一切読まず、公開可能な識別子と状態だけを組み立てる。 */
export function toSummary(row: IdpConnectionRow): OidcConnectionSummary {
  return {
    id: row.id,
    tenant_id: row.tenantId,
    issuer_url: row.issuerUrl,
    client_id: row.clientId,
    credential_mode: row.credentialMode,
    credential_status: row.credentialStatus,
    client_secret_last4: row.clientSecretLast4,
    rotation: {
      staged: row.pendingClientSecretEnc !== null,
      pending_client_secret_last4: row.pendingClientSecretLast4,
      pending_client_id: row.pendingClientId,
      pending_credential_mode: row.pendingCredentialMode,
      pending_tested_at: toIso(row.pendingTestedAt),
    },
    last_tested_at: toIso(row.lastTestedAt),
    created_at: new Date(row.createdAt).toISOString(),
    updated_at: toIso(row.updatedAt),
    allowed_workspace_domains: [
      ...parseAllowedWorkspaceDomains(row.allowedWorkspaceDomains, `idp_connections(${row.id})`),
    ] as WorkspaceDomain[],
    resolvable: row.credentialStatus === RESOLVABLE_OIDC_CREDENTIAL_STATUS,
  };
}
