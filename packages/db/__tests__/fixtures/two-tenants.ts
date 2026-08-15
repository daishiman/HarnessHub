// 2 テナント完全 fixture (DMDB-T03/T06/T12 / security-spec §8.4)。
// tenant A / B の双方で全 tenant-scoped テーブルに行を作る。seed は原則リポジトリ層経由で行い、
// 「全エンティティの CRUD が接続層越しに動作する」ことを fixture 構築自体が検証する。
// 新テーブル追加時にこの fixture が未追随なら tenant-isolation.test.ts が fail する (スキーマ駆動)。

import { createAuditRepo } from '../../repository/audit';
import { createBuildStageRepository } from '../../repository/build-stage';
import { createBuildsRepository } from '../../repository/builds';
import { sha256Hex } from '../../repository/bytes';
import { createTargetChannelsRepo } from '../../repository/channels';
import { createScopedCrud } from '../../repository/crud';
import type { ColumnCipher } from '../../repository/crypto';
import type { CoreAdapter } from '../../repository/db';
import { createDocsCmsRepository } from '../../repository/docs-cms';
import { createFeedbackRepository } from '../../repository/feedback-loop';
import { createHearingIntakeRepository } from '../../repository/hearing-intake';
import { createHearingShareTokensRepo } from '../../repository/hearing-share-tokens';
import { createIdpConnectionsRepo } from '../../repository/idp';
import { createMetricsTrackingRepository } from '../../repository/metrics-tracking';
import { createIdempotencyLedgerRepo, createSessionRevocationsRepo } from '../../repository/misc';
import { createNotionIntegrationRepo } from '../../repository/notion-integration';
import { createPackagesRepo } from '../../repository/packages';
import { createReleasesRepo } from '../../repository/releases';
import { createTenantsRepo } from '../../repository/tenants';
import { newUlid } from '../../repository/ulid';
import { createUsersRepo } from '../../repository/users';
import { createUserWorkspacesRepo } from '../../repository/workspaces';
import { catalogEntries, deploymentReferences, projects } from '../../schema/core/catalog';
import { userSettings, workspaces } from '../../schema/core/identity';
import { deviceAuthorizations, publisherTokens, publishRequests } from '../../schema/core/publish';
import { smokeFixtureLeases } from '../../schema/core/smoke';
import { hearingScreenshots, tenantCoefficients } from '../../schema/hearing-intake/schema';
import { tenantDataObjects } from '../../schema/tenant-data/schema';
import { tenantDataTombstones } from '../../schema/tenant-data/tombstones';
import { createRepositoryContext } from '../../src/context';
import type { RepositoryContext } from '../../src/types';

export interface TenantFixture {
  readonly context: RepositoryContext;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly projectId: string;
  readonly channelId: string;
  readonly releaseId: string;
  readonly salary: number;
}

export interface TwoTenantsFixture {
  readonly a: TenantFixture;
  readonly b: TenantFixture;
}

