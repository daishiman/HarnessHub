'use client';

import type { CSSProperties, ReactNode } from 'react';

import { colorVar, radiusVar, spaceVar } from '../internal/style.js';

/** タグ/バッジ用の小さな共通の角丸ピル。Markdown の重量級依存を持たない。 */
export type BadgeTone = 'neutral' | 'primary' | 'info' | 'warning';

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  style?: CSSProperties;
}

/**
 * 縁取りはトーンの主色を 30% だけ混ぜた色にする (HarnessHub 配色仕様書 v2 §7)。
 * `soft` 背景と同色の枠線は視覚的に消えてしまうため、`color-mix()` で
 * 主色を薄く効かせ、背景との段差を作る。未対応ブラウザは `border-color` が
 * 無効値として無視され、`border-width/style` 由来の 1px 実線だけが残る
 * (contrastRequirements は背景と文字色の組にしか掛からないため安全側に倒れる)。
 */
const toneBorder = (colorName: 'primary' | 'infoCyan' | 'warning'): string =>
  `1px solid color-mix(in srgb, ${colorVar(colorName)} 30%, transparent)`;

const badgeToneStyle: Record<BadgeTone, CSSProperties> = {
  neutral: {
    background: colorVar('surfaceMuted'),
    color: colorVar('textMuted'),
    border: `1px solid ${colorVar('border')}`,
  },
  primary: {
    background: colorVar('primarySoft'),
    color: colorVar('primary'),
    border: toneBorder('primary'),
  },
  info: { background: colorVar('infoSoft'), color: colorVar('infoCyan'), border: toneBorder('infoCyan') },
  warning: {
    background: colorVar('warningSoft'),
    color: colorVar('warning'),
    border: toneBorder('warning'),
  },
};

export function Badge({ children, tone = 'neutral', style }: BadgeProps): ReactNode {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: spaceVar(1),
        padding: `2px ${spaceVar(2)}`,
        borderRadius: radiusVar('full'),
        fontSize: 'var(--hh-font-size-sm)',
        lineHeight: 'var(--hh-line-height-tight)',
        whiteSpace: 'nowrap',
        ...badgeToneStyle[tone],
        ...style,
      }}
    >
      {children}
    </span>
  );
}
