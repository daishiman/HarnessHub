// tenant_data_objects の owner 実装 (feat-tenant-data-retention AD-1〜AD-6)。
// upload: R2 へ暗号化済み blob を put し、DB へ参照メタデータのみ insert する (DB は平文/暗号文どちらも持たない)。
// delete: 即時かつ完全に消す (soft delete 列を持たない)。TC-6〜TC-9 の対象。

import { and, desc, eq, lt } from 'drizzle-orm';
import type { TenantDataRegistry } from '../registry/tenant-data';
import { tenantDataR2Key } from '../registry/tenant-data';
import { type TENANT_DATA_OBJECT_KINDS, tenantDataObjects } from '../schema/tenant-data/schema';
import { tenantDataTombstones } from '../schema/tenant-data/tombstones';
import { EntityNotFoundError } from '../src/errors';
import type { RepositoryContext } from '../src/types';
import type { AuditRepo } from './audit';
import { guardedWrite } from './conflict';
import type { ColumnCipher } from './crypto';
import type { CoreAdapter } from './db';
import { serverNow } from './time';
import { newUlid } from './ulid';

export type TenantDataObjectKind = (typeof TENANT_DATA_OBJECT_KINDS)[number];

export interface TenantDataObjectRow {
  readonly id: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly kind: TenantDataObjectKind;
  readonly title: string;
  readonly r2Key: string;
  readonly sizeBytes: number;
  readonly contentHash: string;
  readonly encKeyVersion: number;
  readonly uploadedBy: string;
  readonly createdAt: number;
}

export interface TenantDataUploadInput {
  readonly workspaceId: string;
  readonly kind: TenantDataObjectKind;
  readonly title: string;
  readonly plaintext: Uint8Array;
  readonly uploadedBy: string;
}

export interface TenantDataListInput {
  readonly workspaceId: string;
  readonly kind?: TenantDataObjectKind;
  readonly cursor?: string;
  readonly limit: number;
}

export interface TenantDataObjectPage {
  readonly items: readonly TenantDataObjectRow[];
  readonly nextCursor: string | null;
}

