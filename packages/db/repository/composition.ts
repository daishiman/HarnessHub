/**
 * repository 層の**公開面**。`packages/db/src/index.ts` が外へ出すのはこの file の名前だけ。
 *
 * なぜ leaf module (`./users` 等) を index から直接 re-export しないか:
 *
 *   1. leaf を index から辿らせると、その file の **全ての export** が公開 API になる。
 *      `./users` を 1 名だけ re-export したつもりでも `UserStatus` / `UserRole` まで公開扱いになり、
 *      値域の単一ソースである `@harness-hub/schemas` (zod) と二重定義になる。
 *      同じことが `./device-flow` の `DeviceAuthorizationStatus` と hub の port 型の間でも起きる。
 *      `scripts/ci/check-shared-layer-duplicates.mjs` の検出 1 が落とすのはこの状態。
 *   2. 呼び出し側 (合成点) が欲しいのは「repository を 1 式まとめて」であって、
 *      factory を 8 個ずつ順番に呼ぶ手順ではない。並べて呼ぶ形にすると
 *      cipher を渡し忘れた repository が 1 つ混ざっても型は通ってしまう。
 *
 * よって **値域 enum は公開しない**。行の型 (`UserRow` 等) だけを alias として再宣言し、
 * 公開する名前をこの file が明示的に持つ。
 *
 * KEK (`kekBase64`) を受け取って `ColumnCipher` をここで作るのも意図的。cipher を外で作らせると
 * 暗号化列の鍵を扱う層が package の外へ増える。外へ出すのは「鍵の文字列」ではなく「鍵を渡す 1 箇所」。
 */

import { deploymentReferences, projects } from '../schema/core/catalog';
import { type AuditRepo, createAuditRepo } from './audit';
import {
  type BuildRow as BuildRowShape,
  type BuildsRepository as BuildsRepositoryShape,
  createBuildsRepository as createBuildsRepositoryLeaf,
} from './builds';
import {
  createTargetChannelsRepo,
  type TargetChannelRow as TargetChannelRowShape,
  type TargetChannelsRepo,
} from './channels';
import { createScopedCrud, type ScopedCrudRepo } from './crud';
import { ColumnCipher } from './crypto';
import type { CoreAdapter } from './db';
import {
  createDeviceAuthorizationsRepo,
  createPublisherTokensRepo,
  type DeviceAuthorizationRow as DeviceAuthorizationRowShape,
  type DeviceAuthorizationsRepo,
  type PublisherTokenRow as PublisherTokenRowShape,
  type PublisherTokensRepo,
} from './device-flow';
import {
  createFeedbackRepository as createFeedbackRepositoryLeaf,
  type FeedbackRepository as FeedbackRepositoryShape,
  type FeedbackRow as FeedbackRowShape,
} from './feedback-loop';
import {
  type AiJobRow as AiJobRowShape,
  createHearingIntakeRepository as createHearingIntakeRepositoryLeaf,
  type HearingIntakeRepository as HearingIntakeRepositoryShape,
  type HearingSheetRow as HearingSheetRowShape,
  type TenantCoefficientRow as TenantCoefficientRowShape,
} from './hearing-intake';
import {
  createHearingSmokeDbProbe as createHearingSmokeDbProbeLeaf,
  type HearingSmokeDbProbe as HearingSmokeDbProbeShape,
  type HearingSmokeJobSnapshot as HearingSmokeJobSnapshotShape,
  type HearingSmokeSheetSnapshot as HearingSmokeSheetSnapshotShape,
  type HearingSmokeTenantFixture as HearingSmokeTenantFixtureShape,
} from './hearing-smoke';
import {
  createIdpConnectionsRepo,
  type IdpConnectionRow as IdpConnectionRowShape,
  type IdpConnectionsRepo,
} from './idp';
import {
  createIdempotencyLedgerRepo,
  createSessionRevocationsRepo,
  type IdempotencyLedgerRepo,
  type SessionRevocationsRepo,
} from './misc';
import { createPackagesRepo, type PackageRefRow as PackageRefRowShape, type PackagesRepo } from './packages';
import {
  createPublishRequestsRepo,
  type PublishRequestRow as PublishRequestRowShape,
  type PublishRequestsRepo,
} from './publish-requests';
import {
  createPublishSmokeDbProbe as createPublishSmokeDbProbeLeaf,
  type PublishSmokeDbProbe as PublishSmokeDbProbeShape,
  type PublishSmokeEvidence as PublishSmokeEvidenceShape,
} from './publish-smoke';
import { createReleasesRepo, type ReleaseRow as ReleaseRowShape, type ReleasesRepo } from './releases';
import { createTenantsRepo, type TenantRow as TenantRowShape, type TenantsRepo } from './tenants';
import { createUsersRepo, type UserRow as UserRowShape, type UsersRepo } from './users';
import { createUserWorkspacesRepo, type UserWorkspacesRepo } from './workspaces';

