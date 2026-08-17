import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { TursoAdapter } from '../connection/turso';
import { createCoreRepositories, createHearingIntakeRepository } from '../repository/composition';
import { createScopedCrud } from '../repository/crud';
import { workspaces } from '../schema/core/identity';
import { aiJobs, displayCodeCounters, hearingSheets } from '../schema/hearing-intake/schema';
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
    department: '業務改善',
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

function createInput(actor: Awaited<ReturnType<typeof seedActor>>, title = '請求書処理') {
  const form = {
    taskName: title,
    company: 'サンプル社',
    applicant: '山田',
    domain: '経理',
    issue: '転記が多い',
    tools: '表計算',
    hours: 40,
    people: 5,
    features: 'OCR',
    output: 'CSV',
    priority: 'high',
  };
  const estimate = {
    savedMinutesPerYear: 50_400,
    savedHoursPerYear: 840,
    savedAmountPerYear: 2_520_000,
  };
  return {
    workspaceId: actor.workspaceId,
    title,
    applicantUserId: actor.userId,
    formJson: JSON.stringify(form),
    estimateJson: JSON.stringify(estimate),
    buildPayloadJson: (sheetId: string, code: string) =>
      JSON.stringify({
        sheet_id: sheetId,
        sheet_code: code,
        form,
        estimate: {
          savedHoursPerYear: estimate.savedHoursPerYear,
          savedAmountPerYear: estimate.savedAmountPerYear,
        },
      }),
  };
}

const RESULT = JSON.stringify({
  generated_sections: {
    overview: '# 概要\n自動化します。',
    issue: '転記が多い',
    feature_tags: ['OCR'],
    estimated_effect: '年間 840 時間',
  },
});

