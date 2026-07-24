// コアドメイン: 公開パイプラインの直列化・Publisher 認証・冪等性 (ADR §2 #12-#14, #18)。

import { sql } from 'drizzle-orm';
import { integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/** PublishRequest の 9 状態 (backend-spec §5.1)。 */
export const PUBLISH_REQUEST_STATUSES = [
  'draft',
  'validating',
  'needs_fix',
  'ready',
  'approval_pending',
  'approved',
  'publishing',
  'failed',
  'published',
] as const;

/**
 * 同一 channel の非終端 request は 1 件 (partial UNIQUE index で直列化, qa-009)。
 * 終端は published/failed/draft (差戻し) — backend-spec §5.1。
 */
export const publishRequests = sqliteTable(
  'publish_requests',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    workspaceId: text('workspace_id').notNull(),
    projectId: text('project_id').notNull(),
    channelId: text('channel_id').notNull(),
    status: text('status', { enum: PUBLISH_REQUEST_STATUSES }).notNull(),
    verdict: text('verdict', { enum: ['green', 'yellow', 'red'] }),
    findingsJson: text('findings_json'),
    releaseId: text('release_id'),
    requestedBy: text('requested_by').notNull(),
    idempotencyKey: text('idempotency_key'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    uniqueIndex('publish_requests_channel_active_uq')
      .on(t.channelId)
      .where(sql`status NOT IN ('published', 'failed', 'draft')`),
  ],
);

/** Publisher refresh token (SHA-256 ハッシュのみ保存。rotation 必須・再利用検知で family 全失効 §2.2)。 */
export const publisherTokens = sqliteTable('publisher_tokens', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  userId: text('user_id').notNull(),
  deviceName: text('device_name').notNull(),
  refreshTokenHash: text('refresh_token_hash').notNull(),
  scopesJson: text('scopes_json').notNull(),
  familyId: text('family_id').notNull(),
  lastUsedAt: integer('last_used_at'),
  expiresAt: integer('expires_at').notNull(),
  revokedAt: integer('revoked_at'),
  createdAt: integer('created_at').notNull(),
});

/** Device Flow (qa-008)。tenant_id/user_id は承認前 NULL。user_code は照合後即失効。 */
export const deviceAuthorizations = sqliteTable(
  'device_authorizations',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id'),
    deviceCodeHash: text('device_code_hash').notNull(),
    userCode: text('user_code').notNull(),
    userId: text('user_id'),
    status: text('status', { enum: ['pending', 'approved', 'denied', 'expired'] }).notNull(),
    intervalSec: integer('interval_sec').notNull(),
    expiresAt: integer('expires_at').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [uniqueIndex('device_authorizations_code_hash_uq').on(t.deviceCodeHash)],
);

/** publish 系 POST の再試行安全化。PK(scope, key)。 */
export const idempotencyLedger = sqliteTable(
  'idempotency_ledger',
  {
    scope: text('scope').notNull(),
    key: text('key').notNull(),
    tenantId: text('tenant_id').notNull(),
    requestHash: text('request_hash').notNull(),
    responseStatus: integer('response_status').notNull(),
    responseBodyJson: text('response_body_json'),
    expiresAt: integer('expires_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.scope, t.key] })],
);
