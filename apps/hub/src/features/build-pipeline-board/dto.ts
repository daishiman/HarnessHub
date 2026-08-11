/**
 * `builds` / `build_stage_events` の DB 行を S13・builds API の wire 表現へ写す層
 * (SYS-BUILD-PIPELINE-BOARD-P05 / docs/backend-spec.md §4.4 / §5.3)。
 *
 * **なぜ独立した層にするか。**
 * DB 行は camelCase かつ `tenantId` を持つ。wire は snake_case かつテナント識別子を**出さない** (D4)。
 * この 2 つの語彙を route の中で直接混ぜると、`tenant_id` の漏洩が「うっかり 1 行足した」だけで起きる。
 * 変換を 1 箇所へ閉じ、必ず zod schema (`buildListItemSchema` 等) を通してから返すことで、
 * schema に無い列は parse 時点で落ちる (`.strict()`) 構造にしている。
 *
 * リスク表示 (`risk`) は DB 列ではなく本層の算出値である (contracts.ts の docblock 参照)。
 * 停滞日数から導くため、算出に必要な「現在時刻」は呼び出し側から渡す (テスト可能性のため)。
 */
import type { BuildRow, BuildStageEventRow } from '@harness-hub/db';
import {
  BUILD_STAGE_ORDER,
  type BuildBoardColumn,
  type BuildListItem,
  type BuildRisk,
  type BuildStage,
  type BuildStageEvent,
  buildBoardColumnSchema,
  buildListItemSchema,
  buildStageEventSchema,
} from '@harness-hub/schemas';

import { BUILD_TYPE_LABELS, toBoardColumnsView } from './board-columns.js';

/** 何日動いていなければ「注意」とみなすか。7 日 = 1 スプリント分の停滞。 */
const WARN_STAGNATION_DAYS = 7;
/** 何日動いていなければ「停止中」とみなすか。 */
const BLOCKED_STAGNATION_DAYS = 14;
const DAY_MILLIS = 24 * 60 * 60 * 1_000;

/** wire の `title` 上限 (`buildListItemSchema`)。超える見出しはここで丸める。 */
const TITLE_MAX_LENGTH = 200;

/**
 * 停滞日数からリスクを求める。
 *
 * `publish` は 7 工程の終端であり、そこに留まっていることは滞留ではなく完了である。
 * 終端まで進んだ Build に「停止中」を出すと、ボード上の警告が常時点灯して意味を失うため除外する。
 */
export function computeBuildRisk(stage: BuildStage, updatedAt: number, nowMillis: number): BuildRisk {
  if (stage === 'publish') return 'none';
  const stagnantDays = (nowMillis - updatedAt) / DAY_MILLIS;
  if (stagnantDays >= BLOCKED_STAGNATION_DAYS) return 'blocked';
  if (stagnantDays >= WARN_STAGNATION_DAYS) return 'warn';
  return 'none';
}

/**
 * 見出しの既定値。接続元 (sheet / feedback) の題名が取れなかったときだけ使う。
 *
 * 空文字を返さないのが要点で、`buildListItemSchema` の `title` は `min(1)` のため
 * 「題名が取れない Build が 1 件あるだけで一覧全体が 500 になる」事故を避ける。
 * Build ID はカード名へ埋め込まない。識別子を人名・案件名の体裁で見せないためである。
 */
export function fallbackBuildTitle(row: BuildRow): string {
  return `${BUILD_TYPE_LABELS[row.type]}起点の構築案件（題名未取得）`;
}

/** 題名を wire の上限へ丸める。改行はカード表示で潰れるため 1 行へ寄せる。 */
export function normalizeBuildTitle(title: string, row: BuildRow): string {
  const oneLine = title.replace(/\s+/g, ' ').trim();
  if (oneLine.length === 0) return fallbackBuildTitle(row);
  return oneLine.length <= TITLE_MAX_LENGTH ? oneLine : `${oneLine.slice(0, TITLE_MAX_LENGTH - 1)}…`;
}

export function toBuildListItem(row: BuildRow, title: string, nowMillis: number): BuildListItem {
  return buildListItemSchema.parse({
    id: row.id,
    workspace_id: row.workspaceId,
    type: row.type,
    stage: row.stage,
    sheet_id: row.sheetId,
    feedback_id: row.feedbackId,
    publish_request_id: row.publishRequestId,
    title: normalizeBuildTitle(title, row),
    risk: computeBuildRisk(row.stage, row.updatedAt, nowMillis),
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  });
}

export function toBuildStageEvent(row: BuildStageEventRow): BuildStageEvent {
  return buildStageEventSchema.parse({
    id: row.id,
    build_id: row.buildId,
    from_stage: row.fromStage,
    to_stage: row.toStage,
    actor_user_id: row.actorUserId,
    reason: row.reason,
    occurred_at: row.occurredAt,
  });
}

/**
 * 一覧 (`BuildListItem[]`) を S13 のボード列へ詰め直し、wire 契約で検証する。
 *
 * 列組み自体は client でも使うため `board-columns.ts` (zod 非依存) が持つ。
 * ここは **API 応答の境界** なので、返す直前に `buildBoardColumnSchema` を通して
 * 契約外の列が外へ出ないことを保証する役だけを担う。
 */
export function toBoardColumns(items: readonly BuildListItem[]): readonly BuildBoardColumn[] {
  return toBoardColumnsView(items, BUILD_STAGE_ORDER).map((column) => buildBoardColumnSchema.parse(column));
}
