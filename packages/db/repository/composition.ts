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

import { createTenantDataRegistry, type TenantDataBucketLike } from '../registry/tenant-data';
import { deploymentReferences, projects } from '../schema/core/catalog';
import { type AuditRepo, createAuditRepo } from './audit';
import {
  type BuildBoardColumnRows as BuildBoardColumnRowsShape,
  type BuildStageEventRow as BuildStageEventRowShape,
  type BuildStageRepository as BuildStageRepositoryShape,
  createBuildStageRepository as createBuildStageRepositoryLeaf,
  InvalidStageTransitionError as InvalidStageTransitionErrorLeaf,
  PublishRequestNotPublishedError as PublishRequestNotPublishedErrorLeaf,
  StageCasConflictError as StageCasConflictErrorLeaf,
  type StageTransitionResult as StageTransitionResultShape,
  type TransitionStageInput as TransitionStageInputShape,
} from './build-stage';
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
  createDocsCmsRepository as createDocsCmsRepositoryLeaf,
  type DocsCmsRepository as DocsCmsRepositoryShape,
  type DocumentRow as DocumentRowShape,
} from './docs-cms';
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
  createMetricsTrackingRepository as createMetricsTrackingRepositoryLeaf,
  type IngestMetricsEventInput as IngestMetricsEventInputShape,
  type IngestMetricsEventResult as IngestMetricsEventResultShape,
  type ListEventsForPeriodInput as ListEventsForPeriodInputShape,
  type ListRollupsInput as ListRollupsInputShape,
  type MetricsBreakdownEntry as MetricsBreakdownEntryShape,
  type MetricsEventRow as MetricsEventRowShape,
  MetricsIdempotencyKeyReuseError as MetricsIdempotencyKeyReuseErrorLeaf,
  type MetricsRollupRow as MetricsRollupRowShape,
  type MetricsSummary as MetricsSummaryShape,
  type MetricsTotals as MetricsTotalsShape,
  type MetricsTrackingRepository as MetricsTrackingRepositoryShape,
  type MetricsTrendPoint as MetricsTrendPointShape,
  type SummarizeInput as SummarizeInputShape,
  type UpsertRollupInput as UpsertRollupInputShape,
} from './metrics-tracking';
import {
  createIdempotencyLedgerRepo,
  createSessionRevocationsRepo,
  type IdempotencyLedgerRepo,
  type SessionRevocationsRepo,
} from './misc';
import {
  createNotionIntegrationRepo,
  type NotionIntegrationRepo,
  type NotionIntegrationRow as NotionIntegrationRowShape,
  type UpsertNotionIntegrationInput as UpsertNotionIntegrationInputShape,
} from './notion-integration';
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
import type {
  SmokeFixtureKind as SmokeFixtureKindShape,
  SmokeFixtureLifecycle as SmokeFixtureLifecycleShape,
  SmokeTenantSweepCandidate as SmokeTenantSweepCandidateShape,
} from './smoke-lifecycle';
import {
  createTenantDataRepo,
  type TenantDataListInput as TenantDataListInputShape,
  type TenantDataObjectPage as TenantDataObjectPageShape,
  type TenantDataObjectRow as TenantDataObjectRowShape,
  type TenantDataRepo,
  type TenantDataUploadInput as TenantDataUploadInputShape,
} from './tenant-data';
import { createTenantsRepo, type TenantRow as TenantRowShape, type TenantsRepo } from './tenants';
import {
  createUserSettingsRepo,
  type UserSettingsRepo,
  type UserSettingsRow as UserSettingsRowShape,
} from './user-settings';
import { createUsersRepo, type UserRow as UserRowShape, type UsersRepo } from './users';
import { createUserWorkspacesRepo, type UserWorkspacesRepo } from './workspaces';

