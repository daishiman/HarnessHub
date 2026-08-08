/** base 層 CSS の契約。素の HTML 要素が token を読む状態であることを固定する。 */
import { describe, expect, it } from 'vitest';

import { buildBaseCss } from './base-css.js';
import { focusRingDeclarations } from './focus-ring.js';
import { breakpointTokens, buildThemeCss, mediaUp } from './tokens.js';

const css = buildBaseCss();

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

  /** 閾値を直書きすると token 側を変えても CSS が追従しない。 */
  it('breakpoint の閾値は token 由来の値だけを使う', () => {
    const widths = [...css.matchAll(/min-width:\s*(\d+)px/g)].map((match) => Number(match[1]));
    expect(widths.length).toBeGreaterThan(0);
    for (const width of widths) {
      expect(Object.values(breakpointTokens)).toContain(width);
    }
  });

  /** Container の左右 padding は幅で変わるので、変数として base 層が定義する。 */
  it('Container の左右 padding を幅に応じて変数で出し分ける', () => {
    expect(css).toContain('--hh-container-padding-inline:');
    expect(css.indexOf(`${mediaUp('md')} {\n  :root {`)).toBeGreaterThan(-1);
  });
});
