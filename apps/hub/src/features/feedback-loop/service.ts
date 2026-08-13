import type { FeedbackRepository, FeedbackRow, RepositoryContext } from '@harness-hub/db';
import {
  type CreateFeedbackRequest,
  type CreateFeedbackResponse,
  createFeedbackResponseSchema,
  type FeedbackDetail,
  type FeedbackListItem,
  type FeedbackListQuery,
  type FeedbackListResponse,
  type FeedbackSource,
  type FeedbackStatus,
  feedbackDetailSchema,
  feedbackListItemSchema,
  feedbackListResponseSchema,
  isValidFeedbackStatusTransition,
} from '@harness-hub/schemas';

import type { NotificationChannel } from '../../shared/notification/index.js';
import { buildFeedbackResponsePayload } from './ai-job-adapter/index.js';

/**
 * resolved 通知の channel 組み立て (D6/B8/SEC9, ADR §6)。
 * in_app は正本として必ず含み、email は user_settings.notify_feedback がオプトイン (true) のときだけ足す。
 */
export function resolveFeedbackNotificationChannels(notifyEmailOptIn: boolean): readonly NotificationChannel[] {
  return notifyEmailOptIn ? ['in_app', 'email'] : ['in_app'];
}

export interface FeedbackNotificationPort {
  notifyResolved(input: {
    readonly tenantId: string;
    readonly workspaceId: string;
    readonly recipientUserId: string;
    readonly feedbackId: string;
    readonly feedbackCode: string;
    readonly notifyEmailOptIn: boolean;
  }): Promise<void>;
}

const noNotification: FeedbackNotificationPort = {
  notifyResolved: async () => undefined,
};

export interface FeedbackLoopService {
  createFeedback(input: {
    readonly context: RepositoryContext;
    readonly workspaceId: string;
    readonly createdBy: string;
    readonly source: FeedbackSource;
    readonly request: CreateFeedbackRequest;
  }): Promise<CreateFeedbackResponse>;
  listFeedbacks(input: {
    readonly context: RepositoryContext;
    readonly workspaceId?: string;
    readonly query: FeedbackListQuery;
  }): Promise<FeedbackListResponse>;
  getFeedback(input: { readonly context: RepositoryContext; readonly id: string }): Promise<FeedbackDetail | null>;
  updateFeedbackStatus(input: {
    readonly context: RepositoryContext;
    readonly id: string;
    readonly status: FeedbackStatus;
  }): Promise<FeedbackDetail>;
  /**
   * ホーム集約向け。要対応件数(open かつ high)と直近更新 N 件を 1 度に返す。
   * home-dashboard/service.ts が権限確認後に呼ぶ内部集約用で、公開 API route は持たない。
   */
  getActionableSummary(input: {
    readonly context: RepositoryContext;
    readonly workspaceId?: string;
    readonly actorUserId: string;
    readonly recentLimit: number;
  }): Promise<FeedbackActionableSummary>;
}

export interface FeedbackActionableSummary {
  readonly actionableCount: number;
  readonly recentItems: readonly FeedbackListItem[];
}

function toListItem(row: FeedbackRow): FeedbackListItem {
  return feedbackListItemSchema.parse({
    id: row.id,
    code: row.code,
    project_id: row.projectId,
    type: row.type,
    priority: row.priority,
    source: row.source,
    status: row.status,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  });
}

function toDetail(row: FeedbackRow): FeedbackDetail {
  return feedbackDetailSchema.parse({
    ...toListItem(row),
    body: row.body,
    ai_response: row.aiResponse,
    ai_job_id: row.aiJobId,
    created_by: row.createdBy,
  });
}

export function createFeedbackLoopService(
  repository: FeedbackRepository,
  notifications: FeedbackNotificationPort = noNotification,
): FeedbackLoopService {
  return {
    async createFeedback(input) {
      const row = await repository.createAndEnqueue(input.context, {
        workspaceId: input.workspaceId,
        projectId: input.request.project_id,
        type: input.request.type,
        priority: input.request.priority,
        source: input.source,
        body: input.request.body,
        createdBy: input.createdBy,
        buildPayloadJson: (feedbackId, code) =>
          JSON.stringify(
            buildFeedbackResponsePayload({
              feedbackId,
              feedbackCode: code,
              type: input.request.type,
              body: input.request.body,
            }),
          ),
      });
      return createFeedbackResponseSchema.parse({ id: row.id, code: row.code, status: row.status });
    },

    async listFeedbacks(input) {
      const page = await repository.listFeedbacks(input.context, {
        ...(input.workspaceId === undefined ? {} : { workspaceId: input.workspaceId }),
        ...(input.query.status === undefined ? {} : { status: input.query.status }),
        ...(input.query.type === undefined ? {} : { type: input.query.type }),
        ...(input.query.project_id === undefined ? {} : { projectId: input.query.project_id }),
        ...(input.query.q === undefined ? {} : { query: input.query.q }),
        ...(input.query.cursor === undefined ? {} : { cursor: input.query.cursor }),
        limit: input.query.limit,
      });
      return feedbackListResponseSchema.parse({
        items: page.items.map(toListItem),
        next_cursor: page.nextCursor,
      });
    },

    async getFeedback(input) {
      const row = await repository.findFeedback(input.context, input.id);
      return row === null ? null : toDetail(row);
    },

    async updateFeedbackStatus(input) {
      const current = await repository.findFeedback(input.context, input.id);
      if (current === null) throw new Error('feedback が見つかりません');
      if (!isValidFeedbackStatusTransition(current.status, input.status)) {
        throw new Error(`不正な状態遷移です: ${current.status} → ${input.status}`);
      }
      const row = await repository.updateFeedbackStatus(input.context, input.id, input.status);

      if (row.status === 'resolved') {
        try {
          const notifyEmailOptIn = await repository.getNotifyFeedbackPreference(input.context, row.createdBy);
          await notifications.notifyResolved({
            tenantId: row.tenantId,
            workspaceId: row.workspaceId,
            recipientUserId: row.createdBy,
            feedbackId: row.id,
            feedbackCode: row.code,
            notifyEmailOptIn,
          });
        } catch {
          // 通知は補助経路。主操作 (status 遷移) の成功を通知失敗で失わせない (fire-and-forget)。
        }
      }
      return toDetail(row);
    },

    async getActionableSummary(input) {
      const [actionableCount, recentRows] = await Promise.all([
        repository.countActionable(input.context, input.workspaceId, input.actorUserId),
        repository.listRecentUpdated(input.context, input.recentLimit, input.workspaceId, input.actorUserId),
      ]);
      return { actionableCount, recentItems: recentRows.map(toListItem) };
    },
  };
}
