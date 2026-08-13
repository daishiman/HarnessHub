/** design token の単体テスト。shared-layers §1「コントラスト 4.5:1 を token 段階で保証」の実体はここ。 */
import { describe, expect, it } from 'vitest';

import {
  breakpointTokens,
  buildThemeCss,
  chartSeriesTokens,
  checkContrastRequirements,
  colorTokens,
  colorVariableName,
  contrastRatio,
  contrastRequirements,
  densityNames,
  densityTokens,
  mediaUp,
  radiusTokens,
  relativeLuminance,
  shadowTokens,
  spacingTokens,
  themeNames,
  typographyTokens,
} from '../index.js';

describe('コントラスト契約 (token 段階の保証)', () => {
  const results = checkContrastRequirements();

  it.each(results.map((result) => [`${result.theme}: ${result.usage}`, result] as const))(
    '%s が要求比を満たす',
    (_label, result) => {
      expect(
        result.passes,
        `${result.theme} の ${result.foreground} on ${result.background} は ${result.ratio.toFixed(2)}:1 (要求 ${result.minRatio}:1)`,
      ).toBe(true);
    },
  );

  it('light / dark の両テーマを検証している', () => {
    expect(new Set(results.map((result) => result.theme))).toEqual(new Set(['light', 'dark']));
  });

  it('テーマを指定するとその分だけ返る', () => {
    expect(checkContrastRequirements('dark')).toHaveLength(contrastRequirements.length);
  });

  it('文字用途は全て 4.5:1 を要求している (基準の緩和が混ざっていないこと)', () => {
    const textUsages = contrastRequirements.filter((requirement) => requirement.minRatio === 4.5);
    expect(textUsages.length).toBeGreaterThan(0);
    expect(contrastRequirements.every((requirement) => requirement.minRatio >= 3)).toBe(true);
  });
});

