'use client';

/** 状態チップとスコープチップ。表示ラベルは状態語彙辞書からのみ引き、画面での直書きを避ける。 */
import type { CSSProperties, ReactNode } from 'react';
import {
  getStatusLabel,
  getStatusTone,
  type StatusDomain,
  type StatusTone,
  type StatusValue,
  statusToneColors,
} from '../i18n/status-vocabulary.js';
import { colorVar, radiusVar, spaceVar } from '../internal/style.js';
import { useUi } from '../theme/UiProvider.js';

const baseChipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: spaceVar(1),
  padding: `2px ${spaceVar(2)}`,
  borderRadius: radiusVar('full'),
  fontSize: 'var(--hh-font-size-sm)',
  lineHeight: 'var(--hh-line-height-tight)',
  whiteSpace: 'nowrap',
};

function toneStyle(tone: StatusTone): CSSProperties {
  const { foreground, background } = statusToneColors[tone];
  return {
    color: colorVar(foreground),
    background: colorVar(background),
    border: `1px solid ${colorVar(foreground)}`,
  };
}

export interface StatusChipProps<D extends StatusDomain> {
  domain: D;
  status: StatusValue<D>;
  style?: CSSProperties;
}

/**
 * 状態チップ。
 * ラベル・配色ともに状態語彙辞書 (`statusVocabulary`) が唯一の出所なので、
 * 表示ゆれが起きない。
 */
export function StatusChip<D extends StatusDomain>({ domain, status, style }: StatusChipProps<D>): ReactNode {
  const { locale } = useUi();
  const tone = getStatusTone(domain, status);

  return (
    <span
      data-status-domain={domain}
      data-status={String(status)}
      style={{ ...baseChipStyle, ...toneStyle(tone), ...style }}
    >
      {getStatusLabel(domain, status, locale)}
    </span>
  );
}

export interface ScopeChipProps {
  /** スコープの種類。テナント越境の見落としを防ぐため必ず種別を出す。 */
  scope: 'tenant' | 'workspace' | 'project' | 'common';
  /** 対象の表示名。 */
  name: string;
  style?: CSSProperties;
}

const scopeLabels: Record<ScopeChipProps['scope'], { ja: string; en: string; tone: StatusTone }> = {
  tenant: { ja: 'テナント', en: 'Tenant', tone: 'magenta' },
  workspace: { ja: 'ワークスペース', en: 'Workspace', tone: 'primary' },
  project: { ja: 'プロジェクト', en: 'Project', tone: 'info' },
  common: { ja: '共通', en: 'Common', tone: 'neutral' },
};

/** どのスコープのデータを見ているかを示すチップ。種別名を省略せずに読み上げさせる。 */
export function ScopeChip({ scope, name, style }: ScopeChipProps): ReactNode {
  const { locale } = useUi();
  const descriptor = scopeLabels[scope];

  return (
    <span data-scope={scope} style={{ ...baseChipStyle, ...toneStyle(descriptor.tone), ...style }}>
      <span>{`${descriptor[locale]}: ${name}`}</span>
    </span>
  );
}