export interface TenantDataRepo {
  upload(context: RepositoryContext, input: TenantDataUploadInput): Promise<TenantDataObjectRow>;
  findById(context: RepositoryContext, objectId: string): Promise<TenantDataObjectRow | null>;
  list(context: RepositoryContext, input: TenantDataListInput): Promise<TenantDataObjectPage>;
  getContent(context: RepositoryContext, objectId: string): Promise<Uint8Array>;
  deleteTenantDataObject(context: RepositoryContext, objectId: string): Promise<void>;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function createTenantDataRepo(
  adapter: CoreAdapter,
  cipher: ColumnCipher,
  registry: TenantDataRegistry,
  audit: AuditRepo,
): TenantDataRepo {
  async function requireRow(context: RepositoryContext, objectId: string): Promise<TenantDataObjectRow> {
    const rows = await adapter.client
      .select()
      .from(tenantDataObjects)
      .where(and(eq(tenantDataObjects.id, objectId), eq(tenantDataObjects.tenantId, context.tenantId)))
      .limit(1);
    const row = rows[0] as TenantDataObjectRow | undefined;
    if (row === undefined) throw new EntityNotFoundError('tenant_data_objects', objectId);
    return row;
  }

  return {
    async upload(context, input) {
      const id = newUlid();
      const r2Key = tenantDataR2Key({
        tenantId: context.tenantId,
        workspaceId: input.workspaceId,
        kind: input.kind,
        objectId: id,
      });
      const encKeyVersion = await cipher.ensureActiveDek('tenant_data', context.tenantId);
      const encrypted = await cipher.encryptColumn(
        'tenant_data',
        Buffer.from(input.plaintext).toString('base64'),
        { table: 'tenant_data_objects', column: 'r2_object', rowId: id },
        context.tenantId,
      );
      const encryptedBytes = new TextEncoder().encode(encrypted);
      await registry.put(r2Key, encryptedBytes);

      const row: TenantDataObjectRow = {
        id,
        tenantId: context.tenantId,
        workspaceId: input.workspaceId,
        kind: input.kind,
        title: input.title,
        r2Key,
        sizeBytes: input.plaintext.byteLength,
        contentHash: await sha256Hex(input.plaintext),
        encKeyVersion,
        uploadedBy: input.uploadedBy,
        createdAt: serverNow(),
      };
      await guardedWrite(adapter, () => adapter.client.insert(tenantDataObjects).values(row));
      return row;
    },

    async findById(context, objectId) {
      const rows = await adapter.client
        .select()
        .from(tenantDataObjects)
        .where(and(eq(tenantDataObjects.id, objectId), eq(tenantDataObjects.tenantId, context.tenantId)))
        .limit(1);
      return (rows[0] as TenantDataObjectRow | undefined) ?? null;
    },

    async list(context, input) {
      const predicates = [
        eq(tenantDataObjects.tenantId, context.tenantId),
        eq(tenantDataObjects.workspaceId, input.workspaceId),
      ];
      if (input.kind !== undefined) predicates.push(eq(tenantDataObjects.kind, input.kind));
      // ULID PK は時系列単調なので、id を cursor にすると「作成順の続き」がそのまま表せる
      // (`hearing-intake.ts` の listSheets / `publish-requests.ts` の list と同じ理由)。
      if (input.cursor !== undefined) predicates.push(lt(tenantDataObjects.id, input.cursor));

      // limit+1 件取って hasNext を判定する。次ページの有無を別クエリの count で確かめると
      // 費用が 2 倍になる。
      const rows = await adapter.client
        .select()
        .from(tenantDataObjects)
        .where(and(...predicates))
        .orderBy(desc(tenantDataObjects.id))
        .limit(input.limit + 1);
      const hasNext = rows.length > input.limit;
      const items = rows.slice(0, input.limit) as TenantDataObjectRow[];
      return { items, nextCursor: hasNext ? (items.at(-1)?.id ?? null) : null };
    },

    async getContent(context, objectId) {
      const row = await requireRow(context, objectId);
      const object = await registry.get(row.r2Key);
      if (object === null) throw new EntityNotFoundError('tenant_data_objects', objectId);
      const chunks: Uint8Array[] = [];
      for await (const chunk of object as unknown as AsyncIterable<Uint8Array>) chunks.push(chunk);
      const encrypted = new TextDecoder().decode(Buffer.concat(chunks.map((c) => Buffer.from(c))));
      const decrypted = await cipher.decryptColumn(
        'tenant_data',
        encrypted,
        { table: 'tenant_data_objects', column: 'r2_object', rowId: objectId },
        context.tenantId,
      );
      return Buffer.from(decrypted, 'base64');
    },

    async deleteTenantDataObject(context, objectId) {
      const row = await requireRow(context, objectId);

      // R2 削除・DB 行の物理削除・tombstone 記録を同一 guardedWrite コールバック内で順に行う
      // (db-write-gate は repository/ 配下の .insert/.update/.delete を DB query builder 専用名として
      // 扱い、非 DB collection への同名呼び出しも fail-closed で guardedWrite 経由を要求するため、
      // R2 delete もこの中に置く)。R2 削除を先に行う理由は変わらない: R2 が失敗すればここで例外が
      // 伝播しコールバックはそこで止まるので DB 行・tombstone は作られず、行はまだ残り一覧からも見え
      // 再削除もできる (安全側の残留)。逆順だと DB 行だけ消えて R2 blob が誰からも参照されず残る =
      // 発見も再試行もできない不可視の漏れになる。DB 行削除と tombstone insert をまとめることで
      // 「行は消えたが tombstone が無い」という中間状態の窓も無くす。
      await guardedWrite(adapter, async () => {
        await registry.delete(row.r2Key);
        await adapter.client
          .delete(tenantDataObjects)
          .where(and(eq(tenantDataObjects.id, objectId), eq(tenantDataObjects.tenantId, context.tenantId)));
        await adapter.client.insert(tenantDataTombstones).values({
          id: newUlid(),
          tenantId: context.tenantId,
          objectId,
          r2Key: row.r2Key,
          deletedAt: serverNow(),
        });
      });

      // audit.append は自前の guardedWrite (hash chain 用 BEGIN IMMEDIATE) を持つので、
      // 上の guardedWrite の外側で呼ぶ (内側で呼ぶと自己デッドロックする)。
      // ここで失敗しても削除自体は既に完了・不可逆であり、失われるのは監査証跡だけなので
      // 呼び出し元へロールバック手段を提供する意味がない。例外はそのまま呼び出し元へ伝播させ、
      // 運用側が audit_events の欠落を検知できるようにする。
      await audit.append(context, {
        workspaceId: row.workspaceId,
        actorType: 'user',
        actorId: context.actorId ?? 'system',
        action: 'tenant_data.delete',
        entityType: 'tenant_data_object',
        entityId: objectId,
        summary: { kind: row.kind },
      });
    },
  };
}
