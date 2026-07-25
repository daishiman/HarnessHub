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

export * from './core/catalog';
export * from './core/identity';
export * from './core/publish';
export * from './core/scope';
export * from './core/security';

// --- studio extensions (re-export のみ。各 feature が自身の write_scope から追加する) ---
// 例: export * from './hearing-intake/schema';

/** コアドメイン 18 テーブルの一覧 (export・分離テスト・網羅チェックが共用する単一ソース)。 */
export const coreTables: Readonly<Record<string, SQLiteTable>> = Object.freeze(
  Object.fromEntries(
    [
      identity.tenants,
      identity.idpConnections,
      identity.workspaces,
      identity.users,
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
