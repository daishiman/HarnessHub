/**
 * S18 設定画面の Notion 連携。workspace 単位の共有設定 (`docs/route.ts` と同型)。
 *
 * `/api/v1/me/*` 配下に置くが selfOnly ではない — このパスは「自分の設定画面から辿る API」の
 * 置き場所として揃えているだけで、`notion-integration.*` action 自体は workspace 単位の
 * 共有資源として判定する (`rules.ts` のコメント参照)。
 */
import { createRepositoryContext } from '@harness-hub/db';
import { problemDetails, upsertNotionIntegrationRequestSchema } from '@harness-hub/schemas';
import { parseJsonRequest, problemResponse } from '../../../../../features/notion-integration/http.js';
import { notionIntegrationRuntime } from '../../../../../features/notion-integration/runtime.js';
import { NotionIntegrationValidationError } from '../../../../../features/notion-integration/service.js';
import { authRuntime, requestScopedResource, withAuthz } from '../../../../../lib/authz/index.js';

/** workspace 未指定は 400 (テナント同様、資源を確定できない要求はここで止める)。 */
function missingWorkspaceResponse(): Response {
  return problemResponse(
    problemDetails({
      title: 'ワークスペースが未指定です',
      status: 400,
      detail: 'x-harness-workspace-id ヘッダーが必要です。',
      instance: '/api/v1/me/notion-integration',
    }),
  );
}

/** GET /api/v1/me/notion-integration — 登録状況の取得 (api_key はマスク済みのみ返す)。 */
export const GET = withAuthz(
  {
    action: 'notion-integration.read',
    deps: () => authRuntime().authz,
    resolveResource: async (request) => requestScopedResource(request, { type: 'notion_integration' }),
  },
  async (_request, authz) => {
    const workspaceId = authz.resource.workspaceId;
    if (workspaceId === null) return missingWorkspaceResponse();
    const context = createRepositoryContext({ tenantId: authz.resource.tenantId, actorId: authz.principal.userId });
    const result = await notionIntegrationRuntime().service.get(context, workspaceId);
    // 未登録は「取得失敗」ではなく「まだ無い」なので 200 + null で返す (画面側は未登録フォームを出す)。
    return Response.json(result);
  },
);

/** PUT /api/v1/me/notion-integration — mode に応じた必須項目判定を伴う upsert (1 workspace 1 行)。 */
export const PUT = withAuthz(
  {
    action: 'notion-integration.write',
    deps: () => authRuntime().authz,
    resolveResource: async (request) => requestScopedResource(request, { type: 'notion_integration' }),
  },
  async (request, authz) => {
    const workspaceId = authz.resource.workspaceId;
    if (workspaceId === null) return missingWorkspaceResponse();
    const parsed = await parseJsonRequest(request, upsertNotionIntegrationRequestSchema);
    if (!parsed.ok) return parsed.response;

    const context = createRepositoryContext({ tenantId: authz.resource.tenantId, actorId: authz.principal.userId });
    try {
      const result = await notionIntegrationRuntime().service.upsert(context, workspaceId, parsed.data);
      await authRuntime().authz.audit.record({
        actorSubject: authz.principal.userId,
        tenantId: authz.resource.tenantId,
        workspaceId,
        action: 'notion-integration.write',
        resourceType: 'notion_integration',
        resourceId: workspaceId,
        // API キーの平文はもちろん、マスク済みの値も監査ログには残さない (mode だけを記録する)。
        metadata: { mode: result.mode },
      });
      return Response.json(result);
    } catch (cause) {
      if (cause instanceof NotionIntegrationValidationError) {
        return problemResponse(
          problemDetails({
            title: '入力を確認してください',
            status: 400,
            detail: cause.message,
            instance: '/api/v1/me/notion-integration',
          }),
        );
      }
      throw cause;
    }
  },
);

/** DELETE /api/v1/me/notion-integration — 連携解除。 */
export const DELETE = withAuthz(
  {
    action: 'notion-integration.write',
    deps: () => authRuntime().authz,
    resolveResource: async (request) => requestScopedResource(request, { type: 'notion_integration' }),
  },
  async (_request, authz) => {
    const workspaceId = authz.resource.workspaceId;
    if (workspaceId === null) return missingWorkspaceResponse();
    const context = createRepositoryContext({ tenantId: authz.resource.tenantId, actorId: authz.principal.userId });
    await notionIntegrationRuntime().service.deleteIntegration(context, workspaceId);
    await authRuntime().authz.audit.record({
      actorSubject: authz.principal.userId,
      tenantId: authz.resource.tenantId,
      workspaceId,
      action: 'notion-integration.write',
      resourceType: 'notion_integration',
      resourceId: workspaceId,
      metadata: { deleted: true },
    });
    return new Response(null, { status: 204 });
  },
);
