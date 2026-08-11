// DMDB-T09: users スキーマが backend-spec §2.2 の単一定義 (department/salary 含む) と一致することの検証。
// P02 architecture decision (owner = feat-domain-model-db) の実装面の担保。

import { getTableColumns } from 'drizzle-orm';
import { getTableConfig, type SQLiteColumn } from 'drizzle-orm/sqlite-core';
import { describe, expect, it } from 'vitest';
import { users, userWorkspaces } from '../schema/core/identity';
import { coreTables } from '../schema/index';

describe('DMDB-T09 users schema match (backend-spec §2.2)', () => {
  it('users の実カラム集合が §2.2 定義 (+共通規約 created_at) と完全一致する', () => {
    const columns = getTableColumns(users) as Record<string, SQLiteColumn>;
    const dbNames = Object.values(columns)
      .map((c) => c.name)
      .sort();
    expect(dbNames).toStrictEqual(
      [
        'id',
        'tenant_id',
        'idp_subject',
        'email',
        'name',
        'department',
        'salary',
        'role',
        'status',
        'last_login_at',
        'created_at',
      ].sort(),
    );
  });

  it('UNIQUE(tenant_id, idp_subject) が定義されている', () => {
    const config = getTableConfig(users);
    const unique = config.indexes.find((i) => i.config.unique);
    expect(unique).toBeDefined();
    expect(unique?.config.columns.map((c) => (c as SQLiteColumn).name)).toStrictEqual(['tenant_id', 'idp_subject']);
  });

  it('user_workspaces の PK は tenant_id を含み、別テナントの同一 ID 組を衝突させない', () => {
    const config = getTableConfig(userWorkspaces);
    expect(config.primaryKeys).toHaveLength(1);
    expect(config.primaryKeys[0]?.columns.map((c) => (c as SQLiteColumn).name)).toStrictEqual([
      'tenant_id',
      'user_id',
      'workspace_id',
    ]);
  });

  it('コアドメインは exact 20 テーブルで構成される', () => {
    expect(Object.keys(coreTables)).toHaveLength(20);
    expect(Object.keys(coreTables).sort()).toStrictEqual([
      'audit_events',
      'catalog_entries',
      'deployment_references',
      'device_authorizations',
      'encryption_keys',
      'idempotency_ledger',
      'idp_connections',
      'packages',
      'projects',
      'publish_requests',
      'publisher_tokens',
      'releases',
      'session_revocations',
      'smoke_fixture_leases',
      'target_channels',
      'tenants',
      'user_settings',
      'user_workspaces',
      'users',
      'workspaces',
    ]);
  });
});
