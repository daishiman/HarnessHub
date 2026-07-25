// users リポジトリ — User 基底テーブルの owner 実装 (ADR §1)。
// salary は封筒暗号化 (purpose=salary) の暗号文でのみ保存・返却する。
// 復号は decryptUserSalary の明示呼出しに限定し、既定の読取経路に平文を流さない (security-spec §4.2)。
// PII ガード (member 向け DTO からの除外・k-匿名性) の適用は feat-user-org-admin の責務。

import { and, eq } from 'drizzle-orm';
import { users } from '../schema/core/identity';
import { EntityNotFoundError } from '../src/errors';
import type { RepositoryContext } from '../src/types';
import type { ColumnCipher } from './crypto';
import type { CoreAdapter } from './db';
import { serverNow } from './time';
import { newUlid } from './ulid';

export type UserRole = 'provider-admin' | 'workspace-admin' | 'member';
export type UserStatus = 'active' | 'inactive';

export interface UserRow {
  readonly id: string;
  readonly tenantId: string;
  readonly idpSubject: string;
  readonly email: string;
  readonly name: string;
  readonly department: string | null;
  /** 暗号文 (`{key_version}:{iv}:{ct}:{tag}`) または null。平文はこの型を通らない。 */
  readonly salary: string | null;
  readonly role: UserRole;
  readonly status: UserStatus;
  readonly lastLoginAt: number | null;
  readonly createdAt: number;
}

export interface InsertUserInput {
  readonly idpSubject: string;
  readonly email: string;
  readonly name: string;
  readonly department?: string | null;
  /** 平文の年収 (JPY)。保存前に必ず暗号化される。 */
  readonly salary?: number | null;
  readonly role: UserRole;
  readonly status: UserStatus;
}

export interface UpdateUserInput {
  readonly email?: string;
  readonly name?: string;
  readonly department?: string | null;
  readonly role?: UserRole;
  readonly status?: UserStatus;
}

const SALARY_REF = (rowId: string) => ({ table: 'users', column: 'salary', rowId });

export interface UsersRepo {
  insert(context: RepositoryContext, input: InsertUserInput): Promise<UserRow>;
  findById(context: RepositoryContext, id: string): Promise<UserRow | null>;
  list(context: RepositoryContext, options?: { readonly limit?: number }): Promise<UserRow[]>;
  /** salary 以外の可変列のみ更新できる。salary は updateSalary の明示経路に限定。 */
  update(context: RepositoryContext, id: string, input: UpdateUserInput): Promise<UserRow>;
  /** 認証成功時刻をサーバー時刻で記録する。クライアント申告時刻は受け取らない (qa-032)。 */
  markLastLogin(context: RepositoryContext, id: string): Promise<UserRow>;
  updateSalary(context: RepositoryContext, id: string, salary: number | null): Promise<UserRow>;
  /** 認可 MW 通過後のみ呼ぶこと (復号の位置は §4.1)。呼出し側で user.salary_read の監査が必要。 */
  decryptSalary(context: RepositoryContext, id: string): Promise<number | null>;
  deleteById(context: RepositoryContext, id: string): Promise<void>;
}

export function createUsersRepo(adapter: CoreAdapter, cipher: ColumnCipher): UsersRepo {
  const scope = (context: RepositoryContext, id: string) => and(eq(users.tenantId, context.tenantId), eq(users.id, id));

  return {
    async insert(context, input) {
      const id = newUlid();
      const salaryEnc =
        input.salary === undefined || input.salary === null
          ? null
          : await cipher.encryptColumn('salary', String(input.salary), SALARY_REF(id));
      const rows = await adapter.client
        .insert(users)
        .values({
          id,
          tenantId: context.tenantId,
          idpSubject: input.idpSubject,
          email: input.email,
          name: input.name,
          department: input.department ?? null,
          salary: salaryEnc,
          role: input.role,
          status: input.status,
          lastLoginAt: null,
          createdAt: serverNow(),
        })
        .returning();
      return rows[0] as UserRow;
    },

    async findById(context, id) {
      const rows = await adapter.client.select().from(users).where(scope(context, id)).limit(1);
      return (rows[0] as UserRow | undefined) ?? null;
    },

    async list(context, options) {
      const rows = await adapter.client
        .select()
        .from(users)
        .where(eq(users.tenantId, context.tenantId))
        .limit(options?.limit ?? 100);
      return rows as UserRow[];
    },

    async update(context, id, input) {
      const patch: Record<string, unknown> = {};
      if (input.email !== undefined) patch.email = input.email;
      if (input.name !== undefined) patch.name = input.name;
      if (input.department !== undefined) patch.department = input.department;
      if (input.role !== undefined) patch.role = input.role;
      if (input.status !== undefined) patch.status = input.status;
      const rows = await adapter.client.update(users).set(patch).where(scope(context, id)).returning();
      const updated = rows[0] as UserRow | undefined;
      if (updated === undefined) throw new EntityNotFoundError('users', id);
      return updated;
    },

    async markLastLogin(context, id) {
      const rows = await adapter.client
        .update(users)
        .set({ lastLoginAt: serverNow() })
        .where(scope(context, id))
        .returning();
      const updated = rows[0] as UserRow | undefined;
      if (updated === undefined) throw new EntityNotFoundError('users', id);
      return updated;
    },

    async updateSalary(context, id, salary) {
      const salaryEnc = salary === null ? null : await cipher.encryptColumn('salary', String(salary), SALARY_REF(id));
      const rows = await adapter.client.update(users).set({ salary: salaryEnc }).where(scope(context, id)).returning();
      const updated = rows[0] as UserRow | undefined;
      if (updated === undefined) throw new EntityNotFoundError('users', id);
      return updated;
    },

    async decryptSalary(context, id) {
      const rows = await adapter.client.select().from(users).where(scope(context, id)).limit(1);
      const row = rows[0] as UserRow | undefined;
      if (row === undefined) throw new EntityNotFoundError('users', id);
      if (row.salary === null) return null;
      const plain = await cipher.decryptColumn('salary', row.salary, SALARY_REF(id));
      return Number(plain);
    },

    async deleteById(context, id) {
      await adapter.client.delete(users).where(scope(context, id));
    },
  };
}
