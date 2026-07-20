'use client';

/** 通知・エラー・空状態の表示。「平易な日本語 + 次の一手」を型で強制する統一フォーマット。 */
import type { CSSProperties, ReactNode } from 'react';

import { colorVar, radiusVar, spaceVar } from '../internal/style.js';
import { statusToneColors, type StatusTone } from '../i18n/status-vocabulary.js';
import { useUi } from '../theme/UiProvider.js';

export interface AlertProps {
  tone: StatusTone;
  title: string;
  /** 何が起きたかの説明。専門用語を避ける。 */
  description?: string | undefined;
  /** 次の一手 (再試行ボタン・導線リンクなど)。 */
  action?: ReactNode;
  /**
   * 支援技術への割り込み方。
   * 操作を止める必要があるものだけ `assertive` にする。
   */
  live?: 'polite' | 'assertive' | 'off' | undefined;
  style?: CSSProperties | undefined;
}

/** 汎用の通知枠。 */
export function Alert({ tone, title, description, action, live = 'polite', style }: AlertProps): ReactNode {
  const { foreground, background } = statusToneColors[tone];

  return (
    <div
      role={live === 'assertive' ? 'alert' : 'status'}
      aria-live={live === 'off' ? undefined : live}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spaceVar(2),
        padding: spaceVar(4),
        borderRadius: radiusVar('md'),
        border: `1px solid ${colorVar(foreground)}`,
        background: colorVar(background),
        color: colorVar(foreground),
        ...style,
      }}
    >
      <strong>{title}</strong>
      {description ? (
        <span style={{ lineHeight: 'var(--hh-line-height-normal)' }}>{description}</span>
      ) : null}
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export interface ErrorStateProps {
  title?: string | undefined;
  description?: string | undefined;
  /**
   * 次の一手。省略時は「時間をおいて、もう一度お試しください。」を出す。
   * 「エラーだけ出して終わり」の画面を作らせないための既定値。
   */
  nextAction?: ReactNode;
}

/** エラー表示。原因ではなく利用者が次に取れる行動を主役にする。 */
export function ErrorState({ title, description, nextAction }: ErrorStateProps): ReactNode {
  const { t } = useUi();

  return (
    <Alert
      tone="danger"
      live="assertive"
      title={title ?? t('error.title')}
      description={description ?? t('error.nextAction')}
      action={nextAction}
    />
  );
}

export interface EmptyStateProps {
  title?: string | undefined;
  description?: string | undefined;
  /** 最初の 1 件を作る導線など。 */
  action?: ReactNode;
}

/** 空状態。次の一手の導線を必ず置けるようにしている。 */
export function EmptyState({ title, description, action }: EmptyStateProps): ReactNode {
  const { t } = useUi();

  return <Alert tone="neutral" title={title ?? t('empty.title')} description={description} action={action} />;
}

export interface DegradedBannerProps {
  /** 影響範囲の説明。 */
  description?: string | undefined;
  action?: ReactNode;
}

/**
 * 縮退バナー (qa-019)。
 * 「導入済みツールはそのまま使えます」を既定文言に持ち、不安を煽らない表現へ寄せる。
 */
export function DegradedBanner({ description, action }: DegradedBannerProps): ReactNode {
  const { t } = useUi();

  return (
    <Alert
      tone="warning"
      title={t('degraded.title')}
      description={description ?? t('degraded.detail')}
      action={action}
    />
  );
}
