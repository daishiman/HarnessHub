/**
 * home-dashboard の本番 composition root。
 *
 * 他 feature の runtime.ts と同じ契約: **route の import 時には環境変数へ触れない**。
 * 3 feature の runtime シングルトンをそのまま束ねるだけで、home-dashboard 自身は
 * DB 接続を持たない (hearing-intake/feedback-loop/build-pipeline-board の service を又借りする)。
 */
import { buildPipelineBoardRuntime } from '../build-pipeline-board/runtime.js';
import { feedbackLoopRuntime } from '../feedback-loop/runtime.js';
import { hearingIntakeRuntime } from '../hearing-intake/runtime.js';
import { createHomeDashboardService, type HomeDashboardService } from './service.js';

export interface HomeDashboardRuntime {
  readonly service: HomeDashboardService;
}

export function homeDashboardRuntime(source: Record<string, string | undefined> = process.env): HomeDashboardRuntime {
  return {
    service: createHomeDashboardService({
      hearingIntake: hearingIntakeRuntime(source).service,
      feedbackLoop: feedbackLoopRuntime(source).service,
      buildPipelineBoard: buildPipelineBoardRuntime(source).service,
    }),
  };
}
