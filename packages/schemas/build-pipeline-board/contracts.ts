/**
 * feat-build-pipeline-board の wire 契約 (docs/backend-spec.md §4.4 builds API / §5.3 Build 状態機械)。
 *
 * wire 表現は他 feature の契約 (feedback-loop / user-org-admin) と揃えて **snake_case** で定義する。
 * TypeScript 側の camelCase (`toStage` 等) は repository 層の語彙であり、HTTP 境界には持ち込まない。
 *
 * 認可 (工程操作は admin 限定 / SEC2) と隣接判定の実行は route / service 層の責務であり、
 * ここでは「受理できる形」だけを定義する。schema は妥当性 (business rule) を判定しない。
 */
import { z } from 'zod';
import { paginatedSchema } from '../src/envelope.js';
import { identifierSchema, paginationQuerySchema } from '../src/primitives.js';

/**
 * Build の 7 工程 (docs/backend-spec.md §5.3)。
 *
 * **この配列の並び順が隣接判定の正本である。** index 差が ±1 の組だけが有効な遷移であり、
 * サービス層 (`packages/db/repository/build-stage.ts` の `transitionStage`) はこの順序を前提に
 * 判定する。並べ替え・値の追加削除は状態機械の変更そのものなので、
 * `packages/db/schema/builds/schema.ts` の `BUILD_STAGES` と**必ず同時に**変更すること
 * (両者は同じ 7 値・同じ順序でなければならない)。
 */
export const BUILD_STAGE_ORDER = ['hearing', 'requirements', 'design', 'build', 'test', 'review', 'publish'] as const;

export const buildStageSchema = z.enum(BUILD_STAGE_ORDER);
export type BuildStage = z.output<typeof buildStageSchema>;

/**
 * 隣接工程かどうか。UI (前へ/次へボタンの活性) と route の事前判定が共有する。
 *
 * DB 層 (`@harness-hub/db`) は `@harness-hub/schemas` に依存しない層構造なので、同じ判定を
 * repository 側にも持つ。二重定義に見えるが、正本は本 file の `BUILD_STAGE_ORDER` の**順序**であり、
 * repository 側は `BUILD_STAGES` の順序から同じ規則を導出しているだけである。
 */
export function isAdjacentBuildStage(from: BuildStage, to: BuildStage): boolean {
  return Math.abs(BUILD_STAGE_ORDER.indexOf(from) - BUILD_STAGE_ORDER.indexOf(to)) === 1;
}

/** Build の起票元種別 (`packages/db/schema/builds/schema.ts` の `BUILD_TYPES` と同じ集合)。 */
export const buildTypeSchema = z.enum(['hearing', 'improvement', 'review', 'bug']);
export type BuildType = z.output<typeof buildTypeSchema>;

/**
 * カードのリスク表示 (`@harness-hub/ui` の `StageRisk` と同じ集合)。
 * 値の算出 (停滞日数など) は route 層が行い、DB 列としては保持しない。
 */
export const buildRiskSchema = z.enum(['none', 'warn', 'blocked']);
export type BuildRisk = z.output<typeof buildRiskSchema>;

const epochMillis = z.number().int().nonnegative();

/** GET /api/v1/builds の 1 件。`builds` テーブルの列をそのまま wire へ写した形。 */
export const buildListItemSchema = z
  .object({
    id: identifierSchema,
    workspace_id: identifierSchema,
    type: buildTypeSchema,
    stage: buildStageSchema,
    /** hearing-intake 起点なら sheet、feedback-loop 起点なら feedback。片方だけが入る。 */
    sheet_id: identifierSchema.nullable(),
    feedback_id: identifierSchema.nullable(),
    /** publish 工程の接続先 (B4)。未接続なら null。 */
    publish_request_id: identifierSchema.nullable(),
    /** 表示用の見出し。sheet/feedback の題名から route が合成する (builds に列は持たない)。 */
    title: z.string().min(1).max(200),
    risk: buildRiskSchema,
    /**
     * カード編集で入れた手入力。null は「上書きなし」で、`title` / `risk` は算出値に戻る。
     * 実効値 (`title` / `risk`) と併記するのは、画面が「これは手入力か」を区別して見せるため。
     */
    title_override: z.string().min(1).max(200).nullable(),
    risk_override: buildRiskSchema.nullable(),
    assignee_user_id: identifierSchema.nullable(),
    note: z.string().max(2_000).nullable(),
    created_at: epochMillis,
    updated_at: epochMillis,
  })
  .strict();
