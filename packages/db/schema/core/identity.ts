// コアドメイン: テナント境界と利用者 (docs/backend-spec.md §2.2 / ADR §2 #1-#5)。
// driver 非依存 API (`drizzle-orm/sqlite-core`) のみを使う (D2 ヘッジ)。

import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

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
    /**
     * 封筒暗号化済み client_secret。
     *
     * `credential_mode='shared_google'` の行では **空文字**になる。共有 client の secret は
     * 環境単位の Secret に 1 組だけ置き、テナント行へは複製しない
     * (issue-auth-tenancy-shared-google-oidc-20260729 受入条件 4)。
     * NULL 許容へ緩めないのは、それが SQLite では表再作成 = 破壊的 DDL になるため。
     * 「空文字 = 共有方式なので行に secret を持たない」を repository 側の型で強制する。
     */
    clientSecretEnc: text('client_secret_enc').notNull(),
    scopes: text('scopes').notNull(),
    createdAt: integer('created_at').notNull(),
    /**
     * credential の出所 (`customer_google` / `shared_google`)。
     *
     * DB 既定値を `customer_google` にするのは、**この列を足す前に存在した行が実際に
     * 顧客持ち込み方式だから**であって「不明なら顧客方式とみなす」という意味ではない。
     * アプリ層は不明・未知の値を共有方式へ落とさず拒否する (fail-closed / AD-5 と同じ姿勢)。
     */
    credentialMode: text('credential_mode', { enum: ['customer_google', 'shared_google'] })
      .notNull()
      .default('customer_google'),
    /**
     * このテナントで受理する Google Workspace ドメインの JSON 配列 (`["example.com"]`)。
     *
     * NULL = 未設定。共有方式は `aud` がテナント識別子にならないため、未設定の共有方式接続は
     * 解決自体を拒否する。顧客方式では NULL のとき従来どおり `hd` を検査しない (後方互換)。
     */
    allowedWorkspaceDomains: text('allowed_workspace_domains'),
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

/**
 * 利用者 ↔ Workspace の所属 (HarnessHub-b7ng で feat-auth-tenancy と合意した追加)。
 *
 * **権限の強さ (role) はテナント単位**だが、Workspace 資源への到達可否は所属で決まる
 * (apps/hub の authz が `workspace_not_member` を判定する単一ソース)。
 * これを持たないと、認可判定は本番で必ず「所属なし = 全 Workspace 拒否」に倒れる。
 *
 * PK(tenant_id, user_id, workspace_id) がテナント内の重複所属を作らせない。
 * user/workspace の ID が別テナントで同じでも衝突させないため、tenant_id も PK に含める。
 * tenant_id は users/workspaces 経由で辿れるが、row-level scope (D4) の WHERE を
 * 1 テーブルで閉じるため冗長に持つ。
 */
export const userWorkspaces = sqliteTable(
  'user_workspaces',
  {
    tenantId: text('tenant_id').notNull(),
    userId: text('user_id').notNull(),
    workspaceId: text('workspace_id').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.userId, t.workspaceId] }),
    // session 発行時の「この利用者の所属 Workspace 一覧」が最頻の読み取り経路
    index('user_workspaces_tenant_user_idx').on(t.tenantId, t.userId),
  ],
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
