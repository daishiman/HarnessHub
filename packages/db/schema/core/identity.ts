// コアドメイン: テナント境界と利用者 (docs/backend-spec.md §2.2 / ADR §2 #1-#5)。
// driver 非依存 API (`drizzle-orm/sqlite-core`) のみを使う (D2 ヘッジ)。

import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/** 課金・IdP 設定の境界。tenant_id 列を持たない唯一のルート境界テーブル。 */
export const tenants = sqliteTable(
  'tenants',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    plan: text('plan').notNull(),
    status: text('status', { enum: ['active', 'suspended'] }).notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [uniqueIndex('tenants_slug_uq').on(t.slug)],
);

/** テナント IdP 設定。client_secret_enc は封筒暗号化 (purpose=idp_secret, security-spec §4.3)。 */
export const idpConnections = sqliteTable(
  'idp_connections',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    issuerUrl: text('issuer_url').notNull(),
    clientId: text('client_id').notNull(),
    clientSecretEnc: text('client_secret_enc').notNull(),
    scopes: text('scopes').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [uniqueIndex('idp_connections_tenant_issuer_uq').on(t.tenantId, t.issuerUrl)],
);

/** 共有・カタログの境界 (権限の境界は tenant — security-spec §3.1.2)。 */
export const workspaces = sqliteTable(
  'workspaces',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [uniqueIndex('workspaces_tenant_slug_uq').on(t.tenantId, t.slug)],
);

/**
 * User 基底テーブル。owner は feat-domain-model-db (ADR §1 の architecture decision)。
 * department/salary は §2.2 の単一定義に含まれる基底列であり、feat-user-org-admin は列追加を行わない。
 * salary は封筒暗号化の暗号文 TEXT (`{key_version}:{iv}:{ct}:{tag}`)。平文で保存しない (qa-032)。
 */
export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    idpSubject: text('idp_subject').notNull(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    department: text('department'),
    salary: text('salary'),
    role: text('role', { enum: ['provider-admin', 'workspace-admin', 'member'] }).notNull(),
    status: text('status', { enum: ['active', 'inactive'] }).notNull(),
    lastLoginAt: integer('last_login_at'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [uniqueIndex('users_tenant_idp_subject_uq').on(t.tenantId, t.idpSubject)],
);

/** アカウント設定 (users 1:1 従属。tenant へは users 経由で辿る)。2FA/パスワード列なし (SEC1)。 */
export const userSettings = sqliteTable('user_settings', {
  userId: text('user_id').primaryKey(),
  notifyGeneration: integer('notify_generation', { mode: 'boolean' }).notNull().default(true),
  notifyReview: integer('notify_review', { mode: 'boolean' }).notNull().default(true),
  notifyWeekly: integer('notify_weekly', { mode: 'boolean' }).notNull().default(true),
  notifyFeedback: integer('notify_feedback', { mode: 'boolean' }).notNull().default(true),
  emailEnabled: integer('email_enabled', { mode: 'boolean' }).notNull().default(true),
  theme: text('theme').notNull().default('system'),
  density: text('density').notNull().default('comfortable'),
  language: text('language').notNull().default('ja'),
});
