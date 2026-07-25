/**
 * `POST /api/v1/token/refresh` — refresh token の rotation (RFC 6749 §6)。
 *
 * **認証不要** (refresh token そのものが資格情報)。`withAuthz` 免除は登録簿に明示登録済み。
 * 失効済みの refresh token が提示された場合は再利用 (窃取) とみなし、
 * service 側で family 全体を失効させる。
 */

import { refreshRequestSchema } from '@harness-hub/schemas';

import { resolveTenantOidcConfig } from '../../../../../lib/auth/index.js';
import { authRuntime } from '../../../../../lib/authz/index.js';

export async function POST(request: Request): Promise<Response> {
  const runtime = authRuntime();

  const parsed = refreshRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return errorResponse('invalid_request', 400);
  }

  const connection = await resolveTenantOidcConfig(runtime.ports.oidcConnections, parsed.data.tenant_slug);
  if (connection === null) {
    return errorResponse('invalid_request', 400);
  }

  const result = await runtime.deviceFlow.refresh({
    tenantId: connection.tenantId,
    refreshToken: parsed.data.refresh_token,
  });

  if (!result.ok) {
    // 再利用検知も期限切れも client からは同じ invalid_grant に見える。
    // 「再利用が検知された」と伝えると、窃取側に family 失効の発生を教えることになる
    return errorResponse(result.error.error, result.error.error === 'access_denied' ? 403 : 400);
  }

  return Response.json(result.value, { status: 200, headers: { 'cache-control': 'no-store' } });
}

function errorResponse(code: string, status: number): Response {
  return Response.json({ error: code }, { status, headers: { 'cache-control': 'no-store' } });
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
