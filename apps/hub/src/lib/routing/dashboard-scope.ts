/**
 * (dashboard) 配下の Server Component が使う既定 tenant/workspace の解決。
 *
 * ログイン後の着地先 (`DEFAULT_POST_SIGNIN_LANDING`) は URL クエリを持たない固定パスであるため、
 * 各画面が `searchParams.tenant` / `.workspace` だけを見る実装のままだと、ログイン直後は
 * 常に空文字になり API 呼び出しが認可層で弾かれる (missing_tenant_scope)。
 *
 * ここでは middleware の `resolveSessionScope` (src/middleware/authz.ts) をそのまま呼び、
 * URL クエリが無いときのフォールバックとして各 server page.tsx から使えるようにする。
 * scope の組み立て規則 (無効化ユーザーの排除・workspace 未確定ならペアで諦める) を
 * middleware 側と二重実装しないことが目的で、判定ロジック自体はここに持たない。
 *
 * 注意: 本ファイルは `next/headers` を使う Server Component 専用。
 * client component は `dashboard-scope-helpers.ts` の純粋関数だけを import すること。
 */

import { cookies } from 'next/headers';
import { cache } from 'react';

import { resolveSessionScope } from '../../middleware-contract.js';
import { SESSION_COOKIE_NAME } from '../auth/config.js';
import { systemAuthClock } from '../auth/ports.js';
import { ACTIVE_WORKSPACE_COOKIE_NAME, verifySessionToken } from '../auth/session.js';
import type { DashboardScope } from './dashboard-scope-helpers.js';

export type { DashboardScope } from './dashboard-scope-helpers.js';
export { scopeFromQuery, tenantIdFromQuery } from './dashboard-scope-helpers.js';

const EMPTY_SCOPE: DashboardScope = { tenantId: null, workspaceId: null };

/**
 * React の request-scoped cache でラップし、同一リクエスト内 (layout.tsx + page.tsx) での
 * cookie 読取・JWT 署名検証の重複実行を避ける。リクエストを跨いでキャッシュされることはない。
 */
export const resolveDashboardScope = cache(async (): Promise<DashboardScope> => {
  // `await cookies()` は env の分岐より**前**で無条件に呼ぶこと (順序を戻さない)。
  // Next.js は「実行時に動的 API へ到達したか」で route を静的化するため、secret 未設定のビルド環境で
  // early return してしまうと呼び出し元の page が静的化され、本番実行時に DYNAMIC_SERVER_USAGE で 500 になる。
  // 2026-08-08 の `/` の 500 がまさにこの形で、本関数は (dashboard)/(workspace) 配下の十数画面から呼ばれる。
  // cookie を読むこと自体に副作用はないので、先に読んでから判定して構わない。
  const cookieStore = await cookies();

  const sessionSecret = process.env.AUTH_SESSION_SECRET;
  if (sessionSecret === undefined || sessionSecret.length === 0) return EMPTY_SCOPE;

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
