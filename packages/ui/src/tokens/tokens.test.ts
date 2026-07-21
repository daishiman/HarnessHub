/** design token の単体テスト。shared-layers §1「コントラスト 4.5:1 を token 段階で保証」の実体はここ。 */
import { describe, expect, it } from 'vitest';

import {
  buildThemeCss,
  chartSeriesTokens,
  checkContrastRequirements,
  colorTokens,
  colorVariableName,
  contrastRatio,
  contrastRequirements,
  densityNames,
  densityTokens,
  radiusTokens,
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
});