async function seedTenant(
  adapter: CoreAdapter,
  cipher: ColumnCipher,
  slug: string,
  salary: number,
): Promise<TenantFixture> {
  const tenants = createTenantsRepo(adapter);
  const tenant = await tenants.create({ slug, name: `Tenant ${slug}`, plan: 'free' });
  const context = createRepositoryContext({ tenantId: tenant.id });

  await adapter.client.insert(smokeFixtureLeases).values({
    tenantId: tenant.id,
    runId: `tenant-isolation-${slug}`,
    kind: 'database',
    expiresAt: Date.now() + 60_000,
    createdAt: Date.now(),
  });

  const idp = createIdpConnectionsRepo(adapter, cipher);
  await idp.insert(context, {
    issuerUrl: `https://idp.${slug}.example.com`,
    clientId: `client-${slug}`,
    clientSecret: `super-secret-${slug}`,
    scopes: 'openid email profile',
  });

  const workspacesRepo = createScopedCrud(adapter, workspaces);
  const workspace = await workspacesRepo.insert(context, { slug: `ws-${slug}`, name: `WS ${slug}` });
  const workspaceId = workspace.id as string;

  const users = createUsersRepo(adapter, cipher);
  const user = await users.insert(context, {
    idpSubject: `subject-${slug}`,
    email: `admin@${slug}.example.com`,
    name: `Admin ${slug}`,
    department: 'engineering',
    salary,
    role: 'workspace-admin',
    status: 'active',
  });

  const notionIntegration = createNotionIntegrationRepo(adapter, cipher);
  await notionIntegration.upsert(context, {
    workspaceId,
    mode: 'url',
    pageUrl: `https://www.notion.so/fixture-${slug}`,
    apiKey: null,
  });

  await adapter.client.insert(tenantCoefficients).values({
    tenantId: tenant.id,
    annualHours: 2_000,
    minutesPerRun: 15,
    sheetReductionRate: 0.35,
    updatedBy: user.id,
  });

  await adapter.client.insert(userSettings).values({ userId: user.id });

  // 所属 (user_workspaces) を作る。これが無いと apps/hub の authz は全 Workspace を拒否に倒す。
  const userWorkspacesRepo = createUserWorkspacesRepo(adapter);
  await userWorkspacesRepo.add(context, { userId: user.id, workspaceId });

  const projectsRepo = createScopedCrud(adapter, projects);
  const project = await projectsRepo.insert(context, {
    workspaceId,
    slug: `proj-${slug}`,
    name: `Project ${slug}`,
    description: null,
    ownerUserId: user.id,
    status: 'active',
  });
  const projectId = project.id as string;

  const channels = createTargetChannelsRepo(adapter);
  const channel = await channels.create(context, { projectId, target: 'skill' });

  const packageBytes = new TextEncoder().encode(`package-body-${slug}`);
  const contentHash = await sha256Hex(packageBytes);
  const packagesRepo = createPackagesRepo(adapter);
  await packagesRepo.record({
    contentHash,
    r2Key: `packages/${contentHash}`,
    sizeBytes: packageBytes.length,
    kind: 'skills-package',
  });

  const releasesRepo = createReleasesRepo(adapter);
  const { release } = await releasesRepo.createRelease(context, {
    projectId,
    channelId: channel.id,
    packageHash: contentHash,
    manifestJson: '{"name":"fixture"}',
    createdBy: user.id,
  });
  await channels.setStableRelease(context, channel.id, release.id);

  const deployRepo = createScopedCrud(adapter, deploymentReferences);
  await deployRepo.insert(context, {
    projectId,
    channelId: channel.id,
    releaseId: release.id,
    url: `https://${slug}.example.workers.dev`,
    provider: 'cloudflare',
    orphanCandidate: false,
    registeredBy: user.id,
    lastHealthAt: null,
  });

  const catalogRepo = createScopedCrud(adapter, catalogEntries);
  await catalogRepo.insert(context, {
    workspaceId,
    projectId,
    visibility: 'workspace',
    summary: `catalog ${slug}`,
    tagsJson: '["fixture"]',
    dlCount: 0,
    publishedAt: null,
  });

  const publishRepo = createScopedCrud(adapter, publishRequests);
  await publishRepo.insert(context, {
    workspaceId,
    projectId,
    channelId: channel.id,
    status: 'published',
    verdict: 'green',
    findingsJson: null,
    releaseId: release.id,
    requestedBy: user.id,
    idempotencyKey: `pub-${slug}-1`,
  });

  const tokensRepo = createScopedCrud(adapter, publisherTokens);
  await tokensRepo.insert(context, {
    workspaceId,
    userId: user.id,
    deviceName: `dev-machine-${slug}`,
    refreshTokenHash: await sha256Hex(`refresh-${slug}`),
    scopesJson: '["publish:write"]',
    familyId: `family-${slug}`,
    lastUsedAt: null,
    expiresAt: Date.now() + 90 * 24 * 3600 * 1000,
    revokedAt: null,
  });

  const deviceRepo = createScopedCrud(adapter, deviceAuthorizations);
  await deviceRepo.insert(context, {
    deviceCodeHash: await sha256Hex(`device-${slug}`),
    userCode: `USER-${slug.toUpperCase()}`,
    userId: user.id,
    workspaceId,
    scopesJson: '["publish:write"]',
    deviceName: `dev-machine-${slug}`,
    status: 'approved',
    attempts: 0,
    intervalSec: 5,
    lastPolledAt: null,
    expiresAt: Date.now() + 600_000,
  });

  const audit = createAuditRepo(adapter);
  await audit.append(context, {
    workspaceId,
    actorType: 'user',
    actorId: user.id,
    action: 'release.publish',
    entityType: 'release',
    entityId: release.id,
    summary: { channel: channel.id, version: release.version },
  });
  await audit.append(context, {
    workspaceId,
    actorType: 'user',
    actorId: user.id,
    action: 'user.salary_change',
    entityType: 'user',
    entityId: user.id,
    summary: { field: 'salary', changed: true },
  });

  const docsCms = createDocsCmsRepository(adapter);
  // tenant scope の分離を DB の一意制約で固定する。key は A/B で意図的に同じだが、
  // tenant_id が PK scope に入るため両方が created になる。
  await docsCms.createDocumentIdempotent(
    createRepositoryContext({ tenantId: tenant.id, workspaceId, actorId: user.id }),
    {
      scope: 'tenant',
      title: `Fixture doc ${slug}`,
      bodyMarkdown: `# Fixture doc ${slug}`,
      actorId: user.id,
    },
    {
      key: '00000000-0000-4000-8000-000000000001',
      payloadHash: await sha256Hex(`fixture-doc-${slug}`),
    },
    (document, expiresAt) => ({
      status: 201,
      headers: {
        'cache-control': 'no-store',
        'content-type': 'application/json; charset=utf-8',
        etag: `"docs-${document.id}-${document.entityRevision}"`,
        'idempotency-expires-at': String(expiresAt),
      },
      body: JSON.stringify({ id: document.id, revision: document.entityRevision }),
    }),
    {
      actorType: 'user',
      actorId: user.id,
      summary: { credential: 'fixture', scope: 'tenant' },
    },
  );

  const revocations = createSessionRevocationsRepo(adapter);
  await revocations.revokeAll(context);

  const ledger = createIdempotencyLedgerRepo(adapter);
  await ledger.put(context, {
    scope: 'publish',
    key: `pub-${slug}-1`,
    requestHash: await sha256Hex(`req-${slug}`),
    responseStatus: 201,
    responseBodyJson: null,
    expiresAt: Date.now() + 24 * 3600 * 1000,
  });

  const hearing = createHearingIntakeRepository(adapter);
  const hearingSheet = await hearing.createSheetAndEnqueue(context, {
    workspaceId,
    title: `Fixture hearing ${slug}`,
    applicantUserId: user.id,
    formJson: JSON.stringify({
      taskName: `Fixture hearing ${slug}`,
      company: `Tenant ${slug}`,
      applicant: user.name,
      domain: 'engineering',
      issue: 'fixture issue',
      tools: 'fixture tool',
      hours: 10,
      people: 2,
      features: 'fixture feature',
      output: 'fixture output',
      priority: 'medium',
    }),
    estimateJson: JSON.stringify({
      savedMinutesPerYear: 50_400,
      savedHoursPerYear: 840,
      savedAmountPerYear: 2_520_000,
    }),
    buildPayloadJson: (sheetId, code) =>
      JSON.stringify({
        sheet_id: sheetId,
        sheet_code: code,
        form: { taskName: `Fixture hearing ${slug}` },
        estimate: { savedHoursPerYear: 840, savedAmountPerYear: 2_520_000 },
      }),
  });

  const feedback = createFeedbackRepository(adapter);
  const feedbackRow = await feedback.createAndEnqueue(context, {
    workspaceId,
    projectId,
    type: 'improvement',
    priority: 'medium',
    source: 'manual',
    body: `Fixture feedback ${slug}`,
    createdBy: user.id,
    buildPayloadJson: (feedbackId, code) =>
      JSON.stringify({
        feedback_id: feedbackId,
        feedback_code: code,
        type: 'improvement',
        body: `Fixture feedback ${slug}`,
      }),
  });

  // builds (ADR §7/§12 P10 差し戻し再設計): AiJob(feedback_response) 完了時の冪等作成と同じ
  // repository API を fixture でも使い、feedback_id 一意の builds 行を両テナントへ用意する。
  const builds = createBuildsRepository(adapter);
  const buildRow = await builds.findOrCreateBuildForFeedback(
    context,
    { id: feedbackRow.id, workspaceId, type: 'improvement' },
    'design',
  );

  // build_stage_events: 工程遷移も repository API で seed し、隣接遷移 (design → build) が
  // 接続層越しに成立することを fixture 構築自体で確かめる。
  const buildStage = createBuildStageRepository(adapter);
  await buildStage.transitionStage(context, {
    buildId: buildRow.id,
    expectedStage: 'design',
    toStage: 'build',
    actorUserId: user.id,
    reason: `Fixture stage transition ${slug}`,
  });

  // metrics_events / metrics_rollups: ingest は回数だけを受け取り (SEC5)、
  // 金額換算済みの rollup は cron と同じ upsert 経路で 1 行だけ置く。
  const metrics = createMetricsTrackingRepository(adapter);
  const metricsContext = createRepositoryContext({ tenantId: tenant.id, workspaceId, actorId: user.id });
  await metrics.ingestEvent(metricsContext, {
    workspaceId,
    harnessId: `harness-${slug}`,
    runCount: 3,
    idempotencyKey: `fixture-metrics-${slug}`,
  });
  const rollupStart = Date.UTC(2026, 0, 5);
  await metrics.upsertRollups(context, [
    {
      workspaceId,
      period: 'weekly',
      dimension: 'harness',
      dimensionKey: `harness-${slug}`,
      periodStart: rollupStart,
      periodEnd: rollupStart + 7 * 24 * 60 * 60 * 1000,
      runCount: 3,
      savedMinutes: 45,
      savedAmount: 3_750,
    },
  ]);

  const tenantDataKeyVersion = await cipher.ensureActiveDek('tenant_data', tenant.id);
  const tenantDataId = newUlid();
  await adapter.client.insert(tenantDataObjects).values({
    id: tenantDataId,
    tenantId: tenant.id,
    workspaceId,
    kind: 'hearing_screenshot',
    title: `Fixture screenshot ${slug}`,
    r2Key: `tenant/${tenant.id}/${workspaceId}/hearing_screenshot/${tenantDataId}`,
    sizeBytes: 128,
    contentHash: await sha256Hex(new TextEncoder().encode(`tenant-data-${slug}`)),
    encKeyVersion: tenantDataKeyVersion,
    uploadedBy: user.id,
    createdAt: Date.now(),
  });

  // hearing_screenshots は tenant_data_objects と sheet の双方を参照する薄い metadata 行。
  // fixture でも同じ依存閉包を作り、backup/restore と tenant 分離検査が2表を実データで通るようにする。
  await adapter.client.insert(hearingScreenshots).values({
    id: newUlid(),
    tenantId: tenant.id,
    workspaceId,
    sheetId: hearingSheet.id,
    tenantDataObjectId: tenantDataId,
    title: `Fixture screenshot ${slug}`,
    linkedItem: 'issue',
    note: `Fixture screenshot note ${slug}`,
    contentType: 'image/png',
    createdBy: user.id,
    createdAt: Date.now(),
  });

  await createHearingShareTokensRepo(adapter).create(context, {
    id: newUlid(),
    workspaceId,
    sheetId: hearingSheet.id,
    audience: 'harness_creator',
    tokenHash: await sha256Hex(`hearing-share-token-${slug}`),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    createdByUserId: user.id,
  });

  // tombstone: 過去に削除された tenant_data の痕跡 (TC-8 backup restore 検証が読む対象)。
  const tombstoneObjectId = newUlid();
  await adapter.client.insert(tenantDataTombstones).values({
    id: newUlid(),
    tenantId: tenant.id,
    objectId: tombstoneObjectId,
    r2Key: `tenant/${tenant.id}/${workspaceId}/knowledge_doc/${tombstoneObjectId}`,
    deletedAt: Date.now(),
  });

  return {
    context,
    tenantId: tenant.id,
    workspaceId,
    userId: user.id,
    projectId,
    channelId: channel.id,
    releaseId: release.id,
    salary,
  };
}

/** tenant A / B を同一 DB へ seed する。encryption_keys は cipher が自動発行する (共有 2 行)。 */
export async function seedTwoTenants(adapter: CoreAdapter, cipher: ColumnCipher): Promise<TwoTenantsFixture> {
  const a = await seedTenant(adapter, cipher, 'alpha', 8_000_000);
  const b = await seedTenant(adapter, cipher, 'beta', 6_500_000);
  return { a, b };
}
