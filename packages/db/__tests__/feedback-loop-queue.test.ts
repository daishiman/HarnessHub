import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { TursoAdapter } from '../connection/turso';
import { createCoreRepositories, createFeedbackRepository } from '../repository/composition';
import { createScopedCrud } from '../repository/crud';
import { builds } from '../schema/builds/schema';
import { workspaces } from '../schema/core/identity';
import { aiJobs } from '../schema/hearing-intake/schema';
import { createRepositoryContext } from '../src/context';
import { asCore, createLibsqlTestDb, TEST_KEK_B64 } from './support/test-db';

let adapter: TursoAdapter;

beforeEach(async () => {
  adapter = await createLibsqlTestDb();
});

afterEach(() => adapter.close());

async function seedActor(slug: string) {
  const core = createCoreRepositories({ adapter: asCore(adapter), kekBase64: TEST_KEK_B64 });
  const tenant = await core.tenants.create({ slug, name: `Tenant ${slug}`, plan: 'free' });
  const context = createRepositoryContext({ tenantId: tenant.id });
  const workspace = await createScopedCrud(asCore(adapter), workspaces).insert(context, {
    slug: `ws-${slug}`,
    name: `Workspace ${slug}`,
  });
  const user = await core.users.insert(context, {
    idpSubject: `sub-${slug}`,
    email: `${slug}@example.com`,
    name: `User ${slug}`,
    department: '品質改善',
    role: 'workspace-admin',
    status: 'active',
  });
  return {
    context: createRepositoryContext({
      tenantId: tenant.id,
      workspaceId: workspace.id as string,
      actorId: user.id,
    }),
    workspaceId: workspace.id as string,
    userId: user.id,
  };
}

function createInput(actor: Awaited<ReturnType<typeof seedActor>>, body = '検索結果の並び順を変えてほしい') {
  return {
    workspaceId: actor.workspaceId,
    projectId: 'proj-1',
    type: 'improvement' as const,
    priority: 'medium' as const,
    source: 'harness' as const,
    body,
    createdBy: actor.userId,
    buildPayloadJson: (feedbackId: string, code: string) =>
      JSON.stringify({ feedback_id: feedbackId, feedback_code: code, body }),
  };
}

