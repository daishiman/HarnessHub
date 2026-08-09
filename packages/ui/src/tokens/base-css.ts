/**
 * 素の HTML 要素へ design token を適用する base 層。
 *
 * `buildThemeCss()` は CSS カスタムプロパティ (`--hh-*`) を配るだけで、それを読む規則を持たない。
 * その結果 token が定義済みでも `<h1>` や `<a>` はブラウザ既定スタイルのまま描画され、
 * 画面は「何も設定していない HTML」に見える。ここはその欠けていた消費側を埋める唯一の層。
 *
 * 部品 (`Button` など) は inline style で token を参照するのに対し、ここは
 * **部品化されていない素の要素**だけを対象にする。両者の担当が重なると、
 * 同じ見た目を 2 か所で決めることになり片方だけ更新される事故が起きる。
 */

import { focusRingRule } from './focus-ring.js';
import { mediaUp } from './tokens.js';

/**
 * 見出しの段階。`h1` から `h4` まで token の font-size を割り当てる。
 * `h5`/`h6` は本文と同寸にし、見出しの階層を 4 段までに抑える意図を持たせる。
 */
const headingScale: readonly (readonly [selector: string, fontSizeVar: string])[] = [
  ['h1', '--hh-font-size-xl'],
  ['h2', '--hh-font-size-lg'],
  ['h3', '--hh-font-size-md'],
  ['h4', '--hh-font-size-md'],
];

const resetRules = [
  // border-box を既定にしないと、padding を持つ要素が親幅を超えて横スクロールを生む。
  '*, *::before, *::after {\n  box-sizing: border-box;\n}',
  // iOS Safari の横向き時に本文だけ拡大される既定挙動を止める。
  'html {\n  -webkit-text-size-adjust: 100%;\n}',
  [
    'body {',
    '  margin: 0;',
    '  min-height: 100vh;',
    '  background: var(--hh-color-bg);',
    '  color: var(--hh-color-text);',
    '  font-family: var(--hh-font-family);',
    '  font-size: var(--hh-font-size-md);',
    '  line-height: var(--hh-line-height-normal);',
    '}',
  ].join('\n'),
].join('\n\n');

const typographyRules = [
  [
    // 見出しの既定 margin は要素ごとに値が違い、余白が token グリッドから外れる。
    // 余白は Stack / Container が持つので、ここでは 0 に均す。
    `${headingScale.map(([selector]) => selector).join(', ')}, p, figure, blockquote {`,
    '  margin: 0;',
    '}',
  ].join('\n'),
  [
    `${headingScale.map(([selector]) => selector).join(', ')} {`,
    '  line-height: var(--hh-line-height-tight);',
    '  font-weight: var(--hh-font-weight-bold);',
    '}',
  ].join('\n'),
  ...headingScale.map(([selector, sizeVar]) => `${selector} {\n  font-size: var(${sizeVar});\n}`),
  ['small {', '  font-size: var(--hh-font-size-sm);', '  color: var(--hh-color-text-muted);', '}'].join('\n'),
  [
    'code, pre, kbd, samp {',
    '  font-family: var(--hh-font-family-mono);',
    '  font-size: var(--hh-font-size-sm);',
    '}',
  ].join('\n'),
].join('\n\n');

const linkRules = [
  [
    // 下線を残すのは、色だけでリンクを示すと 1.4.1 (色の使用) に反するため。
    'a {',
    '  color: var(--hh-color-primary);',
    '  text-decoration: underline;',
    '  text-underline-offset: 2px;',
    '}',
  ].join('\n'),
  'a:hover {\n  color: var(--hh-color-primary-hover);\n}',
].join('\n\n');

const listRules = [
  'ul, ol {\n  margin: 0;\n  padding-inline-start: var(--hh-space-5);\n}',
  // ナビゲーションなど「一覧の意味は要るがマーカーは要らない」用途の逃げ道。
  ':where(ul, ol)[data-hh-unstyled-list] {\n  list-style: none;\n  padding-inline-start: 0;\n}',
].join('\n\n');

