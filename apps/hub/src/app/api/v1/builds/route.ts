/**
 * GET /api/v1/builds — Build 一覧 (SYS-BUILD-PIPELINE-BOARD-P05 / docs/backend-spec.md §4.4)。
 *
 * 閲覧は member 以上 (`builds.read`)。工程操作だけが admin 限定 (SEC2) であり、
 * 進捗の可視化そのものは workspace の全員に開く — 見えないと工程ボードが管理者専用の道具になる。
 *
 * 認可は `withAuthz` が唯一の入口 (B1/qa-023)。tenant/workspace の申告が無い要求は資源を確定できず、
 * ここで推測して補完しない (補完した瞬間に越境検査が到達不能になる)。
 */
import { createRepositoryContext } from '@harness-hub/db';
import {
  type BuildDetailResponse,
  type BuildListResponse,
  buildCreateRequestSchema,
  buildListQuerySchema,
  problemDetails,
  problemDetailsFromZodError,
} from '@harness-hub/schemas';

import { buildListProblem, buildMutationProblem } from '../../../../features/build-pipeline-board/errors.js';
import { parseJsonRequest, problemResponse } from '../../../../features/build-pipeline-board/http.js';
import { buildPipelineBoardRuntime } from '../../../../features/build-pipeline-board/runtime.js';
import { authRuntime, requestScopedResource, withAuthz } from '../../../../lib/authz/index.js';

export const GET = withAuthz(
  {
    action: 'builds.read',
    deps: () => authRuntime().authz,
    resolveResource: async (request) => requestScopedResource(request, { type: 'build_collection' }),
  },
  async (request, authz) => {
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

    const url = new URL(request.url);
    const parsed = buildListQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) {
      return problemResponse(problemDetailsFromZodError(parsed.error, { instance: url.pathname }));
    }
    // query の workspace_id は「読みたい workspace」の申告に過ぎず、認可の scope はヘッダー側で確定している。
    // 食い違ったまま query を優先すると、ヘッダーで通した認可と実際に読む範囲がずれる (scope の抜け道)。
    if (parsed.data.workspace_id !== undefined && parsed.data.workspace_id !== workspaceId) {
      return problemResponse(
        problemDetails({
          title: 'Workspace の指定が一致しません',
          status: 400,
          detail: 'workspace_id クエリと x-harness-workspace-id ヘッダーは同じ値にしてください。',
          instance: url.pathname,
        }),
      );
    }

    let result: BuildListResponse;
    try {
      result = await buildPipelineBoardRuntime().service.listBuilds({
        context: createRepositoryContext({
          tenantId: authz.resource.tenantId,
          workspaceId,
          actorId: authz.principal.userId,
        }),
        workspaceId,
        query: parsed.data,
      });
    } catch (error) {
      const problem = buildListProblem(error, url.pathname);
      if (problem === null) throw error;
      return problemResponse(problem);
    }
    // 表示側へ role 名や認可表を複製しない。API が同じ認可判定から capability を投影し、
    // member の DOM には押しても必ず 403 になる操作を最初から出さない。
    return Response.json({ ...result, can_manage: authz.can('builds.stage_change') });
  },
);

/**
 * POST /api/v1/builds — 手動起票 (連携が落ちたときの復旧経路)。
 *
 * 二重起票の防止は route の事前 SELECT ではなく `builds.sheet_id` の一意制約に置く。
 * 事前確認は SELECT と INSERT の隙間で同時要求が両方通る (TOCTOU) ため、
 * repository が driver の一意制約違反を `DuplicateBuildSourceError` へ写し、ここは 409 に写すだけにする。
 */
export const POST = withAuthz(
  {
    action: 'builds.create',
    deps: () => authRuntime().authz,
    resolveResource: async (request) => requestScopedResource(request, { type: 'build_collection' }),
  },
  async (request, authz) => {
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

    const parsed = await parseJsonRequest(request, buildCreateRequestSchema);
    if (!parsed.ok) return parsed.response;

    const instance = new URL(request.url).pathname;
    let detail: BuildDetailResponse;
    try {
      detail = await buildPipelineBoardRuntime().service.createBuild({
        context: createRepositoryContext({
          tenantId: authz.resource.tenantId,
          workspaceId,
          actorId: authz.principal.userId,
        }),
        workspaceId,
        actorUserId: authz.principal.userId,
        request: parsed.data,
        canManage: authz.can('builds.stage_change'),
      });
    } catch (error) {
      const problem = buildMutationProblem(error, instance);
      if (problem === null) throw error;
      return problemResponse(problem);
    }

    // 成功後にのみ記録する (SEC6)。失敗経路は早期 return で到達しないので、
    // 「試みたが弾かれた」が成功として台帳へ残らない。
    await authRuntime().authz.audit.record({
      actorSubject: authz.principal.userId,
      tenantId: authz.resource.tenantId,
      workspaceId,
      action: 'build.create',
      resourceType: 'build',
      resourceId: detail.id,
      metadata: {
        type: detail.type,
        stage: detail.stage,
        sheet_id: detail.sheet_id,
        feedback_id: detail.feedback_id,
        credential: authz.principal.credential,
      },
    });

    return Response.json(detail, { status: 201 });
  },
);
