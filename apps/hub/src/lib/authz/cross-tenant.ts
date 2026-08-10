/**
 * テナント境界を越えられる主体の判定 (security-spec §3.1.3 / FL-SEC8-102)。
 *
 * 越境の可否そのものは `decide()` の `resolveEffectiveRole` が持っているが、その手前に立つ
 * edge middleware も同じ問いに答える必要がある。両者が別々に role リテラルを持つと、
 * 「契約上は許可・実運用では到達不能」という二枚舌 (HarnessHub-stmx) がまた生える。
 *
 * そこで**述語だけ**をこのモジュールへ切り出し、判定語彙 (`'provider-admin'`) の出現箇所を
 * ここ 1 つに固定する。edge (`src/middleware/authz.ts`) と route (`decide` / `withAuthz`) は
 * このモジュールを呼ぶだけで、自前の role 比較を持たない。
 * 制約は `apps/hub/scripts/check-single-authz-middleware.mjs` が機械検査する。
 *
 * このファイルは **I/O も環境依存も持たない純関数だけ**で構成すること。
 * edge runtime の middleware が直接 import するため、DB や Node API を引き込むと本番で壊れる
 * (`lib/authz/index.ts` 経由にしないのも同じ理由)。
 */

import type { BaseRole } from './types.js';

/**
 * テナントの外側に立つ主体の role。
 *
 * この 1 箇所だけが越境 role のリテラルを持つ。増やす前に「本当にテナント境界の外の主体か」を
 * 疑うこと — ここへ role を足すのは、その role の全 action を越境可能にする操作である。
 */
export const CROSS_TENANT_ROLE: BaseRole = 'provider-admin';

/**
 * 与えられた role 集合がテナント境界を越えられるか。
 *
 * edge 側の `Principal` は `roles: readonly string[]` (テナント固有語彙を許す境界型)、
 * route 側の `AuthzPrincipal` は `role: EffectiveRole` と形が違うため、
 * 呼び出し側で配列へ均してから渡す契約にしてある。
 */
export function canCrossTenantBoundary(roles: readonly string[]): boolean {
  return roles.includes(CROSS_TENANT_ROLE);
}

/**
 * 越境を edge で通してよい経路か。
 *
 * **越境を通す条件に path を含めるのが要点。**
 * edge が越境を通す唯一の正当性は「その先の route 層 (`withAuthz`) が
 * `provider.cross_tenant_access` を必ず記録する」ことにある。`withAuthz` が掛からない経路
 * (RSC の画面など) まで通すと、監査の残らない越境が生まれる — 遮断されている今より悪くなる。
 *
 * `withAuthz` を通さない API の例外 (`/health`, `/api/auth/**`, `/api/v1/device/code` 等) は
 * すべて public path として手前で返るため、ここへは到達しない。例外一覧の増減は
 * `check-single-authz-middleware.mjs` の `EXPECTED_EXEMPTIONS` が厳密一致で検査する。
 */
export function isCrossTenantAuditedPath(pathname: string): boolean {
  return pathname === '/api' || pathname.startsWith('/api/');
}
