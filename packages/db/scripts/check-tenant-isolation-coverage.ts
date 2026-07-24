// schema-driven 分離テスト網羅チェック (security-spec §8.4 / P09)。
// barrel から tenant_id 保有テーブルを列挙し、(1) 除外宣言 TENANT_SCOPE_EXEMPT との突合、
// (2) 2-tenant fixture (分離テストの seed 経路) が全対象テーブルを覆っているか、を fail-closed で検査する。
// 新テーブル追加時に fixture/宣言が未追随なら CI が落ちる。

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getTableColumns } from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';
import { coreTables, TENANT_SCOPE_EXEMPT } from '../schema/index';

const PKG_ROOT = join(import.meta.dirname, '..');

function fail(message: string): never {
  console.error(`[check:tenant-isolation-coverage] NG: ${message}`);
  process.exit(1);
}

const scoped: string[] = [];
const unscoped: string[] = [];
for (const [name, table] of Object.entries(coreTables)) {
  const hasTenantId = Object.values(getTableColumns(table) as Record<string, SQLiteColumn>).some(
    (c) => c.name === 'tenant_id',
  );
  (hasTenantId ? scoped : unscoped).push(name);
}

// (1) 除外宣言との突合 (宣言漏れ・宣言過剰の双方を検出)
const undeclared = unscoped.filter((name) => !(name in TENANT_SCOPE_EXEMPT));
if (undeclared.length > 0) {
  fail(`tenant_id が無いのに TENANT_SCOPE_EXEMPT 未宣言: ${undeclared.join(', ')}`);
}
const stale = Object.keys(TENANT_SCOPE_EXEMPT).filter((name) => scoped.includes(name));
if (stale.length > 0) {
  fail(`tenant_id を持つのに除外宣言されている: ${stale.join(', ')}`);
}
const unknown = Object.keys(TENANT_SCOPE_EXEMPT).filter((name) => !(name in coreTables));
if (unknown.length > 0) {
  fail(`存在しないテーブルへの除外宣言: ${unknown.join(', ')}`);
}

// (2) 分離テストの seed 経路 (2-tenant fixture) が全 scoped テーブルへ触れているか。
// fixture は挿入をリポジトリ層経由で行うため、テーブルごとの schema シンボル参照を静的に確認する。
const fixtureSource = readFileSync(join(PKG_ROOT, '__tests__', 'fixtures', 'two-tenants.ts'), 'utf8');
const isolationSource = readFileSync(join(PKG_ROOT, '__tests__', 'tenant-isolation.test.ts'), 'utf8');
if (!isolationSource.includes('coreTables')) {
  fail('tenant-isolation.test.ts が coreTables を列挙していません (スキーマ駆動が壊れています)');
}
const SYMBOL_BY_TABLE: Record<string, string> = {
  idp_connections: 'createIdpConnectionsRepo',
  workspaces: 'workspaces',
  users: 'createUsersRepo',
  projects: 'projects',
  target_channels: 'createTargetChannelsRepo',
  releases: 'createReleasesRepo',
  deployment_references: 'deploymentReferences',
  catalog_entries: 'catalogEntries',
  publish_requests: 'publishRequests',
  publisher_tokens: 'publisherTokens',
  device_authorizations: 'deviceAuthorizations',
  audit_events: 'createAuditRepo',
  session_revocations: 'createSessionRevocationsRepo',
  idempotency_ledger: 'createIdempotencyLedgerRepo',
};
const uncovered = scoped.filter((name) => {
  const symbol = SYMBOL_BY_TABLE[name];
  return symbol === undefined || !fixtureSource.includes(symbol);
});
if (uncovered.length > 0) {
  fail(
    `2-tenant fixture が seed していない tenant-scoped テーブル: ${uncovered.join(', ')}\n` +
      '  → __tests__/fixtures/two-tenants.ts へ seed を追加し、SYMBOL_BY_TABLE を更新すること',
  );
}

console.log(
  `[check:tenant-isolation-coverage] OK: scoped=${scoped.length} / exempt=${unscoped.length} (宣言一致) / fixture 網羅 ${scoped.length}/${scoped.length}`,
);
