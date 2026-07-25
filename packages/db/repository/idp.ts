// idp_connections リポジトリ — テナント IdP secret の封筒暗号化保存 (security-spec §4.3)。
// 復号は OIDC 認可要求の組立時のみ。既定の読取経路は暗号文のまま返す。

import { and, eq } from 'drizzle-orm';
import { idpConnections } from '../schema/core/identity';
import { EntityNotFoundError } from '../src/errors';
import type { RepositoryContext } from '../src/types';
import type { ColumnCipher } from './crypto';
import type { CoreAdapter } from './db';
import { serverNow } from './time';
import { newUlid } from './ulid';

export interface IdpConnectionRow {
  readonly id: string;
  readonly tenantId: string;
  readonly issuerUrl: string;
  readonly clientId: string;
  /** 暗号文 (`{key_version}:{iv}:{ct}:{tag}`)。平文はこの型を通らない。 */
  readonly clientSecretEnc: string;
  readonly scopes: string;
  readonly createdAt: number;
}

const SECRET_REF = (rowId: string) => ({
  table: 'idp_connections',
  column: 'client_secret_enc',
  rowId,
});

export interface IdpConnectionsRepo {
  insert(
    context: RepositoryContext,
    input: {
      readonly issuerUrl: string;
      readonly clientId: string;
      /** 平文 secret。保存前に必ず暗号化される。 */
      readonly clientSecret: string;
      readonly scopes: string;
    },
  ): Promise<IdpConnectionRow>;
  findById(context: RepositoryContext, id: string): Promise<IdpConnectionRow | null>;
  list(context: RepositoryContext): Promise<IdpConnectionRow[]>;
  /** OIDC 認可要求の組立時のみ呼ぶこと。レスポンス・ログへ出さない。 */
  decryptClientSecret(context: RepositoryContext, id: string): Promise<string>;
  deleteById(context: RepositoryContext, id: string): Promise<void>;
}

export function createIdpConnectionsRepo(adapter: CoreAdapter, cipher: ColumnCipher): IdpConnectionsRepo {
  const scope = (context: RepositoryContext, id: string) =>
    and(eq(idpConnections.tenantId, context.tenantId), eq(idpConnections.id, id));

  return {
    async insert(context, input) {
      const id = newUlid();
      const enc = await cipher.encryptColumn('idp_secret', input.clientSecret, SECRET_REF(id));
      const rows = await adapter.client
        .insert(idpConnections)
        .values({
          id,
          tenantId: context.tenantId,
          issuerUrl: input.issuerUrl,
          clientId: input.clientId,
          clientSecretEnc: enc,
          scopes: input.scopes,
          createdAt: serverNow(),
        })
        .returning();
      return rows[0] as IdpConnectionRow;
    },

    async findById(context, id) {
      const rows = await adapter.client.select().from(idpConnections).where(scope(context, id)).limit(1);
      return (rows[0] as IdpConnectionRow | undefined) ?? null;
    },

    async list(context) {
      const rows = await adapter.client
        .select()
        .from(idpConnections)
        .where(eq(idpConnections.tenantId, context.tenantId));
      return rows as IdpConnectionRow[];
    },

    async decryptClientSecret(context, id) {
      const rows = await adapter.client.select().from(idpConnections).where(scope(context, id)).limit(1);
      const row = rows[0] as IdpConnectionRow | undefined;
      if (row === undefined) throw new EntityNotFoundError('idp_connections', id);
      return cipher.decryptColumn('idp_secret', row.clientSecretEnc, SECRET_REF(id));
    },

    async deleteById(context, id) {
      await adapter.client.delete(idpConnections).where(scope(context, id));
    },
  };
}