describe('HI-DB: 受付番号・sheet snapshot・共通 AI queue の実 DB 往復', () => {
  it('採番・sheet INSERT・enqueue が 1 transaction で完了し、payload の ref が一致する', async () => {
    const actor = await seedActor('alpha');
    const repo = createHearingIntakeRepository(asCore(adapter));

    const created = await repo.createSheetAndEnqueue(actor.context, createInput(actor));
    expect(created.code).toBe('HS-0001');
    expect(created.status).toBe('generating');
    expect(created.department).toBe('業務改善');

    const jobs = await adapter.client.select().from(aiJobs);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.kind).toBe('sheet_generation');
    expect(jobs[0]?.refId).toBe(created.id);
    expect(JSON.parse(jobs[0]?.payloadJson ?? '{}')).toMatchObject({
      sheet_id: created.id,
      sheet_code: created.code,
    });
    expect(JSON.parse(created.formJson)).not.toHaveProperty('salary');
    expect(JSON.parse(created.estimateJson)).toMatchObject({ savedHoursPerYear: 840 });
  });

  it('payload 構築が失敗すると counter/sheet/job を 1 件も残さず、次回も HS-0001 になる', async () => {
    const actor = await seedActor('rollback');
    const repo = createHearingIntakeRepository(asCore(adapter));

    await expect(
      repo.createSheetAndEnqueue(actor.context, {
        ...createInput(actor),
        buildPayloadJson: () => {
          throw new Error('synthetic enqueue failure');
        },
      }),
    ).rejects.toThrow('synthetic enqueue failure');

    expect(await adapter.client.select().from(displayCodeCounters)).toHaveLength(0);
    expect(await adapter.client.select().from(hearingSheets)).toHaveLength(0);
    expect(await adapter.client.select().from(aiJobs)).toHaveLength(0);
    expect((await repo.createSheetAndEnqueue(actor.context, createInput(actor))).code).toBe('HS-0001');
  });

  it('同一 tenant の並行提出は欠番・重複なしで HS-0001..HS-0003 を発行する', async () => {
    const actor = await seedActor('parallel');
    const repo = createHearingIntakeRepository(asCore(adapter));
    const rows = await Promise.all(
      ['A', 'B', 'C'].map((suffix) => repo.createSheetAndEnqueue(actor.context, createInput(actor, `業務 ${suffix}`))),
    );
    expect(rows.map((row) => row.code).sort()).toEqual(['HS-0001', 'HS-0002', 'HS-0003']);
  });

  it('tenant ごとに HS-0001 から独立採番し、一覧・ID 直指定でも越境しない', async () => {
    const a = await seedActor('tenant-a');
    const b = await seedActor('tenant-b');
    const repo = createHearingIntakeRepository(asCore(adapter));
    const sheetA = await repo.createSheetAndEnqueue(a.context, createInput(a, 'A の業務'));
    const sheetB = await repo.createSheetAndEnqueue(b.context, createInput(b, 'B の業務'));

    expect(sheetA.code).toBe('HS-0001');
    expect(sheetB.code).toBe('HS-0001');
    expect(await repo.findSheet(a.context, sheetB.id)).toBeNull();
    expect((await repo.listSheets(a.context, { limit: 50 })).items.map((row) => row.id)).toEqual([sheetA.id]);
  });

  it('同一 tenant でも別 workspace の sheet 更新と AI job claim を拒否する', async () => {
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
    const repo = createHearingIntakeRepository(asCore(adapter));
    const otherSheet = await repo.createSheetAndEnqueue(otherActor.context, createInput(otherActor));

    await expect(repo.updateSheetStatus(actor.context, otherSheet.id, 'completed')).rejects.toThrow(/hearing_sheets/);
    expect((await repo.findSheet(otherActor.context, otherSheet.id))?.status).toBe('generating');
    expect(await repo.claimNextSheetGenerationJob(actor.context, 'token-original-workspace')).toBeNull();
    expect(await repo.claimNextSheetGenerationJob(otherActor.context, 'token-other-workspace')).toMatchObject({
      workspaceId: otherWorkspace.id,
      status: 'processing',
    });
  });

  it('一覧を status・department・全文検索で絞り、cursor を返す', async () => {
    const actor = await seedActor('list-filter');
    const repo = createHearingIntakeRepository(asCore(adapter));
    const first = await repo.createSheetAndEnqueue(actor.context, createInput(actor, '請求書処理'));
    const second = await repo.createSheetAndEnqueue(actor.context, createInput(actor, '勤怠集計'));

    expect(
      (
        await repo.listSheets(actor.context, {
          workspaceId: actor.workspaceId,
          status: 'generating',
          department: '業務改善',
          query: '請求書',
          limit: 25,
        })
      ).items.map((row) => row.id),
    ).toEqual([first.id]);

    const page = await repo.listSheets(actor.context, { workspaceId: actor.workspaceId, limit: 1 });
    expect(page.items).toHaveLength(1);
    expect(page.nextCursor).not.toBeNull();
    if (page.nextCursor === null) throw new Error('first page must expose next cursor');
    const nextPage = await repo.listSheets(actor.context, {
      workspaceId: actor.workspaceId,
      cursor: page.nextCursor,
      limit: 1,
    });
    expect(nextPage.nextCursor).toBeNull();
    expect(new Set([...page.items, ...nextPage.items].map((row) => row.id))).toEqual(new Set([first.id, second.id]));
  });

  it('状態タブの件数は cursor と status を外した集合から数え、ページを送っても動かない', async () => {
    const actor = await seedActor('status-counts');
    const repo = createHearingIntakeRepository(asCore(adapter));
    const first = await repo.createSheetAndEnqueue(actor.context, createInput(actor, '請求書処理'));
    await repo.createSheetAndEnqueue(actor.context, createInput(actor, '勤怠集計'));
    // 1 件だけ完了へ送り、active / completed の内訳が分かれることを確かめる
    await repo.updateSheetStatus(actor.context, first.id, 'completed');

    const page = await repo.listSheets(actor.context, { workspaceId: actor.workspaceId, limit: 1 });
    // 1 件しか返していないのに、件数は 2 件の集合から数えた値になる (受入条件 6)
    expect(page.items).toHaveLength(1);
    expect(page.statusCounts).toEqual({ all: 2, active: 1, completed: 1, unknown: 0 });

    // 2 ページ目でも同じ件数。ページを送るたびに数字が動くと「絞り込めていない」と読まれる
    if (page.nextCursor === null) throw new Error('first page must expose next cursor');
    const nextPage = await repo.listSheets(actor.context, {
      workspaceId: actor.workspaceId,
      cursor: page.nextCursor,
      limit: 1,
    });
    expect(nextPage.statusCounts).toEqual({ all: 2, active: 1, completed: 1, unknown: 0 });

    // 状態で絞っても件数は変わらない。ここで 0 になると、選択中以外のタブが全部 0 に見える
    const activeOnly = await repo.listSheets(actor.context, {
      workspaceId: actor.workspaceId,
      statuses: ['received', 'generating', 'review'],
      limit: 25,
    });
    expect(activeOnly.items).toHaveLength(1);
    expect(activeOnly.statusCounts).toEqual({ all: 2, active: 1, completed: 1, unknown: 0 });
  });

  it('pull→claim 者 complete→sheet review の往復が完結し、別 token は拒否する', async () => {
    const actor = await seedActor('complete');
    const repo = createHearingIntakeRepository(asCore(adapter));
    const sheet = await repo.createSheetAndEnqueue(actor.context, createInput(actor));

    const claimed = await repo.claimNextSheetGenerationJob(actor.context, 'token-worker');
    expect(claimed?.status).toBe('processing');
    await expect(
      repo.completeSheetGenerationJob(actor.context, claimed?.id ?? '', 'token-other', RESULT),
    ).rejects.toThrow(/claim した token/);

    const completed = await repo.completeSheetGenerationJob(actor.context, claimed?.id ?? '', 'token-worker', RESULT);
    expect(completed.status).toBe('completed');
    const updated = await repo.findSheet(actor.context, sheet.id);
    expect(updated?.status).toBe('review');
    expect(updated?.aiJobResultJson).toBe(RESULT);
  });

  it('3 回失敗で job=dead、sheet=received に戻り再生成可能になる', async () => {
    const actor = await seedActor('dead');
    const repo = createHearingIntakeRepository(asCore(adapter));
    const sheet = await repo.createSheetAndEnqueue(actor.context, createInput(actor));

    let failedStatus = '';
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const claimed = await repo.claimNextSheetGenerationJob(actor.context, 'token-worker');
      expect(claimed).not.toBeNull();
      const failed = await repo.failSheetGenerationJob(
        actor.context,
        claimed?.id ?? '',
        'token-worker',
        `failure ${attempt}`,
      );
      failedStatus = failed.status;
    }

    expect(failedStatus).toBe('dead');
    expect((await repo.findSheet(actor.context, sheet.id))?.status).toBe('received');
  });

  it('countActionable は review または ai_job dead の件数だけを tenant/workspace 境界内で数える', async () => {
    const actor = await seedActor('actionable');
    const other = await seedActor('actionable-other');
    const repo = createHearingIntakeRepository(asCore(adapter));

    // review: 生成完了して見積確認待ちになった 1 件。
    const reviewSheet = await repo.createSheetAndEnqueue(actor.context, createInput(actor, '見積確認待ち'));
    const claimedForReview = await repo.claimNextSheetGenerationJob(actor.context, 'token-review');
    await repo.completeSheetGenerationJob(actor.context, claimedForReview?.id ?? '', 'token-review', RESULT);

    // dead: 3 回失敗させた 1 件 (ai_job_status のみが対象で sheet 自体は received に戻る)。
    await repo.createSheetAndEnqueue(actor.context, createInput(actor, '生成失敗'));
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const claimed = await repo.claimNextSheetGenerationJob(actor.context, 'token-dead');
      await repo.failSheetGenerationJob(actor.context, claimed?.id ?? '', 'token-dead', `failure ${attempt}`);
    }

    // generating のまま (未処理) の 1 件は対象外。
    await repo.createSheetAndEnqueue(actor.context, createInput(actor, '処理中'));

    // 別 tenant の review は数えない。
    const otherReview = await repo.createSheetAndEnqueue(other.context, createInput(other, '他社の見積確認待ち'));
    const claimedOther = await repo.claimNextSheetGenerationJob(other.context, 'token-other');
    await repo.completeSheetGenerationJob(other.context, claimedOther?.id ?? '', 'token-other', RESULT);

    expect(await repo.countActionable(actor.context)).toBe(2);
    expect(await repo.countActionable(actor.context, actor.workspaceId)).toBe(2);
    expect(await repo.countActionable(other.context)).toBe(1);
    expect(reviewSheet.id).not.toBe(otherReview.id);
  });

  it('listRecentUpdated は tenant 内の直近更新順に limit 件だけ返す', async () => {
    const actor = await seedActor('recent');
    const repo = createHearingIntakeRepository(asCore(adapter));
    const first = await repo.createSheetAndEnqueue(actor.context, createInput(actor, '1件目'));
    const second = await repo.createSheetAndEnqueue(actor.context, createInput(actor, '2件目'));
    const third = await repo.createSheetAndEnqueue(actor.context, createInput(actor, '3件目'));
    // 先に作った 1 件目を最後に更新し直し、更新順が createdAt 順と一致しないことを確認する。
    await repo.updateSheetStatus(actor.context, first.id, 'review');

    const recent = await repo.listRecentUpdated(actor.context, 2, actor.workspaceId, actor.userId);
    expect(recent.map((row) => row.id)).toEqual([first.id, third.id]);
    expect(second.id).not.toBe(third.id);
  });
});
