/**
 * Build 工程遷移の tenant-scoped repository (docs/backend-spec.md §5.3 Build 状態機械 / §2.3 / D4)。
 *
 * 責務は「状態機械として正しい遷移だけを、原子的に、履歴つきで適用する」ことに限る。
 *
 * **ここで行わないこと。**
 * - **admin 限定の認可判定 (SEC2 / B9 共有認可表)。** route 層の単一認可 middleware の責務である。
 *   repository が role を見始めると、認可表が middleware と repository の 2 箇所に散り、
 *   deny-by-default の網羅性を 1 箇所で検査できなくなる。この層は「誰が呼んだか」を
 *   `actorUserId` として**記録するだけ**で、呼んでよいかは判断しない。
 * - **SEC6 の `build.stage_change` 監査 event の append。** hash chain 付き `audit_events` への追記は
 *   `AuditRepo` が持ち、route が呼ぶ。guardedWrite は再入禁止 (conflict.ts) なので、
 *   本 repository の書き込みゲート内から監査 repository を呼ぶと自己デッドロックする。
 *   本 file が書く `build_stage_events` は業務的な工程履歴であり、監査台帳とは別物。
 * - **publish 状態機械そのものの操作。** publish 工程へ進めてよいかを既存 `PublishRequest` に**問い合わせる**
 *   だけで、`publish_requests` は一切書き換えない (二重状態を作らない / B4)。
 */
import { and, asc, desc, eq, inArray, max } from 'drizzle-orm';
import { buildStageEvents } from '../schema/build-pipeline/schema';
import { BUILD_STAGES, builds } from '../schema/builds/schema';
import { EntityNotFoundError, RepositoryError } from '../src/errors';
import type { RepositoryContext } from '../src/types';
import type { BuildRisk, BuildRow, BuildStage, BuildType } from './builds';
import { errorChainText, guardedWrite } from './conflict';
import type { CoreAdapter } from './db';
import { createPublishRequestsRepo, type PublishRequestStatus } from './publish-requests';
import { serverNow } from './time';
import { newUlid } from './ulid';

export type BuildStageEventRow = typeof buildStageEvents.$inferSelect;

/**
 * publish 工程へ進むために `PublishRequest` が満たすべき状態 (B4)。
 * 値は `publish-requests.ts` の `PublishRequestStatus` から取り、文字列を独自に持たない。
 */
const REQUIRED_PUBLISH_STATUS: PublishRequestStatus = 'published';

/**
 * 隣接判定。`BUILD_STAGES` の**並び順**が正本で、index 差が ±1 の組だけを許す。
 * 逆行 (build → design) も隣接であれば許可する。差し戻しは通常運用に含まれるため。
 */
function isAdjacent(from: BuildStage, to: BuildStage): boolean {
  return Math.abs(BUILD_STAGES.indexOf(from) - BUILD_STAGES.indexOf(to)) === 1;
}

/** 状態機械が許さない遷移 (隣接でない / 同一工程)。入力書式は正しいので 422 相当。 */
export class InvalidStageTransitionError extends RepositoryError {
  readonly from: BuildStage;
  readonly to: BuildStage;

  constructor(from: BuildStage, to: BuildStage) {
    super('invalid-context', `工程 ${from} から ${to} へは遷移できません (隣接工程のみ許可)`);
    this.name = 'InvalidStageTransitionError';
    this.from = from;
    this.to = to;
  }
}

/**
 * CAS 敗北 (期待した現在工程と実際が違う)。並行する 2 人の admin がいれば正常に起こる事象で、
 * 呼び出し側は 409 を返して画面の再読込を促す。
 */
export class StageCasConflictError extends RepositoryError {
  readonly buildId: string;
  readonly expectedStage: BuildStage;
  readonly actualStage: BuildStage;

  constructor(buildId: string, expectedStage: BuildStage, actualStage: BuildStage) {
    super(
      'conflict',
      `build ${buildId} の工程は既に ${actualStage} です (期待した現在工程: ${expectedStage})。` +
        '画面を再読込してから操作し直してください。',
    );
    this.name = 'StageCasConflictError';
    this.buildId = buildId;
    this.expectedStage = expectedStage;
    this.actualStage = actualStage;
  }
}

/** publish 工程の前提 (接続済み PublishRequest が published) を満たさない。 */
export class PublishRequestNotPublishedError extends RepositoryError {
  readonly buildId: string;
  readonly publishRequestId: string | null;
  readonly actualStatus: PublishRequestStatus | null;

  constructor(buildId: string, publishRequestId: string | null, actualStatus: PublishRequestStatus | null) {
    super(
      'conflict',
      publishRequestId === null
        ? `build ${buildId} には PublishRequest が接続されていないため publish 工程へ進めません`
        : `PublishRequest ${publishRequestId} は ${actualStatus ?? '不明'} 状態です ` +
            `(publish 工程へ進めるのは ${REQUIRED_PUBLISH_STATUS} のときだけです)`,
    );
    this.name = 'PublishRequestNotPublishedError';
    this.buildId = buildId;
    this.publishRequestId = publishRequestId;
    this.actualStatus = actualStatus;
  }
}

