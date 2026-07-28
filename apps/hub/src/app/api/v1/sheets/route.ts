import { createRepositoryContext } from '@harness-hub/db';
import { createSheetRequestSchema, problemDetails, sheetListQuerySchema } from '@harness-hub/schemas';
import { parseJsonRequest, problemResponse } from '../../../../features/hearing-intake/http.js';
import { hearingIntakeRuntime } from '../../../../features/hearing-intake/runtime.js';
import { authRuntime, requestScopedResource, withAuthz } from '../../../../lib/authz/index.js';

function contextFor(tenantId: string, workspaceId: string | null, actorId: string) {
  return createRepositoryContext({
    tenantId,
    ...(workspaceId === null ? {} : { workspaceId }),
    actorId,
  });
}

export const POST = withAuthz(
  {
    action: 'sheets.create',
    deps: () => authRuntime().authz,
    resolveResource: async (request) => requestScopedResource(request, { type: 'hearing_sheet' }),
  },
  async (request, authz) => {
    if (authz.resource.workspaceId === null) {
      return problemResponse(
        problemDetails({
          title: 'Workspace を指定してください',
          status: 400,
          detail: 'x-harness-workspace-id ヘッダーが必要です。',
        }),
      );
    }
    const parsed = await parseJsonRequest(request, createSheetRequestSchema);
    if (!parsed.ok) return parsed.response;

    const result = await hearingIntakeRuntime().service.createSheet({
      context: contextFor(authz.resource.tenantId, authz.resource.workspaceId, authz.principal.userId),
      workspaceId: authz.resource.workspaceId,
      applicantUserId: authz.principal.userId,
      request: parsed.data,
    });
    return Response.json(result, { status: 201 });
  },
);

export const GET = withAuthz(
  {
    action: 'sheets.read_own',
    deps: () => authRuntime().authz,
    resolveResource: async (request, _params, principal) =>
      requestScopedResource(request, { type: 'hearing_sheet_collection', ownerUserId: principal.userId }),
  },
  async (request, authz) => {
    if (authz.resource.workspaceId === null) {
      return problemResponse(
        problemDetails({
          title: 'Workspace を指定してください',
          status: 400,
          detail: 'x-harness-workspace-id ヘッダーが必要です。',
        }),
      );
    }
    const url = new URL(request.url);
    const parsed = sheetListQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) {
      const { problemDetailsFromZodError } = await import('@harness-hub/schemas');
      return problemResponse(problemDetailsFromZodError(parsed.error, { instance: url.pathname }));
    }

    const result = await hearingIntakeRuntime().service.listSheets({
      context: contextFor(authz.resource.tenantId, authz.resource.workspaceId, authz.principal.userId),
      workspaceId: authz.resource.workspaceId,
      applicantUserId: authz.principal.userId,
      readAll: authz.can('sheets.read_all'),
      query: parsed.data,
    });
    return Response.json(result);
  },
);
