/** `PATCH /api/v1/sheets/{id}/handoff-tokens/{tokenId}` — 共有URLトークンの失効。 */
import { createRepositoryContext } from '@harness-hub/db';
import { problemDetails } from '@harness-hub/schemas';

import {
  findSheetRow,
  resolveSheetResource,
  type SheetParams,
} from '../../../../../../../features/hearing-intake/authz-resource.js';
import { problemResponse } from '../../../../../../../features/hearing-intake/http.js';
import { authRuntime, withAuthz } from '../../../../../../../lib/authz/index.js';
import { hearingShareRuntime } from '../../../../../../../lib/hearing-share/index.js';

interface TokenParams extends SheetParams {
  readonly tokenId: string;
}

export const PATCH = withAuthz<TokenParams>(
  {
    action: 'sheets.handoff_tokens.revoke',
    deps: () => authRuntime().authz,
    resolveResource: (request, params, principal) => resolveSheetResource(request, params, principal),
  },
  async (_request, authz, params) => {
    const sheet = await findSheetRow(authz.resource.tenantId, params.id);
    if (sheet === null) {
      return problemResponse(problemDetails({ title: 'シートが見つかりません', status: 404 }));
    }

    const runtime = await hearingShareRuntime();
    const context = createRepositoryContext({
      tenantId: authz.resource.tenantId,
      workspaceId: sheet.workspaceId,
      actorId: authz.principal.userId,
    });

    // token が別 sheet のものである/存在しない場合を区別せず「見つからない」に畳む
    // (`tenant_mismatch` を 404 にする with-authz の方針と同じ理由)。
    const existing = (await runtime.shareTokens.listBySheetId(context, params.id)).find(
      (row) => row.id === params.tokenId,
    );
    if (existing === undefined) {
      return problemResponse(problemDetails({ title: 'トークンが見つかりません', status: 404 }));
    }

    const revoked = await runtime.shareTokens.revokeIfActive(context, {
      id: params.tokenId,
      revokedAt: Date.now(),
    });

    if (revoked) {
      await authRuntime().authz.audit.record({
        actorSubject: authz.principal.userId,
        tenantId: authz.resource.tenantId,
        workspaceId: sheet.workspaceId,
        action: 'hearing_share_token.revoked',
        resourceType: 'hearing_sheet',
        resourceId: params.id,
        metadata: { token_id: params.tokenId, credential: authz.principal.credential },
      });
    }

    return Response.json(
      { id: params.tokenId, revoked: revoked || existing.revokedAt !== null },
      { headers: { 'cache-control': 'no-store' } },
    );
  },
);
