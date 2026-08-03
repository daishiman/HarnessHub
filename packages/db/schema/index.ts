// 単一 migration lineage の入力となる schema barrel (ADR §8)。
// drizzle.config.ts はこのファイルだけを schema 入力とする。
//
// Studio 拡張 feature は各自の write_scope `packages/db/schema/{studio-feature}/` にテーブルを定義し、
// この barrel へ `export * from './{studio-feature}/...'` を 1 行追加することで
// 同一 lineage へ統合される (barrel は re-export のみを行い、内容は編集しない)。

import { getTableName } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import * as catalog from './core/catalog';
import * as identity from './core/identity';
import * as publish from './core/publish';
import * as security from './core/security';
import * as docsCms from './docs-cms/schema';
import * as hearingIntake from './hearing-intake/schema';
import * as tenantData from './tenant-data/schema';
import * as tenantDataTombstones from './tenant-data/tombstones';

export * from './core/catalog';
export * from './core/identity';
export * from './core/publish';
export * from './core/scope';
export * from './core/security';

// --- studio extensions (re-export のみ。各 feature が自身の write_scope から追加する) ---
export * from './docs-cms/schema';
export * from './hearing-intake/schema';
export * from './tenant-data/schema';
export * from './tenant-data/tombstones';

/** コアドメイン 19 テーブルの一覧 (分離テスト・網羅チェックが共用する単一ソース)。 */
export const coreTables: Readonly<Record<string, SQLiteTable>> = Object.freeze(
  Object.fromEntries(
    [
      identity.tenants,
      identity.idpConnections,
      identity.workspaces,
      identity.users,
      identity.userWorkspaces,
      identity.userSettings,
      catalog.projects,
      catalog.targetChannels,
      catalog.releases,
      catalog.packages,
      catalog.deploymentReferences,
      catalog.catalogEntries,
      publish.publishRequests,
      publish.publisherTokens,
      publish.deviceAuthorizations,
      publish.idempotencyLedger,
      security.auditEvents,
      security.encryptionKeys,
      security.sessionRevocations,
    ].map((table) => [getTableName(table), table]),
  ),
);

/** Studio extension の一覧。core の 19 件とは分け、全体検査では allTables を使う。 */
export const studioTables: Readonly<Record<string, SQLiteTable>> = Object.freeze(
  Object.fromEntries(
    [
      hearingIntake.hearingSheets,
      hearingIntake.aiJobs,
      hearingIntake.displayCodeCounters,
      hearingIntake.tenantCoefficients,
      tenantData.tenantDataObjects,
      tenantDataTombstones.tenantDataTombstones,
      docsCms.documents,
    ].map((table) => [getTableName(table), table]),
  ),
);

/** migration / tenant 分離ゲートが参照する全テーブルの単一ソース。 */
export const allTables: Readonly<Record<string, SQLiteTable>> = Object.freeze({
  ...coreTables,
  ...studioTables,
});
