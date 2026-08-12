/**
 * sheet 所有権を伴う認可資源解決の共通ヘルパー。
 *
 * `sheets/[id]/route.ts` の `resolveSheet` と同じパターン: header 申告テナントを起点に、
 * 実際の sheet 行が見つかればその `applicantUserId` を owner として資源参照へ載せる。
 * screenshots / handoff-tokens の各 route (D) がこれを共有することで、所有権判定のロジックを
 * route ごとに書き分けない (feat-hearing-intake 追加要件)。
 */
import { createRepositoryContext, type HearingSheetRow } from '@harness-hub/db';
import type { AuthzPrincipal, AuthzResourceRef } from '../../lib/authz/index.js';
import { requestScopedResource } from '../../lib/authz/index.js';
import { hearingIntakeRuntime } from './runtime.js';

export interface SheetParams {
  readonly id: string;
}

/**
 * `type: 'hearing_sheet'` の資源参照を組み立てる。sheet が見つからない場合は
 * (存在しない ID を叩かれた場合) principal 自身を owner とみなし、`decide()` 側の
 * `tenant_mismatch`/`not_owner` 判定へ処理を委ねる (`resolveSheet` と同じ方針)。
 */
export async function resolveSheetResource(
  request: Request,
  params: SheetParams,
  principal: Pick<AuthzPrincipal, 'userId'>,
): Promise<AuthzResourceRef | null> {
  const base = requestScopedResource(request, { type: 'hearing_sheet', id: params.id });
  if (base === null) return null;
  const row = await hearingIntakeRuntime().repository.findSheet(
    createRepositoryContext({ tenantId: base.tenantId }),
    params.id,
  );
  if (row === null) return { ...base, ownerUserId: principal.userId };
  return {
    ...base,
    workspaceId: row.workspaceId,
    ownerUserId: row.applicantUserId,
  };
}

/**
 * screenshots / handoff-tokens route が「実在する sheet の workspaceId」を確実に得るためのヘルパー。
 *
 * `resolveSheetResource` が返す `AuthzResourceRef.workspaceId` は sheet が見つからないとき
 * header 申告値へフォールバックしうる (= 実在しない workspace を書き込みに使ってしまう危険がある)。
 * ここでは改めて実在行を引き、無ければ null を返す (呼び出し側は 404 にする)。
 */
export async function findSheetRow(tenantId: string, id: string): Promise<HearingSheetRow | null> {
  return hearingIntakeRuntime().repository.findSheet(createRepositoryContext({ tenantId }), id);
}
