'use client';

/** かんばん風ステージボード。工程移動はメニュー操作に限り、DnD は採用しない (タッチ/キーボード同等性)。 */
import type { ReactNode } from 'react';

import { colorVar, radiusVar, spaceVar, surfaceStyle } from '../internal/style.js';
import { getStatusLabel, type StatusValue } from '../i18n/status-vocabulary.js';
import { useUi } from '../theme/UiProvider.js';
import { Button } from './Button.js';

export type BuildStage = StatusValue<'buildStage'>;

/** リスクの度合い。色だけでなくラベルでも示す。 */
export type StageRisk = 'none' | 'warn' | 'blocked';

export interface StageCard {
  id: string;
  title: string;
  /** 担当者名など補足行。 */
  meta?: string;
  risk?: StageRisk;
}

export interface StageColumn {
  stage: BuildStage;
  cards: readonly StageCard[];
}

export interface StageBoardProps {
  /** ボード全体の説明。 */
  label: string;
  columns: readonly StageColumn[];
  /** 隣接工程への移動。省略すると移動操作を出さない (閲覧専用)。 */
  onMoveCard?: (cardId: string, direction: 'previous' | 'next') => void;
}

const riskLabels: Record<StageRisk, { ja: string; en: string }> = {
  none: { ja: 'リスクなし', en: 'No risk' },
  warn: { ja: '注意', en: 'Warning' },
  blocked: { ja: '停止中', en: 'Blocked' },
};

const riskColors: Record<StageRisk, string> = {
  none: colorVar('textMuted'),
  warn: colorVar('warning'),
  blocked: colorVar('danger'),
};

export function StageBoard({ label, columns, onMoveCard }: StageBoardProps): ReactNode {
  const { locale, t } = useUi();

  return (
    <section aria-label={label} style={{ display: 'flex', gap: spaceVar(3), overflowX: 'auto' }}>
      {columns.map((column, columnIndex) => {
        const stageLabel = getStatusLabel('buildStage', column.stage, locale);

        return (
          <div
            key={column.stage}
            style={{ ...surfaceStyle, minWidth: '240px', padding: spaceVar(3) }}
          >
            <h3 style={{ fontSize: 'var(--hh-font-size-md)', margin: 0 }}>
              {stageLabel}
              <span style={{ color: colorVar('textMuted') }}>
                {` (${column.cards.length}${t('board.itemCount')})`}
              </span>
            </h3>

            <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: spaceVar(2) }}>
              {column.cards.map((card) => {
                const risk = card.risk ?? 'none';
                return (
                  <li
                    key={card.id}
                    style={{
                      border: `1px solid ${colorVar('border')}`,
                      borderRadius: radiusVar('sm'),
                      padding: spaceVar(2),
                    }}
                  >
                    <p style={{ margin: 0 }}>{card.title}</p>
                    {card.meta ? (
                      <p style={{ margin: 0, color: colorVar('textMuted'), fontSize: 'var(--hh-font-size-sm)' }}>
                        {card.meta}
                      </p>
                    ) : null}

                    {risk === 'none' ? null : (
                      <p style={{ margin: 0, color: riskColors[risk], fontSize: 'var(--hh-font-size-sm)' }}>
                        {riskLabels[risk][locale]}
                      </p>
                    )}

                    {onMoveCard ? (
                      <div style={{ display: 'flex', gap: spaceVar(1) }}>
                        {/*
                          どのカードの操作かを読み上げで区別する。可視文言 + 視覚的非表示 span の
                          連結だと算出名の空白の入り方が実装依存になるため、aria-label で確定させる。
                          可視ラベル (次へ/戻る) を先頭に含むので WCAG 2.5.3 Label in Name も満たす。
                        */}
                        <Button
                          variant="ghost"
                          disabled={columnIndex === 0}
                          aria-label={`${t('action.back')}: ${card.title}`}
                          onClick={() => onMoveCard(card.id, 'previous')}
                        >
                          {t('action.back')}
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={columnIndex === columns.length - 1}
                          aria-label={`${t('action.next')}: ${card.title}`}
                          onClick={() => onMoveCard(card.id, 'next')}
                        >
                          {t('action.next')}
                        </Button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>

            {column.cards.length === 0 ? (
              <p style={{ color: colorVar('textMuted'), fontSize: 'var(--hh-font-size-sm)' }}>
                {t('table.empty')}
              </p>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}
