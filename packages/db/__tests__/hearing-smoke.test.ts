import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { TursoAdapter } from '../connection/turso';
import { createHearingSmokeDbProbe } from '../repository/composition';
import {
  createSmokeFixtureLifecycle,
  isSweepableSmokeFixture,
  parseSmokeFixtureTtlMinutes,
} from '../repository/smoke-lifecycle';
import { builds } from '../schema/builds/schema';
import { idpConnections, tenants, users, workspaces } from '../schema/core/identity';
import { auditEvents } from '../schema/core/security';
import { smokeFixtureLeases } from '../schema/core/smoke';
import { documents } from '../schema/docs-cms/schema';
import { feedbacks } from '../schema/feedback-loop/schema';
import { asCore, createLibsqlTestDb } from './support/test-db';

let adapter: TursoAdapter;

const lifecycle = (runId: string = 'test-hearing', expiresAt: number = 1_900_000_000_000) => ({
  runId,
  kind: 'hearing' as const,
  expiresAt,
});

beforeEach(async () => {
  adapter = await createLibsqlTestDb();
});

afterEach(() => adapter.close());

describe('createHearingSmokeDbProbe', () => {
  it('fixture を 1 transaction で作り、途中失敗時に本番相当 DB へ半端な行を残さない', async () => {
    const probe = createHearingSmokeDbProbe(asCore(adapter));

    // 同じ tenant 内の idp_subject UNIQUE 違反を users INSERT で起こす。
    // それより前に tenant / idp_connection / workspace の INSERT は走るため、
    // transaction が無ければ 3 テーブルへゴミが残る回帰ケースになる。
    await expect(
      probe.createTenantFixture({
        slug: 'hearing-smoke-rollback',
        memberIdpSubject: 'duplicate-subject',
        workerIdpSubject: 'duplicate-subject',
        lifecycle: lifecycle('rollback'),
      }),
    ).rejects.toThrow();

    expect(await adapter.client.select().from(tenants).where(eq(tenants.slug, 'hearing-smoke-rollback'))).toEqual([]);
    expect(
      await adapter.client
        .select()
        .from(idpConnections)
        .where(eq(idpConnections.issuerUrl, 'https://hearing-smoke.invalid/hearing-smoke-rollback')),
    ).toEqual([]);
    expect(
      await adapter.client.select().from(workspaces).where(eq(workspaces.slug, 'ws-hearing-smoke-rollback')),
    ).toEqual([]);
    expect(await adapter.client.select().from(smokeFixtureLeases)).toEqual([]);
  });

  it('作成した fixture を tenant 単位で削除し、残数 0 を確認する', async () => {
    const probe = createHearingSmokeDbProbe(asCore(adapter));
    const fixture = await probe.createTenantFixture({
      slug: 'hearing-smoke-cleanup',
      memberIdpSubject: 'member-subject',
      workerIdpSubject: 'worker-subject',
      lifecycle: lifecycle('cleanup'),
    });

    const now = Date.now();
    await adapter.client.insert(feedbacks).values({
      id: 'feedback-smoke-cleanup',
      tenantId: fixture.tenantId,
      workspaceId: fixture.workspaceId,
      code: 'FR-9001',
      projectId: 'project-smoke-cleanup',
      type: 'improvement',
      priority: 'medium',
      source: 'manual',
      body: 'cleanup 対象の feedback',
      status: 'open',
      createdBy: fixture.memberUserId,
      createdAt: now,
      updatedAt: now,
    });
    await adapter.client.insert(documents).values({
      id: 'document-smoke-cleanup',
      tenantId: fixture.tenantId,
      scope: 'tenant',
      title: 'cleanup 対象の document',
      bodyMarkdown: '本文',
      createdBy: fixture.memberUserId,
      updatedBy: fixture.memberUserId,
      createdAt: now,
      updatedAt: now,
    });
    await adapter.client.insert(builds).values({
      id: 'build-smoke-cleanup',
      tenantId: fixture.tenantId,
      workspaceId: fixture.workspaceId,
      type: 'improvement',
      stage: 'build',
      feedbackId: 'feedback-smoke-cleanup',
      createdAt: now,
      updatedAt: now,
    });

    expect(await adapter.client.select().from(users).where(eq(users.tenantId, fixture.tenantId))).toHaveLength(2);
    expect(await adapter.client.select().from(feedbacks).where(eq(feedbacks.tenantId, fixture.tenantId))).toHaveLength(
      1,
    );
    expect(await adapter.client.select().from(documents).where(eq(documents.tenantId, fixture.tenantId))).toHaveLength(
      1,
    );
    expect(await adapter.client.select().from(builds).where(eq(builds.tenantId, fixture.tenantId))).toHaveLength(1);
    expect(
      await adapter.client
        .select({ tenantId: smokeFixtureLeases.tenantId })
        .from(smokeFixtureLeases)
        .where(eq(smokeFixtureLeases.tenantId, fixture.tenantId)),
    ).toEqual([{ tenantId: fixture.tenantId }]);
    await expect(probe.cleanupTenant(fixture.tenantId)).resolves.toEqual({ remainingRows: 0, clean: true });
    expect(await adapter.client.select().from(tenants).where(eq(tenants.id, fixture.tenantId))).toEqual([]);
    expect(await adapter.client.select().from(smokeFixtureLeases)).toEqual([]);
  });

  it('S8監査は対象actor/workspace/actionの許可イベントだけを数える', async () => {
    const probe = createHearingSmokeDbProbe(asCore(adapter));
    const fixture = await probe.createTenantFixture({
      slug: 'hearing-smoke-audit-delta',
      memberIdpSubject: 'member-audit-delta',
      workerIdpSubject: 'worker-audit-delta',
      providerAdminIdpSubject: 'provider-audit-delta',
      lifecycle: lifecycle('audit'),
    });
    const providerAdminUserId = fixture.providerAdminUserId;
    if (providerAdminUserId === null) throw new Error('前提: provider-admin fixture が作られる');

    const query = {
      tenantId: fixture.tenantId,
      actorId: providerAdminUserId,
      workspaceId: fixture.workspaceId,
      requestedAction: 'aijob.pull',
    } as const;
    await expect(probe.countCrossTenantAuditEvents(query)).resolves.toBe(0);

    const base = {
      tenantId: fixture.tenantId,
      workspaceId: fixture.workspaceId,
      actorType: 'publisher_token' as const,
      actorId: providerAdminUserId,
      action: 'provider.cross_tenant_access',
      entityType: 'ai_job_queue',
      entityId: '(none)',
      prevHash: 'prev',
      createdAt: Date.now(),
    };
    await adapter.client.insert(auditEvents).values([
      {
        ...base,
        id: 'audit-s8-match',
        seq: 1,
        eventHash: 'hash-1',
        summaryJson: JSON.stringify({ requested_action: 'aijob.pull', allowed: true }),
      },
      {
        ...base,
        id: 'audit-s8-denied',
        seq: 2,
        eventHash: 'hash-2',
        summaryJson: JSON.stringify({ requested_action: 'aijob.pull', allowed: false }),
      },
      {
        ...base,
        id: 'audit-s8-other-action',
        seq: 3,
        eventHash: 'hash-3',
        summaryJson: JSON.stringify({ requested_action: 'aijob.complete', allowed: true }),
      },
      {
        ...base,
        id: 'audit-s8-other-actor',
        seq: 4,
        actorId: fixture.workerUserId,
        eventHash: 'hash-4',
        summaryJson: JSON.stringify({ requested_action: 'aijob.pull', allowed: true }),
      },
    ]);

    await expect(probe.countCrossTenantAuditEvents(query)).resolves.toBe(1);
    await expect(probe.cleanupTenant(fixture.tenantId)).resolves.toEqual({ remainingRows: 0, clean: true });
    await expect(probe.countCrossTenantAuditEvents(query)).resolves.toBe(0);
  });
});

