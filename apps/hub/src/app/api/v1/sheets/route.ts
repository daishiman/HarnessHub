import { createRepositoryContext } from '@harness-hub/db';
import { createSheetRequestSchema, problemDetails, sheetListQuerySchema } from '@harness-hub/schemas';
import { parseJsonRequest, problemResponse } from '../../../../features/hearing-intake/http.js';
import { hearingIntakeRuntime } from '../../../../features/hearing-intake/runtime.js';
import { authRuntime, requestScopedResource, withAuthz } from '../../../../lib/authz/index.js';
import {
  buildEntityCreateWireResponse,
  canonicalPayloadHash,
  MutationRequestError,
  mutationErrorResponse,
  mutationWireResponse,
  parseIdempotencyKey,
} from '../../../../lib/http/mutation-safety.js';

const SHEET_CREATE_JSON_MAX_BYTES = 250_000;

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
    let idempotencyKey: string;
    try {
      idempotencyKey = parseIdempotencyKey(request.headers.get('idempotency-key'));
    } catch (error) {
      if (error instanceof MutationRequestError) return mutationErrorResponse(error);
      throw error;
    }
    const parsed = await parseJsonRequest(request, createSheetRequestSchema, {
      maxBytes: SHEET_CREATE_JSON_MAX_BYTES,
    });
    if (!parsed.ok) return parsed.response;

    const result = await hearingIntakeRuntime().service.createSheetIdempotent({
      context: contextFor(authz.resource.tenantId, authz.resource.workspaceId, authz.principal.userId),
      workspaceId: authz.resource.workspaceId,
      applicantUserId: authz.principal.userId,
      request: parsed.data,
      idempotency: { key: idempotencyKey, payloadHash: await canonicalPayloadHash(parsed.data) },
      buildResponse: (response, expiresAt) =>
        buildEntityCreateWireResponse(response, {
          namespace: 'sheets',
          revision: response.revision,
          expiresAt,
        }),
    });
    if (result.outcome === 'conflict') {
      return mutationErrorResponse(
        new MutationRequestError(422, '同じ Idempotency-Key は別のリクエスト本文で使用済みです'),
      );
    }
    return mutationWireResponse(result.wireResponse, result.outcome === 'replayed');
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
