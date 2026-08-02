// packages/db の公開 API。**境界と型のみ**を公開し、テーブル定義 (スキーマ実体) は持たない。
// スキーマ実体は feat-domain-model-db の責務 (architecture-decision-record.md §3 / §9)。
//
// repository / connection の実体も **ここから**取る。`@harness-hub/db/repository` のような
// subpath 直参照は `scripts/ci/check-shared-layer-duplicates.mjs` が「境界迂回 (deep import)」として落とす
// (公開 API の集計入口を index 1 枚に固定するための規則)。
//
// repository は leaf module (`../repository/users` 等) を直接 re-export せず、
// `../repository/composition` の facade だけを出す。理由はその file の冒頭コメントにある
// (leaf を辿らせると値域 enum まで公開 API になり、zod 単一ソースと二重定義になる)。

// DDL 適用ヘルパ。空 DB へ canonical migration を流す経路 (restore drill / 統合テストの足場) を
// **driver に触らせずに**提供するために公開する。consumer が自前で sqlite を開くと
// packages/db/scripts/check-connection-layer-isolation.ts が落ちる — それが正しい設計の表明なので、
// 迂回させるのではなく必要な能力をここから出す。
export { applyDdlStatements, splitMigrationSql } from '../backup/ddl';
export { createTursoClient, createTursoWebClient } from '../connection/turso';
// R2 PackageRegistry。consumer (feat-publish-pipeline の package upload) は
// `@harness-hub/db/registry` の subpath ではなく必ずこの入口から取る —
// subpath 直参照は detector が boundary-bypass-deep-import として落とす。
export {
  createPackageRegistry,
  type PackageRegistry,
  type PutPackageResult,
  packageR2Key,
  type R2BucketLike,
} from '../registry/index';
export {
  type AiJobRow,
  type CoreRepositories,
  type CoreRepositoriesInput,
  createCoreRepositories,
  createHearingIntakeRepository,
  createHearingSmokeDbProbe,
  createPublishSmokeDbProbe,
  type DeviceAuthorizationRow,
  type HearingIntakeRepository,
  type HearingSheetRow,
  type HearingSmokeDbProbe,
  type HearingSmokeJobSnapshot,
  type HearingSmokeSheetSnapshot,
  type HearingSmokeTenantFixture,
  type IdpConnectionRow,
  type PublisherTokenRow,
  type PublishSmokeDbProbe,
  type PublishSmokeEvidence,
  type TenantCoefficientRow,
  type TenantRow,
  type UserRow,
} from '../repository/composition';
export {
  assertSupportedDriver,
  DATABASE_DRIVERS,
  type DatabaseAdapter,
  type DatabaseDriver,
  isDatabaseDriver,
  isTransactionalAdapter,
  type TransactionalAdapter,
  type WriteConcurrencyScope,
} from './adapter';
export { createRepositoryContext, type RepositoryContextInput } from './context';
export type { DrizzleSchema, QueryFilter } from './drizzle';

export {
  ConnectionPoisonedError,
  DriverNotSupportedError,
  EntityNotFoundError,
  RepositoryError,
  type RepositoryErrorCode,
} from './errors';
// 接続が壊れたときの判定述語。アプリ層が「再試行して良い競合」と「接続を作り直すべき故障」を
// 見分けるために必要 (毒エラーは drizzle に包まれるので instanceof だけでは判らない)。
export { isConnectionPoisoned, isLockConflict } from './lock-conflict';
export {
  DEFAULT_PAGE_SIZE,
  defineRepositoryFactory,
  emptyPage,
  MAX_PAGE_SIZE,
  normalizePageRequest,
  type ReadOnlyRepository,
  type Repository,
  type RepositoryFactory,
} from './repository';
export type {
  Page,
  PageRequest,
  QueryCriteria,
  RepositoryContext,
  SortDirection,
  SortSpec,
} from './types';