// 公開する行の型。leaf module の型と同一の実体で、alias は「公開する名前をここが決める」ことの表明。
// 行の型は列の集合そのものなので公開する。**列の値域 (enum) は公開しない** — 値域は zod 側が持つ。
export type TenantRow = TenantRowShape;
export type UserRow = UserRowShape;
export type IdpConnectionRow = IdpConnectionRowShape;
export type DeviceAuthorizationRow = DeviceAuthorizationRowShape;
export type PublisherTokenRow = PublisherTokenRowShape;
export type AiJobRow = AiJobRowShape;
export type HearingSheetRow = HearingSheetRowShape;
export type TenantCoefficientRow = TenantCoefficientRowShape;
export type HearingIntakeRepository = HearingIntakeRepositoryShape;
export type FeedbackRow = FeedbackRowShape;
export type FeedbackRepository = FeedbackRepositoryShape;
export type BuildRow = BuildRowShape;
export type BuildsRepository = BuildsRepositoryShape;
export type PublishRequestRow = PublishRequestRowShape;
export type ReleaseRow = ReleaseRowShape;
export type TargetChannelRow = TargetChannelRowShape;
export type PackageRefRow = PackageRefRowShape;
export type PublishSmokeDbProbe = PublishSmokeDbProbeShape;
export type PublishSmokeEvidence = PublishSmokeEvidenceShape;
export type HearingSmokeDbProbe = HearingSmokeDbProbeShape;
export type HearingSmokeTenantFixture = HearingSmokeTenantFixtureShape;
export type HearingSmokeSheetSnapshot = HearingSmokeSheetSnapshotShape;
export type HearingSmokeJobSnapshot = HearingSmokeJobSnapshotShape;

/** Studio feature も leaf factory を直接公開せず、この facade からだけ組み立てる。 */
export function createHearingIntakeRepository(adapter: CoreAdapter): HearingIntakeRepository {
  return createHearingIntakeRepositoryLeaf(adapter);
}

/** feat-feedback-loop も同じ理由でこの facade からだけ組み立てる。 */
export function createFeedbackRepository(adapter: CoreAdapter): FeedbackRepository {
  return createFeedbackRepositoryLeaf(adapter);
}

/** `builds` も同じ理由でこの facade からだけ組み立てる (ADR §7 P10 差し戻し再設計)。 */
export function createBuildsRepository(adapter: CoreAdapter): BuildsRepository {
  return createBuildsRepositoryLeaf(adapter);
}

/** P13 smoke の schema 非公開 DB probe。アプリ層に table 定義を渡さない。 */
export function createPublishSmokeDbProbe(adapter: CoreAdapter): PublishSmokeDbProbe {
  return createPublishSmokeDbProbeLeaf(adapter);
}

/** feat-hearing-intake P13 smoke の schema 非公開 DB probe。同上の理由でこの facade を通す。 */
export function createHearingSmokeDbProbe(adapter: CoreAdapter): HearingSmokeDbProbe {
  return createHearingSmokeDbProbeLeaf(adapter);
}

/**
 * core schema の repository 一式。
 * 追加するときは必ずここへ足す — 合成点が leaf factory を直接呼ぶ経路を作らないため。
 */
export interface CoreRepositories {
  readonly tenants: TenantsRepo;
  readonly users: UsersRepo;
  readonly userWorkspaces: UserWorkspacesRepo;
  readonly idpConnections: IdpConnectionsRepo;
  readonly sessionRevocations: SessionRevocationsRepo;
  readonly deviceAuthorizations: DeviceAuthorizationsRepo;
  readonly publisherTokens: PublisherTokensRepo;
  readonly audit: AuditRepo;
  // ---- publish pipeline 系 (ADR AD-9)。factory は既存だったが合成点から到達できなかったため追加。
  readonly publishRequests: PublishRequestsRepo;
  readonly releases: ReleasesRepo;
  readonly channels: TargetChannelsRepo;
  readonly packages: PackagesRepo;
  readonly idempotency: IdempotencyLedgerRepo;
  /**
   * projects は owner_user_id を認可資源へ投影するためにも使う。
   * tenant 条件を必ず注入する汎用 scoped CRUD へ閉じ、route から schema を直接読ませない。
   */
  readonly projects: ScopedCrudRepo;
  /**
   * deployment_references は id PK + tenant_id を持つ素直な表なので汎用 scoped CRUD で足りる。
   * 専用 repository を足さないのは、この表に固有の不変条件 (immutable / hash chain / CAS) が無いため。
   */
  readonly deploymentReferences: ScopedCrudRepo;
}

export interface CoreRepositoriesInput {
  readonly adapter: CoreAdapter;
  /**
   * 暗号化列 (`idp_connections.client_secret_enc` 等) の KEK。base64。
   * 本番では Workers Secret から渡す。file や環境変数へ平文で置かない。
   */
  readonly kekBase64: string;
}

/**
 * repository を 1 式作る。
 *
 * cipher は 1 つを共有する。repository ごとに作ると鍵導出 (KDF) が回数分走るうえ、
 * 「どの repository の cipher か」という区別が生まれてしまう (区別する理由は無い)。
 */
export function createCoreRepositories(input: CoreRepositoriesInput): CoreRepositories {
  const { adapter } = input;
  const cipher = new ColumnCipher(adapter, input.kekBase64);

  return {
    tenants: createTenantsRepo(adapter),
    users: createUsersRepo(adapter, cipher),
    userWorkspaces: createUserWorkspacesRepo(adapter),
    idpConnections: createIdpConnectionsRepo(adapter, cipher),
    sessionRevocations: createSessionRevocationsRepo(adapter),
    deviceAuthorizations: createDeviceAuthorizationsRepo(adapter),
    publisherTokens: createPublisherTokensRepo(adapter),
    audit: createAuditRepo(adapter),
    publishRequests: createPublishRequestsRepo(adapter),
    releases: createReleasesRepo(adapter),
    channels: createTargetChannelsRepo(adapter),
    packages: createPackagesRepo(adapter),
    idempotency: createIdempotencyLedgerRepo(adapter),
    projects: createScopedCrud(adapter, projects),
    deploymentReferences: createScopedCrud(adapter, deploymentReferences),
  };
}
