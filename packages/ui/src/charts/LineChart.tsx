'use client';

/** 折れ線チャートとスパークライン。依存ライブラリを持たない自前 SVG 実装 (Worker bundle 予算のため)。 */
import type { ReactNode } from 'react';

import { colorVar, seriesColorVar } from '../internal/style.js';
import { ChartFrame } from './ChartFrame.js';
import {
  buildPolylinePoints,
  type ChartSeries,
  describeChart,
  resolveValueDomain,
  scaleIndexToX,
  scaleValueToY,
} from './scale.js';

const PADDING = 8;

/** 系列を区別する破線パターン。色を見分けられない利用者のための冗長化。 */
const seriesDash = (index: number): string | undefined =>
  [undefined, '6 3', '2 3', '8 3 2 3', '1 3', '10 4'][index % 6];

export interface LineChartProps {
  title: string;
  series: readonly ChartSeries[];
  height?: number;
}

export function LineChart({ title, series, height = 200 }: LineChartProps): ReactNode {
  const width = 480;
  const values = series.flatMap((entry) => entry.points.map((point) => point.value));
  const domain = resolveValueDomain(values);
  const labels = series[0]?.points.map((point) => point.label) ?? [];

  return (
    <ChartFrame
      title={title}
      description={describeChart(title, series)}
      tableColumns={['ラベル', ...series.map((entry) => entry.name)]}
      tableRows={labels.map((label, index) => ({
        key: label,
        cells: [label, ...series.map((entry) => entry.points[index]?.value ?? '')],
      }))}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        focusable="false"
        aria-hidden="true"
      >
        {series.map((entry, index) => (
          <g key={entry.name}>
            <polyline
              points={buildPolylinePoints(entry.points, domain, { width, height, padding: PADDING })}
              fill="none"
              stroke={seriesColorVar(index)}
              strokeDasharray={seriesDash(index)}
              strokeWidth={2}
            />
            {entry.points.map((point, pointIndex) => (
              <circle
                key={point.label}
                cx={scaleIndexToX(pointIndex, entry.points.length, width, PADDING)}
                cy={scaleValueToY(point.value, domain, height, PADDING)}
                r={3}
                fill={seriesColorVar(index)}
              />
            ))}
          </g>
        ))}
      </svg>
    </ChartFrame>
  );
}

export interface SparklineProps {
  /** 何の推移かの説明。視覚的には出さないが読み上げには必要。 */
  label: string;
  values: readonly number[];
  width?: number;
  height?: number;
}

/**
 * 行内に置く極小の推移表示。
 * 単体では数値を読み取れないため、必ず実数値の表示と併記して使う。
 */
export function Sparkline({ label, values, width = 96, height = 24 }: SparklineProps): ReactNode {
  const points = values.map((value, index) => ({ label: String(index), value }));
  const domain = resolveValueDomain(values);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={label}
      focusable="false"
    >
      <polyline
        points={buildPolylinePoints(points, domain, { width, height, padding: 2 })}
        fill="none"
        stroke={colorVar('primary')}
        strokeWidth={1.5}
      />
    </svg>
  );
}
