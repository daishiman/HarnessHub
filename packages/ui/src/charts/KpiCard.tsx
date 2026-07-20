'use client';

/** KPI カード。サーバ計算済みの値を表示するだけで、クライアント側で金額を再計算しない (SEC5)。 */
import type { ReactNode } from 'react';

import { colorVar, spaceVar, surfaceStyle, visuallyHidden } from '../internal/style.js';
import { Sparkline } from './LineChart.js';

export type KpiTrend = 'up' | 'down' | 'flat';

export interface KpiCardProps {
  /** 指標名。 */
  label: string;
  /** 表示値。整形済みの文字列をそのまま受け取る (単位・桁区切りは呼び出し側の責務)。 */
  value: string;
  unit?: string;
  /** 前期比などの差分表示。 */
  delta?: { text: string; trend: KpiTrend };
  /** 推移のスパークライン用データ。 */
  trendValues?: readonly number[];
}

/** 増減の意味づけ。上昇が常に「良い」とは限らないため、色は中立寄りに保つ。 */
const trendMeta: Record<KpiTrend, { symbol: string; description: string; color: string }> = {
  up: { symbol: '▲', description: '増加', color: colorVar('success') },
  down: { symbol: '▼', description: '減少', color: colorVar('danger') },
  flat: { symbol: '−', description: '変化なし', color: colorVar('textMuted') },
};

export function KpiCard({ label, value, unit, delta, trendValues }: KpiCardProps): ReactNode {
  const meta = delta ? trendMeta[delta.trend] : null;

  return (
    <div style={{ ...surfaceStyle, padding: spaceVar(4), display: 'grid', gap: spaceVar(2) }}>
      <span style={{ color: colorVar('textMuted'), fontSize: 'var(--hh-font-size-sm)' }}>{label}</span>

      <strong style={{ fontSize: 'var(--hh-font-size-xl)', color: colorVar('text') }}>
        {value}
        {unit ? <span style={{ fontSize: 'var(--hh-font-size-md)' }}>{unit}</span> : null}
      </strong>

      {delta && meta ? (
        <span style={{ color: meta.color, fontSize: 'var(--hh-font-size-sm)' }}>
          {/* 記号は装飾。意味はテキストで補う */}
          <span aria-hidden="true">{meta.symbol}</span>
          <span style={visuallyHidden}>{`${meta.description}: `}</span>
          {delta.text}
        </span>
      ) : null}

      {trendValues && trendValues.length > 0 ? (
        <Sparkline label={`${label} の推移`} values={trendValues} />
      ) : null}
    </div>
  );
}