/**
 * 同じ接続元 (sheet / feedback) の Build を二重に起票した。
 *
 * 判定は route の事前 SELECT ではなく **DB の一意制約**に置く。SELECT→INSERT の間には隙間があり、
 * 並行する 2 要求が両方とも「まだ無い」と読んで両方 INSERT できてしまう (TOCTOU)。
 * INSERT の失敗を受けてこの error へ写すことで、隙間そのものを無くしている。
 */
export class DuplicateBuildSourceError extends RepositoryError {
  readonly sheetId: string | null;
  readonly feedbackId: string | null;

  constructor(sheetId: string | null, feedbackId: string | null) {
    super('conflict', `接続元 (${sheetId ?? feedbackId ?? '不明'}) の Build は既に存在します`);
    this.name = 'DuplicateBuildSourceError';
    this.sheetId = sheetId;
    this.feedbackId = feedbackId;
  }
}

export interface CreateBuildInput {
  readonly workspaceId: string;
  readonly type: BuildType;
  /** 起票時の工程。route が既定値 (先頭工程) を決めてから渡す。 */
  readonly stage: BuildStage;
  readonly sheetId: string | null;
  readonly feedbackId: string | null;
  /** 認可判定は route が済ませた前提で、初期履歴の記録のためだけに受け取る。 */
  readonly actorUserId: string;
}

/**
 * カード編集の部分更新。`undefined` は「触れない」、`null` は「上書きを外す」を意味する。
 * この 2 つを 1 つの型で区別するために optional と nullable を併用している。
 */
export interface UpdateBuildInput {
  readonly buildId: string;
  readonly titleOverride?: string | null;
  readonly riskOverride?: BuildRisk | null;
  readonly assigneeUserId?: string | null;
  readonly note?: string | null;
}

export interface TransitionStageInput {
  readonly buildId: string;
  /** CAS (compare-and-swap) の期待値。画面が表示していた現在工程。 */
  readonly expectedStage: BuildStage;
  readonly toStage: BuildStage;
  /** 操作主体。認可判定は route が済ませた前提で、記録のためだけに受け取る。 */
  readonly actorUserId: string;
  readonly reason?: string | null;
}

export interface StageTransitionResult {
  readonly build: BuildRow;
  readonly event: BuildStageEventRow;
}

/** ボード 1 列分。空の工程も列として返す (列位置が workspace ごとにずれないように)。 */
export interface BuildBoardColumnRows {
  readonly stage: BuildStage;
  readonly builds: readonly BuildRow[];
}

export interface BuildStageRepository {
  /**
   * 手動復旧の起票。`builds` への INSERT と `build_stage_events` の初期 1 件
   * (`fromStage: null`) を同一の書き込みゲート内で行う。接続元の重複は
   * `DuplicateBuildSourceError` として返す。
   */
  createBuild(context: RepositoryContext, input: CreateBuildInput): Promise<StageTransitionResult>;
  /** カード編集。指定された項目だけを更新し、該当行が無ければ `EntityNotFoundError`。 */
  updateBuild(context: RepositoryContext, input: UpdateBuildInput): Promise<BuildRow>;
  /**
   * 工程を 1 つ進める / 戻す。隣接工程のみ許可し、CAS で lost update を防ぎ、
   * `builds.stage` の更新と `build_stage_events` への追記を**同一の書き込みゲート内**で行う。
   */
  transitionStage(context: RepositoryContext, input: TransitionStageInput): Promise<StageTransitionResult>;
  /** 1 build の工程履歴 (古い順)。 */
  listStageEvents(context: RepositoryContext, buildId: string): Promise<BuildStageEventRow[]>;
  /** 本人の工程操作 event が新しい Build だけを返す。workspace 全件を本人の履歴として扱わない。 */
  listRecentTouchedBuilds(
    context: RepositoryContext,
    filter: { readonly workspaceId: string; readonly actorUserId: string; readonly limit?: number },
  ): Promise<readonly BuildRow[]>;
  /** S13 パイプラインボードの読取。7 工程ぶんの列を `BUILD_STAGES` の順で返す。 */
  listBoard(context: RepositoryContext, filter: { readonly workspaceId: string }): Promise<BuildBoardColumnRows[]>;
}