describe('smoke fixture の共通 lifecycle', () => {
  it('kind / run / TTL を検証し、無効 TTL を fail-closed に拒否する', () => {
    expect(createSmokeFixtureLifecycle({ runId: 'gha-1234-2', kind: 'hearing', now: 1_000, ttlMinutes: 5 })).toEqual({
      runId: 'gha-1234-2',
      kind: 'hearing',
      expiresAt: 301_000,
    });
    expect(parseSmokeFixtureTtlMinutes(undefined)).toBe(30);
    expect(parseSmokeFixtureTtlMinutes('1')).toBe(1);
    for (const invalid of ['', '0', '-1', '1.5', 'abc']) {
      expect(() => parseSmokeFixtureTtlMinutes(invalid)).toThrow(/1 以上の整数/);
    }
  });

  it('期限切れか自分の run のときだけ回収してよいと判定する', () => {
    const value = lifecycle('gha-1-1', 100);
    expect(isSweepableSmokeFixture(value, { now: 100 })).toBe(true);
    expect(isSweepableSmokeFixture(value, { now: 99 })).toBe(false);
    expect(isSweepableSmokeFixture(value, { now: 99, runId: 'gha-1-1' })).toBe(true);
    expect(isSweepableSmokeFixture(value, { now: 99, runId: 'gha-2-1' })).toBe(false);
  });
});

