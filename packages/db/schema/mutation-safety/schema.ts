import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const MUTATION_IDEMPOTENCY_RESOURCES = ['documents', 'sheets'] as const;
export const MUTATION_IDEMPOTENCY_OPERATIONS = ['create'] as const;

/**
 * Docs / Sheets の business INSERT と同じ transaction で確保する冪等 claim。
 *
 * 既存 `idempotency_ledger` は handler 実行後に response を置く汎用 cache であり、
 * business row と claim を原子的に作れないため流用しない。Docs 自体は workspace 列を持たないが、
 * 作成要求の冪等 scope は tenant + workspace で分離するため workspace_id は必須にする。
 */
export const mutationCreateIdempotency = sqliteTable(
  'mutation_create_idempotency',
  {
    tenantId: text('tenant_id').notNull(),
    workspaceId: text('workspace_id').notNull(),
    resource: text('resource', { enum: MUTATION_IDEMPOTENCY_RESOURCES }).notNull(),
    operation: text('operation', { enum: MUTATION_IDEMPOTENCY_OPERATIONS }).notNull(),
    key: text('key').notNull(),
    payloadHash: text('payload_hash').notNull(),
    resourceId: text('resource_id').notNull(),
    /** 初回 HTTP response の wire snapshot。claim 直後、同じ transaction 内で全列を埋める。 */
    responseStatus: integer('response_status'),
    responseHeadersJson: text('response_headers_json'),
    responseBody: text('response_body'),
    expiresAt: integer('expires_at').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.workspaceId, t.resource, t.operation, t.key] }),
    index('mutation_create_idempotency_expires_idx').on(t.expiresAt),
  ],
);
