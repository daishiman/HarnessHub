import { beforeAll, vi } from 'vitest';

/**
 * `next/font/local` は Next のコンパイラ (SWC/webpack プラグイン) が変換して初めて動く仕組みで、
 * 素の vitest プロセスでは解決できない。root layout を描画するテストは必ずここを踏むので、
 * CSS 変数名だけを返す薄い偽物へ差し替える。
 *
 * **各テストファイルではなく setup に置いている理由**: 以前は 9 個のテストが同じ
 * `vi.mock('next/font/google', ...)` を各自コピーしていた。テストを 1 つ増やすたびに
 * モックを書き忘れる余地があり、実際にフォント層を触るたび 9 ファイルを追随修正していた。
 * setup へ集約すると、この「書き忘れ」という失敗モードが消える。
 *
 * 返す `variable` は `src/app/fonts.ts` が渡す CSS 変数名から導出する。
 * こうしておくと、フォントを増減したときにテスト側の固定値を書き換える必要が無く、
 * かつ sans / mono を取り違えない (どちらも同じ値を返す偽物だと配線ミスを見逃す)。
 *   --font-ibm-plex-sans  → hh-test-font-ibm-plex-sans
 *   --font-jetbrains-mono → hh-test-font-jetbrains-mono
 */
vi.mock('next/font/local', () => ({
  default: (options: { variable?: string }) => {
    const slug = (options?.variable ?? '--font-unknown').replace(/^--font-/, '');
    return {
      variable: `hh-test-font-${slug}`,
      className: `hh-test-font-${slug}-class`,
      style: { fontFamily: `hh-test-font-${slug}` },
    };
  },
}));

beforeAll(() => {
  if (typeof HTMLCanvasElement === 'undefined') return;
  // axe の color-contrast 検査が jsdom 未実装の canvas context を参照して出す
  // ノイズを抑える。画面結合テストは canvas 描画そのものを検証対象にしていない。
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: vi.fn(() => null),
  });
});
