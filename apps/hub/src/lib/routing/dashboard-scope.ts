/**
 * (dashboard) 配下の画面が使う既定 tenant/workspace の解決。
 *
 * ログイン後の着地先 (`DEFAULT_POST_SIGNIN_LANDING`) は URL クエリを持たない固定パスであるため、
 * 各画面が `searchParams.tenant` / `.workspace` だけを見る実装のままだと、ログイン直後は
 * 常に空文字になり API 呼び出しが認可層で弾かれる (missing_tenant_scope)。
 *
 * ここでは middleware の `resolveSessionScope` (src/middleware/authz.ts) をそのまま呼び、
 * URL クエリが無いときのフォールバックとして各 page.tsx から使えるようにする。
 * scope の組み立て規則 (無効化ユーザーの排除・workspace 未確定ならペアで諦める) を
 * middleware 側と二重実装しないことが目的で、判定ロジック自体はここに持たない。
 * URL クエリを最優先する現行の互換性は崩さない (呼び出し側が `query.tenant ?? scope.tenantId ?? ''` の形で使う)。
 */

import { cookies } from 'next/headers';
import { cache } from 'react';

import { resolveSessionScope } from '../../middleware/index.js';
import { SESSION_COOKIE_NAME } from '../auth/config.js';
import { systemAuthClock } from '../auth/ports.js';
import { ACTIVE_WORKSPACE_COOKIE_NAME, verifySessionToken } from '../auth/session.js';

export interface DashboardScope {
  readonly tenantId: string | null;
  readonly workspaceId: string | null;
}

const EMPTY_SCOPE: DashboardScope = { tenantId: null, workspaceId: null };

/**
 * React の request-scoped cache でラップし、同一リクエスト内 (layout.tsx + page.tsx) での
 * cookie 読取・JWT 署名検証の重複実行を避ける。リクエストを跨いでキャッシュされることはない。
 */
export const resolveDashboardScope = cache(async (): Promise<DashboardScope> => {
  const sessionSecret = process.env.AUTH_SESSION_SECRET;
  if (sessionSecret === undefined || sessionSecret.length === 0) return EMPTY_SCOPE;

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token === undefined) return EMPTY_SCOPE;

  const verification = await verifySessionToken(token, sessionSecret, systemAuthClock.nowSeconds());
  if (!verification.ok) return EMPTY_SCOPE;

  const { claims } = verification;
  // 無効化された利用者の session は署名が正しくても主体として扱わない (session-provider.ts と同じ基準)
  if (claims.status !== 'active') return EMPTY_SCOPE;

  const activeWorkspaceCookie = cookieStore.get(ACTIVE_WORKSPACE_COOKIE_NAME)?.value;
  const cookieHeader =
    activeWorkspaceCookie === undefined ? null : `${ACTIVE_WORKSPACE_COOKIE_NAME}=${activeWorkspaceCookie}`;

  const scope = resolveSessionScope(
    {
      subject: claims.sub,
      tenantId: claims.tenant_id,
      workspaceIds: claims.workspace_ids,
      roles: [claims.role],
    },
    cookieHeader,
  );

  return scope ?? EMPTY_SCOPE;
});

/**
 * `query.tenant ?? scope.tenantId ?? ''` を各 page.tsx へコピーする代わりにここへ集約する。
 * フォールバック順序 (URL クエリ優先) を変える場合はここ 1 箇所を直せばよい。
 */
export function tenantIdFromQuery(query: { readonly tenant?: string }, scope: DashboardScope): string {
  return query.tenant ?? scope.tenantId ?? '';
}

export function scopeFromQuery(
  query: { readonly tenant?: string; readonly workspace?: string },
  scope: DashboardScope,
): { readonly tenantId: string; readonly workspaceId: string } {
  return {
    tenantId: tenantIdFromQuery(query, scope),
    workspaceId: query.workspace ?? scope.workspaceId ?? '',
  };
}
