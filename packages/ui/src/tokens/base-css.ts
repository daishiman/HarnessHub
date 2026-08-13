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
import { mediaDown, mediaUp } from './token-names.js';

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
    // 最下層は面の 3 段のうち最も奥の pageBg (デザインシステム §2)。
    // アプリ本体はこの上に一段浮かぶので、外周にわずかに覗く暗い縁が「土台」になる。
    // 本体を敷いていない画面 (エラー画面など) でも、bg との差は 1 段だけなので違和感が出ない。
    '  background: var(--hh-color-page-bg);',
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

/**
 * Markdown 描画 (`MarkdownView` / `MarkdownEditor` のプレビュータブ) だけに効く装飾。
 *
 * 上の `typographyRules` は `code, pre, kbd, samp` にフォント指定しか与えないため、
 * コードブロック・引用は見出しや箇条書きと違って「地の文と同じ見た目」になり、
 * 装飾が反映されていないように見える (HarnessHub docs-cms 不具合報告)。
 * `data-hh-markdown` は `MarkdownView` の wrapper div が常に持つ属性なので、それを
 * scope にして他の素の `pre`/`blockquote` (コードサンプルの表示など) に影響を広げない。
 */
const markdownRules = [
  [
    '[data-hh-markdown] pre {',
    '  margin: 0;',
    '  padding: var(--hh-space-3);',
    '  overflow-x: auto;',
    '  background: var(--hh-color-surface-muted);',
    '  border: 1px solid var(--hh-color-border);',
    '  border-radius: var(--hh-radius-sm);',
    '}',
  ].join('\n'),
  ['[data-hh-markdown] pre code {', '  background: none;', '  padding: 0;', '  border: none;', '}'].join('\n'),
  [
    '[data-hh-markdown] :not(pre) > code {',
    '  padding: 0.125em 0.375em;',
    '  background: var(--hh-color-surface-muted);',
    '  border: 1px solid var(--hh-color-border);',
    '  border-radius: var(--hh-radius-sm);',
    '}',
  ].join('\n'),
  [
    '[data-hh-markdown] blockquote {',
    '  padding-inline-start: var(--hh-space-3);',
    '  border-inline-start: 3px solid var(--hh-color-border-strong);',
    '  color: var(--hh-color-text-muted);',
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
    // ナビ列は伸縮させ、本文列は minmax(0, 1fr) で「はみ出しても広がらない」を明示する。
    // 上限 212px はシェルのサイドバー幅 (shellSidebarWidth) と同じ値。画面内に
    // シェルのナビとページ内の副ナビが並んだとき、2 本の縦線が別々の幅に見えないようにする。
    '    grid-template-columns: minmax(160px, 212px) minmax(0, 1fr);',
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
    // 定義リストの 2 列指定は「広い画面のときだけ」効かせる。
    // 狭い画面で 2 列にすると 1 列あたり 150px 前後になり、項目名も値も折り返して読めなくなる。
    // DefinitionList は inline style からこの変数を読むだけにして、閾値の判断をここへ集約する。
    ':root {',
    '  --hh-dl-columns: minmax(0, 1fr);',
    '}',
  ].join('\n'),
  [`${mediaUp('md')} {`, '  :root {', '    --hh-dl-columns: repeat(2, minmax(0, 1fr));', '  }', '}'].join('\n'),
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
 * 識別子バッジ (`IdBadge`) の見た目。
 * 省略は CSS で行い、DOM には全文を残す (短縮した文字列をコピーさせないため)。
 */
const idBadgeRules = [
  // 可読幅 (measure) は余白スケールとは別軸の寸法。「何文字読めれば識別できるか」で決まるので
  // ch で持つしかなく、space token には載らない。載らない値ほど規則の中に埋もれると
  // 次に読む人が根拠を追えないため、名前を付けて :root に出す。
  // 14ch は接頭辞 + 短縮 ID (例: HarnessHub-5yen) が収まる最小幅。
  ':root {\n  --hh-id-badge-measure: 14ch;\n}\n',
  // 閉じているときは 1 行に収める。開くと全文が折り返して下へ伸びる
  '[data-hh-id-badge] {',
  '  display: inline-block;',
  '  max-inline-size: var(--hh-id-badge-measure);',
  '  vertical-align: bottom;',
  '  font-family: var(--hh-font-family-mono);',
  '  font-size: var(--hh-font-size-xs);',
  '  color: var(--hh-color-text-muted);',
  '}',
  '',
  // 開く印 (▸) は消さない。消すと「押せる」ことが見た目に何も出ず、
  // 省略された値の続きがどこにあるのか分からなくなる
  '[data-hh-id-badge] > summary {',
  '  cursor: pointer;',
  '  overflow: hidden;',
  '  white-space: nowrap;',
  '  text-overflow: ellipsis;',
  '}',
  '',
  // 開いたあとの全文。ここで初めて折り返しを許し、クリック 1 回で全体が選択される
  '[data-hh-id-badge-full] {',
  '  display: block;',
  '  padding-block-start: var(--hh-space-1);',
  '  color: var(--hh-color-text);',
  '  overflow-wrap: anywhere;',
  '  user-select: all;',
  '}',
].join('\n');

/**
 * 絞り込み帯 (FilterBar) の整列。
 *
 * flex + `align-items: flex-end` で並べていたときは、補足文言 (`description`) を持つ欄だけ
 * 背が高くなり、その隣のボタンだけが下へ押し出されていた。「補足を 1 行足したら他の要素が動く」は
 * 画面ごとの不揃いを生む最大の原因なので、次の 3 点を base 層で固定する。
 *
 * 1. 帯は grid にして各欄の**上端**を揃える (下端合わせをやめる)。下に伸びる補足文言は
 *    他の欄の位置に影響しない。
 * 2. 帯の中の入力欄は下 margin を持たない (帯の gap だけが余白を決める)。
 * 3. ボタンは専用スロットへ置き、ラベル 1 行ぶんの高さだけ下げて入力欄と同じ高さから始める。
 *
 * inline style では `@media` も子孫セレクタも書けないため、置き場所はここしかない。
 */
const filterBarRules = [
  [
    ':root {',
    // ラベル 1 行 (font-size-sm × line-height-tight) + ラベル下の余白。
    // 「ラベルの高さ」を数値でベタ書きすると token 変更に追従しないので式で持つ。
    '  --hh-field-label-offset: calc(var(--hh-font-size-sm) * var(--hh-line-height-tight) + var(--hh-space-1));',
    // 欄 1 つの下限幅。これを下回るとセレクトの選択肢名が読めなくなるため、詰めずに折り返す。
    // `--hh-id-badge-measure` と同じ「可読幅」の軸で、余白スケール (space token) とは別物。
    '  --hh-filter-column-min: 12rem;',
    '}',
  ].join('\n'),
  // 入力欄 1 つ分の下余白。FormField の inline style ではなくここが持つ (帯の中で 0 に落とせるように)。
  '[data-hh-field] {\n  margin-bottom: var(--hh-space-3);\n}',
  [
    '[data-hh-filter-bar] {',
    '  display: grid;',
    '  grid-template-columns: repeat(auto-fit, minmax(var(--hh-filter-column-min), 1fr));',
    '  align-items: start;',
    '  gap: var(--hh-space-3);',
    '}',
  ].join('\n'),
  '[data-hh-filter-bar] [data-hh-field] {\n  margin-bottom: 0;\n}',
  [
    '[data-hh-filter-actions] {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: center;',
    '  gap: var(--hh-space-2);',
    '  padding-block-start: var(--hh-field-label-offset);',
    '}',
  ].join('\n'),
  [
    // 狭い画面では欄が 1 列に積まれる。そこでラベル 1 行ぶんの下げ幅を残すと
    // ボタンの上だけ不自然な空きになるため、1 列のときは offset を消す。
    // 閾値は sm (480px = 30rem)。以前はここに 30rem を直書きしていたが、
    // breakpoint を動かしたときに追従しない箇所になるため helper 経由へ寄せた。
    `${mediaDown('sm')} {`,
    '  [data-hh-filter-actions] {',
    '    padding-block-start: 0;',
    '  }',
    '}',
  ].join('\n'),
].join('\n\n');

/**
 * カードを敷き詰める器。`<ul>` で組んだ一覧では 1 件が `<li>` に入るため、
 * `<li>` 自身が伸びないとカードの高さが行内で揃わない (中身の少ないカードだけ背が低くなる)。
 * 画面ごとに `style={{ display: 'flex' }}` を書き写していたのをここへ 1 つだけ置く。
 */
const cardGridRules = ['[data-hh-card-grid] > li {\n  display: flex;\n}'].join('\n\n');

/**
 * StageBoard の狭幅変形。
 *
 * カード DOM は 1 組だけ描き、native radio の選択を `:has()` で同じ番号の column へ結ぶ。
 * JavaScript で viewport を読む方式は SSR と hydration の初期形がずれるため採らない。
 * 7 は buildStage の固定工程数で、部分集合を渡した場合も先頭から同じ規則で動く。
 */
const selectedStageColumnRules = Array.from(
  { length: 7 },
  (_, index) =>
    `[data-hh-stage-board]:has([data-hh-stage-option]:nth-child(${index + 1}) input:checked) [data-hh-stage-column]:nth-child(${index + 1}) {\n  display: block;\n}`,
).join('\n');

const stageBoardRules = [
  '[data-hh-stage-board] {\n  min-width: 0;\n}',
  [
    '[data-hh-stage-picker] {',
    '  min-width: 0;',
    '  margin: 0 0 var(--hh-space-3);',
    '  padding: 0;',
    '  border: 0;',
    '}',
  ].join('\n'),
  '[data-hh-stage-picker] > legend {\n  margin-block-end: var(--hh-space-2);\n  font-weight: var(--hh-font-weight-bold);\n}',
  [
    '[data-hh-stage-picker-options] {',
    '  display: flex;',
    '  gap: var(--hh-space-2);',
    '  max-width: 100%;',
    '  padding-block-end: var(--hh-space-1);',
    '  overflow-x: auto;',
    '}',
  ].join('\n'),
  [
    '[data-hh-stage-option] {',
    '  display: inline-flex;',
    '  flex: 0 0 auto;',
    '  align-items: center;',
    '  gap: var(--hh-space-1);',
    '  min-height: var(--hh-control-height);',
    '  padding-inline: var(--hh-space-3);',
    '  border: 1px solid var(--hh-color-border);',
    '  border-radius: var(--hh-radius-full);',
    '  background: var(--hh-color-surface);',
    '  cursor: pointer;',
    '}',
  ].join('\n'),
  '[data-hh-stage-option]:has(input:checked) {\n  border-color: var(--hh-color-primary);\n  background: var(--hh-color-primary-soft);\n  color: var(--hh-color-primary);\n}',
  '[data-hh-stage-option] input {\n  margin: 0;\n}',
  '[data-hh-stage-columns] {\n  display: grid;\n  min-width: 0;\n}',
  // narrow は未選択 column を隠す。同じカードを別 DOM に複製していないため二重読み上げにならない。
  '[data-hh-stage-column] {\n  display: none;\n  min-width: 0;\n}',
  selectedStageColumnRules,
  [
    // lg (1025px) 未満は工程 picker + 選択中の 1 列を維持する。タブレット幅へ 7 列を
    // 無理に詰めると可読性が落ち、複数行に折り返すと工程の一方向性が崩れるためである。
    // desktop でのみ、正本の 7 工程を 1 行のままコンテナ幅へ収める。
    `${mediaUp('lg')} {`,
    '  [data-hh-stage-picker] {',
    '    display: none;',
    '  }',
    '  [data-hh-stage-columns] {',
    '    grid-template-columns: repeat(7, minmax(0, 1fr));',
    '    gap: var(--hh-space-3);',
    '  }',
    '  [data-hh-stage-column] {',
    '    display: block;',
    '    min-width: 0;',
    '  }',
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
 * 画面幅で表現を差し替える器 (`[data-hh-viewport]`)。
 *
 * SSR では画面幅が分からないので `matchMedia` では出し分けられない
 * (server で描いた形と client で描いた形が食い違う)。そこで**両方の表現を描いておき、
 * 表示するほうを CSS だけで選ぶ**。`display: none` にした側は支援技術からも消えるため、
 * 同じ内容が二重に読み上げられることはない。
 *
 * 既定を narrow にしてあるのは、CSS が届く前 (読み込み中) に出るのが狭い側になるようにするため。
 * 広い画面に狭い表現が一瞬出るのは読めるが、逆は横へはみ出す。
 */
const viewportRules = [
  '[data-hh-viewport="narrow"] {\n  display: block;\n}',
  '[data-hh-viewport="wide"] {\n  display: none;\n}',
  [
    `${mediaUp('md')} {`,
    '  [data-hh-viewport="narrow"] {',
    '    display: none;',
    '  }',
    '  [data-hh-viewport="wide"] {',
    '    display: block;',
    '  }',
    '}',
  ].join('\n'),
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
    markdownRules,
    linkRules,
    listRules,
    tableRules,
    mediaRules,
    formRules,
    visuallyHiddenRules,
    responsiveRules,
    idBadgeRules,
    filterBarRules,
    cardGridRules,
    stageBoardRules,
    viewportRules,
    skipLinkRules,
    // ネイティブの操作要素にもフォーカスリングを与える。data-hh-focusable 版と宣言は共通。
    focusRingRule(':where(a, button, input, select, textarea, summary, [tabindex]):focus-visible'),
    motionRules,
  ].join('\n\n');
}
