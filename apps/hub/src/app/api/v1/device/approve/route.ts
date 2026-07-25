/**
 * `POST /api/v1/device/approve` — 利用者がブラウザで CLI の device 認可を承認する。
 *
 * ここは **認証必須**。RFC 8628 で「利用者が別デバイスで承認する」段に当たる。
 * `withAuthz` を通すので、承認は自テナント・所属 Workspace に対してしか行えない。
 */

import { deviceApproveRequestSchema } from '@harness-hub/schemas';

import { authRuntime, requestScopedResource, withAuthz } from '../../../../../lib/authz/index.js';

/** approve の拒否理由 → HTTP status。承認できなかった理由を client が区別できるようにする。 */
const REJECTION_STATUS: Readonly<Record<string, number>> = {
  not_found: 404,
  expired: 410,
  denied: 403,
  already_used: 409,
};

export const POST = withAuthz(
  {
    action: 'device.approve',
    deps: () => authRuntime().authz,
    resolveResource: async (request) => {
      // body は handler でも読むので clone する (Request の body は 1 度しか読めない)
      const body = await readJson(request.clone());
      const parsed = deviceApproveRequestSchema.safeParse(body);
      if (!parsed.success) return null;

      return requestScopedResource(request, {
        type: 'device_authorization',
        workspaceId: parsed.data.workspace_id,
      });
    },
  },
  async (request, authz) => {
    const parsed = deviceApproveRequestSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return Response.json({ error: 'invalid_request' }, { status: 400 });
    }

    const result = await authRuntime().deviceFlow.approve({
      tenantId: authz.principal.tenantId,
      userCode: parsed.data.user_code,
      userId: authz.principal.userId,
      workspaceId: parsed.data.workspace_id,
    });

    if (!result.ok) {
      return Response.json({ error: result.reason }, { status: REJECTION_STATUS[result.reason] ?? 400 });
    }

    return Response.json({ approved: true, device_label: result.deviceLabel }, { status: 200 });
  },
);

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
