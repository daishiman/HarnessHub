// user_workspaces リポジトリ — 利用者 ↔ Workspace 所属 (HarnessHub-b7ng で feat-auth-tenancy と合意)。
//
// role (権限の強さ) はテナント単位、到達可否は所属単位という security-spec §3.1.2 の二層構造のうち、
// 後者の単一ソース。session claims の workspace_ids と access token の workspace_id はここから導出する。

import { and, eq } from 'drizzle-orm';
import { userWorkspaces } from '../schema/core/identity';
import type { RepositoryContext } from '../src/types';
import { guardedWrite } from './conflict';
import type { CoreAdapter } from './db';
import { serverNow } from './time';

export interface UserWorkspaceRow {
  readonly tenantId: string;
  readonly userId: string;
  readonly workspaceId: string;
  readonly createdAt: number;
}

export interface UserWorkspacesRepo {
  /** 所属を追加する。既に所属していれば何もしない (冪等 = 何回呼んでも結果が同じ)。 */
  add(context: RepositoryContext, input: { readonly userId: string; readonly workspaceId: string }): Promise<void>;
  remove(context: RepositoryContext, input: { readonly userId: string; readonly workspaceId: string }): Promise<void>;
  /** session 発行時の最頻経路。順序を固定して claims の再現性を保つ。 */
  listWorkspaceIdsForUser(context: RepositoryContext, userId: string): Promise<string[]>;
  listUserIdsForWorkspace(context: RepositoryContext, workspaceId: string): Promise<string[]>;
}

export function createUserWorkspacesRepo(adapter: CoreAdapter): UserWorkspacesRepo {
  const member = (context: RepositoryContext, userId: string, workspaceId: string) =>
    and(
      eq(userWorkspaces.tenantId, context.tenantId),
      eq(userWorkspaces.userId, userId),
      eq(userWorkspaces.workspaceId, workspaceId),
    );

  return {
    async add(context, input) {
      await guardedWrite(adapter, () =>
        adapter.client
          .insert(userWorkspaces)
          .values({
            tenantId: context.tenantId,
            userId: input.userId,
            workspaceId: input.workspaceId,
            createdAt: serverNow(),
          })
          .onConflictDoNothing(),
      );
    },

    async remove(context, input) {
      await guardedWrite(adapter, () =>
        adapter.client.delete(userWorkspaces).where(member(context, input.userId, input.workspaceId)),
      );
    },

    async listWorkspaceIdsForUser(context, userId) {
      const rows = await adapter.client
        .select({ workspaceId: userWorkspaces.workspaceId })
        .from(userWorkspaces)
        .where(and(eq(userWorkspaces.tenantId, context.tenantId), eq(userWorkspaces.userId, userId)))
        .orderBy(userWorkspaces.workspaceId);
      return rows.map((row) => row.workspaceId);
    },

    async listUserIdsForWorkspace(context, workspaceId) {
      const rows = await adapter.client
        .select({ userId: userWorkspaces.userId })
        .from(userWorkspaces)
        .where(and(eq(userWorkspaces.tenantId, context.tenantId), eq(userWorkspaces.workspaceId, workspaceId)))
        .orderBy(userWorkspaces.userId);
      return rows.map((row) => row.userId);
    },
  };
}
