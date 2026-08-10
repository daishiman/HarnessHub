// BPB-DB: Build 工程遷移 repository の実 DB 往復 (docs/backend-spec.md §5.3 / §2.3 / D4)。
//
// 検証するのは状態機械そのもの — 隣接遷移・CAS・publish 前提・tenant 分離の 4 点。
// admin 限定の認可判定は route 層の責務なのでここでは扱わない。

import { and, eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { TursoAdapter } from '../connection/turso';
import {
  createBuildStageRepository,
  InvalidStageTransitionError,
  PublishRequestNotPublishedError,
  StageCasConflictError,
} from '../repository/build-stage';
import { createBuildsRepository } from '../repository/builds';
import { createCoreRepositories } from '../repository/composition';
import { createScopedCrud } from '../repository/crud';
import { buildStageEvents } from '../schema/build-pipeline/schema';
import { BUILD_STAGES, builds } from '../schema/builds/schema';
import { workspaces } from '../schema/core/identity';
import { publishRequests } from '../schema/core/publish';
import { createRepositoryContext } from '../src/context';
import { asCore, createLibsqlTestDb, TEST_KEK_B64 } from './support/test-db';

let adapter: TursoAdapter;

beforeEach(async () => {
  adapter = await createLibsqlTestDb();
});

afterEach(() => adapter.close());

async function seedTenant(slug: string) {
  const core = createCoreRepositories({ adapter: asCore(adapter), kekBase64: TEST_KEK_B64 });
  const tenant = await core.tenants.create({ slug, name: `Tenant ${slug}`, plan: 'free' });
  const tenantContext = createRepositoryContext({ tenantId: tenant.id });
  const workspace = await createScopedCrud(asCore(adapter), workspaces).insert(tenantContext, {
    slug: `ws-${slug}`,
    name: `Workspace ${slug}`,
  });
  const workspaceId = workspace.id as string;
  const user = await core.users.insert(tenantContext, {
    idpSubject: `sub-${slug}`,
    email: `${slug}@example.com`,
    name: `Admin ${slug}`,
    department: '品質改善',
    role: 'workspace-admin',
    status: 'active',
  });

  // Build は feedback 起点の冪等作成 API で作る (唯一の生成経路)。初期工程は design。
  const build = await createBuildsRepository(asCore(adapter)).findOrCreateBuildForFeedback(
    tenantContext,
    { id: `fb-${slug}`, workspaceId, type: 'improvement' },
    'design',
  );

  return {
    context: createRepositoryContext({ tenantId: tenant.id, workspaceId, actorId: user.id }),
    tenantId: tenant.id,
    workspaceId,
    userId: user.id,
    buildId: build.id,
  };
}

type Tenant = Awaited<ReturnType<typeof seedTenant>>;

/** 状態機械の途中から検証したい case のための直接セットアップ (repository には工程を飛ばす API を置かない)。 */
async function forceStage(tenant: Tenant, stage: (typeof BUILD_STAGES)[number]): Promise<void> {
  await adapter.client.update(builds).set({ stage }).where(eq(builds.id, tenant.buildId));
}

async function attachPublishRequest(tenant: Tenant, status: 'ready' | 'published'): Promise<string> {
  const inserted = await createScopedCrud(asCore(adapter), publishRequests).insert(tenant.context, {
    workspaceId: tenant.workspaceId,
    projectId: `proj-${tenant.workspaceId}`,
    channelId: `ch-${tenant.workspaceId}`,
    status,
    verdict: 'green',
    findingsJson: null,
    releaseId: null,
    requestedBy: tenant.userId,
    idempotencyKey: null,
  });
  const publishRequestId = inserted.id as string;
  await adapter.client.update(builds).set({ publishRequestId }).where(eq(builds.id, tenant.buildId));
  return publishRequestId;
}

function countEvents(tenant: Tenant) {
  return adapter.client
    .select()
    .from(buildStageEvents)
    .where(and(eq(buildStageEvents.tenantId, tenant.tenantId), eq(buildStageEvents.buildId, tenant.buildId)));
}

describe('BPB-DB: 7 工程の値域', () => {
  it('BUILD_STAGES は 7 値・この順序 (@harness-hub/schemas の BUILD_STAGE_ORDER と対で固定する)', () => {
    expect([...BUILD_STAGES]).toEqual(['hearing', 'requirements', 'design', 'build', 'test', 'review', 'publish']);
  });
});

describe('BPB-DB: transitionStage の隣接判定と CAS', () => {
  it('隣接遷移が成功し、stage event が 1 行増える', async () => {
    const tenant = await seedTenant('adjacent');
    const repo = createBuildStageRepository(asCore(adapter));

    expect(await countEvents(tenant)).toHaveLength(0);

    const result = await repo.transitionStage(tenant.context, {
      buildId: tenant.buildId,
      expectedStage: 'design',
      toStage: 'build',
      actorUserId: tenant.userId,
      reason: '設計レビュー完了',
    });

    expect(result.build.stage).toBe('build');
    expect(result.event).toMatchObject({
      buildId: tenant.buildId,
      tenantId: tenant.tenantId,
      workspaceId: tenant.workspaceId,
      fromStage: 'design',
      toStage: 'build',
      actorUserId: tenant.userId,
      reason: '設計レビュー完了',
    });

    expect(await countEvents(tenant)).toHaveLength(1);
    const events = await repo.listStageEvents(tenant.context, tenant.buildId);
    expect(events.map((e) => e.toStage)).toEqual(['build']);
  });

  it('逆行 (build → design) も隣接なら許可する (差し戻しは通常運用)', async () => {
    const tenant = await seedTenant('backward');
    const repo = createBuildStageRepository(asCore(adapter));
    await forceStage(tenant, 'build');

    const result = await repo.transitionStage(tenant.context, {
      buildId: tenant.buildId,
      expectedStage: 'build',
      toStage: 'design',
      actorUserId: tenant.userId,
    });
    expect(result.build.stage).toBe('design');
    expect(result.event.reason).toBeNull();
  });

  it('2 工程飛ばし (design → test) は拒否され、build も event も変化しない', async () => {
    const tenant = await seedTenant('skip');
    const repo = createBuildStageRepository(asCore(adapter));

    await expect(
      repo.transitionStage(tenant.context, {
        buildId: tenant.buildId,
        expectedStage: 'design',
        toStage: 'test',
        actorUserId: tenant.userId,
      }),
    ).rejects.toBeInstanceOf(InvalidStageTransitionError);

    const rows = await adapter.client.select().from(builds).where(eq(builds.id, tenant.buildId));
    expect(rows[0]?.stage).toBe('design');
    expect(await countEvents(tenant)).toHaveLength(0);
  });

  it('同一工程への遷移も隣接でないため拒否される', async () => {
    const tenant = await seedTenant('same');
    const repo = createBuildStageRepository(asCore(adapter));

    await expect(
      repo.transitionStage(tenant.context, {
        buildId: tenant.buildId,
        expectedStage: 'design',
        toStage: 'design',
        actorUserId: tenant.userId,
      }),
    ).rejects.toBeInstanceOf(InvalidStageTransitionError);
  });

  it('expectedStage 不一致 (並行更新に負けた側) は拒否され、build も event も変化しない', async () => {
    const tenant = await seedTenant('cas');
    const repo = createBuildStageRepository(asCore(adapter));

    // 先行する admin が design → build を完了させた状態。
    await repo.transitionStage(tenant.context, {
      buildId: tenant.buildId,
      expectedStage: 'design',
      toStage: 'build',
      actorUserId: tenant.userId,
    });

    // 後発の admin は古いボード表示 (design) のまま操作してくる。
    const rejected = repo.transitionStage(tenant.context, {
      buildId: tenant.buildId,
      expectedStage: 'design',
      toStage: 'build',
      actorUserId: tenant.userId,
    });
    await expect(rejected).rejects.toBeInstanceOf(StageCasConflictError);
    await expect(rejected).rejects.toMatchObject({ code: 'conflict', actualStage: 'build' });

    const rows = await adapter.client.select().from(builds).where(eq(builds.id, tenant.buildId));
    expect(rows[0]?.stage).toBe('build');
    // 先行遷移の 1 行だけ。負けた側は履歴を残さない。
    expect(await countEvents(tenant)).toHaveLength(1);
  });
});

describe('BPB-DB: publish 工程と PublishRequest の接続 (B4)', () => {
  it('PublishRequest が未接続なら publish 遷移を拒否する', async () => {
    const tenant = await seedTenant('publish-unlinked');
    const repo = createBuildStageRepository(asCore(adapter));
    await forceStage(tenant, 'review');

    await expect(
      repo.transitionStage(tenant.context, {
        buildId: tenant.buildId,
        expectedStage: 'review',
        toStage: 'publish',
        actorUserId: tenant.userId,
      }),
    ).rejects.toBeInstanceOf(PublishRequestNotPublishedError);
    expect(await countEvents(tenant)).toHaveLength(0);
  });

  it('接続済み PublishRequest が published でなければ publish 遷移を拒否する', async () => {
    const tenant = await seedTenant('publish-not-yet');
    const repo = createBuildStageRepository(asCore(adapter));
    await forceStage(tenant, 'review');
    await attachPublishRequest(tenant, 'ready');

    await expect(
      repo.transitionStage(tenant.context, {
        buildId: tenant.buildId,
        expectedStage: 'review',
        toStage: 'publish',
        actorUserId: tenant.userId,
      }),
    ).rejects.toMatchObject({ name: 'PublishRequestNotPublishedError', actualStatus: 'ready' });

    const rows = await adapter.client.select().from(builds).where(eq(builds.id, tenant.buildId));
    expect(rows[0]?.stage).toBe('review');
  });

  it('接続済み PublishRequest が published なら publish 遷移が通る (publish_requests は書き換えない)', async () => {
    const tenant = await seedTenant('publish-ok');
    const repo = createBuildStageRepository(asCore(adapter));
    await forceStage(tenant, 'review');
    const publishRequestId = await attachPublishRequest(tenant, 'published');

    const result = await repo.transitionStage(tenant.context, {
      buildId: tenant.buildId,
      expectedStage: 'review',
      toStage: 'publish',
      actorUserId: tenant.userId,
    });
    expect(result.build.stage).toBe('publish');
    expect(result.event.toStage).toBe('publish');

    // 二重状態を持たない: publish_requests 側は一切変えない。
    const pr = await adapter.client.select().from(publishRequests).where(eq(publishRequests.id, publishRequestId));
    expect(pr[0]?.status).toBe('published');
  });
});

describe('BPB-DB: tenant 分離 (D4)', () => {
  it('他テナントの build は transitionStage から触れない (not-found)', async () => {
    const alpha = await seedTenant('alpha');
    const beta = await seedTenant('beta');
    const repo = createBuildStageRepository(asCore(adapter));

    await expect(
      repo.transitionStage(alpha.context, {
        buildId: beta.buildId,
        expectedStage: 'design',
        toStage: 'build',
        actorUserId: alpha.userId,
      }),
    ).rejects.toMatchObject({ code: 'not-found' });

    const rows = await adapter.client.select().from(builds).where(eq(builds.id, beta.buildId));
    expect(rows[0]?.stage).toBe('design');
    expect(await countEvents(beta)).toHaveLength(0);
  });

  it('listBoard / listStageEvents は自テナント自 workspace の行しか返さない', async () => {
    const alpha = await seedTenant('board-alpha');
    const beta = await seedTenant('board-beta');
    const repo = createBuildStageRepository(asCore(adapter));

    await repo.transitionStage(beta.context, {
      buildId: beta.buildId,
      expectedStage: 'design',
      toStage: 'build',
      actorUserId: beta.userId,
    });

    const alphaBoard = await repo.listBoard(alpha.context, { workspaceId: alpha.workspaceId });
    expect(alphaBoard.map((c) => c.stage)).toEqual([...BUILD_STAGES]);
    expect(alphaBoard.flatMap((c) => c.builds.map((b) => b.id))).toEqual([alpha.buildId]);
    expect(alphaBoard.find((c) => c.stage === 'design')?.builds).toHaveLength(1);

    // 他テナントの workspaceId を指定しても、tenant 条件で 0 件になる。
    const crossTenant = await repo.listBoard(createRepositoryContext({ tenantId: alpha.tenantId }), {
      workspaceId: beta.workspaceId,
    });
    expect(crossTenant.flatMap((c) => c.builds)).toHaveLength(0);

    expect(await repo.listStageEvents(alpha.context, beta.buildId)).toHaveLength(0);
    expect(await repo.listStageEvents(beta.context, beta.buildId)).toHaveLength(1);
  });

  it('context.workspaceId と filter.workspaceId の不一致は invalid-context で止める', async () => {
    const alpha = await seedTenant('mismatch');
    const repo = createBuildStageRepository(asCore(adapter));

    await expect(repo.listBoard(alpha.context, { workspaceId: 'ws-other' })).rejects.toMatchObject({
      code: 'invalid-context',
    });
  });
});