describe('FL-DB: feedback_response AI queue (claim/lease-expiry/fail) の実 DB 往復', () => {
  it('queued の job を claim すると processing になり、claim 直後の再 claim は失敗する (二重取得防止)', async () => {
    const actor = await seedActor('claim');
    const repo = createFeedbackRepository(asCore(adapter));
    const feedback = await repo.createAndEnqueue(actor.context, createInput(actor));

    const jobsBefore = await adapter.client.select().from(aiJobs);
    expect(jobsBefore).toHaveLength(1);
    expect(jobsBefore[0]?.kind).toBe('feedback_response');
    expect(jobsBefore[0]?.refId).toBe(feedback.id);
    expect(jobsBefore[0]?.status).toBe('queued');

    const claimed = await repo.claimNextFeedbackResponseJob(actor.context, 'token-worker-1');
    expect(claimed?.status).toBe('processing');
    expect(claimed?.claimedByTokenId).toBe('token-worker-1');

    // まだ lease が切れていない processing 行は queued 扱いされず、再 claim は何も返さない。
    expect(await repo.claimNextFeedbackResponseJob(actor.context, 'token-worker-2')).toBeNull();
  });

  it('lease 切れの processing job は他 token が再 claim できる (leaseExpiresAt<=now による再取得)', async () => {
    const actor = await seedActor('lease-expiry');
    const repo = createFeedbackRepository(asCore(adapter));
    const feedback = await repo.createAndEnqueue(actor.context, createInput(actor));

    const claimed = await repo.claimNextFeedbackResponseJob(actor.context, 'token-worker-stale', 1_000);
    expect(claimed?.status).toBe('processing');
    const claimedJobId = claimed?.id ?? '';

    // まだ lease 内なので別 token の claim は不可。
    expect(await repo.claimNextFeedbackResponseJob(actor.context, 'token-worker-fresh')).toBeNull();

    // 実行環境の clock を差し替えず、lease を強制的に過去へ書き換えて期限切れを再現する。
    await adapter.client
      .update(aiJobs)
      .set({ leaseExpiresAt: Date.now() - 1_000 })
      .where(eq(aiJobs.id, claimedJobId));

    const reclaimed = await repo.claimNextFeedbackResponseJob(actor.context, 'token-worker-fresh');
    expect(reclaimed?.id).toBe(claimedJobId);
    expect(reclaimed?.status).toBe('processing');
    expect(reclaimed?.claimedByTokenId).toBe('token-worker-fresh');

    // claim し直しても対象 feedback は変わらず同じ行を指す。
    expect(reclaimed?.refId).toBe(feedback.id);
  });

  it('別 token による complete/fail は claim した token だけを許す CAS 拒否を返す', async () => {
    const actor = await seedActor('cas-guard');
    const repo = createFeedbackRepository(asCore(adapter));
    await repo.createAndEnqueue(actor.context, createInput(actor));
    const claimed = await repo.claimNextFeedbackResponseJob(actor.context, 'token-owner');

    await expect(
      repo.completeFeedbackResponseJob(actor.context, claimed?.id ?? '', 'token-stranger', '{}', 'AI からの回答'),
    ).rejects.toThrow(/claim した token/);
    await expect(
      repo.failFeedbackResponseJob(actor.context, claimed?.id ?? '', 'token-stranger', 'synthetic failure'),
    ).rejects.toThrow(/claim した token/);
  });

  it('complete は ai_response/ai_job_id だけを書き戻し、feedbacks.status には触れない (SEC8-103)', async () => {
    const actor = await seedActor('complete');
    const repo = createFeedbackRepository(asCore(adapter));
    const feedback = await repo.createAndEnqueue(actor.context, createInput(actor));
    const claimed = await repo.claimNextFeedbackResponseJob(actor.context, 'token-worker');

    const completed = await repo.completeFeedbackResponseJob(
      actor.context,
      claimed?.id ?? '',
      'token-worker',
      JSON.stringify({ answer: 'ok' }),
      'AI からの回答',
    );
    expect(completed.status).toBe('completed');

    const updated = await repo.findFeedback(actor.context, feedback.id);
    expect(updated?.status).toBe('open');
    expect(updated?.aiResponse).toBe('AI からの回答');
    expect(updated?.aiJobId).toBe(claimed?.id);

    // AiJob complete・feedback への応答書戻し・Build 作成は同じ transaction で完了する。
    // type=improvement は design から始まり、feedback_id は一意に保持される。
    const createdBuilds = await adapter.client.select().from(builds).where(eq(builds.feedbackId, feedback.id));
    expect(createdBuilds).toHaveLength(1);
    expect(createdBuilds[0]).toMatchObject({
      tenantId: actor.context.tenantId,
      workspaceId: actor.workspaceId,
      feedbackId: feedback.id,
      type: 'improvement',
      stage: 'design',
    });
  });

  it('3 回失敗で job=dead になり、maxAttempts 未満では queued へ再投入される (attempt 上限の dead 遷移)', async () => {
    const actor = await seedActor('dead');
    const repo = createFeedbackRepository(asCore(adapter));
    const feedback = await repo.createAndEnqueue(actor.context, createInput(actor));

    let lastFailed: Awaited<ReturnType<typeof repo.failFeedbackResponseJob>> | undefined;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const claimed = await repo.claimNextFeedbackResponseJob(actor.context, 'token-worker');
      expect(claimed).not.toBeNull();
      if (attempt < 3) {
        // dead になる前段の失敗は queued に戻り、再 claim できることを確認する。
        const failed = await repo.failFeedbackResponseJob(
          actor.context,
          claimed?.id ?? '',
          'token-worker',
          `failure ${attempt}`,
        );
        expect(failed.status).toBe('queued');
        expect(failed.attempt).toBe(attempt);
        lastFailed = failed;
      } else {
        const failed = await repo.failFeedbackResponseJob(
          actor.context,
          claimed?.id ?? '',
          'token-worker',
          `failure ${attempt}`,
        );
        expect(failed.status).toBe('dead');
        expect(failed.attempt).toBe(3);
        lastFailed = failed;
      }
    }

    expect(lastFailed?.status).toBe('dead');
    // SEC8-104: dead 化しても feedbacks.status は自動で退行しない (人手確認前提)。
    const finalFeedback = await repo.findFeedback(actor.context, feedback.id);
    expect(finalFeedback?.status).toBe('open');
    expect(finalFeedback?.aiResponse).toBeNull();

    // dead になった job はもう claim 対象にならない。
    expect(await repo.claimNextFeedbackResponseJob(actor.context, 'token-worker-after-dead')).toBeNull();
  });

  it('同一 tenant でも別 workspace の job は claim 対象に入らない (D4 workspace isolation)', async () => {
    const actor = await seedActor('workspace-scope');
    const otherWorkspace = await createScopedCrud(asCore(adapter), workspaces).insert(
      createRepositoryContext({ tenantId: actor.context.tenantId }),
      { slug: 'ws-other', name: 'Other workspace' },
    );
    const otherActor = {
      ...actor,
      workspaceId: otherWorkspace.id as string,
      context: createRepositoryContext({
        tenantId: actor.context.tenantId,
        workspaceId: otherWorkspace.id as string,
        actorId: actor.userId,
      }),
    };
    const repo = createFeedbackRepository(asCore(adapter));
    await repo.createAndEnqueue(otherActor.context, createInput(otherActor));

    expect(await repo.claimNextFeedbackResponseJob(actor.context, 'token-original-workspace')).toBeNull();
    expect(await repo.claimNextFeedbackResponseJob(otherActor.context, 'token-other-workspace')).toMatchObject({
      workspaceId: otherWorkspace.id,
      status: 'processing',
    });
  });

  it('countActionable は open かつ high の件数だけを tenant/workspace 境界内で数える', async () => {
    const actor = await seedActor('actionable');
    const other = await seedActor('actionable-other');
    const repo = createFeedbackRepository(asCore(adapter));

    const openHigh = await repo.createAndEnqueue(actor.context, {
      ...createInput(actor, '至急対応してほしい'),
      priority: 'high',
    });
    await repo.createAndEnqueue(actor.context, { ...createInput(actor, '低優先度'), priority: 'low' });
    const resolvedHigh = await repo.createAndEnqueue(actor.context, {
      ...createInput(actor, '対応済み'),
      priority: 'high',
    });
    await repo.updateFeedbackStatus(actor.context, resolvedHigh.id, 'resolved');

    // 別 tenant の open&high は数えない。
    await repo.createAndEnqueue(other.context, { ...createInput(other, '他社の至急対応'), priority: 'high' });

    expect(await repo.countActionable(actor.context, undefined, actor.userId)).toBe(1);
    expect(await repo.countActionable(actor.context, actor.workspaceId, actor.userId)).toBe(1);
    expect(await repo.countActionable(other.context, undefined, other.userId)).toBe(1);
    expect(openHigh.priority).toBe('high');
  });

  it('listRecentUpdated は tenant 内の直近更新順に limit 件だけ返す', async () => {
    const actor = await seedActor('recent');
    const repo = createFeedbackRepository(asCore(adapter));
    const first = await repo.createAndEnqueue(actor.context, createInput(actor, '1件目'));
    const second = await repo.createAndEnqueue(actor.context, createInput(actor, '2件目'));
    const third = await repo.createAndEnqueue(actor.context, createInput(actor, '3件目'));
    // 先に作った 1 件目を最後に更新し直し、更新順が createdAt 順と一致しないことを確認する。
    await repo.updateFeedbackStatus(actor.context, first.id, 'in_progress');

    const recent = await repo.listRecentUpdated(actor.context, 2, actor.workspaceId, actor.userId);
    expect(recent.map((row) => row.id)).toEqual([first.id, third.id]);
    expect(second.id).not.toBe(third.id);
  });
});
