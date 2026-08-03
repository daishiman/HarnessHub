// Studio extension: feat-tenant-data-retention (security-spec §4.1 拡張 / §1.3 T-15)。
// R2 に格納するテナント業務データの参照メタデータのみを保持する (実体は R2、DB は行単位一意 key と暗号化情報のみ)。
// soft delete 列を持たない (immediate-full-deletion-r2-db-backup-contract): 削除は行の物理削除で表現する。

import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const TENANT_DATA_OBJECT_KINDS = ['knowledge_doc', 'run_input', 'run_output'] as const;

export const tenantDataObjects = sqliteTable(
  'tenant_data_objects',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    workspaceId: text('workspace_id').notNull(),
    kind: text('kind', { enum: TENANT_DATA_OBJECT_KINDS }).notNull(),
    title: text('title').notNull(),
    r2Key: text('r2_key').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    contentHash: text('content_hash').notNull(),
    encKeyVersion: integer('enc_key_version').notNull(),
    uploadedBy: text('uploaded_by').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    uniqueIndex('tenant_data_objects_r2_key_uq').on(t.r2Key),
    index('tenant_data_objects_tenant_workspace_kind_created_idx').on(t.tenantId, t.workspaceId, t.kind, t.createdAt),
  ],
);
