import { and, eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { TursoAdapter } from '../connection/turso';
import { createHearingSmokeDbProbe, createPublishSmokeDbProbe } from '../repository/composition';
import { packages, projects, releases, targetChannels } from '../schema/core/catalog';
import { tenants } from '../schema/core/identity';
import { publishRequests } from '../schema/core/publish';
import { smokeFixtureLeases } from '../schema/core/smoke';
import { asCore, createLibsqlTestDb } from './support/test-db';

let adapter: TursoAdapter;

beforeEach(async () => {
  adapter = await createLibsqlTestDb();
});

afterEach(() => adapter.close());

describe('createPublishSmokeDbProbe', () => {
  it('schema を公開せず production smoke の fixture・証跡・cleanup を扱う', async () => {
    const db = createPublishSmokeDbProbe(asCore(adapter));
    const context = { tenantId: 'tenant-smoke', workspaceId: 'workspace-smoke', actorId: 'owner-smoke' };
    await adapter.client.insert(smokeFixtureLeases).values({
      tenantId: context.tenantId,
      runId: 'test-publish',
      kind: 'publish',
      expiresAt: 1_900_000_000_000,
      createdAt: 1,
    });

    await db.createProjectChannelFixture(context, {
      projectId: 'project-smoke',
      channelId: 'channel-smoke',
      ownerUserId: 'owner-smoke',
      createdAt: 1,
    });
    await adapter.client.insert(publishRequests).values({
      id: 'request-smoke',
      tenantId: context.tenantId,
      workspaceId: context.workspaceId,
      projectId: 'project-smoke',
      channelId: 'channel-smoke',
      status: 'draft',
      verdict: null,
      findingsJson: null,
      releaseId: null,
      requestedBy: context.actorId,
      idempotencyKey: null,
      createdAt: 2,
    });

    await db.markRequestReady(context, 'request-smoke');
    expect(await db.findRequest(context, 'request-smoke')).toEqual({ status: 'ready', releaseId: null });
    expect(await db.findStableReleaseId(context, 'channel-smoke')).toBeNull();

    await adapter.client.insert(packages).values({
      contentHash: 'a'.repeat(64),
      r2Key: `packages/${'a'.repeat(64)}`,
      sizeBytes: 10,
      kind: 'skills-package',
      createdAt: 3,
    });
    await db.createWebReleaseFixture(context, {
      projectId: 'project-smoke',
      channelId: 'web-channel-smoke',
      releaseId: 'web-release-smoke',
      packageHash: 'a'.repeat(64),
      createdBy: context.actorId,
      createdAt: 4,
    });

    const evidence = await db.collectEvidence(context, {
      projectId: 'project-smoke',
      channelId: 'channel-smoke',
      contentHashes: ['a'.repeat(64), 'b'.repeat(64)],
      entityIds: new Set(['request-smoke']),
    });
    expect(evidence.releaseRows).toEqual([{ id: 'web-release-smoke', packageHash: 'a'.repeat(64) }]);
    expect(evidence.packageRows).toEqual([{ contentHash: 'a'.repeat(64), r2Key: `packages/${'a'.repeat(64)}` }]);
    expect(evidence.auditChain).toBeNull();

    const webChannelRows = await adapter.client
      .select({ stableReleaseId: targetChannels.stableReleaseId })
      .from(targetChannels)
      .where(eq(targetChannels.id, 'web-channel-smoke'));
    const webReleaseRows = await adapter.client
      .select({ id: releases.id })
      .from(releases)
      .where(eq(releases.id, 'web-release-smoke'));
    expect(webChannelRows).toEqual([{ stableReleaseId: 'web-release-smoke' }]);
    expect(webReleaseRows).toEqual([{ id: 'web-release-smoke' }]);

    // 使い捨て tenant の後始末 (HarnessHub-pf5o)。publish 領域が残す表を 1 行も残さない。
    expect(await db.cleanupPublishTenant(context.tenantId)).toEqual({ remainingRows: 0, clean: true });
    const remainingProjects = await adapter.client
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.tenantId, context.tenantId), eq(projects.id, 'project-smoke')));
    expect(remainingProjects).toEqual([]);
    // content-addressed の packages は tenant 非スコープなので消さない (他 tenant の Release が参照しうる)。
    expect(await adapter.client.select({ contentHash: packages.contentHash }).from(packages)).toEqual([
      { contentHash: 'a'.repeat(64) },
    ]);
  });

  it('他 tenant の publish 行は消さない', async () => {
    const db = createPublishSmokeDbProbe(asCore(adapter));
    const target = { tenantId: 'tenant-smoke', workspaceId: 'workspace-smoke', actorId: 'owner-smoke' };
    const bystander = { tenantId: 'tenant-other', workspaceId: 'workspace-other', actorId: 'owner-other' };
    await adapter.client.insert(tenants).values({
      id: bystander.tenantId,
      slug: 'real-customer',
      name: '実在する顧客 tenant',
      plan: 'free',
      status: 'active',
      createdAt: 1,
    });

    for (const context of [target, bystander]) {
      await db.createProjectChannelFixture(context, {
        projectId: `project-${context.tenantId}`,
        channelId: `channel-${context.tenantId}`,
        ownerUserId: context.actorId,
        createdAt: 1,
      });
    }

    await adapter.client.insert(smokeFixtureLeases).values({
      tenantId: target.tenantId,
      runId: 'test-publish-target',
      kind: 'publish',
      expiresAt: 1_900_000_000_000,
      createdAt: 1,
    });

    await db.cleanupPublishTenant(target.tenantId);

    const rows = await adapter.client.select({ id: projects.id, tenantId: projects.tenantId }).from(projects);
    expect(rows).toEqual([{ id: 'project-tenant-other', tenantId: 'tenant-other' }]);
    // smoke らしい publish 行があっても、専用 lease の無い bystander は物理削除できない。
    await expect(db.cleanupPublishTenant(bystander.tenantId)).rejects.toThrow(/lease を持たない/);
  });

  /**
   * cancel 相当 (runner が強制終了され finally が走らない) の後始末 (HarnessHub-aauo)。
   * fixture を作ったまま cleanup を呼ばずに放置し、lease 台帳からの列挙 → publish 先行の削除で
   * 残数 0 まで戻せることを実 DB で通す。
   */
  it('cleanup を呼ばずに中断した run の fixture を、列挙して publish 先行で回収できる', async () => {
    const publish = createPublishSmokeDbProbe(asCore(adapter));
    const identity = createHearingSmokeDbProbe(asCore(adapter));
    const now = 1_800_000_000_000;
    const fixture = await identity.createTenantFixture({
      slug: 'pb-smoke-cancelled',
      memberIdpSubject: 'pb-member-cancelled',
      workerIdpSubject: 'pb-publisher-cancelled',
      lifecycle: { runId: 'gha-777-1', kind: 'publish', expiresAt: now - 1 },
    });
    const context = {
      tenantId: fixture.tenantId,
      workspaceId: fixture.workspaceId,
      actorId: fixture.workerUserId,
    };
    await publish.createProjectChannelFixture(context, {
      projectId: 'project-cancelled',
      channelId: 'channel-cancelled',
      ownerUserId: fixture.workerUserId,
      createdAt: now - 60_000,
    });
    // ここで runner が殺された想定。finally は走らず、行は本番に残る。

    const candidates = await identity.listSweepableTenants({ now });
    expect(candidates.map((candidate) => candidate.tenantId)).toEqual([fixture.tenantId]);

    const publishCleanup = await publish.cleanupPublishTenant(fixture.tenantId);
    expect(publishCleanup).toEqual({ remainingRows: 0, clean: true });
    const identityCleanup = await identity.cleanupTenant(fixture.tenantId);
    expect(identityCleanup).toEqual({ remainingRows: 0, clean: true });

    // 回収後は列挙にも残らない = 次の run が同じ tenant を再回収しに行かない。
    await expect(identity.listSweepableTenants({ now })).resolves.toEqual([]);
    expect(await adapter.client.select({ id: projects.id }).from(projects)).toEqual([]);
    expect(await adapter.client.select({ id: tenants.id }).from(tenants)).toEqual([]);
    // deploy job と定期 sweeper が同じ候補を競合しても、先に完走済みなら同じ command は成功する。
    await expect(publish.cleanupPublishTenant(fixture.tenantId)).resolves.toEqual({ remainingRows: 0, clean: true });
    await expect(identity.cleanupTenant(fixture.tenantId)).resolves.toEqual({ remainingRows: 0, clean: true });
  });
});
