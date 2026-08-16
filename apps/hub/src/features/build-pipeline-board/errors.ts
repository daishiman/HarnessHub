/**
 * Build 一覧・工程遷移の domain error → RFC 9457 problem+json の写像
 * (SYS-BUILD-PIPELINE-BOARD-P05 / docs/backend-spec.md §4.4)。
 *
 * status を分けているのは、利用者に取ってほしい次の行動が違うからである。
 * - 422 (`InvalidStageTransitionError`): 送った遷移そのものが状態機械に存在しない。
 *   再試行しても永久に通らないので、**別の遷移を選ぶ**しかない。
 * - 409 (`StageCasConflictError`): 送った遷移は正しいが、他の admin が先に進めていた。
 *   **画面を再読込すれば**同じ操作が通りうる。
 * - 409 (`PublishRequestNotPublishedError`): 遷移自体は正しいが前提 (PublishRequest が published) が未成立。
 *   **publish パイプライン側が進めば**通る。B4 により hub 側では publish_requests を書き換えない。
 *
 * 3 つを一律 409 にすると、画面は「再読込を促す」以外の案内を出せなくなる。
 */
import {
  DuplicateBuildSourceError,
  EntityNotFoundError,
  InvalidStageTransitionError,
  PublishRequestNotPublishedError,
  StageCasConflictError,
} from '@harness-hub/db';
import { type ProblemDetails, problemDetails } from '@harness-hub/schemas';

/** 現在の絞り込み結果に存在しない cursor。先頭ページへ黙って戻さない。 */
export class InvalidBuildCursorError extends Error {
  readonly cursor: string;

  constructor(cursor: string) {
    super(`Build 一覧の cursor が無効です (cursor=${cursor})`);
    this.name = 'InvalidBuildCursorError';
    this.cursor = cursor;
  }
}

/** 一覧取得の domain error を利用者が修正可能な 422 へ写す。 */
export function buildListProblem(error: unknown, instance: string): ProblemDetails | null {
  if (error instanceof InvalidBuildCursorError) {
    return problemDetails({
      title: '一覧の続き位置が無効です',
      status: 422,
      detail: error.message,
      instance,
    });
  }
  return null;
}

/**
 * 起票 (POST) と編集 (PATCH) の domain error を写す。
 *
 * 409 は「同じ接続元の Build が既にある」だけで、利用者が取るべき行動は
 * 「新しく作る」ではなく「既にあるカードを開く」なので、404/422 とは区別する。
 * 404 は存在秘匿を兼ねる (別テナントの ID 総当たりで在庫を推定させない)。
 */
export function buildMutationProblem(error: unknown, instance: string): ProblemDetails | null {
  if (error instanceof DuplicateBuildSourceError) {
    return problemDetails({
      title: 'この接続元の Build は既に存在します',
      status: 409,
      detail: error.message,
      instance,
    });
  }
  if (error instanceof EntityNotFoundError) {
    return problemDetails({ title: 'Build が見つかりません', status: 404, instance });
  }
  return null;
}

/** 写像できた場合だけ problem を返す。未知の例外は握り潰さず null を返し、呼び出し側で再送出する。 */
export function stageTransitionProblem(error: unknown, instance: string): ProblemDetails | null {
  if (error instanceof InvalidStageTransitionError) {
    return problemDetails({
      title: 'この工程へは進められません',
      status: 422,
      detail: error.message,
      instance,
    });
  }
  if (error instanceof StageCasConflictError) {
    return problemDetails({
      title: '工程が他の操作で更新されています',
      status: 409,
      detail: error.message,
      instance,
    });
  }
  if (error instanceof PublishRequestNotPublishedError) {
    return problemDetails({
      title: '公開工程の前提が満たされていません',
      status: 409,
      detail: error.message,
      instance,
    });
  }
  if (error instanceof EntityNotFoundError) {
    // 存在秘匿。他テナントの ID 総当たりで在庫を推定させない (with-authz.ts の tenant_mismatch と同じ基準)。
    return problemDetails({
      title: 'Build が見つかりません',
      status: 404,
      instance,
    });
  }
  return null;
}
