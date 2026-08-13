/**
 * feat-build-pipeline-board のアプリケーションサービス
 * (SYS-BUILD-PIPELINE-BOARD-P05 / docs/backend-spec.md §4.4 builds API / §5.3 Build 状態機械)。
 *
 * **この層が持つもの。** 「DB 行の取り出し方」と「wire 表現の組み立て方」の接合だけ。
 *
 * **この層が持たないもの。**
 * - 認可判定 (SEC2 / B9 共有認可表)。route の `withAuthz` が唯一の決定点で、ここでは role を見ない。
 * - 状態機械の判定 (隣接性・CAS・publish 前提)。`packages/db` の `BuildStageRepository` が持ち、
 *   本層は例外をそのまま route へ透過させる。判定を写すと状態機械が 2 箇所に割れる。
 * - 監査 event の append (SEC6)。route が成功後に `AuditLogger` へ記録する。
 *
 * 一覧・詳細を `listBoard` (workspace 単位の一括取得) の上に組み立てているのは、
 * `BuildStageRepository` が公開する読取口がそれだけであり、`packages/db` は本 task の
 * 書込スコープ外だからである。1 workspace の Build 件数は S13 のボードに載る規模を前提としており、
 * 件数が板の表示限界を超えた時点で repository 側へ絞り込み付きの読取を足すのが次の一手になる。
 */
import type { BuildRow, BuildStageRepository, RepositoryContext } from '@harness-hub/db';
import {
  type BuildDetailResponse,
  type BuildListItem,
  type BuildListQuery,
  type BuildListResponse,
  type BuildStageTransitionRequest,
  type BuildStageTransitionResponse,
  buildDetailResponseSchema,
  buildListResponseSchema,
  buildStageTransitionResponseSchema,
} from '@harness-hub/schemas';

import { computeBuildRisk, fallbackBuildTitle, toBuildListItem, toBuildStageEvent } from './dto.js';
import { InvalidBuildCursorError } from './errors.js';

/**
 * Build の見出しを接続元から引くための境界。
 *
 * `builds` テーブルは題名列を持たない (contracts.ts §`title`)。題名の正本は hearing sheet か
 * feedback の側にあり、Build はその参照 ID だけを持つ。二重に持つと片方だけ更新された状態が生まれる。
 * 参照先の repository を service が直接握ると build-pipeline-board が
 * hearing-intake / feedback-loop の repository へ依存してしまうため、port として切り出す。
 */
export interface BuildSourceTitlePort {
  titleForSheet(context: RepositoryContext, sheetId: string): Promise<string | null>;
  titleForFeedback(context: RepositoryContext, feedbackId: string): Promise<string | null>;
}

/** 接続元を引かない実装。題名は常に既定値になる (port 未接続でも一覧が 500 にならない)。 */
export const noSourceTitles: BuildSourceTitlePort = {
  titleForSheet: async () => null,
  titleForFeedback: async () => null,
};

export interface BuildPipelineBoardService {
  /** GET /api/v1/builds。workspace 単位で `id` の降順 (新しい順) に cursor ページングする。 */
  listBuilds(input: {
    readonly context: RepositoryContext;
    readonly workspaceId: string;
    readonly query: BuildListQuery;
  }): Promise<BuildListResponse>;
  /** GET /api/v1/builds/:id。見つからなければ null (route が 404 へ写す)。 */
  getBuild(input: {
    readonly context: RepositoryContext;
    readonly workspaceId: string;
    readonly id: string;
    readonly canManage: boolean;
  }): Promise<BuildDetailResponse | null>;
  /**
   * POST /api/v1/builds/:id/stage。状態機械違反は repository の例外
   * (`InvalidStageTransitionError` / `StageCasConflictError` / `PublishRequestNotPublishedError`) が
   * そのまま伝播する。route が HTTP status へ写す。
   */
  transitionStage(input: {
    readonly context: RepositoryContext;
    readonly workspaceId: string;
    readonly id: string;
    readonly actorUserId: string;
    readonly request: BuildStageTransitionRequest;
  }): Promise<BuildStageTransitionResponse>;
  /**
   * ホーム集約向け。要対応件数と直近更新 N 件を 1 度に返す。
   *
   * risk は DB 列でなく `dto.ts` の `computeBuildRisk` によるその場算出値 (停滞日数由来) なので、
   * SQL で件数を絞れない。本人が触った Build だけを取得し、risk を JS 側でカウントする
   * (1 workspace の Build 件数は S13 ボードの表示限界を前提にしており、listBuilds と同じ制約)。
   * 要対応件数は `risk:'blocked'` のみを数える (`'warn'` は次点として recentItems 側で見せる)。
   */
  getActionableSummary(input: {
    readonly context: RepositoryContext;
    readonly workspaceId: string;
    readonly actorUserId: string;
    readonly recentLimit: number;
  }): Promise<BuildActionableSummary>;
}

export interface BuildActionableSummary {
  readonly actionableCount: number;
  readonly recentItems: readonly BuildListItem[];
}

