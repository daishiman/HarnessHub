// コアドメイン: 監査 (append-only + hash chain)・封筒暗号化 DEK 台帳・緊急失効 (ADR §2 #15-#17)。

import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * append-only 監査 event (S-D6)。UPDATE/DELETE 関数はリポジトリ層に存在しない。
 * hash chain はテナント単位 (security-spec §5.4)。UNIQUE(tenant_id, seq) が並行 append を直列化する。
 * summary_json に値そのもの (salary 金額・secret・token) を書かない。
 */
export const auditEvents = sqliteTable(
  'audit_events',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    workspaceId: text('workspace_id'),
    actorType: text('actor_type', { enum: ['user', 'publisher_token', 'system'] }).notNull(),
    actorId: text('actor_id').notNull(),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    summaryJson: text('summary_json').notNull(),
    seq: integer('seq').notNull(),
    prevHash: text('prev_hash').notNull(),
    eventHash: text('event_hash').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [uniqueIndex('audit_events_tenant_seq_uq').on(t.tenantId, t.seq)],
);

/**
 * 封筒暗号化の DEK 台帳 (KEK で wrap。security-spec §4.1.1)。DEK 平文は保存しない。
 * システム全体の鍵素材のため tenant 非スコープ (ADR §2 の宣言済み除外)。
 */
export const encryptionKeys = sqliteTable(
  'encryption_keys',
  {
    id: text('id').primaryKey(),
    purpose: text('purpose', { enum: ['salary', 'idp_secret'] }).notNull(),
    keyVersion: integer('key_version').notNull(),
    dekWrapped: text('dek_wrapped').notNull(),
    status: text('status', { enum: ['active', 'retiring', 'retired'] }).notNull(),
    createdAt: integer('created_at').notNull(),
    retiredAt: integer('retired_at'),
  },
  (t) => [uniqueIndex('encryption_keys_purpose_version_uq').on(t.purpose, t.keyVersion)],
);

/** 緊急失効のみ (security-spec §2.1)。認可 MW が JWT.iat < revoked_at を拒否する。 */
export const sessionRevocations = sqliteTable('session_revocations', {
  tenantId: text('tenant_id').primaryKey(),
  revokedAt: integer('revoked_at').notNull(),
});