const tableRules = [
  ['table {', '  width: 100%;', '  border-collapse: collapse;', '  font-size: var(--hh-font-size-sm);', '}'].join('\n'),
  [
    'th, td {',
    // 縦 padding を密度 token に従わせることで、compact 切替が表にも効く。
    '  padding: var(--hh-row-padding-y) var(--hh-space-3);',
    '  border-bottom: 1px solid var(--hh-color-border);',
    '  text-align: start;',
    '  vertical-align: top;',
    '}',
  ].join('\n'),
  [
    'thead th {',
    '  background: var(--hh-color-surface-muted);',
    '  font-weight: var(--hh-font-weight-bold);',
    '  white-space: nowrap;',
    '}',
  ].join('\n'),
  'caption {\n  text-align: start;\n  color: var(--hh-color-text-muted);\n  padding-block-end: var(--hh-space-2);\n}',
].join('\n\n');

const mediaRules = [
  // 画像・埋め込みが親幅を超えると、その 1 要素だけで画面全体に横スクロールが出る。
  'img, svg, video, canvas, iframe {\n  max-width: 100%;\n  height: auto;\n}',
  'hr {\n  border: 0;\n  border-block-start: 1px solid var(--hh-color-border);\n  margin: var(--hh-space-5) 0;\n}',
].join('\n\n');

const formRules = [
  // ブラウザ既定でフォーム要素だけフォントが継承されないため、明示的に揃える。
  'button, input, select, textarea {\n  font: inherit;\n  color: inherit;\n}',
  'fieldset {\n  margin: 0;\n  padding: 0;\n  border: 0;\n}',
  'legend {\n  padding: 0;\n  font-weight: var(--hh-font-weight-bold);\n}',
].join('\n\n');

/**
 * 支援技術にだけ渡したい文言の逃げ道。`display: none` や `visibility: hidden` は
 * 読み上げからも消えるため使えない。部品内では internal/style の `visuallyHidden` が
 * 同じ役割を持つが、apps 側は internal を import できないのでここに属性版を置く。
 */
const visuallyHiddenRules = [
  '[data-hh-visually-hidden] {',
  '  position: absolute;',
  '  width: 1px;',
  '  height: 1px;',
  '  margin: -1px;',
  '  padding: 0;',
  '  overflow: hidden;',
  '  clip-path: inset(50%);',
  '  white-space: nowrap;',
  '  border: 0;',
  '}',
].join('\n');

/**
 * 幅への追従 (レスポンシブ) を base 層で一括して決める。
 *
 * 部品側の inline style に書かない理由は 2 つ。
 * (a) inline style には `@media` を書けないので、幅で変える指定は原理的に CSS 側にしか置けない。
 * (b) 「幅が変わったときの振る舞い」を部品ごとに分散させると、
 *     ある画面だけ 360px で横スクロールが出る、という取りこぼしが必ず生まれる。
 *
 * 横スクロールを生む主犯は 4 つで、それぞれに対応する規則を置いている。
 * 1. grid / flex の子は既定が `min-width: auto` なので、長い語や広い表が親を押し広げる
 * 2. 表は列が増えるほど最小幅が伸び、狭い画面では必ず親を超える
 * 3. Container の左右 padding が固定だと、狭い画面で内容幅が足りなくなる
 * 4. URL や識別子のような折り返し位置を持たない長い語は、箱の幅に関係なく外へ描かれる
 */
