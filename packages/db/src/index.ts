// packages/db の公開 API。**境界と型のみ**を公開し、テーブル定義 (スキーマ実体) は持たない。
// スキーマ実体は feat-domain-model-db の責務 (architecture-decision-record.md §3 / §9)。

export {
  assertSupportedDriver,
  DATABASE_DRIVERS,
  type DatabaseAdapter,
  type DatabaseDriver,
  isDatabaseDriver,
  isTransactionalAdapter,
  type TransactionalAdapter,
} from './adapter';
export { createRepositoryContext, type RepositoryContextInput } from './context';
export type { DrizzleSchema, QueryFilter } from './drizzle';

export {
  DriverNotSupportedError,
  EntityNotFoundError,
  RepositoryError,
  type RepositoryErrorCode,
} from './errors';
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