export function createBuildStageRepository(adapter: CoreAdapter): BuildStageRepository {
  const publishRequestsRepo = createPublishRequestsRepo(adapter);

  /** tenant (+ context に workspace があればそれも) で絞った 1 行取得。 */
  async function findBuild(context: RepositoryContext, buildId: string): Promise<BuildRow | undefined> {
    const conditions = [eq(builds.tenantId, context.tenantId), eq(builds.id, buildId)];
    if (context.workspaceId !== undefined) conditions.push(eq(builds.workspaceId, context.workspaceId));
    const rows = await adapter.client
      .select()
      .from(builds)
      .where(and(...conditions))
      .limit(1);
    return rows[0] as BuildRow | undefined;
  }

  return {
    async createBuild(context, input) {
      if (context.workspaceId !== undefined && context.workspaceId !== input.workspaceId) {
        throw new RepositoryError('invalid-context', 'context と入力の workspaceId が一致しません');
      }

      return guardedWrite(adapter, async () => {
        const now = serverNow();
        const buildId = newUlid(now);
        let buildRow: BuildRow | undefined;
        try {
          const inserted = await adapter.client
            .insert(builds)
            .values({
              id: buildId,
              tenantId: context.tenantId,
              workspaceId: input.workspaceId,
              type: input.type,
              stage: input.stage,
              sheetId: input.sheetId,
              feedbackId: input.feedbackId,
              publishRequestId: null,
              titleOverride: null,
              riskOverride: null,
              assigneeUserId: null,
              note: null,
              createdAt: now,
              updatedAt: now,
            })
            .returning();
          buildRow = inserted[0] as BuildRow | undefined;
        } catch (error) {
          // 一意制約 (`builds_sheet_id_uq` / `builds_feedback_id_uq`) だけを重複起票へ写す。
          // それ以外の driver 例外を握り潰すと、書き込み失敗が「既にあります」に化ける。
          if (/unique/i.test(errorChainText(error))) {
            throw new DuplicateBuildSourceError(input.sheetId, input.feedbackId);
          }
          throw error;
        }
        if (buildRow === undefined) throw new RepositoryError('conflict', 'builds 行の作成に失敗しました');

        // 初期工程も履歴の 1 件目として残す。ここを省くと「いつこの工程に入ったか」が
        // 2 件目の遷移が起きるまで分からず、停滞日数の根拠が欠ける。
        const inserted = await adapter.client
          .insert(buildStageEvents)
          .values({
            id: newUlid(now),
            tenantId: context.tenantId,
            workspaceId: buildRow.workspaceId,
            buildId: buildRow.id,
            fromStage: null,
            toStage: buildRow.stage,
            actorUserId: input.actorUserId,
            reason: null,
            occurredAt: now,
            createdAt: now,
          })
          .returning();
        const event = inserted[0] as BuildStageEventRow | undefined;
        if (event === undefined) {
          throw new RepositoryError('conflict', 'build_stage_events の初期記録に失敗しました');
        }

        return { build: buildRow, event };
      });
    },

    async updateBuild(context, input) {
      return guardedWrite(adapter, async () => {
        const current = await findBuild(context, input.buildId);
        if (current === undefined) throw new EntityNotFoundError('builds', input.buildId);

        // key の有無で「触れない」と「上書きを外す (null)」を区別する。undefined を
        // そのまま drizzle へ渡すと前者が後者に化けるため、明示されたものだけを組み立てる。
        const patch: Partial<typeof builds.$inferInsert> = {};
        if (input.titleOverride !== undefined) patch.titleOverride = input.titleOverride;
        if (input.riskOverride !== undefined) patch.riskOverride = input.riskOverride;
        if (input.assigneeUserId !== undefined) patch.assigneeUserId = input.assigneeUserId;
        if (input.note !== undefined) patch.note = input.note;

        // `updatedAt` は意図的に触らない。この列は「工程が最後に動いた時刻」であり、
        // 停滞日数からのリスク算出 (features/build-pipeline-board/dto.ts) の基準でもある。
        // メモを直すたびに進むと、停止中の警告をメモ編集だけで消せてしまう。
        const updated = await adapter.client
          .update(builds)
          .set(patch)
          .where(and(eq(builds.tenantId, context.tenantId), eq(builds.id, input.buildId)))
          .returning();
        const buildRow = updated[0] as BuildRow | undefined;
        if (buildRow === undefined) throw new EntityNotFoundError('builds', input.buildId);
        return buildRow;
      });
    },

    async transitionStage(context, input) {
      // 状態機械の判定は DB を触らずに済むので、書き込みゲートへ入る前に落とす。
      if (!isAdjacent(input.expectedStage, input.toStage)) {
        throw new InvalidStageTransitionError(input.expectedStage, input.toStage);
      }

      return guardedWrite(adapter, async () => {
        const current = await findBuild(context, input.buildId);
        if (current === undefined) throw new EntityNotFoundError('builds', input.buildId);

        // 事前確認。ここで落とすのは「実際の現在工程」を利用者へ返すためで、
        // 競合に対する保証そのものは下の UPDATE の WHERE 句 (真の CAS) が持つ。
        if (current.stage !== input.expectedStage) {
          throw new StageCasConflictError(input.buildId, input.expectedStage, current.stage);
        }

        // B4: publish 工程は既存 publish 状態機械の結果に従属する。ここで publish_requests は書かない。
        if (input.toStage === 'publish') {
          const publishRequestId = current.publishRequestId;
          const publishRequest =
            publishRequestId === null ? null : await publishRequestsRepo.findById(context, publishRequestId);
          if (publishRequest === null || publishRequest.status !== REQUIRED_PUBLISH_STATUS) {
            throw new PublishRequestNotPublishedError(input.buildId, publishRequestId, publishRequest?.status ?? null);
          }
        }

        const now = serverNow();
        const updated = await adapter.client
          .update(builds)
          .set({ stage: input.toStage, updatedAt: now })
          .where(
            and(
              eq(builds.tenantId, context.tenantId),
              eq(builds.id, input.buildId),
              // CAS 本体。上の事前確認から UPDATE までの間に別要求が進めていれば 0 行になる。
              eq(builds.stage, input.expectedStage),
            ),
          )
          .returning();
        const buildRow = updated[0] as BuildRow | undefined;
        if (buildRow === undefined) {
          const latest = await findBuild(context, input.buildId);
          throw new StageCasConflictError(input.buildId, input.expectedStage, latest?.stage ?? current.stage);
        }

        const inserted = await adapter.client
          .insert(buildStageEvents)
          .values({
            id: newUlid(now),
            tenantId: context.tenantId,
            workspaceId: buildRow.workspaceId,
            buildId: buildRow.id,
            fromStage: input.expectedStage,
            toStage: input.toStage,
            actorUserId: input.actorUserId,
            reason: input.reason ?? null,
            occurredAt: now,
            createdAt: now,
          })
          .returning();
        const event = inserted[0] as BuildStageEventRow | undefined;
        if (event === undefined) {
          throw new RepositoryError('conflict', 'build_stage_events の追記に失敗しました');
        }

        return { build: buildRow, event };
      });
    },

    async listStageEvents(context, buildId) {
      const conditions = [eq(buildStageEvents.tenantId, context.tenantId), eq(buildStageEvents.buildId, buildId)];
      if (context.workspaceId !== undefined) {
        conditions.push(eq(buildStageEvents.workspaceId, context.workspaceId));
      }
      const rows = await adapter.client
        .select()
        .from(buildStageEvents)
        .where(and(...conditions))
        .orderBy(asc(buildStageEvents.occurredAt), asc(buildStageEvents.id));
      return rows as BuildStageEventRow[];
    },

    async listRecentTouchedBuilds(context, filter) {
      if (context.workspaceId !== undefined && context.workspaceId !== filter.workspaceId) {
        throw new RepositoryError('invalid-context', 'context と filter の workspaceId が一致しません');
      }
      const lastTouched = max(buildStageEvents.occurredAt).as('last_touched_at');
      const touchedQuery = adapter.client
        .select({ buildId: buildStageEvents.buildId, lastTouched })
        .from(buildStageEvents)
        .where(
          and(
            eq(buildStageEvents.tenantId, context.tenantId),
            eq(buildStageEvents.workspaceId, filter.workspaceId),
            eq(buildStageEvents.actorUserId, filter.actorUserId),
          ),
        )
        .groupBy(buildStageEvents.buildId)
        .orderBy(desc(lastTouched));
      const touched = filter.limit === undefined ? await touchedQuery : await touchedQuery.limit(filter.limit);
      const ids = touched.map((row) => row.buildId);
      if (ids.length === 0) return [];
      const rows = (await adapter.client
        .select()
        .from(builds)
        .where(
          and(
            eq(builds.tenantId, context.tenantId),
            eq(builds.workspaceId, filter.workspaceId),
            inArray(builds.id, ids),
          ),
        )) as BuildRow[];
      const byId = new Map(rows.map((row) => [row.id, row]));
      return ids.flatMap((id) => {
        const row = byId.get(id);
        return row === undefined ? [] : [row];
      });
    },

    async listBoard(context, filter) {
      if (context.workspaceId !== undefined && context.workspaceId !== filter.workspaceId) {
        throw new RepositoryError('invalid-context', 'context と filter の workspaceId が一致しません');
      }
      const rows = (await adapter.client
        .select()
        .from(builds)
        .where(and(eq(builds.tenantId, context.tenantId), eq(builds.workspaceId, filter.workspaceId)))
        .orderBy(asc(builds.updatedAt), asc(builds.id))) as BuildRow[];

      // 工程ごとに詰め直す。空の工程も列として残す。
      return BUILD_STAGES.map((stage) => ({
        stage,
        builds: rows.filter((row) => row.stage === stage),
      }));
    },
  };
}
