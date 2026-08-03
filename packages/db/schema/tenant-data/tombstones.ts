// tenant_data 削除完全性の tombstone 台帳 (AD-6: backup snapshot からの restore でも復元されないこと)。
// append-only。日次 backup/restore が対象 r2_key を復元しないよう突き合わせる正本。

import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const tenantDataTombstones = sqliteTable(
  'tenant_data_tombstones',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    objectId: text('object_id').notNull(),
    r2Key: text('r2_key').notNull(),
    deletedAt: integer('deleted_at').notNull(),
  },
  (t) => [index('tenant_data_tombstones_tenant_deleted_idx').on(t.tenantId, t.deletedAt)],
);
