/**
 * `builds` の tenant-scoped repository (ADR §7 P10 差し戻し再設計 / §12)。
 *
 * この task が実装するのは唯一の書き込み経路 —
 * AiJob(`feedback_response`) 完了時に `feedback_id` 一意で行を冪等作成する `findOrCreateBuildForFeedback`
 * だけである。CRUD API・7 工程遷移は別 task (owner=feat-publish-pipeline) のスコープ。
 *
 * feedback-loop.ts と同じ D4 パターン: RepositoryContext を第 1 引数に取り、
 * context.workspaceId が指定されていれば書き込み対象と一致することを検査する。
 */
import { and, eq } from 'drizzle-orm';
import { type BUILD_STAGES, type BUILD_TYPES, builds } from '../schema/builds/schema';
import { RepositoryError } from '../src/errors';
import type { RepositoryContext } from '../src/types';
import { guardedWrite } from './conflict';
import type { CoreAdapter } from './db';
import { serverNow } from './time';
import { newUlid } from './ulid';

export type BuildRow = typeof builds.$inferSelect;
export type BuildType = (typeof BUILD_TYPES)[number];
export type BuildStage = (typeof BUILD_STAGES)[number];

export interface BuildFeedbackRef {
  readonly id: string;
  readonly workspaceId: string;
  readonly type: BuildType;
}

export interface BuildsRepository {
  /**
   * `feedback_id` 一意で `builds` 行を冪等作成する。既存行があれば新規作成せずそのまま返す
   * (ADR §7)。`initialStage` は呼び出し側 (route) が feedback.type から算出する
   * (`improvement/review`→`design`、`bug`→`test`)。
   */
  findOrCreateBuildForFeedback(
    context: RepositoryContext,
    feedback: BuildFeedbackRef,
    initialStage: BuildStage,
  ): Promise<BuildRow>;
}

export function createBuildsRepository(adapter: CoreAdapter): BuildsRepository {
  return {
    async findOrCreateBuildForFeedback(context, feedback, initialStage) {
      return guardedWrite(adapter, async () => {
        if (context.workspaceId !== undefined && context.workspaceId !== feedback.workspaceId) {
          throw new RepositoryError('invalid-context', 'context と feedback の workspaceId が一致しません');
        }
        const now = serverNow();
        const inserted = await adapter.client
          .insert(builds)
          .values({
            id: newUlid(now),
            tenantId: context.tenantId,
            workspaceId: feedback.workspaceId,
            type: feedback.type,
            stage: initialStage,
            sheetId: null,
            feedbackId: feedback.id,
            publishRequestId: null,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoNothing()
          .returning();
        const createdRow = inserted[0] as BuildRow | undefined;
        if (createdRow !== undefined) return createdRow;

        // 一意制約 (feedback_id) に競合した = 既に作成済み。冪等に既存行を返す。
        const existingRows = await adapter.client
          .select()
          .from(builds)
          .where(and(eq(builds.tenantId, context.tenantId), eq(builds.feedbackId, feedback.id)))
          .limit(1);
        const existing = existingRows[0] as BuildRow | undefined;
        if (existing === undefined) {
          throw new RepositoryError('conflict', 'builds 行の冪等作成に失敗しました (feedback_id の再取得に失敗)');
        }
        return existing;
      });
    },
  };
}
