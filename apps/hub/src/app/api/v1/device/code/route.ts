/**
 * `POST /api/v1/device/code` — device 認可の開始 (RFC 8628 §3.1)。
 *
 * **認証不要**。まだ誰も認証していない段階の endpoint なので `withAuthz` を通さない。
 * この免除は `scripts/ci/shared-layer-registry.json` の `route_handler_policy.exemptions` に
 * 明示登録してあり、`apps/hub/scripts/check-route-handler-exemptions.mjs` が
 * **集合の完全一致**で検査する (勝手に増やせない)。
 */

import { deviceCodeRequestSchema } from '@harness-hub/schemas';

import { resolveTenantOidcConfig } from '../../../../../lib/auth/index.js';
import { authRuntime } from '../../../../../lib/authz/index.js';

export async function POST(request: Request): Promise<Response> {
  const runtime = authRuntime();

  const body = await readJson(request);
  const parsed = deviceCodeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'invalid_request' }, { status: 400 });
  }

  // slug からテナントを確定できない場合、候補を返さずそのまま拒否する。
  // 「そのテナントは存在しない」と返すと、slug の総当たりでテナント一覧を作れてしまう
  const connection = await resolveTenantOidcConfig(runtime.ports.oidcConnections, parsed.data.tenant_slug);
  if (connection === null) {
    return Response.json({ error: 'invalid_request' }, { status: 400 });
  }

  const response = await runtime.deviceFlow.requestCode({
    tenantId: connection.tenantId,
    scope: parsed.data.scope,
    deviceLabel: parsed.data.device_label ?? null,
  });

  // 資格情報を含む応答はキャッシュさせない
  return Response.json(response, { status: 200, headers: { 'cache-control': 'no-store' } });
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
