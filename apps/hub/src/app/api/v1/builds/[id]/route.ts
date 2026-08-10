/**
 * GET /api/v1/builds/:id — Build 詳細と工程履歴 (SYS-BUILD-PIPELINE-BOARD-P05 / docs/backend-spec.md §4.4)。
 *
 * 応答の `can_manage` は role 文字列の比較ではなく `authz.can('builds.stage_change')` から作る。
 * 画面が「操作ボタンを出すか」を自前の role 判定で決めると、認可表 (B9) と UI の判断が二重化し、
 * 表を直しても画面が追従しない状態になる。判定の正本は常に規則表側に置く (feedback-loop と同型)。
 */
import { createRepositoryContext } from '@harness-hub/db';
import { problemDetails } from '@harness-hub/schemas';

import { problemResponse } from '../../../../../features/build-pipeline-board/http.js';
import { buildPipelineBoardRuntime } from '../../../../../features/build-pipeline-board/runtime.js';
import { authRuntime, requestScopedResource, withAuthz } from '../../../../../lib/authz/index.js';

interface BuildParams {
  readonly id: string;
}

export const GET = withAuthz<BuildParams>(
  {
    action: 'builds.read',
    deps: () => authRuntime().authz,
    resolveResource: async (request, params) => requestScopedResource(request, { type: 'build', id: params.id }),
  },
  async (_request, authz, params) => {
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

    const detail = await buildPipelineBoardRuntime().service.getBuild({
      context: createRepositoryContext({
        tenantId: authz.resource.tenantId,
        workspaceId,
        actorId: authz.principal.userId,
      }),
      workspaceId,
      id: params.id,
      canManage: authz.can('builds.stage_change'),
    });
    if (detail === null) {
      return problemResponse(problemDetails({ title: 'Build が見つかりません', status: 404 }));
    }
    return Response.json(detail);
  },
);
