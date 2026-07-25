/**
 * `POST /api/v1/device/token` — device_code を token に交換する (RFC 8628 §3.4)。
 *
 * **認証不要** (device_code そのものが資格情報)。`withAuthz` 免除は登録簿に明示登録済み。
 * client は承認されるまでこの endpoint を polling する。
 */

import { deviceTokenRequestSchema } from '@harness-hub/schemas';

import { resolveTenantOidcConfig } from '../../../../../lib/auth/index.js';
import { authRuntime } from '../../../../../lib/authz/index.js';

/** RFC 8628 §3.5 / RFC 6749 §5.2 の status 対応。polling 継続の可否を client が判定できるようにする。 */
const ERROR_STATUS: Readonly<Record<string, number>> = {
  authorization_pending: 400,
  slow_down: 400,
  access_denied: 403,
  expired_token: 400,
  invalid_grant: 400,
  invalid_request: 400,
};

export async function POST(request: Request): Promise<Response> {
  const runtime = authRuntime();

  const parsed = deviceTokenRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return errorResponse('invalid_request');
  }

  const connection = await resolveTenantOidcConfig(runtime.ports.oidcConnections, parsed.data.tenant_slug);
  if (connection === null) {
    return errorResponse('invalid_request');
  }

  const result = await runtime.deviceFlow.exchangeToken({
    tenantId: connection.tenantId,
    deviceCode: parsed.data.device_code,
  });

  if (!result.ok) {
    return errorResponse(result.error.error);
  }

  return Response.json(result.value, { status: 200, headers: { 'cache-control': 'no-store' } });
}

function errorResponse(code: string): Response {
  return Response.json(
    { error: code },
    { status: ERROR_STATUS[code] ?? 400, headers: { 'cache-control': 'no-store' } },
  );
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
