/**
 * Studio 拡張: `builds` テーブル (ADR §7 P10 差し戻しによる再設計 / §12)。
 *
 * `docs/backend-spec-api-state.md` §5.3 が定める Build 7 工程状態機械のうち、本 task が実装するのは
 * 「AiJob(`feedback_response`) 完了時に feedback_id 一意で行を冪等作成する」最小範囲だけである。
 * CRUD API (`GET/POST /api/v1/builds` 等)・7 工程遷移 UI・`hearing-intake` (`sheet_generation`) 側の
 * Build 化はスコープ外のまま (`sheet_id` は列だけ確保し、この task では書き込まない)。
 */
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const BUILD_TYPES = ['hearing', 'improvement', 'review', 'bug'] as const;
export const BUILD_STAGES = ['hearing', 'requirements', 'design', 'build', 'test', 'review', 'publish'] as const;
/** カードのリスク表示。通常は停滞日数からの算出値で、この集合は人手の上書き値としてだけ列に載る。 */
export const BUILD_RISKS = ['none', 'warn', 'blocked'] as const;

export const builds = sqliteTable(
  'builds',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    workspaceId: text('workspace_id').notNull(),
    type: text('type', { enum: BUILD_TYPES }).notNull(),
    stage: text('stage', { enum: BUILD_STAGES }).notNull(),
    // 将来の hearing-intake 接続用に列だけ確保する。本 task では書き込まない (ADR §7)。
    sheetId: text('sheet_id'),
    // feedback-loop からの冪等作成キー。一意制約で二重作成を DB 側でも防ぐ。
    feedbackId: text('feedback_id'),
    publishRequestId: text('publish_request_id'),
    /**
     * カード編集 (PATCH /api/v1/builds/:id) の手入力。null は「上書きなし」で、
     * 表示値は接続元由来の算出値へ戻る。算出値そのものをここへ焼き付けない
     * (焼き付けると接続元の題名を直しても Build 側が古いまま残る)。
     */
    titleOverride: text('title_override'),
    /** 停滞日数からの算出リスクを人手で上書きする。null なら算出値をそのまま使う。 */
    riskOverride: text('risk_override', { enum: BUILD_RISKS }),
    assigneeUserId: text('assignee_user_id'),
    note: text('note'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    uniqueIndex('builds_feedback_id_uq').on(t.feedbackId),
    // 接続元 1 件につき Build 1 件。二重起票の防止を route の事前確認ではなく DB 側に置く
    // (SELECT→INSERT の隙間で並行要求が両方通るため)。
    uniqueIndex('builds_sheet_id_uq').on(t.sheetId),
    index('builds_tenant_workspace_stage_updated_idx').on(t.tenantId, t.workspaceId, t.stage, t.updatedAt),
  ],
);