// 公開する行の型。leaf module の型と同一の実体で、alias は「公開する名前をここが決める」ことの表明。
// 行の型は列の集合そのものなので公開する。**列の値域 (enum) は公開しない** — 値域は zod 側が持つ。
export type TenantRow = TenantRowShape;
export type UserRow = UserRowShape;
export type UserSettingsRow = UserSettingsRowShape;
export type IdpConnectionRow = IdpConnectionRowShape;
export type DeviceAuthorizationRow = DeviceAuthorizationRowShape;
export type PublisherTokenRow = PublisherTokenRowShape;
export type AiJobRow = AiJobRowShape;
export type HearingSheetRow = HearingSheetRowShape;
export type TenantCoefficientRow = TenantCoefficientRowShape;
export type HearingIntakeRepository = HearingIntakeRepositoryShape;
export type DocsCmsRepository = DocsCmsRepositoryShape;
export type DocumentRow = DocumentRowShape;
export type FeedbackRow = FeedbackRowShape;
export type FeedbackRepository = FeedbackRepositoryShape;
export type BuildRow = BuildRowShape;
export type BuildsRepository = BuildsRepositoryShape;
// feat-build-pipeline-board。工程遷移は行の型と入出力の型だけを公開し、
// 工程の値域 (BUILD_STAGES) は zod (@harness-hub/schemas) 側の単一ソースに残す。
export type BuildStageEventRow = BuildStageEventRowShape;
export type BuildStageRepository = BuildStageRepositoryShape;
export type TransitionStageInput = TransitionStageInputShape;
export type StageTransitionResult = StageTransitionResultShape;
export type BuildBoardColumnRows = BuildBoardColumnRowsShape;
// feat-metrics-tracking。period/dimension の値域も同じ理由で公開しない。
export type MetricsEventRow = MetricsEventRowShape;
export type MetricsRollupRow = MetricsRollupRowShape;
export type MetricsTrackingRepository = MetricsTrackingRepositoryShape;
export type IngestMetricsEventInput = IngestMetricsEventInputShape;
export type IngestMetricsEventResult = IngestMetricsEventResultShape;
export type ListEventsForPeriodInput = ListEventsForPeriodInputShape;
export type UpsertRollupInput = UpsertRollupInputShape;
export type ListRollupsInput = ListRollupsInputShape;
export type SummarizeInput = SummarizeInputShape;
export type MetricsTotals = MetricsTotalsShape;
export type MetricsTrendPoint = MetricsTrendPointShape;
export type MetricsBreakdownEntry = MetricsBreakdownEntryShape;
export type MetricsSummary = MetricsSummaryShape;
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
// 中断後の fixture 回収 (HarnessHub-aauo) は smoke runner 側が主導するので、lease 値の
// 生成・検証もアプリ層から使える必要がある。schema は渡さず値の形だけを公開する。
export type SmokeFixtureKind = SmokeFixtureKindShape;
export type SmokeFixtureLifecycle = SmokeFixtureLifecycleShape;
export type SmokeTenantSweepCandidate = SmokeTenantSweepCandidateShape;
export {
  createSmokeFixtureLifecycle,
  DEFAULT_SMOKE_FIXTURE_TTL_MINUTES,
  isSweepableSmokeFixture,
  normalizeSmokeRunId,
  parseSmokeFixtureTtlMinutes,
  SMOKE_FIXTURE_KINDS,
} from './smoke-lifecycle';
export type TenantDataObjectRow = TenantDataObjectRowShape;
export type TenantDataUploadInput = TenantDataUploadInputShape;
export type TenantDataListInput = TenantDataListInputShape;
export type TenantDataObjectPage = TenantDataObjectPageShape;
export type { TenantDataRepo };
// feat-notion-integration。mode の値域は zod 側 (@harness-hub/schemas) が単一ソースを持つため、
// ここでは行の型と入出力の型だけを公開する (他 studio extension と同じ理由)。
export type NotionIntegrationRow = NotionIntegrationRowShape;
export type UpsertNotionIntegrationInput = UpsertNotionIntegrationInputShape;
export type { NotionIntegrationRepo };

