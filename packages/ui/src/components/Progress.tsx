'use client';

/** 進捗・読み込み状態の表示。ポーリング中の PublishRequest / AiJob と、CLS を抑えるスケルトンを担う。 */
import type { CSSProperties, ReactNode } from 'react';

import { colorVar, radiusVar } from '../internal/style.js';

export interface ProgressBarProps {
  /** 何の進捗かを必ず説明する。 */
  label: string;
  /** 0-100。省略すると「終了時期が読めない処理」として不確定表示になる。 */
  value?: number;
  style?: CSSProperties;
}

/**
 * 進捗バー。
 * 値が読めない処理 (検査中・生成中など) は `value` を省略し、`aria-valuenow` を出さないことで
 * 支援技術へ「不確定」であることを正しく伝える。
 */
export function ProgressBar({ label, value, style }: ProgressBarProps): ReactNode {
  const clamped = value === undefined ? undefined : Math.min(100, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={clamped === undefined ? undefined : 0}
      aria-valuemax={clamped === undefined ? undefined : 100}
      aria-valuenow={clamped}
      style={{
        width: '100%',
        height: '8px',
        background: colorVar('surfaceMuted'),
        borderRadius: radiusVar('full'),
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        style={{
          width: clamped === undefined ? '100%' : `${clamped}%`,
          height: '100%',
          background: clamped === undefined ? colorVar('accentAi') : colorVar('primary'),
          transition: 'width 200ms ease',
        }}
      />
    </div>
  );
}

export interface SkeletonProps {
  /** 実データが入ったときと同じ高さを指定して、描画後のずれ (CLS) を防ぐ。 */
  height?: string;
  width?: string;
  /** 行数。段落のプレースホルダに使う。 */
  lines?: number;
  style?: CSSProperties;
}

/**
 * 読み込み中のプレースホルダ。
 * 内容を持たない装飾なので `aria-hidden` にし、読み込み状態の告知は
 * 呼び出し側の `aria-busy` / ライブリージョンで行う。
 */
export function Skeleton({ height = '1em', width = '100%', lines = 1, style }: SkeletonProps): ReactNode {
  return (
    <div aria-hidden="true" style={{ display: 'grid', gap: 'var(--hh-gap)', ...style }}>
      {Array.from({ length: lines }, (_, index) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: 行数固定の装飾で識別子を持たず、並べ替えも差し込みも起きないため index が唯一の安定 key
          key={index}
          style={{
            display: 'block',
            height,
            width: index === lines - 1 && lines > 1 ? '60%' : width,
            background: colorVar('surfaceMuted'),
            borderRadius: radiusVar('sm'),
          }}
        />
      ))}
    </div>
  );
}
