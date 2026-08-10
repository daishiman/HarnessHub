/**
 * 静的 CSS 成果物 (`tokens.css`) の**内容の正本** (HarnessHub-2fo1)。
 *
 * これまで token CSS は root layout が `<style>{buildThemeCss()}</style>` として
 * inline 出力していた。静的 stylesheet にすると文書をまたぐ再訪でブラウザキャッシュの
 * 対象にでき、同じ約 7.7KB を HTML ごと転送する必要がなくなる。一方、初回表示の
 * CSS parse / CSSOM 構築 / layout 自体が消えるわけではないため、CPU 12x 下で観測した
 * Style & Layout (219〜300ms) の改善可否は Performance 再計測で判定する。
 *
 * ここで文字列を組み立て、生成スクリプトとドリフト検出テストの**両方が同じ関数を呼ぶ**。
 * 「生成側の連結順」と「検査側の期待値」を別々に書くと、片方だけ直した瞬間に
 * 検査が意味を失う (二重帳簿) ため、連結はこの 1 箇所にしか存在させない。
 */
import { buildBaseCss } from './base-css.js';
import { buildThemeCss } from './tokens.js';

/**
 * 生成物の先頭に置く警告。
 *
 * 生成物は git 管理下に置く (Next の webpack が build 前に実ファイルを要求するため)。
 * 実ファイルである以上、人が直接編集できてしまう — 編集してもドリフトテストが落ちるが、
 * 落ちてから理由を探すより、開いた瞬間に再生成コマンドが読める方が速い。
 */
export const TOKEN_CSS_BANNER = [
  '/*',
  ' * 自動生成ファイル。直接編集しないこと。',
  ' * 正本: packages/ui/src/tokens/{tokens,base-css}.ts',
  ' * 再生成: pnpm --filter @harness-hub/ui run gen:tokens-css',
  ' */',
].join('\n');

/**
 * `packages/ui/src/tokens/tokens.css` に書き出すべき全文。
 *
 * 順序は inline 時代と同一 — theme (カスタムプロパティの定義) が先、
 * base (素の HTML 要素へその変数を適用する層) が後。逆にすると base が
 * 未定義の変数を読むことになり、初期値へフォールバックして見た目が変わる。
 */
export function buildTokenCssArtifact(): string {
  return `${[TOKEN_CSS_BANNER, buildThemeCss(), buildBaseCss()].join('\n\n')}\n`;
}