/** Studio feature も leaf factory を直接公開せず、この facade からだけ組み立てる。 */
export function createHearingIntakeRepository(adapter: CoreAdapter): HearingIntakeRepository {
  return createHearingIntakeRepositoryLeaf(adapter);
}

/** Studio S15/B7 (docs-cms) も同じ facade 経由の原則に従う。 */
export function createDocsCmsRepository(adapter: CoreAdapter): DocsCmsRepository {
  return createDocsCmsRepositoryLeaf(adapter);
}

/** feat-feedback-loop も同じ理由でこの facade からだけ組み立てる。 */
export function createFeedbackRepository(adapter: CoreAdapter): FeedbackRepository {
  return createFeedbackRepositoryLeaf(adapter);
}

/** `builds` も同じ理由でこの facade からだけ組み立てる (ADR §7 P10 差し戻し再設計)。 */
export function createBuildsRepository(adapter: CoreAdapter): BuildsRepository {
  return createBuildsRepositoryLeaf(adapter);
}

/** 工程遷移 (build_stage_events) も同じ理由でこの facade からだけ組み立てる。 */
export function createBuildStageRepository(adapter: CoreAdapter): BuildStageRepository {
  return createBuildStageRepositoryLeaf(adapter);
}

/** feat-metrics-tracking も同じ理由でこの facade からだけ組み立てる。 */
export function createMetricsTrackingRepository(adapter: CoreAdapter): MetricsTrackingRepository {
  return createMetricsTrackingRepositoryLeaf(adapter);
}

// 工程遷移の失敗理由はアプリ層が HTTP status へ写す必要があるため、error class だけは公開する
// (値域 enum とは違い、これは「境界での分岐に必要な型」であって二重定義にならない)。
export const InvalidStageTransitionError = InvalidStageTransitionErrorLeaf;
export const StageCasConflictError = StageCasConflictErrorLeaf;
export const PublishRequestNotPublishedError = PublishRequestNotPublishedErrorLeaf;
export const MetricsIdempotencyKeyReuseError = MetricsIdempotencyKeyReuseErrorLeaf;

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
  readonly userSettings: UserSettingsRepo;
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
    userSettings: createUserSettingsRepo(adapter),
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

export interface TenantDataRepositoryInput extends CoreRepositoriesInput {
  /** feat-tenant-data-retention 専用の R2 bucket (AD-3: PackageRegistry とはバケットを分離)。 */
  readonly bucket: TenantDataBucketLike;
}

/**
 * tenant_data の repository を組む facade。`createCoreRepositories` から独立させているのは、
 * こちらだけが R2 bucket (DB 外の依存) を要求するため — `CoreRepositoriesInput` へ bucket を混ぜると
 * bucket を持たない既存呼び出し元 (hearing-intake 等) にまで無関係な依存を強制してしまう。
 * cipher を共有しないのも同じ理由 (別の合成単位): tenant_data の DEK は purpose 別に独立して
 * 管理される (AD-1) ため、`createCoreRepositories` 側の cipher と同居させる必然性が無い。
 */
export function createTenantDataRepository(input: TenantDataRepositoryInput): TenantDataRepo {
  const cipher = new ColumnCipher(input.adapter, input.kekBase64);
  return createTenantDataRepo(
    input.adapter,
    cipher,
    createTenantDataRegistry(input.bucket),
    createAuditRepo(input.adapter),
  );
}

/**
 * notion_integrations の repository を組む facade。`createTenantDataRepository` と同じ理由
 * (R2 の有無は関係ないが、`createCoreRepositories` の合成単位を素通りさせず独立した専用鍵経路にする)
 * で `CoreRepositoriesInput` を受けて cipher を自前で組む。api_key の暗号化 purpose は
 * `'tenant_data'` を再利用する (security-spec §4.1: purpose を無闇に増やさない)。
 */
export function createNotionIntegrationRepository(input: CoreRepositoriesInput): NotionIntegrationRepo {
  const cipher = new ColumnCipher(input.adapter, input.kekBase64);
  return createNotionIntegrationRepo(input.adapter, cipher);
}