export interface BuildPipelineBoardServiceOptions {
  readonly titles?: BuildSourceTitlePort | undefined;
  /** リスク算出の基準時刻。テストから固定できるように注入可能にしてある。 */
  readonly now?: (() => number) | undefined;
}

export function createBuildPipelineBoardService(
  repository: BuildStageRepository,
  options: BuildPipelineBoardServiceOptions = {},
): BuildPipelineBoardService {
  const titles = options.titles ?? noSourceTitles;
  const now = options.now ?? (() => Date.now());

  async function resolveTitle(context: RepositoryContext, row: BuildRow): Promise<string> {
    // sheet / feedback は「片方だけが入る」契約 (contracts.ts)。両方 null の行は手動起票なので既定値になる。
    const resolved =
      row.sheetId !== null
        ? await titles.titleForSheet(context, row.sheetId)
        : row.feedbackId !== null
          ? await titles.titleForFeedback(context, row.feedbackId)
          : null;
    return resolved ?? fallbackBuildTitle(row);
  }

  /** workspace 内の全 Build を新しい順 (ULID の降順) に平坦化して返す。 */
  async function listRowsDesc(context: RepositoryContext, workspaceId: string): Promise<readonly BuildRow[]> {
    const columns = await repository.listBoard(context, { workspaceId });
    return columns.flatMap((column) => column.builds).sort((left, right) => (left.id < right.id ? 1 : -1));
  }

  async function toItems(
    context: RepositoryContext,
    rows: readonly BuildRow[],
    nowMillis: number,
  ): Promise<readonly BuildListItem[]> {
    const resolved: BuildListItem[] = [];
    for (const row of rows) {
      resolved.push(toBuildListItem(row, await resolveTitle(context, row), nowMillis));
    }
    return resolved;
  }

  return {
    async listBuilds(input) {
      const nowMillis = now();
      const all = await listRowsDesc(input.context, input.workspaceId);
      const filtered = all.filter(
        (row) =>
          (input.query.stage === undefined || row.stage === input.query.stage) &&
          (input.query.type === undefined || row.type === input.query.type),
      );

      // cursor は「前ページ末尾の Build id」。ULID は生成時刻順に単調増加するので、
      // 降順一覧では「cursor より小さい id」が次ページになる (行の追加削除で欠落・重複しない)。
      let afterCursor = filtered;
      if (input.query.cursor !== undefined) {
        const cursorIndex = filtered.findIndex((row) => row.id === input.query.cursor);
        if (cursorIndex === -1) {
          // `slice(-1 + 1)` は先頭ページを返し、古い/別条件の cursor を成功に見せかける。
          // ページ境界の欠落・重複を避けるため、domain error として fail-closed にする。
          throw new InvalidBuildCursorError(input.query.cursor);
        }
        afterCursor = filtered.slice(cursorIndex + 1);
      }
      const page = afterCursor.slice(0, input.query.limit);
      const hasMore = afterCursor.length > page.length;

      return buildListResponseSchema.parse({
        items: await toItems(input.context, page, nowMillis),
        next_cursor: hasMore ? (page.at(-1)?.id ?? null) : null,
      });
    },

    async getBuild(input) {
      const rows = await listRowsDesc(input.context, input.workspaceId);
      const row = rows.find((candidate) => candidate.id === input.id);
      if (row === undefined) return null;

      const events = await repository.listStageEvents(input.context, row.id);
      return buildDetailResponseSchema.parse({
        ...toBuildListItem(row, await resolveTitle(input.context, row), now()),
        stage_events: events.map(toBuildStageEvent),
        can_manage: input.canManage,
      });
    },

    async transitionStage(input) {
      const result = await repository.transitionStage(input.context, {
        buildId: input.id,
        expectedStage: input.request.expected_stage,
        toStage: input.request.to_stage,
        actorUserId: input.actorUserId,
        reason: input.request.reason ?? null,
      });
      return buildStageTransitionResponseSchema.parse({
        build: toBuildListItem(result.build, await resolveTitle(input.context, result.build), now()),
        event: toBuildStageEvent(result.event),
      });
    },

    async getActionableSummary(input) {
      const nowMillis = now();
      const touchedFilter = { workspaceId: input.workspaceId, actorUserId: input.actorUserId };
      const [recentRows, allTouchedRows] = await Promise.all([
        repository.listRecentTouchedBuilds(input.context, { ...touchedFilter, limit: input.recentLimit }),
        repository.listRecentTouchedBuilds(input.context, touchedFilter),
      ]);
      const items = await toItems(input.context, recentRows, nowMillis);
      // 件数は recent の上限に左右されず、本人が触った全 Build のうち停止中だけを数える。
      // 題名は件数算出に不要なので、全件の title 解決は行わない。
      const actionableCount = allTouchedRows.filter(
        (row) => computeBuildRisk(row.stage, row.updatedAt, nowMillis) === 'blocked',
      ).length;
      return { actionableCount, recentItems: items };
    },
  };
}
