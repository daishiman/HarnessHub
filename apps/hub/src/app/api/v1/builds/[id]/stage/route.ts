/**
 * POST /api/v1/builds/:id/stage — 7 工程の遷移
 * (SYS-BUILD-PIPELINE-BOARD-P05 / docs/backend-spec.md §3.3 認可マトリクス・§3.8 監査対象・§5.3 状態機械)。
 *
 * 3 つの不変条件をこの順で守る。
 * 1. **admin 限定 (SEC2)。** action `builds.stage_change` は規則表 (B9) で minRole=workspace-admin。
 *    provider-admin は上位 role として通り、越境は `withAuthz` が必ず監査へ落とす。
 * 2. **隣接遷移のみ・CAS・publish 前提 (§5.3 / B4)。** 判定は `BuildStageRepository` が持ち、
 *    ここでは例外を HTTP status へ写すだけ。route 側で先に隣接判定を写すと状態機械が 2 箇所へ割れる。
 * 3. **成功後にのみ `build.stage_change` を監査記録 (SEC6)。** 失敗経路は早期 return するので
 *    `audit.record` に到達しない — 「試みたが弾かれた」を成功として台帳に残さない。
 */
import { createRepositoryContext } from '@harness-hub/db';
import {
  type BuildStageTransitionResponse,
  buildStageTransitionRequestSchema,
  problemDetails,
} from '@harness-hub/schemas';

import { stageTransitionProblem } from '../../../../../../features/build-pipeline-board/errors.js';
import { parseJsonRequest, problemResponse } from '../../../../../../features/build-pipeline-board/http.js';
import { buildPipelineBoardRuntime } from '../../../../../../features/build-pipeline-board/runtime.js';
import { authRuntime, requestScopedResource, withAuthz } from '../../../../../../lib/authz/index.js';

interface BuildStageParams {
  readonly id: string;
}

export const POST = withAuthz<BuildStageParams>(
  {
    action: 'builds.stage_change',
    deps: () => authRuntime().authz,
    resolveResource: async (request, params) => requestScopedResource(request, { type: 'build', id: params.id }),
  },
  async (request, authz, params) => {
    const workspaceId = authz.resource.workspaceId;
    if (workspaceId === null) {
      return problemResponse(
        problemDetails({
          title: 'Workspace を指定してください',
          status: 400,
          detail: 'x-harness-workspace-id ヘッダーが必要です。',
        }),
      );
    }

    const parsed = await parseJsonRequest(request, buildStageTransitionRequestSchema);
    if (!parsed.ok) return parsed.response;

    const instance = new URL(request.url).pathname;
    let result: BuildStageTransitionResponse;
    try {
      result = await buildPipelineBoardRuntime().service.transitionStage({
        context: createRepositoryContext({
          tenantId: authz.resource.tenantId,
          workspaceId,
          actorId: authz.principal.userId,
        }),
        workspaceId,
        id: params.id,
        actorUserId: authz.principal.userId,
        request: parsed.data,
      });
    } catch (error) {
      const problem = stageTransitionProblem(error, instance);
      // 写像できない例外は運用上の異常。problem へ丸めると原因が応答本文に紛れて監視から消えるので再送出する。
      if (problem === null) throw error;
      return problemResponse(problem);
    }

    await authRuntime().authz.audit.record({
      actorSubject: authz.principal.userId,
      tenantId: authz.resource.tenantId,
      workspaceId,
      action: 'build.stage_change',
      resourceType: 'build',
      resourceId: params.id,
      metadata: {
        from_stage: result.event.from_stage,
        to_stage: result.event.to_stage,
        stage_event_id: result.event.id,
        credential: authz.principal.credential,
      },
    });

    return Response.json(result);
  },
);
