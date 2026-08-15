// 表示上のページング境界 (ADR §5.2)。
//
// 値そのものはここに書き写さない。実コードの定数がどこにあるかだけを宣言し、
// 一致検証はテスト側 (T6-1) が定義ファイルを読んで行う。
// packages/db から apps/hub や packages/schemas を import できない (依存を増やさない) ため、
// 「参照の宣言」と「値の照合」を分離している。

export interface DisplayBoundary {
  /** 現在の実コード上の値。テストが sourcePath/constantName から読み直して照合する。 */
  readonly limit: number;
  /** repository root からの相対 path。 */
  readonly sourcePath: string;
  /** その file 内で `const <名前> = <数値>` として現れる識別子。 */
  readonly constantName: string;
}

export const DISPLAY_BOUNDARIES: Record<string, DisplayBoundary> = {
  /** /builds のカーソルページングの 1 ページ件数。 */
  buildsPage: {
    limit: 100,
    sourcePath: 'apps/hub/src/app/(dashboard)/builds/build-board.tsx',
    constantName: 'BOARD_PAGE_LIMIT',
  },
  /** /metrics のランキング表示件数。 */
  metricsRanking: {
    limit: 10,
    sourcePath: 'packages/schemas/metrics-tracking/contracts.ts',
    constantName: 'METRICS_RANKING_LIMIT',
  },
};
