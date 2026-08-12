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

const badgeToneStyle: Record<BadgeTone, CSSProperties> = {
  neutral: {
    background: colorVar('surfaceMuted'),
    color: colorVar('textMuted'),
    border: `1px solid ${colorVar('border')}`,
  },
  primary: {
    background: colorVar('primarySoft'),
    color: colorVar('primary'),
    border: `1px solid ${colorVar('primarySoft')}`,
  },
  info: { background: colorVar('infoSoft'), color: colorVar('infoCyan'), border: `1px solid ${colorVar('infoSoft')}` },
  warning: {
    background: colorVar('warningSoft'),
    color: colorVar('warning'),
    border: `1px solid ${colorVar('warningSoft')}`,
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
