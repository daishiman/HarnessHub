import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { TursoAdapter } from '../connection/turso';
import { createHearingSmokeDbProbe } from '../repository/composition';
import { builds } from '../schema/builds/schema';
import { idpConnections, tenants, users, workspaces } from '../schema/core/identity';
import { auditEvents } from '../schema/core/security';
import { documents } from '../schema/docs-cms/schema';
import { feedbacks } from '../schema/feedback-loop/schema';
import { asCore, createLibsqlTestDb } from './support/test-db';

let adapter: TursoAdapter;

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
  });

  it('作成した fixture を tenant 単位で削除し、残数 0 を確認する', async () => {
    const probe = createHearingSmokeDbProbe(asCore(adapter));
    const fixture = await probe.createTenantFixture({
      slug: 'hearing-smoke-cleanup',
      memberIdpSubject: 'member-subject',
      workerIdpSubject: 'worker-subject',
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
    await expect(probe.cleanupTenant(fixture.tenantId)).resolves.toEqual({ remainingRows: 0, clean: true });
    expect(await adapter.client.select().from(tenants).where(eq(tenants.id, fixture.tenantId))).toEqual([]);
  });

  it('S8監査は対象actor/workspace/actionの許可イベントだけを数える', async () => {
    const probe = createHearingSmokeDbProbe(asCore(adapter));
    const fixture = await probe.createTenantFixture({
      slug: 'hearing-smoke-audit-delta',
      memberIdpSubject: 'member-audit-delta',
      workerIdpSubject: 'worker-audit-delta',
      providerAdminIdpSubject: 'provider-audit-delta',
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
