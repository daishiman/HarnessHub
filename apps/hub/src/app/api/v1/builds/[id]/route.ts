/**
 * GET /api/v1/builds/:id — Build 詳細と工程履歴 (SYS-BUILD-PIPELINE-BOARD-P05 / docs/backend-spec.md §4.4)。
 *
 * 応答の `can_manage` は role 文字列の比較ではなく `authz.can('builds.stage_change')` から作る。
 * 画面が「操作ボタンを出すか」を自前の role 判定で決めると、認可表 (B9) と UI の判断が二重化し、
 * 表を直しても画面が追従しない状態になる。判定の正本は常に規則表側に置く (feedback-loop と同型)。
 */
import { createRepositoryContext } from '@harness-hub/db';
import { type BuildDetailResponse, buildUpdateRequestSchema, problemDetails } from '@harness-hub/schemas';

import { buildMutationProblem } from '../../../../../features/build-pipeline-board/errors.js';
import { parseJsonRequest, problemResponse } from '../../../../../features/build-pipeline-board/http.js';
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

/**
 * PATCH /api/v1/builds/:id — カードの手入力欄 (題名・リスク・担当・メモ) だけを更新する。
 *
 * 3 値の意味論を持つ。key 無し=触れない / `null`=手入力を外して算出値へ戻す / 値=上書き。
 * 監査には**触れた欄の名前だけ**を残し、本文 (題名やメモの文字列) は載せない。
 * 台帳は「誰がいつ何を触ったか」の記録であり、業務内容の第二の保管場所ではない (SEC6)。
 */
export const PATCH = withAuthz<BuildParams>(
  {
    action: 'builds.update',
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

    const parsed = await parseJsonRequest(request, buildUpdateRequestSchema);
    if (!parsed.ok) return parsed.response;

    const instance = new URL(request.url).pathname;
    let detail: BuildDetailResponse;
    try {
      detail = await buildPipelineBoardRuntime().service.updateBuild({
        context: createRepositoryContext({
          tenantId: authz.resource.tenantId,
          workspaceId,
          actorId: authz.principal.userId,
        }),
        workspaceId,
        id: params.id,
        request: parsed.data,
        canManage: authz.can('builds.stage_change'),
      });
    } catch (error) {
      const problem = buildMutationProblem(error, instance);
      if (problem === null) throw error;
      return problemResponse(problem);
    }

    await authRuntime().authz.audit.record({
      actorSubject: authz.principal.userId,
      tenantId: authz.resource.tenantId,
      workspaceId,
      action: 'build.update',
      resourceType: 'build',
      resourceId: params.id,
      metadata: {
        fields: Object.keys(parsed.data).join(','),
        credential: authz.principal.credential,
      },
    });

    return Response.json(detail);
  },
);