/**
 * cancel-in-progress / runner 強制終了では runner 内の finally が完走しない (HarnessHub-aauo)。
 * その経路で残った fixture を lease 台帳から一意に列挙できるか = 回収経路が成立するかを見る。
 */
describe('createHearingSmokeDbProbe の中断後 fixture 列挙', () => {
  const NOW = 1_800_000_000_000;

  it('期限切れの fixture だけを列挙し、実行中の別 run と marker 無しの tenant は候補にしない', async () => {
    const probe = createHearingSmokeDbProbe(asCore(adapter));
    const expired = await probe.createTenantFixture({
      slug: 'sweep-expired',
      memberIdpSubject: 'member-expired',
      workerIdpSubject: 'worker-expired',
      lifecycle: { runId: 'gha-1-1', kind: 'hearing', expiresAt: NOW - 1 },
    });
    const running = await probe.createTenantFixture({
      slug: 'sweep-running',
      memberIdpSubject: 'member-running',
      workerIdpSubject: 'worker-running',
      lifecycle: { runId: 'gha-2-1', kind: 'coverage', expiresAt: NOW + 600_000 },
    });
    // lease を持たない実 tenant は回収対象にならない。fixture API 自体は lifecycle 必須なので、
    // 通常 tenant を直接入れて「見た目では authority を得られない」ことを検査する。
    await adapter.client.insert(tenants).values({
      id: 'tenant-unleased',
      slug: 'sweep-unleased',
      name: 'P13 hearing smoke [smoke-run run_id=gha-2-1 expires_at=1]',
      plan: 'free',
      status: 'active',
      createdAt: NOW - 10_000,
    });

    const candidates = await probe.listSweepableTenants({ now: NOW });
    expect(candidates.map((candidate) => candidate.tenantId)).toEqual([expired.tenantId]);
    expect(candidates[0]).toMatchObject({ slug: 'sweep-expired', runId: 'gha-1-1', expiresAt: NOW - 1 });

    // 陰性だけだと「常に空配列」を返す実装も緑になる。自分の run は期限内でも回収してよい。
    const own = await probe.listSweepableTenants({ now: NOW, runId: 'gha-2-1' });
    expect(own.map((candidate) => candidate.tenantId).sort()).toEqual([expired.tenantId, running.tenantId].sort());

    expect(own.map((candidate) => candidate.tenantId)).not.toContain('tenant-unleased');
    await expect(probe.cleanupTenant('tenant-unleased')).rejects.toThrow(/lease を持たない/);
    await expect(
      adapter.client.select({ id: tenants.id }).from(tenants).where(eq(tenants.id, 'tenant-unleased')),
    ).resolves.toEqual([{ id: 'tenant-unleased' }]);
  });

  it('marker に似た名前を持つだけの tenant を回収候補にしない', async () => {
    const probe = createHearingSmokeDbProbe(asCore(adapter));
    await adapter.client.insert(tenants).values([
      {
        id: 'tenant-lookalike',
        slug: 'lookalike',
        // 旧 marker に見えても lease 台帳には無いので削除 authority にならない。
        name: '[smoke-run run_id=gha-9-1] 顧客の本番テナント',
        plan: 'free',
        status: 'active',
        createdAt: NOW - 10_000,
      },
      {
        id: 'tenant-plain',
        slug: 'plain',
        name: '通常の顧客テナント',
        plan: 'free',
        status: 'active',
        createdAt: NOW - 10_000,
      },
    ]);

    await expect(probe.listSweepableTenants({ now: NOW })).resolves.toEqual([]);
  });

  it('古い残骸から先に返す (途中で打ち切られても長く残っている行が先に片付く)', async () => {
    const probe = createHearingSmokeDbProbe(asCore(adapter));
    const newer = await probe.createTenantFixture({
      slug: 'sweep-newer',
      memberIdpSubject: 'member-newer',
      workerIdpSubject: 'worker-newer',
      lifecycle: { runId: 'gha-3-1', kind: 'database', expiresAt: NOW - 1_000 },
    });
    const older = await probe.createTenantFixture({
      slug: 'sweep-older',
      memberIdpSubject: 'member-older',
      workerIdpSubject: 'worker-older',
      lifecycle: { runId: 'gha-4-1', kind: 'publish', expiresAt: NOW - 900_000 },
    });

    const candidates = await probe.listSweepableTenants({ now: NOW });
    expect(candidates.map((candidate) => candidate.tenantId)).toEqual([older.tenantId, newer.tenantId]);
  });
});
