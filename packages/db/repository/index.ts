// リポジトリ層の公開面 (qa-020: DB アクセスはこの層に閉じる)。
// 全 tenant-scoped 関数は RepositoryContext を第 1 引数に取り、WHERE tenant_id を強制注入する。

export {
  type AuditEventInput,
  type AuditEventRow,
  type AuditRepo,
  computeEventHash,
  createAuditRepo,
  GENESIS_HASH,
} from './audit';
export { canonicalJson, sha256Hex } from './bytes';
export { createTargetChannelsRepo, type TargetChannelRow, type TargetChannelsRepo } from './channels';
export { createScopedCrud, type ScopedCrudRepo } from './crud';
export {
  ColumnCipher,
  type ColumnRef,
  ENCRYPTED_COLUMN_PATTERN,
  EncryptionError,
  type EncryptionPurpose,
} from './crypto';
export type { CoreAdapter, CoreDb, CoreSchema } from './db';
export { createIdpConnectionsRepo, type IdpConnectionRow, type IdpConnectionsRepo } from './idp';
export {
  createIdempotencyLedgerRepo,
  createSessionRevocationsRepo,
  type IdempotencyLedgerRepo,
  type IdempotencyRecord,
  type SessionRevocationsRepo,
} from './misc';
export { createPackagesRepo, type PackageRefRow, type PackagesRepo } from './packages';
export {
  type CreateReleaseInput,
  createReleasesRepo,
  type ReleaseRow,
  type ReleaseStatus,
  type ReleasesRepo,
} from './releases';
export { createTenantsRepo, type TenantRow, type TenantsRepo } from './tenants';
export { serverNow } from './time';
export { isUlid, newUlid, ULID_PATTERN } from './ulid';
export {
  createUsersRepo,
  type InsertUserInput,
  type UpdateUserInput,
  type UserRole,
  type UserRow,
  type UserStatus,
  type UsersRepo,
} from './users';
