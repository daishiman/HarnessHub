/** チャート計算の単体テスト。SVG から切り出した純関数なので境界条件をここで固定する。 */
import { describe, expect, it } from 'vitest';

import {
  buildDonutSegments,
  buildPolylinePoints,
  describeChart,
  resolveValueDomain,
  scaleIndexToX,
  scaleValueToY,
} from '../index.js';

describe('resolveValueDomain', () => {
  it('空データでも 0 除算にならない値域を返す', () => {
    expect(resolveValueDomain([])).toEqual({ min: 0, max: 1 });
  });

  it('全点同値でも値域が潰れない', () => {
    expect(resolveValueDomain([5, 5, 5])).toEqual({ min: 0, max: 5 });
  });

  it('負値があれば下限に含める', () => {
    expect(resolveValueDomain([-3, 4])).toEqual({ min: -3, max: 4 });
  });

  it('正の値だけなら下限を 0 に揃える (棒の長さを実量で見せるため)', () => {
    expect(resolveValueDomain([10, 20])).toEqual({ min: 0, max: 20 });
  });
});

describe('scaleValueToY', () => {
  const domain = { min: 0, max: 100 };

  it('最大値は上端、最小値は下端になる (SVG の上下反転を吸収する)', () => {
    expect(scaleValueToY(100, domain, 200, 10)).toBeCloseTo(10, 5);
    expect(scaleValueToY(0, domain, 200, 10)).toBeCloseTo(190, 5);
  });

  it('中間値は中央に来る', () => {
    expect(scaleValueToY(50, domain, 200, 10)).toBeCloseTo(100, 5);
  });
});

describe('scaleIndexToX', () => {
  it('両端は padding の位置に置く', () => {
    expect(scaleIndexToX(0, 3, 100, 10)).toBeCloseTo(10, 5);
    expect(scaleIndexToX(2, 3, 100, 10)).toBeCloseTo(90, 5);
  });

  it('点が 1 つのときは中央に置く', () => {
    expect(scaleIndexToX(0, 1, 100, 10)).toBeCloseTo(50, 5);
  });
});

describe('buildPolylinePoints', () => {
  it('座標列を SVG の points 形式で返す', () => {
    const points = buildPolylinePoints(
      [
        { label: 'a', value: 0 },
        { label: 'b', value: 100 },
      ],
      { min: 0, max: 100 },
      { width: 100, height: 100, padding: 0 },
    );

    expect(points).toBe('0.00,100.00 100.00,0.00');
  });

  it('空データでは空文字を返す', () => {
    expect(buildPolylinePoints([], { min: 0, max: 1 }, { width: 10, height: 10, padding: 0 })).toBe('');
  });
});

describe('buildDonutSegments', () => {
  const data = [
    { label: '完了', value: 3 },
    { label: '進行中', value: 1 },
  ];

  it('割合を算出する', () => {
    const segments = buildDonutSegments(data, { size: 100, thickness: 20 });

    expect(segments.map((segment) => segment.ratio)).toEqual([0.75, 0.25]);
  });

  it('各セグメントに描画 path を持たせる', () => {
    for (const segment of buildDonutSegments(data, { size: 100, thickness: 20 })) {
      expect(segment.path).toMatch(/^M .+ A .+ Z$/);
    }
  });

  it('合計 0 のときは空配列 (0 除算を呼び出し側へ漏らさない)', () => {
    expect(buildDonutSegments([{ label: 'なし', value: 0 }], { size: 100, thickness: 20 })).toEqual([]);
  });

  it('1 件だけでも円弧が消えない', () => {
    const segments = buildDonutSegments([{ label: '全部', value: 5 }], { size: 100, thickness: 20 });

    expect(segments).toHaveLength(1);
    expect(segments[0]?.ratio).toBe(1);
    expect(segments[0]?.path).toContain('A');
  });

  it('負値は 0 として扱う', () => {
    const segments = buildDonutSegments(
      [
        { label: 'a', value: 4 },
        { label: 'b', value: -2 },
      ],
      { size: 100, thickness: 20 },
    );

    expect(segments.map((segment) => segment.ratio)).toEqual([1, 0]);
  });
});

describe('describeChart', () => {
  it('系列ごとの最小・最大・点数を読み上げ文にする', () => {
    const description = describeChart('週次の削減時間', [
      { name: '開発部', points: [{ label: '1週', value: 2 }, { label: '2週', value: 8 }] },
    ]);

    expect(description).toContain('週次の削減時間');
    expect(description).toContain('開発部: 最小 2 最大 8 (2 点)');
  });

  it('空系列でも例外にしない', () => {
    expect(describeChart('推移', [{ name: '無データ', points: [] }])).toContain('無データ');
  });
});
