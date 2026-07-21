'use client';

/** バーチャート。自前 SVG 実装で、値は「表で見る」代替と併せて必ず数値でも取得できるようにする。 */
import type { ReactNode } from 'react';

import { colorVar } from '../internal/style.js';
import { chartSeriesTokens } from '../tokens/tokens.js';
import { ChartFrame } from './ChartFrame.js';
import { type ChartDatum, describeChart, resolveValueDomain, scaleValueToY } from './scale.js';

const PADDING = 8;

export interface BarChartProps {
  title: string;
  data: readonly ChartDatum[];
  height?: number;
}

export function BarChart({ title, data, height = 200 }: BarChartProps): ReactNode {
  const width = 480;
  const domain = resolveValueDomain(data.map((datum) => datum.value));
  const usableWidth = width - PADDING * 2;
  // 棒どうしの隙間を棒 1 本分の 25% とし、本数が増えても潰れないようにする。
  const slot = data.length === 0 ? usableWidth : usableWidth / data.length;
  const barWidth = slot * 0.75;
  const baseline = scaleValueToY(Math.max(0, domain.min), domain, height, PADDING);

  return (
    <ChartFrame
      title={title}
      description={describeChart(title, [{ name: title, points: data }])}
      tableColumns={['ラベル', '値']}
      tableRows={data.map((datum) => ({ key: datum.label, cells: [datum.label, datum.value] }))}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        focusable="false"
        aria-hidden="true"
      >
        {data.map((datum, index) => {
          const y = scaleValueToY(datum.value, domain, height, PADDING);
          return (
            <rect
              key={datum.label}
              x={PADDING + slot * index + (slot - barWidth) / 2}
              y={Math.min(y, baseline)}
              width={barWidth}
              height={Math.abs(baseline - y)}
              fill={colorVar(chartSeriesTokens[index % chartSeriesTokens.length]!)}
            />
          );
        })}
      </svg>
    </ChartFrame>
  );
}