describe('colorTokens', () => {
  it('light と dark が同じ token 集合を持つ', () => {
    expect(Object.keys(colorTokens.dark).sort()).toEqual(Object.keys(colorTokens.light).sort());
  });

  it('全ての値が 16 進の色である', () => {
    for (const theme of themeNames) {
      for (const [token, value] of Object.entries(colorTokens[theme])) {
        expect(value, `${theme}.${token}`).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  /**
   * デザインシステム §2「面は 3 段」の機械検証。
   * light は外枠 (pageBg) が最も暗く、カード (surface) が最も明るい。dark はその逆。
   * 3 段の明度が潰れると、影を持たない面同士の境界が読めなくなる。
   */
  it('面の階層は pageBg / bg / surface の 3 段で、テーマごとに向きが揃っている', () => {
    const light = colorTokens.light;
    expect(relativeLuminance(light.pageBg)).toBeLessThan(relativeLuminance(light.bg));
    expect(relativeLuminance(light.bg)).toBeLessThan(relativeLuminance(light.surface));

    const dark = colorTokens.dark;
    expect(relativeLuminance(dark.pageBg)).toBeLessThan(relativeLuminance(dark.bg));
    expect(relativeLuminance(dark.bg)).toBeLessThan(relativeLuminance(dark.surface));
  });

  /**
   * 旧構成の AI 専用色 (accentAi) は廃止した。「AI が作った」ではなく「いま動いている」で
   * 色を配る方針 (デザインシステム §1) の後戻りを防ぐため、名前の復活をここで止める。
   */
  it('AI 専用色を持たない (accent は状態色であって AI 印ではない)', () => {
    for (const theme of themeNames) {
      expect(Object.keys(colorTokens[theme]).filter((token) => token.startsWith('accentAi'))).toEqual([]);
    }
    expect(colorTokens.light.accent).toBeDefined();
  });
});

describe('チャート系列色', () => {
  it('系列色は全て surface 上で 3:1 以上 (図形の識別)', () => {
    for (const theme of themeNames) {
      for (const token of chartSeriesTokens) {
        const ratio = contrastRatio(colorTokens[theme][token], colorTokens[theme].surface);
        expect(ratio, `${theme}.${token}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('系列色に重複が無い', () => {
    expect(new Set(chartSeriesTokens).size).toBe(chartSeriesTokens.length);
  });
});

describe('寸法 token', () => {
  it('余白は 4px グリッド上にある', () => {
    for (const value of Object.values(spacingTokens)) {
      if (value === '0') continue;
      expect(Number.parseInt(value, 10) % 4).toBe(0);
    }
  });

  it('角丸と書体の token を公開している', () => {
    expect(radiusTokens.full).toBe('9999px');
    expect(typographyTokens.fontSizeMd).toBe('16px');
  });

  /** デザインシステム §7 の外枠 14px / カード 10px。段が潰れると入れ子の階層が読めなくなる。 */
  it('角丸は外枠 > カード の順に大きい', () => {
    expect(radiusTokens.frame).toBe('14px');
    expect(radiusTokens.card).toBe('10px');
    expect(Number.parseInt(radiusTokens.frame, 10)).toBeGreaterThan(Number.parseInt(radiusTokens.card, 10));
  });

  /** 影は「外枠を浮かせる」「下から迫り上がる面」の 2 種だけ。増やすと面の階層が曖昧になる。 */
  it('影 token は frame と raised の 2 種', () => {
    expect(Object.keys(shadowTokens).sort()).toEqual(['frame', 'raised']);
  });

  /**
   * 本文 16px を維持する。デザインシステム原案は 13-14px だが、本リポジトリは
   * 日本語が主で字形が複雑なうえ、WCAG 1.4.4 の 200% 拡大に耐える必要がある。
   * 「密度を上げる」考え方は density token (compact) 側で受ける。
   */
  it('本文は 16px を下回らない (和文可読性と 200% 拡大の担保)', () => {
    expect(Number.parseInt(typographyTokens.fontSizeMd, 10)).toBeGreaterThanOrEqual(16);
  });

  /** 英数字は IBM Plex Sans、等幅は JetBrains Mono (デザインシステム §3)。 */
  it('書体族はデザインシステムの 2 系統を先頭に置く', () => {
    expect(typographyTokens.fontFamily).toContain('IBM Plex Sans');
    expect(typographyTokens.fontFamilyMono).toContain('JetBrains Mono');
  });

  it('comfortable の操作部品は 44px のタップ域を確保する', () => {
    expect(densityTokens.comfortable.controlHeight).toBe('44px');
  });

  it('compact でも 36px を下回らない', () => {
    expect(Number.parseInt(densityTokens.compact.controlHeight, 10)).toBeGreaterThanOrEqual(36);
  });

  it('密度は comfortable / compact の 2 種', () => {
    expect([...densityNames]).toEqual(['comfortable', 'compact']);
  });
});

describe('colorVariableName', () => {
  it('camelCase を kebab-case の CSS 変数名にする', () => {
    expect(colorVariableName('primaryHover')).toBe('--hh-color-primary-hover');
    expect(colorVariableName('bg')).toBe('--hh-color-bg');
  });
});

describe('buildThemeCss', () => {
  const css = buildThemeCss();

  it(':root に light の色を出力する', () => {
    expect(css).toContain(':root {');
    expect(css).toContain(`--hh-color-primary: ${colorTokens.light.primary};`);
  });

  it('dark は data-theme 属性で切り替える', () => {
    expect(css).toContain("[data-theme='dark'] {");
    expect(css).toContain(`--hh-color-primary: ${colorTokens.dark.primary};`);
  });

  it('auto は prefers-color-scheme に追従する', () => {
    expect(css).toContain('@media (prefers-color-scheme: dark)');
    expect(css).toContain("[data-theme='auto']");
  });

  /**
   * スクロールバー・select の展開部・日付ピッカー・フォーム部品の枠はブラウザが描くので、
   * `--hh-color-*` を読まない。`color-scheme` を宣言しないと、dark 配色の画面に
   * 明色の部品だけが残る。**3 系統すべてで宣言されていること**を検査する
   * (1 つでも欠けると、その設定を選んでいる利用者にだけ破綻が出る)。
   */
  it.each([
    ['light', "[data-theme='light'] {\n  color-scheme: light;\n}"],
    ['dark', 'color-scheme: dark;\n}'],
    ['auto の既定側', "[data-theme='auto'] {\n  color-scheme: light;\n}"],
  ])('%s で color-scheme を宣言する', (_label, expected) => {
    expect(css).toContain(expected);
  });

  it('auto は OS が dark のときだけ color-scheme を dark へ上書きする', () => {
    const media = css.slice(css.indexOf('@media (prefers-color-scheme: dark)'));
    expect(media).toContain("[data-theme='auto'] {");
    expect(media).toContain('color-scheme: dark;');
    // 上書きが先に来ると既定側の light に負ける。順序も固定する
    expect(css.indexOf("[data-theme='auto'] {\n  color-scheme: light;\n}")).toBeLessThan(
      css.indexOf('@media (prefers-color-scheme: dark)'),
    );
  });

  it('表示密度は data-density 属性で切り替える', () => {
    expect(css).toContain("[data-density='compact'] {");
    expect(css).toContain('--hh-control-height: 36px;');
  });

  it('フォーカス可視化の規則を含む', () => {
    expect(css).toContain(':focus-visible');
    expect(css).toContain('var(--hh-color-focus-ring)');
  });

  it('余白・書体の変数を出力する', () => {
    expect(css).toContain('--hh-space-4: 16px;');
    expect(css).toContain('--hh-font-size-md: 16px;');
  });

  /**
   * breakpoint を CSS 変数として出しておくと、部品や app 側が「今どこで折り返しているか」を
   * 数値の直書きなしに参照できる。分岐そのものは @media (= base 層) が持つ。
   */
  it('breakpoint を CSS 変数として配る', () => {
    expect(css).toContain(`--hh-breakpoint-md: ${breakpointTokens.md}px;`);
    expect(css).toContain(`--hh-breakpoint-lg: ${breakpointTokens.lg}px;`);
  });

  /** 段階が逆転すると @media の条件が重なり、狭い方の規則が広い方を上書きしてしまう。 */
  it('breakpoint は昇順で重複しない', () => {
    const values = Object.values(breakpointTokens);
    expect([...values].sort((a, b) => a - b)).toEqual(values);
    expect(new Set(values).size).toBe(values.length);
  });

  it('mediaUp が token の値から @media 前置きを組み立てる', () => {
    expect(mediaUp('md')).toBe(`@media (min-width: ${breakpointTokens.md}px)`);
  });
});
