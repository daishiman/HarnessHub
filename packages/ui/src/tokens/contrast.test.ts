/** コントラスト計算の単体テスト。design token の 4.5:1 判定がここに依存するため境界値を押さえる。 */
import { describe, expect, it } from 'vitest';

import {
  AA_CONTRAST_LARGE_TEXT,
  AA_CONTRAST_NON_TEXT,
  AA_CONTRAST_TEXT,
  contrastRatio,
  meetsTextContrast,
  parseHexColor,
  relativeLuminance,
} from '../index.js';

describe('parseHexColor', () => {
  it('#rrggbb を RGB へ分解する', () => {
    expect(parseHexColor('#1677ff')).toEqual({ r: 0x16, g: 0x77, b: 0xff });
  });

  it('短縮形 #rgb を展開する', () => {
    expect(parseHexColor('#fff')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it.each(['1677ff', '#12345', 'rgb(1,2,3)', ''])('不正な色 %j を拒否する', (input) => {
    expect(() => parseHexColor(input)).toThrow();
  });
});

describe('relativeLuminance', () => {
  it('黒は 0、白は 1', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
  });
});

describe('contrastRatio', () => {
  it('白と黒は最大比 21:1', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 2);
  });

  it('同色は 1:1', () => {
    expect(contrastRatio('#1677ff', '#1677ff')).toBeCloseTo(1, 5);
  });

  it('引数の順序は結果に影響しない', () => {
    expect(contrastRatio('#ffffff', '#0958d9')).toBeCloseTo(contrastRatio('#0958d9', '#ffffff'), 10);
  });
});

describe('AA の閾値', () => {
  it('本文 4.5 / 大きい文字 3 / 図形 3', () => {
    expect(AA_CONTRAST_TEXT).toBe(4.5);
    expect(AA_CONTRAST_LARGE_TEXT).toBe(3);
    expect(AA_CONTRAST_NON_TEXT).toBe(3);
  });
});

describe('meetsTextContrast', () => {
  it('4.5:1 に届く組合せを合格とする', () => {
    expect(meetsTextContrast('#0958d9', '#ffffff')).toBe(true);
  });

  it('mockup 実測の #1677ff は白背景で不合格 (token を濃色段へ寄せた理由)', () => {
    expect(meetsTextContrast('#1677ff', '#ffffff')).toBe(false);
  });
});
