/** チャート描画の純関数 (座標変換・目盛り)。SVG 部品から計算ロジックを切り離して単体検証できるようにする。 */

export interface ChartDatum {
  label: string;
  value: number;
}

export interface ChartSeries {
  name: string;
  points: readonly ChartDatum[];
}

/** 値域が潰れないように最小幅を確保する。全点同値でも直線が中央に引けるようにするため。 */
export function resolveValueDomain(values: readonly number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 1 };

  const min = Math.min(0, ...values);
  const max = Math.max(...values);
  return max === min ? { min, max: min + 1 } : { min, max };
}

/**
 * 値を SVG の y 座標へ写す。SVG は上が 0 なので上下を反転する。
 */
export function scaleValueToY(
  value: number,
  domain: { min: number; max: number },
  height: number,
  padding: number,
): number {
  const usable = height - padding * 2;
  const ratio = (value - domain.min) / (domain.max - domain.min);
  return height - padding - ratio * usable;
}

/** 系列内の i 番目の点の x 座標。点が 1 つのときは中央に置く。 */
export function scaleIndexToX(index: number, count: number, width: number, padding: number): number {
  const usable = width - padding * 2;
  if (count <= 1) return padding + usable / 2;
  return padding + (index / (count - 1)) * usable;
}

/** 折れ線の `points` 属性を組み立てる。 */
export function buildPolylinePoints(
  points: readonly ChartDatum[],
  domain: { min: number; max: number },
  size: { width: number; height: number; padding: number },
): string {
  return points
    .map((point, index) => {
      const x = scaleIndexToX(index, points.length, size.width, size.padding);
      const y = scaleValueToY(point.value, domain, size.height, size.padding);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

export interface DonutSegment extends ChartDatum {
  /** 全体に占める割合 (0-1)。 */
  ratio: number;
  /** 円弧の SVG path。 */
  path: string;
}

const polarToCartesian = (cx: number, cy: number, radius: number, angle: number): [number, number] => [
  cx + radius * Math.cos(angle - Math.PI / 2),
  cy + radius * Math.sin(angle - Math.PI / 2),
];

/**
 * ドーナツの各セグメントの path を算出する。
 * 合計が 0 のときは空配列を返し、0 除算を呼び出し側に漏らさない。
 */
export function buildDonutSegments(
  data: readonly ChartDatum[],
  options: { size: number; thickness: number },
): DonutSegment[] {
  const total = data.reduce((sum, datum) => sum + Math.max(0, datum.value), 0);
  if (total <= 0) return [];

  const center = options.size / 2;
  const outer = center;
  const inner = center - options.thickness;
  let startAngle = 0;

  return data.map((datum) => {
    const ratio = Math.max(0, datum.value) / total;
    // 全周 (ratio = 1) は始点と終点が重なって描画が消えるため、わずかに手前で止める。
    const sweep = ratio === 1 ? Math.PI * 2 - 0.0001 : ratio * Math.PI * 2;
    const endAngle = startAngle + sweep;
    const largeArc = sweep > Math.PI ? 1 : 0;

    const [x1, y1] = polarToCartesian(center, center, outer, startAngle);
    const [x2, y2] = polarToCartesian(center, center, outer, endAngle);
    const [x3, y3] = polarToCartesian(center, center, inner, endAngle);
    const [x4, y4] = polarToCartesian(center, center, inner, startAngle);

    const path = [
      `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
      `A ${outer} ${outer} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
      `L ${x3.toFixed(2)} ${y3.toFixed(2)}`,
      `A ${inner} ${inner} 0 ${largeArc} 0 ${x4.toFixed(2)} ${y4.toFixed(2)}`,
      'Z',
    ].join(' ');

    startAngle = endAngle;
    return { ...datum, ratio, path };
  });
}

/** チャートの読み上げ要約。role="img" の aria-label に使う。 */
export function describeChart(title: string, series: readonly ChartSeries[]): string {
  const parts = series.map((entry) => {
    const values = entry.points.map((point) => point.value);
    const min = values.length === 0 ? 0 : Math.min(...values);
    const max = values.length === 0 ? 0 : Math.max(...values);
    return `${entry.name}: 最小 ${min} 最大 ${max} (${entry.points.length} 点)`;
  });

  return [title, ...parts].join('。');
}
