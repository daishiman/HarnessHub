// 単一 migration lineage の入力となる schema barrel (ADR §8)。
// drizzle.config.ts はこのファイルだけを schema 入力とする。
//
// Studio 拡張 feature は各自の write_scope `packages/db/schema/{studio-feature}/` にテーブルを定義し、
// この barrel へ `export * from './{studio-feature}/...'` を 1 行追加することで
// 同一 lineage へ統合される (barrel は re-export のみを行い、内容は編集しない)。

import { getTableName } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import * as buildPipeline from './build-pipeline/schema';
import * as builds from './builds/schema';
import * as catalog from './core/catalog';
import * as identity from './core/identity';
import * as publish from './core/publish';
import * as security from './core/security';
import * as smoke from './core/smoke';
import * as docsCms from './docs-cms/schema';
import * as feedbackLoop from './feedback-loop/schema';
import * as hearingIntake from './hearing-intake/schema';
import * as metricsTracking from './metrics-tracking/schema';
import * as mutationSafety from './mutation-safety/schema';
import * as notionIntegration from './notion-integration/schema';
import * as tenantData from './tenant-data/schema';
import * as tenantDataTombstones from './tenant-data/tombstones';

// --- studio extensions (re-export のみ。各 feature が自身の write_scope から追加する) ---
export * from './build-pipeline/schema';
export * from './builds/schema';
export * from './core/catalog';
export * from './core/identity';
export * from './core/publish';
export * from './core/scope';
export * from './core/security';
export * from './core/smoke';
export * from './docs-cms/schema';
export * from './feedback-loop/schema';
export * from './hearing-intake/schema';
export * from './metrics-tracking/schema';
export * from './mutation-safety/schema';
export * from './notion-integration/schema';
export * from './tenant-data/schema';
export * from './tenant-data/tombstones';

/** コアドメイン 20 テーブルの一覧 (分離テスト・網羅チェックが共用する単一ソース)。 */
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
      smoke.smokeFixtureLeases,
    ].map((table) => [getTableName(table), table]),
  ),
);

/** Studio extension の一覧。core の 20 件とは分け、全体検査では allTables を使う。 */
export const studioTables: Readonly<Record<string, SQLiteTable>> = Object.freeze(
  Object.fromEntries(
    [
      hearingIntake.hearingSheets,
      hearingIntake.aiJobs,
      hearingIntake.displayCodeCounters,
      hearingIntake.hearingScreenshots,
      hearingIntake.hearingShareTokens,
      hearingIntake.tenantCoefficients,
      tenantData.tenantDataObjects,
      tenantDataTombstones.tenantDataTombstones,
      notionIntegration.notionIntegrations,
      docsCms.documents,
      feedbackLoop.feedbacks,
      builds.builds,
      buildPipeline.buildStageEvents,
      metricsTracking.metricsEvents,
      metricsTracking.metricsRollups,
      mutationSafety.mutationCreateIdempotency,
    ].map((table) => [getTableName(table), table]),
  ),
);

/** migration / tenant 分離ゲートが参照する全テーブルの単一ソース。 */
export const allTables: Readonly<Record<string, SQLiteTable>> = Object.freeze({
  ...coreTables,
  ...studioTables,
});