export type BuildListItem = z.output<typeof buildListItemSchema>;

/** GET /api/v1/builds。workspace / 工程 / 種別での絞り込みと cursor ページング。 */
export const buildListQuerySchema = paginationQuerySchema.extend({
  workspace_id: identifierSchema.optional(),
  stage: buildStageSchema.optional(),
  type: buildTypeSchema.optional(),
});
export type BuildListQuery = z.output<typeof buildListQuerySchema>;

/**
 * 一覧全体に対する工程操作 capability。
 *
 * 認可規則を client へ複製せず、route が `authz.can('builds.stage_change')` から算出して返す。
 * optional なのは、段階的な wire 互換を保ちながら consumer が fail-closed (`=== true`) で扱えるようにするため。
 */
export const buildListResponseSchema = paginatedSchema(buildListItemSchema)
  .extend({ can_manage: z.boolean().optional() })
  .strict();
export type BuildListResponse = z.output<typeof buildListResponseSchema>;

/**
 * 工程遷移の記録 1 件 (`build_stage_events`)。
 * `from_stage` が null なのは初期記録 (Build 作成時の初期工程) だけである。
 */
export const buildStageEventSchema = z
  .object({
    id: identifierSchema,
    build_id: identifierSchema,
    from_stage: buildStageSchema.nullable(),
    to_stage: buildStageSchema,
    actor_user_id: identifierSchema,
    reason: z.string().max(2_000).nullable(),
    occurred_at: epochMillis,
  })
  .strict();
export type BuildStageEvent = z.output<typeof buildStageEventSchema>;

/**
 * GET /api/v1/builds/:id。
 * `can_manage` は route が認可表 (B9) から算出して合成する (feedback-loop の `FeedbackDetail` と同型)。
 */
export const buildDetailResponseSchema = buildListItemSchema
  .extend({
    stage_events: z.array(buildStageEventSchema),
    can_manage: z.boolean().default(false),
  })
  .strict();
export type BuildDetailResponse = z.output<typeof buildDetailResponseSchema>;

/**
 * POST /api/v1/builds/:id/stage。
 *
 * `expected_stage` は **CAS (compare-and-swap = 期待した現在値と一致するときだけ書き換える楽観ロック)**
 * の期待値であり、**必須**にする。省略可能にすると「ボードを開いたまま放置した admin」の操作が、
 * その間に別の admin が進めた工程を無条件で上書きしてしまう (lost update)。
 * 画面が表示していた工程を毎回申告させることで、競合を 409 として利用者に見せられる。
 *
 * `to_stage` の隣接性はここでは検査しない。schema が通す値域と、状態機械が許す遷移は別物であり、
 * 「隣接でない」は入力書式の誤りではなく業務規則違反なので、判定と応答コードはサービス層が持つ。
 */
export const buildStageTransitionRequestSchema = z
  .object({
    to_stage: buildStageSchema,
    expected_stage: buildStageSchema,
    reason: z.string().trim().min(1).max(2_000).optional(),
  })
  .strict();
export type BuildStageTransitionRequest = z.output<typeof buildStageTransitionRequestSchema>;

/** 遷移後の build と、記録された stage event の組。監査 event の本文はここには載せない (SEC6 は別経路)。 */
export const buildStageTransitionResponseSchema = z
  .object({
    build: buildListItemSchema,
    event: buildStageEventSchema,
  })
  .strict();
