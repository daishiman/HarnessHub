// user_workspaces リポジトリ — 利用者 ↔ Workspace 所属 (HarnessHub-b7ng で feat-auth-tenancy と合意)。
//
// role (権限の強さ) はテナント単位、到達可否は所属単位という security-spec §3.1.2 の二層構造のうち、
// 後者の単一ソース。session claims の workspace_ids と access token の workspace_id はここから導出する。

import { and, eq } from 'drizzle-orm';
import { userWorkspaces, workspaces } from '../schema/core/identity';
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

/** 所属 1 件を、画面に出せる名前つきで表したもの。 */
export interface UserWorkspaceMembership {
  readonly workspaceId: string;
  /** `workspaces.name`。NOT NULL だが空文字を取り得るので、呼び出し側は空を「名前なし」として扱う。 */
  readonly name: string;
}

export interface UserWorkspacesRepo {
  /** 所属を追加する。既に所属していれば何もしない (冪等 = 何回呼んでも結果が同じ)。 */
  add(context: RepositoryContext, input: { readonly userId: string; readonly workspaceId: string }): Promise<void>;
  remove(context: RepositoryContext, input: { readonly userId: string; readonly workspaceId: string }): Promise<void>;
  /** session 発行時の最頻経路。順序を固定して claims の再現性を保つ。 */
  listWorkspaceIdsForUser(context: RepositoryContext, userId: string): Promise<string[]>;
  /**
   * 所属を**名前つきで**返す。`listWorkspaceIdsForUser` と同じ順序 (workspace_id 昇順) を保つ。
   *
   * 「ID を渡すと名前が返る」汎用の口はここに作らない。所属していない Workspace の名前を
   * 引ける関数があると、所属外の存在と名称が漏れる経路になる。入口を「この利用者の所属」に
   * 限ることで、返せる範囲が問い合わせの形そのもので閉じる。
   */
  listWorkspacesForUser(context: RepositoryContext, userId: string): Promise<UserWorkspaceMembership[]>;
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

    async listWorkspacesForUser(context, userId) {
      // **外部結合にする。** 内部結合にすると、workspaces 行が引けない所属が結果から消え、
      // この関数から導いた所属一覧が listWorkspaceIdsForUser より短くなる。所属一覧は到達可否の
      // 単一ソースなので、名前が引けないことを理由に到達先を減らしてはいけない。
      // 名前が無い場合は空文字を返し、「名前が無い」の判断は呼び出し側に委ねる。
      // workspaces 側も同じ tenant に閉じる (tenant を跨いだ id 衝突で他テナントの名前を拾わない)。
      const rows = await adapter.client
        .select({ workspaceId: userWorkspaces.workspaceId, name: workspaces.name })
        .from(userWorkspaces)
        .leftJoin(
          workspaces,
          and(eq(workspaces.id, userWorkspaces.workspaceId), eq(workspaces.tenantId, context.tenantId)),
        )
        .where(and(eq(userWorkspaces.tenantId, context.tenantId), eq(userWorkspaces.userId, userId)))
        .orderBy(userWorkspaces.workspaceId);
      return rows.map((row) => ({ workspaceId: row.workspaceId, name: row.name ?? '' }));
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
