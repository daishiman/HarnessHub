/**
 * feat-dual-catalog-web が所有する契約 schema の公開入口。
 *
 * consumer は `@harness-hub/schemas` (root entry) 経由で参照する。
 * subpath deep import は共通層 detector が `boundary-bypass-deep-import` として弾くため、
 * root からの再エクスポートが唯一の正式経路になる (auth-tenancy / publish-pipeline と同じ扱い)。
 *
 * 業務ドメイン固有の契約なので `contract-registry.ts` (OpenAPI drift 検査の入力) には登録しない。
 */

export type {
  CatalogDetail,
  CatalogEntry,
  CatalogListQuery,
  CatalogListResponse,
  InstallDescriptor,
} from './catalog.js';
export {
  catalogDetailSchema,
  catalogEntrySchema,
  catalogListQuerySchema,
  catalogListResponseSchema,
  installDescriptorSchema,
} from './catalog.js';
export type { MarketplaceDocument, MarketplacePlugin } from './marketplace.js';
export { marketplaceDocumentSchema, marketplaceOwnerSchema, marketplacePluginSchema } from './marketplace.js';
export type { CatalogFailureKind, CatalogSourceStatus } from './primitives.js';
export { catalogFailureKindSchema, catalogSourceStatusSchema } from './primitives.js';