const responsiveRules = [
  [
    ':root {',
    // 狭い画面では左右 padding を詰めて内容幅を稼ぐ。Container はこの変数だけを見る
    '  --hh-container-padding-inline: var(--hh-space-3);',
    // 表の 1 列あたりの下限。360px に 5 列を詰めると 1 列 72px となり、
    // どの列も 2〜3 文字で折り返して読めなくなる。潰すより横スクロールさせるほうが読める
    '  --hh-table-column-min: 9rem;',
    '}',
  ].join('\n'),
  [`${mediaUp('md')} {`, '  :root {', '    --hh-container-padding-inline: var(--hh-space-5);', '  }', '}'].join('\n'),
  [
    // (1) 既定の min-width: auto を解除する。これが無いと長い URL 1 本で画面全体に横スクロールが出る
    ':where([data-hh-sidebar-layout], [data-hh-stack]) > * {',
    '  min-width: 0;',
    '}',
  ].join('\n'),
  [
    // 狭い画面ではナビゲーションを本文の上へ積む (1 カラム)
    '[data-hh-sidebar-layout] {',
    '  grid-template-columns: minmax(0, 1fr);',
    '}',
  ].join('\n'),
  [
    `${mediaUp('md')} {`,
    '  [data-hh-sidebar-layout] {',
    // ナビ列は伸縮させ、本文列は minmax(0, 1fr) で「はみ出しても広がらない」を明示する
    '    grid-template-columns: minmax(160px, 220px) minmax(0, 1fr);',
    '  }',
    '}',
  ].join('\n'),
  [
    // (2) 表は横スクロールできる箱に入れる。縦は切らない (auto ではなく visible のままにする)
    '[data-hh-scroll-x] {',
    '  max-width: 100%;',
    '  overflow-x: auto;',
    '}',
  ].join('\n'),
  [
    // (4) 折り返し位置を持たない長い語への対処。`word-break: break-all` ではなく
    // `overflow-wrap: anywhere` を使うのは、前者が日本語の文中でも無差別に切ってしまうのに対し、
    // 後者は「そのままでは溢れる」ときにだけ切るため。
    // 要素の矩形は親幅に収まったまま文字だけが外へ出るので、getBoundingClientRect では検出できず、
    // document の scrollWidth にだけ現れる。原因が見えにくい分、base 層で塞いでおく価値が大きい。
    'body {',
    '  overflow-wrap: anywhere;',
    '}',
  ].join('\n'),
].join('\n\n');

/**
 * スキップリンク。常時表示だとブランド名の前に無関係な文字列が出てレイアウトが崩れるため、
 * 通常は視覚的に隠し、フォーカスされたときだけ左上へ実体を出す。
 * `display: none` を使わないのは支援技術から到達できなくなるため。
 */
const skipLinkRules = [
  [
    '[data-hh-skip-link] {',
    '  position: absolute;',
    '  inset-block-start: var(--hh-space-2);',
    '  inset-inline-start: var(--hh-space-2);',
    '  z-index: 100;',
    '  padding: var(--hh-space-2) var(--hh-space-4);',
    '  background: var(--hh-color-surface);',
    '  color: var(--hh-color-primary);',
    '  border: 1px solid var(--hh-color-border-strong);',
    '  border-radius: var(--hh-radius-sm);',
    '  transform: translateY(-200%);',
    '}',
  ].join('\n'),
  '[data-hh-skip-link]:focus-visible {\n  transform: translateY(0);\n}',
].join('\n\n');

/**
 * 動きの抑制設定を尊重する (WCAG 2.3.3)。base 層に置くのは、
 * 個々の部品が各自 `prefers-reduced-motion` を書くと必ず書き漏れが出るため。
 */
const motionRules = [
  '@media (prefers-reduced-motion: reduce) {',
  '  *, *::before, *::after {',
  '    animation-duration: 0.01ms !important;',
  '    animation-iteration-count: 1 !important;',
  '    transition-duration: 0.01ms !important;',
  '    scroll-behavior: auto !important;',
  '  }',
  '}',
].join('\n');

/**
 * base 層の CSS を組み立てる。`buildThemeCss()` と同じく引数を取らず token 定数だけから
 * 生成する閉じた関数で、外部入力の混入経路を持たない (`<style>` へ直接流す前提のため重要)。
 */
export function buildBaseCss(): string {
  return [
    resetRules,
    typographyRules,
    linkRules,
    listRules,
    tableRules,
    mediaRules,
    formRules,
    visuallyHiddenRules,
    responsiveRules,
    skipLinkRules,
    // ネイティブの操作要素にもフォーカスリングを与える。data-hh-focusable 版と宣言は共通。
    focusRingRule(':where(a, button, input, select, textarea, summary, [tabindex]):focus-visible'),
    motionRules,
  ].join('\n\n');
}
