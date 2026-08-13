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

/**
 * チップの下地 (デザインシステム §7「ステータスバッジ」)。
 *
 * 仕様原案は 11px・等幅・大文字だが、本リポジトリの状態ラベルは「生成中」「承認待ち」の
 * ような和文で、等幅化も大文字化も効かず、11px では字形が潰れて読めない。
 * そこで原案の**狙い**である「本文より一段小さく・太く・締まった塊に見せる」だけを採り、
 * 寸法は和文が読める sm (14px) + 太字 + わずかな字間で表現する。
 */
const baseChipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: spaceVar(1),
  padding: `2px ${spaceVar(2)}`,
  borderRadius: radiusVar('full'),
  fontSize: 'var(--hh-font-size-sm)',
  fontWeight: 600,
  letterSpacing: '0.02em',
  lineHeight: 'var(--hh-line-height-tight)',
  whiteSpace: 'nowrap',
};

function toneStyle(tone: StatusTone): CSSProperties {
  const { foreground, background } = statusToneColors[tone];
  return {
    color: colorVar(foreground),
    background: colorVar(background),
    // 輪郭は文字色をそのまま引くのではなく 35% まで薄める (デザインシステム §7)。
    // 100% のままだと輪郭が文字と同じ強さで主張し、チップが「押せるもの」に見えてしまう。
    // 塗り (background) が意味の主役で、輪郭は面の境界を示す補助という役割分担にする。
    // color-mix で薄めているので、テーマ切替時も token の色を追従して 1 か所で決まる。
    border: `1px solid color-mix(in srgb, ${colorVar(foreground)} 35%, transparent)`,
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
