// packages/db の公開 API。**境界と型のみ**を公開し、テーブル定義 (スキーマ実体) は持たない。
// スキーマ実体は feat-domain-model-db の責務 (architecture-decision-record.md §3 / §9)。

export { type DrizzleSchema, type QueryFilter } from './drizzle';

export {
  type Page,
  type PageRequest,
  type QueryCriteria,
  type RepositoryContext,
  type SortDirection,
  type SortSpec,
} from './types';

export { createRepositoryContext, type RepositoryContextInput } from './context';

export {
  DriverNotSupportedError,
  EntityNotFoundError,
  RepositoryError,
  type RepositoryErrorCode,
} from './errors';

export {
  DATABASE_DRIVERS,
  assertSupportedDriver,
  isDatabaseDriver,
  isTransactionalAdapter,
  type DatabaseAdapter,
  type DatabaseDriver,
  type TransactionalAdapter,
} from './adapter';

export {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  defineRepositoryFactory,
  emptyPage,
  normalizePageRequest,
  type ReadOnlyRepository,
  type Repository,
  type RepositoryFactory,
} from './repository';
