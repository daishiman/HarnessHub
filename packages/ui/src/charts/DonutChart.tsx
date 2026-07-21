'use client';

/** ドーナツチャート。構成比を示す用途に限り、系列名は凡例テキストでも併記する。 */
import type { ReactNode } from 'react';

import { colorVar, seriesColorVar, spaceVar } from '../internal/style.js';
import { ChartFrame } from './ChartFrame.js';
import { buildDonutSegments, type ChartDatum } from './scale.js';

export interface DonutChartProps {
  title: string;
  data: readonly ChartDatum[];
  size?: number;
  thickness?: number;
}

/** 読み上げ用の要約。割合は整数 % に丸める。 */
function describeDonut(title: string, segments: ReturnType<typeof buildDonutSegments>): string {
  if (segments.length === 0) return `${title}。データがありません`;

  const parts = segments.map((segment) => `${segment.label} ${Math.round(segment.ratio * 100)}%`);
  return `${title}。${parts.join('、')}`;
}

export function DonutChart({ title, data, size = 180, thickness = 32 }: DonutChartProps): ReactNode {
  const segments = buildDonutSegments(data, { size, thickness });

  return (
    <ChartFrame
      title={title}
      description={describeDonut(title, segments)}
      tableColumns={['ラベル', '値', '割合']}
      tableRows={segments.map((segment) => ({
        key: segment.label,
        cells: [segment.label, segment.value, `${Math.round(segment.ratio * 100)}%`],
      }))}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: spaceVar(4), flexWrap: 'wrap' }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} focusable="false" aria-hidden="true">
          {segments.map((segment, index) => (
            <path key={segment.label} d={segment.path} fill={seriesColorVar(index)} />
          ))}
        </svg>

        {/* 凡例。色が判別できなくても対応が取れるよう、必ずラベルと数値を出す */}
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: spaceVar(1) }}>
          {segments.map((segment, index) => (
            <li key={segment.label} style={{ display: 'flex', alignItems: 'center', gap: spaceVar(2) }}>
              <span
                aria-hidden="true"
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '2px',
                  background: seriesColorVar(index),
                }}
              />
              <span style={{ color: colorVar('text') }}>
                {`${segment.label}: ${segment.value} (${Math.round(segment.ratio * 100)}%)`}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ChartFrame>
  );
}
