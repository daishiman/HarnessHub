/** base 層 CSS の契約。素の HTML 要素が token を読む状態であることを固定する。 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { buildBaseCss } from './base-css.js';
import { focusRingDeclarations } from './focus-ring.js';
import { breakpointTokens, buildThemeCss, mediaUp } from './tokens.js';

const css = buildBaseCss();
/** 実際に配られる成果物。生成関数の出力と別に読む (再生成し忘れをここでも踏む)。 */
const tokensCssArtifact = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'tokens.css'), 'utf8');

interface BreakpointUse {
  readonly value: number;
  readonly unit: string;
}

/**
 * CSS から breakpoint の指定を、**単位を捨てずに**拾う。
 *
 * 対象は `@media` の条件部だけに限る (`{` の手前で切る)。`max-width: 100%` のような
 * 通常の宣言は breakpoint ではないので、全文から拾うと本題でない値が混ざる。
 */
function collectBreakpointUses(source: string, feature: 'min-width' | 'max-width'): readonly BreakpointUse[] {
  const preludes = [...source.matchAll(/@media[^{]*/g)].map((match) => match[0]);
  return preludes.flatMap((prelude) =>
    [...prelude.matchAll(new RegExp(`${feature}:\\s*([\\d.]+)([a-z%]*)`, 'g'))].map((match) => ({
      value: Number(match[1]),
      unit: match[2] ?? '',
    })),
  );
}

describe('buildBaseCss', () => {
  it('本文の色・背景・書体を token 変数から取る', () => {
    expect(css).toContain('background: var(--hh-color-bg);');
    expect(css).toContain('color: var(--hh-color-text);');
    expect(css).toContain('font-family: var(--hh-font-family);');
  });

  it.each([
    ['h1', '--hh-font-size-xl'],
    ['h2', '--hh-font-size-lg'],
    ['h3', '--hh-font-size-md'],
    ['h4', '--hh-font-size-md'],
  ])('%s の文字サイズを token 段階 %s へ割り当てる', (selector, sizeVar) => {
    expect(css).toContain(`${selector} {\n  font-size: var(${sizeVar});\n}`);
  });

  it('リンクを色だけでなく下線でも示す (WCAG 1.4.1)', () => {
    expect(css).toContain('text-decoration: underline;');
  });

  it('表の縦 padding が表示密度 token に追従する', () => {
    expect(css).toContain('padding: var(--hh-row-padding-y) var(--hh-space-3);');
  });

  it('横スクロールの主因になる box-sizing と画像幅を封じる', () => {
    expect(css).toContain('box-sizing: border-box;');
    expect(css).toContain('max-width: 100%;');
  });

  it('動きの抑制設定を尊重する (WCAG 2.3.3)', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('スキップリンクは通常隠れ、フォーカス時だけ現れる', () => {
    expect(css).toContain('[data-hh-skip-link] {');
    expect(css).toContain('transform: translateY(-200%);');
    expect(css).toContain('[data-hh-skip-link]:focus-visible {\n  transform: translateY(0);\n}');
  });

  /** display:none にすると読み上げからも消えるため、視覚だけ隠す実装であることを固定する。 */
  it('視覚的に隠す逃げ道が読み上げからは消えない実装になっている', () => {
    expect(css).toContain('[data-hh-visually-hidden] {');
    expect(css).toContain('clip-path: inset(50%);');
    expect(css).not.toMatch(/\[data-hh-visually-hidden\] \{[^}]*display: none/);
  });

  it('ネイティブ操作要素にもフォーカスリングが付く', () => {
    expect(css).toContain(':where(a, button, input, select, textarea, summary, [tabindex]):focus-visible');
    expect(css).toContain(focusRingDeclarations);
  });

  /**
   * token 層と base 層でフォーカスリングの見え方が食い違わないことを固定する。
   * 片方だけ色や太さを変える改変が入ったらここで落ちる。
   */
  it('token 層と base 層のフォーカスリング宣言が同一', () => {
    expect(buildThemeCss()).toContain(focusRingDeclarations);
  });

  /**
   * base 層で生の色コードを書くと token の単一正本が崩れる。
   * `--hh-*` 変数以外の色指定が混ざっていないことを機械で押さえる。
   */
  it('生の色コードを含まない (色は必ず token 変数経由)', () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/\brgba?\(/);
  });

  /**
   * レスポンシブの分岐は base 層にしか置けない (inline style に @media は書けない)。
   * ここが抜けると狭い画面で 2 カラムのまま押し出され、全ページに横スクロールが出る。
   */
  it('SidebarLayout を md 未満は 1 カラム、md 以上で 2 カラムにする', () => {
    expect(css).toContain('[data-hh-sidebar-layout] {\n  grid-template-columns: minmax(0, 1fr);\n}');
    expect(css).toContain(`${mediaUp('md')} {\n  [data-hh-sidebar-layout] {`);
  });

  /**
   * grid/flex の子は既定が min-width: auto で、長い語や広い表が親を押し広げる。
   * 横スクロールの原因として最も見落とされやすいので明示的に固定する。
   */
  it('grid/flex の子の min-width: auto を解除する', () => {
    expect(css).toContain(':where([data-hh-sidebar-layout], [data-hh-stack]) > * {\n  min-width: 0;\n}');
  });

  it('横スクロールを受け止める箱の規則がある (表の破綻を親で吸収する)', () => {
    expect(css).toContain('[data-hh-scroll-x] {');
    expect(css).toContain('overflow-x: auto;');
  });

  /**
   * md 以上/lg 以上を固定 flex 列 + overflow-x: auto にすると、7 工程ぶんの幅が
   * 画面に入らない限り常に横スクロールが出る (HarnessHub 構築パイプラインボードの
   * 横スクロール問題)。列数を画面幅ごとに grid で固定して折り返すことで、
   * どの画面幅でも横スクロールなしに全工程を見渡せるようにする。
   */
  it('StageBoard は md 未満で選択工程だけ、md 以上は grid で折り返して全工程を横スクロールなしに表示する', () => {
    expect(css).toContain('[data-hh-stage-picker-options] {');
    expect(css).toContain(
      '[data-hh-stage-board]:has([data-hh-stage-option]:nth-child(1) input:checked) [data-hh-stage-column]:nth-child(1)',
    );
    expect(css).toContain('[data-hh-stage-column] {\n  display: none;');
    expect(css).toContain(`${mediaUp('md')} {\n  [data-hh-stage-picker] {\n    display: none;`);
    expect(css).toContain(
      '[data-hh-stage-columns] {\n    display: grid;\n    grid-template-columns: repeat(3, minmax(0, 1fr));',
    );
    expect(css).toContain('[data-hh-stage-column] {\n    display: block;\n    min-width: 0;');
    expect(css).toContain(
      `${mediaUp('lg')} {\n  [data-hh-stage-columns] {\n    grid-template-columns: repeat(4, minmax(0, 1fr));`,
    );
    expect(css).not.toMatch(
      /\[data-hh-stage-columns\] \{\s*display: flex;\s*gap: var\(--hh-space-3\);\s*overflow-x: auto;/,
    );
  });

  /**
   * 折り返し位置を持たない長い語 (URL・識別子) は、箱の幅に関係なく外へ描かれる。
   * 矩形は親幅に収まったままなので要素の座標では検出できず、実ブラウザでも
   * document の scrollWidth にしか現れない。base 層で塞いでおく。
   */
  it('折り返せない長い語を溢れさせない', () => {
    expect(css).toContain('overflow-wrap: anywhere;');
    // break-all は日本語の文中でも無差別に切ってしまうので使わない
    expect(css).not.toContain('word-break: break-all;');
  });

  /** 列が潰れて読めなくなるのを防ぐ下限。DataTable はこの変数を掛けて minWidth を作る。 */
  it('表の 1 列あたりの下限を変数で配る', () => {
    expect(css).toContain('--hh-table-column-min:');
  });

  /**
   * 閾値を直書きすると token 側を変えても CSS が追従しない。
   *
   * 検査対象を生成関数の出力だけにすると「実際に配られるファイル」を見ていないことになるので、
   * コミット済みの `tokens.css` も同じ規則で通す (生成し忘れたまま直書きが残る経路を塞ぐ)。
   * 上限側 (`mediaDown`) は境界の重なりを避けるため閾値から 0.02px 引いた値になるので、
   * 「そのまま一致」ではなく「どれかの閾値から 0.02 引いた値」として照合する。
   *
   * **単位も検査対象に含める。** 塞いだ元の違反は `@media (max-width: 30rem)` で、
   * 単位が px の値だけを拾う検査では同じ違反が戻ってきても緑のまま通る。
   * 閾値は token 側が px で保持しているので、CSS に px 以外の breakpoint が出る正当な理由は無い。
   */
  it.each([
    ['buildBaseCss() の出力', css],
    ['コミット済みの tokens.css', tokensCssArtifact],
  ])('%s の breakpoint 閾値は token 由来の値だけを使う', (_label, source) => {
    const thresholds = Object.values(breakpointTokens);
    const lower = collectBreakpointUses(source, 'min-width');
    expect(lower.length).toBeGreaterThan(0);
    for (const { value, unit } of lower) {
      expect(unit).toBe('px');
      expect(thresholds).toContain(value);
    }

    const upper = collectBreakpointUses(source, 'max-width');
    expect(upper.length).toBeGreaterThan(0);
    for (const { value, unit } of upper) {
      expect(unit).toBe('px');
      expect(thresholds).toContain(Math.round(value + 0.02));
    }
  });

  /**
   * 上の検査が**生きている**ことを固定する。
   *
   * 元の違反 (`@media (max-width: 30rem)`) を合成した CSS に対して、拾えていること・
   * 単位が px でないことの両方を確認する。ここが無いと、検査側の正規表現が
   * 取りこぼす形に戻っても「緑だから守られている」と読めてしまう。
   */
  it('px 以外の単位で書かれた breakpoint を拾う (検査の空振り防止)', () => {
    const withRem = '@media (max-width: 30rem) {\n  .x {\n    max-width: 100%;\n  }\n}';
    const uses = collectBreakpointUses(withRem, 'max-width');

    expect(uses).toEqual([{ value: 30, unit: 'rem' }]);
    // 通常の宣言 (max-width: 100%) は @media の条件部ではないので拾わない
    expect(uses).toHaveLength(1);
  });

  /** Container の左右 padding は幅で変わるので、変数として base 層が定義する。 */
  it('Container の左右 padding を幅に応じて変数で出し分ける', () => {
    expect(css).toContain('--hh-container-padding-inline:');
    expect(css.indexOf(`${mediaUp('md')} {\n  :root {`)).toBeGreaterThan(-1);
  });
});
