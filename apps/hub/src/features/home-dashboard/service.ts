/**
 * ホーム画面集約サービス (design-judgment/ux-design §9: 要対応→次のアクション→最近の動き)。
 *
 * **この層が持つもの。** sheets/feedback/builds 3 サービスの `getActionableSummary` を
 * 並列に呼び、1つのレスポンスへ束ねるだけ。件数の定義や recentItems の中身は各 feature の
 * service (docstring 参照) が正本を持ち、ここでは再計算しない。
 *
 * **この層が持たないもの。**
 * - 認可判定そのもの。route の `withAuthz` が `dashboard.summary_read` (workspace member なら到達可) を
 *   検査するが、それは「集約 API へ到達できるか」だけであり、「どの機能のデータを見せてよいか」は
 *   別問題 (計画のリスク事項「権限混入」)。呼び出し側 (route) が機能ごとに
 *   `sessionActionVisible(role, 'sheets.read_all' | 'feedback.read' | 'builds.read')` を判定し、
 *   `visibility` として渡す。ここでは渡された可否をそのまま尊重するだけで、role を見ない。
 * - docs/users の集約。両者とも「要対応」に相当する状態を持たない
 *   (docs は文書の鮮度概念がなく、users は個々のレコードに対応要否という概念がない)。
 *   3機能に絞ったホームへ強引に含めると、意味のない0件セクションが並ぶだけで
 *   ux-design §9の「偽の緊急性・意味のない数字を出さない」規律に反するため対象外にした。
 */
import type { RepositoryContext } from '@harness-hub/db';

import type { BuildPipelineBoardService } from '../build-pipeline-board/service.js';
import type { FeedbackLoopService } from '../feedback-loop/service.js';
import type { HearingIntakeService } from '../hearing-intake/service.js';
import { type HomeSectionVisibility, type HomeSummaryResponse, homeSummaryResponseSchema } from './dto.js';

/** ホームは「直近の動き」の一覧であって業務一覧の代替ではないため、件数を絞る (§2-1 上位N件)。 */
const RECENT_LIMIT = 5;

const emptySummary = { actionableCount: 0, recentItems: [] } as const;

export interface HomeDashboardService {
  getSummary(input: {
    readonly context: RepositoryContext;
    readonly workspaceId: string;
    readonly actorUserId: string;
    readonly visibility: HomeSectionVisibility;
  }): Promise<HomeSummaryResponse>;
}

export function createHomeDashboardService(deps: {
  readonly hearingIntake: HearingIntakeService;
  readonly feedbackLoop: FeedbackLoopService;
  readonly buildPipelineBoard: BuildPipelineBoardService;
}): HomeDashboardService {
  return {
    async getSummary(input) {
      const [sheets, feedback, builds] = await Promise.all([
        input.visibility.sheets
          ? deps.hearingIntake.getActionableSummary({
              context: input.context,
              workspaceId: input.workspaceId,
              actorUserId: input.actorUserId,
              readAllActionable: input.visibility.sheetsReadAll,
              recentLimit: RECENT_LIMIT,
            })
          : Promise.resolve(emptySummary),
        input.visibility.feedback
          ? deps.feedbackLoop.getActionableSummary({
              context: input.context,
              workspaceId: input.workspaceId,
              actorUserId: input.actorUserId,
              recentLimit: RECENT_LIMIT,
            })
          : Promise.resolve(emptySummary),
        input.visibility.builds
          ? deps.buildPipelineBoard.getActionableSummary({
              context: input.context,
              workspaceId: input.workspaceId,
              actorUserId: input.actorUserId,
              recentLimit: RECENT_LIMIT,
            })
          : Promise.resolve(emptySummary),
      ]);

      return homeSummaryResponseSchema.parse({
        sheets: {
          visible: input.visibility.sheets,
          actionable_count: sheets.actionableCount,
          recent_items: sheets.recentItems,
        },
        feedback: {
          visible: input.visibility.feedback,
          actionable_count: feedback.actionableCount,
          recent_items: feedback.recentItems,
        },
        builds: {
          visible: input.visibility.builds,
          actionable_count: builds.actionableCount,
          recent_items: builds.recentItems,
        },
      });
    },
  };
}