export type BuildStageTransitionResponse = z.output<typeof buildStageTransitionResponseSchema>;

/**
 * POST /api/v1/builds。接続元 (sheet / feedback) から Build カードを 1 枚起票する。
 *
 * `sheet_id` と `feedback_id` は **どちらか一方だけ**を必須にする。両方許すと「どちらの案件の
 * Build なのか」が 2 つになり、題名の正本が決まらない。どちらも無い Build は接続元を持たず、
 * カードの見出しを合成する材料が無いまま一覧へ並ぶことになる。どちらも入力書式の問題として
 * 422 で弾く (業務規則ではなく「受理できる形」の判定なので schema 側に置く)。
 *
 * `stage` 省略時の既定は route 層で `'hearing'` を入れる。schema は既定値を注入しない
 * (省略と明示指定を route が区別できなくなるため)。
 */
export const buildCreateRequestSchema = z
  .object({
    type: buildTypeSchema,
    stage: buildStageSchema.optional(),
    sheet_id: identifierSchema.optional(),
    feedback_id: identifierSchema.optional(),
  })
  .strict()
  .refine((value) => (value.sheet_id === undefined) !== (value.feedback_id === undefined), {
    message: '接続元は sheet_id か feedback_id のどちらか一方だけを指定してください',
  });
export type BuildCreateRequest = z.output<typeof buildCreateRequestSchema>;

/**
 * PATCH /api/v1/builds/:id。カードの手入力欄だけを部分更新する。
 *
 * 全項目が **optional かつ nullable** で、意味が 3 通りに分かれる。
 * - key 自体が無い: その項目に触れない
 * - `null`: 上書きを外す (`title` なら接続元由来の題名へ、`risk` なら停滞日数からの算出値へ戻る)
 * - 値: その値で上書きする
 *
 * `stage` はここに置かない。工程遷移は CAS と隣接判定と監査を伴う別 endpoint
 * (`POST /:id/stage`) の責務であり、`.strict()` によって `{ stage }` は 422 になる。
 * 空 body (`{}`) も 422 にする。「何も変えない更新」は成功として台帳へ載せる意味が無い。
 */
export const buildUpdateRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(200).nullable().optional(),
    risk: buildRiskSchema.nullable().optional(),
    assignee_user_id: identifierSchema.nullable().optional(),
    note: z.string().trim().min(1).max(2_000).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: '更新する項目を 1 つ以上指定してください',
  });
export type BuildUpdateRequest = z.output<typeof buildUpdateRequestSchema>;

/** S13 のカード 1 枚 (`@harness-hub/ui` の `StageCard` と同型)。 */
export const buildBoardCardSchema = z
  .object({
    id: identifierSchema,
    title: z.string().min(1).max(200),
    meta: z.string().max(200).optional(),
    risk: buildRiskSchema,
  })
  .strict();
export type BuildBoardCard = z.output<typeof buildBoardCardSchema>;

/** S13 の 1 列 (`@harness-hub/ui` の `StageColumn` と同型)。 */
export const buildBoardColumnSchema = z
  .object({
    stage: buildStageSchema,
    cards: z.array(buildBoardCardSchema),
  })
  .strict();
export type BuildBoardColumn = z.output<typeof buildBoardColumnSchema>;

/**
 * S13 パイプラインボードの読取応答。列は常に `BUILD_STAGE_ORDER` の順で 7 件返す
 * (空の工程も列として残さないと、ボードの列位置が workspace ごとにずれる)。
 */
export const buildBoardResponseSchema = z
  .object({
    workspace_id: identifierSchema,
    columns: z.array(buildBoardColumnSchema).length(BUILD_STAGE_ORDER.length),
  })
  .strict();
export type BuildBoardResponse = z.output<typeof buildBoardResponseSchema>;
