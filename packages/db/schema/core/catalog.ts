// コアドメイン: Project→TargetChannel→Release(immutable)→Package と配布出口 (ADR §2 #6-#11)。

import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable(
  'projects',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    workspaceId: text('workspace_id').notNull(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    ownerUserId: text('owner_user_id').notNull(),
    status: text('status', { enum: ['active', 'suspended', 'archived'] }).notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [uniqueIndex('projects_workspace_name_uq').on(t.workspaceId, t.name)],
);

/**
 * stable pointer の正本。tenant_id は WHERE 強制注入の単純化のための非正規化 (ADR §2)。
 * stable_release_id の切替は単一 UPDATE で atomic (I3)。
 */
export const targetChannels = sqliteTable(
  'target_channels',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    projectId: text('project_id').notNull(),
    target: text('target', { enum: ['skill', 'web_app'] }).notNull(),
    stableReleaseId: text('stable_release_id'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [uniqueIndex('target_channels_project_target_uq').on(t.projectId, t.target)],
);

/**
 * immutable Release (I3)。更新は status のみ (リポジトリ層が updateReleaseStatus 以外を公開しない)。
 * version は直前 release との package_hash 差分から自動採番。UNIQUE(channel_id, version) が並行採番を直列化する。
 */
export const releases = sqliteTable(
  'releases',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    projectId: text('project_id').notNull(),
    channelId: text('channel_id').notNull(),
    version: text('version').notNull(),
    packageHash: text('package_hash').notNull(),
    manifestJson: text('manifest_json').notNull(),
    status: text('status', { enum: ['available', 'suspended', 'deprecated'] }).notNull(),
    createdBy: text('created_by').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [uniqueIndex('releases_channel_version_uq').on(t.channelId, t.version)],
);

/**
 * R2 PackageRegistry への参照 (C4)。実体は R2、DB は content hash と参照のみ。
 * content-addressed 共有のため tenant 非スコープ (到達可能性は releases 経由の認可で制御)。
 */
export const packages = sqliteTable('packages', {
  contentHash: text('content_hash').primaryKey(),
  r2Key: text('r2_key').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  kind: text('kind', { enum: ['skills-package'] }).notNull(),
  createdAt: integer('created_at').notNull(),
});

/** web_app 出口。orphan_candidate は publish pipeline §7.2 準拠。 */
export const deploymentReferences = sqliteTable('deployment_references', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  projectId: text('project_id').notNull(),
  channelId: text('channel_id').notNull(),
  releaseId: text('release_id').notNull(),
  url: text('url').notNull(),
  provider: text('provider', { enum: ['cloudflare'] }).notNull(),
  orphanCandidate: integer('orphan_candidate', { mode: 'boolean' }).notNull().default(false),
  registeredBy: text('registered_by').notNull(),
  lastHealthAt: integer('last_health_at'),
  createdAt: integer('created_at').notNull(),
});

/** Workspace カタログ。`public` visibility は Stage 5 まで非対象。 */
export const catalogEntries = sqliteTable(
  'catalog_entries',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    workspaceId: text('workspace_id').notNull(),
    projectId: text('project_id').notNull(),
    visibility: text('visibility', { enum: ['private', 'workspace'] }).notNull(),
    summary: text('summary'),
    tagsJson: text('tags_json'),
    dlCount: integer('dl_count').notNull().default(0),
    publishedAt: integer('published_at'),
  },
  (t) => [uniqueIndex('catalog_entries_project_uq').on(t.projectId)],
);
