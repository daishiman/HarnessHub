/**
 * `GET /api/v1/admin/oidc-connections` — テナントの OIDC 接続一覧 + Console 登録用の値。
 * `POST /api/v1/admin/oidc-connections` — 顧客持ち込み Google OAuth client の登録。
 *
 * どちらも provider-admin 限定 (`ACTION_RULES` の `idp.connection_read` / `idp.connection_change`)。
 * 対象テナントは **header の申告**から読む。principal のテナントへ寄せると、越境操作が
 * 「自テナントへの操作」に化けて `provider.cross_tenant_access` の監査が出なくなる。
 *
 * 登録直後の接続は `pending` で、接続テストを通すまで認証には使われない。
 * つまりこの POST は**ログイン経路を切り替えない** — 切り替えるのは activate。
 */

import {
  oidcConnectionListResponseSchema,
  oidcConnectionMutationResponseSchema,
  oidcConnectionRegisterRequestSchema,
} from '@harness-hub/schemas';

import {
  OIDC_CONNECTION_RESOURCE_TYPE,
  oidcAdminErrorResponse,
  oidcAdminResponse,
  readJsonBody,
} from '../../../../../lib/auth/oidc-admin/index.js';
import { authRuntime, requestScopedResource, withAuthz } from '../../../../../lib/authz/index.js';

export const GET = withAuthz(
  {
    action: 'idp.connection_read',
    deps: () => authRuntime().authz,
    resolveResource: async (request) => requestScopedResource(request, { type: OIDC_CONNECTION_RESOURCE_TYPE }),
  },
  async (_request, authz) => {
    const result = await authRuntime().oidcAdmin.list({
      // 資源側のテナント。越境要求ではここが principal と食い違う (それが正しい)
      tenantId: authz.resource.tenantId,
      actorSubject: authz.principal.userId,
    });
    return oidcAdminResponse(result, (value) => oidcConnectionListResponseSchema.parse(value));
  },
);

export const POST = withAuthz(
  {
    action: 'idp.connection_change',
    deps: () => authRuntime().authz,
    resolveResource: async (request) => requestScopedResource(request, { type: OIDC_CONNECTION_RESOURCE_TYPE }),
  },
  async (request, authz) => {
    const parsed = oidcConnectionRegisterRequestSchema.safeParse(await readJsonBody(request));
    // zod の issue をそのまま返さない。client_secret が短いときの issue には
    // 入力値が載りうるので、応答は列挙された業務エラーだけに閉じる
    if (!parsed.success) return oidcAdminErrorResponse('invalid_request');

    const result = await authRuntime().oidcAdmin.register(
      { tenantId: authz.resource.tenantId, actorSubject: authz.principal.userId },
      parsed.data,
    );
    // 201: 登録コマンドを受理したことを表す。disabled の再登録では既存行を pending に戻す。
    return oidcAdminResponse(result, (value) => oidcConnectionMutationResponseSchema.parse(value), 201);
  },
);
