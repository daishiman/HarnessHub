/**
 * HD-SVC-*: home-dashboard/service.ts の集約とvisibility gating。
 *
 * 3 feature の `getActionableSummary` は fake で差し替え、home-dashboard 自身は
 * 「visible=false の機能を呼ばない・レスポンスへ含めない」ことだけを検証する
 * (件数の算出ロジック自体は各 feature 側のテストが担保する)。
 */
import { createRepositoryContext } from '@harness-hub/db';
import type { BuildListItem, FeedbackListItem, SheetListItem } from '@harness-hub/schemas';
import { describe, expect, it, vi } from 'vitest';

import type { BuildActionableSummary, BuildPipelineBoardService } from '../../features/build-pipeline-board/service.js';
import type { FeedbackActionableSummary, FeedbackLoopService } from '../../features/feedback-loop/service.js';
import type { HearingActionableSummary, HearingIntakeService } from '../../features/hearing-intake/service.js';
import { homeSummaryResponseSchema } from '../../features/home-dashboard/dto.js';
import { createHomeDashboardService } from '../../features/home-dashboard/service.js';

const context = createRepositoryContext({ tenantId: 'tenant-1', workspaceId: 'ws-1', actorId: 'user-1' });

const sheetItem: SheetListItem = {
  id: 'hs-1',
  code: 'HS-0001',
  status: 'review',
  title: '見積作成の自動化',
  domain: '見積',
  department: '営業',
  people: 2,
  hours: 40,
  applicant: { id: 'user-2', name: '申請 太郎' },
  updated_at: 1_000,
};

const feedbackItem: FeedbackListItem = {
  id: 'fb-1',
  code: 'FR-0001',
  project_id: 'proj-1',
  type: 'improvement',
  priority: 'high',
  source: 'harness',
  status: 'open',
  created_at: 900,
  updated_at: 1_100,
};

const buildItem: BuildListItem = {
  id: 'build-1',
  workspace_id: 'ws-1',
  type: 'improvement',
  stage: 'build',
  sheet_id: null,
  feedback_id: 'fb-1',
  publish_request_id: null,
  title: '改善要望対応',
  risk: 'blocked',
  created_at: 800,
  updated_at: 1_200,
};

function fakeHearingIntake(summary: HearingActionableSummary): HearingIntakeService {
  return { getActionableSummary: vi.fn(async () => summary) } as unknown as HearingIntakeService;
}
function fakeFeedbackLoop(summary: FeedbackActionableSummary): FeedbackLoopService {
  return { getActionableSummary: vi.fn(async () => summary) } as unknown as FeedbackLoopService;
}
function fakeBuildPipelineBoard(summary: BuildActionableSummary): BuildPipelineBoardService {
  return { getActionableSummary: vi.fn(async () => summary) } as unknown as BuildPipelineBoardService;
}

describe('HD-SVC: home-dashboard 集約サービス', () => {
  it('HD-SVC-001: 3機能とも visible=true なら実件数を束ねて返す', async () => {
    const hearingIntake = fakeHearingIntake({ actionableCount: 2, recentItems: [sheetItem] });
    const feedbackLoop = fakeFeedbackLoop({ actionableCount: 1, recentItems: [feedbackItem] });
    const buildPipelineBoard = fakeBuildPipelineBoard({ actionableCount: 3, recentItems: [buildItem] });
    const service = createHomeDashboardService({ hearingIntake, feedbackLoop, buildPipelineBoard });

    const result = await service.getSummary({
      context,
      workspaceId: 'ws-1',
      actorUserId: 'user-1',
      visibility: { sheets: true, sheetsReadAll: true, feedback: true, builds: true },
    });

    expect(result).toEqual({
      sheets: { visible: true, actionable_count: 2, recent_items: [sheetItem] },
      feedback: { visible: true, actionable_count: 1, recent_items: [feedbackItem] },
      builds: { visible: true, actionable_count: 3, recent_items: [buildItem] },
    });
  });

  it('HD-SVC-002: visible=false の機能は問い合わせず、0件visible=falseで返す (権限混入防止)', async () => {
    const hearingIntake = fakeHearingIntake({ actionableCount: 5, recentItems: [sheetItem] });
    const feedbackLoop = fakeFeedbackLoop({ actionableCount: 1, recentItems: [feedbackItem] });
    const buildPipelineBoard = fakeBuildPipelineBoard({ actionableCount: 3, recentItems: [buildItem] });
    const service = createHomeDashboardService({ hearingIntake, feedbackLoop, buildPipelineBoard });

    // member 相当: sheets.read_all を持たないため sheets だけ非表示。
    const result = await service.getSummary({
      context,
      workspaceId: 'ws-1',
      actorUserId: 'user-1',
      visibility: { sheets: false, sheetsReadAll: false, feedback: true, builds: true },
    });

    expect(result.sheets).toEqual({ visible: false, actionable_count: 0, recent_items: [] });
    expect(hearingIntake.getActionableSummary).not.toHaveBeenCalled();
    expect(result.feedback.actionable_count).toBe(1);
    expect(result.builds.actionable_count).toBe(3);
  });

  it('HD-DTO-001: visible=false は 0件かつ空配列以外を拒否する', () => {
    expect(() =>
      homeSummaryResponseSchema.parse({
        sheets: { visible: false, actionable_count: 1, recent_items: [sheetItem] },
        feedback: { visible: false, actionable_count: 0, recent_items: [] },
        builds: { visible: false, actionable_count: 0, recent_items: [] },
      }),
    ).toThrow();
  });
});
