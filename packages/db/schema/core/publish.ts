// コアドメイン: 公開パイプラインの直列化・Publisher 認証・冪等性 (ADR §2 #12-#14, #18)。

import { sql } from 'drizzle-orm';
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

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

/**
 * Publisher refresh token (SHA-256 ハッシュのみ保存。rotation 必須・再利用検知で family 全失効 §2.2)。
 *
 * `workspace_id` は HarnessHub-b7ng で feat-auth-tenancy の `PublisherTokenRecord` と
 * 合意した追加列。access token の `workspace_id` claim と Workspace 単位の token 一覧
 * (`token.list.workspace`) がこの列を根拠にする。
 *
 * `device_name` は NOT NULL を外した。利用者が任意に付ける表示名であり、
 * NOT NULL のままでは「ラベル未指定の Device Flow」を表現できず port
 * (`deviceLabel: string | null`) と矛盾していた。**列名は baseline のまま維持**し、
 * port 語彙 (`deviceLabel`) への読み替えは repository 層 1 箇所に閉じる
 * (列 rename は破壊的 DDL を増やすだけで、得られるのは名前の好みだけ)。
 */
export const publisherTokens = sqliteTable(
  'publisher_tokens',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    workspaceId: text('workspace_id').notNull(),
    userId: text('user_id').notNull(),
    deviceName: text('device_name'),
    refreshTokenHash: text('refresh_token_hash').notNull(),
    scopesJson: text('scopes_json').notNull(),
    familyId: text('family_id').notNull(),
    lastUsedAt: integer('last_used_at'),
    expiresAt: integer('expires_at').notNull(),
    revokedAt: integer('revoked_at'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    // rotation は毎回ハッシュ引き当て → CAS 更新なので、この索引が Device Flow の最頻経路
    uniqueIndex('publisher_tokens_refresh_hash_uq').on(t.refreshTokenHash),
    index('publisher_tokens_tenant_family_idx').on(t.tenantId, t.familyId),
  ],
);

/**
 * Device Flow (qa-008)。user_code は照合後即失効。
 *
 * HarnessHub-b7ng で feat-auth-tenancy の `DeviceAuthorizationRecord` と合意した形へ揃えた:
 * - `tenant_id` を NOT NULL 化 — code 発行要求が `tenant_slug` を必須にしているため
 *   発行時点でテナントは確定している。NULL 可のままだと row-level scope (D4) に穴が残る。
 * - `workspace_id` / `scopes_json` / `device_name` / `attempts` / `last_polled_at` を追加 —
 *   承認先 Workspace・要求 scope・端末表示名・user_code 総当たり計数・`slow_down` 判定の保存先。
 *   `device_name` は publisher_tokens と同名で揃える (同じ値が Device Flow で引き継がれるため)。
 * - status の `expired` を削除し `consumed` を追加 — 期限切れは `expires_at` から導出する
 *   派生状態であり、列に持つと「期限切れを書き込む batch」が別途必要になる。
 *   一方 `consumed` は device_code の使い捨てを DB 側で保証する必須の遷移先。
 */
export const deviceAuthorizations = sqliteTable(
  'device_authorizations',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    deviceCodeHash: text('device_code_hash').notNull(),
    userCode: text('user_code').notNull(),
    userId: text('user_id'),
    workspaceId: text('workspace_id'),
    scopesJson: text('scopes_json').notNull(),
    deviceName: text('device_name'),
    status: text('status', { enum: ['pending', 'approved', 'denied', 'consumed'] }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    intervalSec: integer('interval_sec').notNull(),
    lastPolledAt: integer('last_polled_at'),
    expiresAt: integer('expires_at').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    uniqueIndex('device_authorizations_code_hash_uq').on(t.deviceCodeHash),
    // user_code はテナント内で一意に照合する (別テナントの同一 code と混線させない)
    uniqueIndex('device_authorizations_tenant_user_code_uq').on(t.tenantId, t.userCode),
  ],
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
