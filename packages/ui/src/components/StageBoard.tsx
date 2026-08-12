'use client';

/** かんばん風ステージボード。工程移動はメニュー操作に限り、DnD は採用しない (タッチ/キーボード同等性)。 */
import { type ReactNode, useId } from 'react';
import { getStatusLabel, type StatusValue } from '../i18n/status-vocabulary.js';
import { colorVar, radiusVar, spaceVar, surfaceStyle } from '../internal/style.js';
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
  const boardId = useId();
  const labelledColumns = columns.map((column) => ({
    ...column,
    stageLabel: getStatusLabel('buildStage', column.stage, locale),
  }));

  return (
    <section aria-label={label} data-hh-stage-board="">
      {/* 狭幅用の工程 segment。radio を使うので矢印キーによる選択がブラウザ標準で成立し、
          viewport を JavaScript で読む必要もない。カード本体は下の 1 組だけを共有する。 */}
      <fieldset data-hh-stage-picker="">
        <legend>{t('board.stagePicker')}</legend>
        <div data-hh-stage-picker-options="">
          {labelledColumns.map((column, columnIndex) => {
            const choiceId = `${boardId}-${column.stage}-choice`;
            return (
              <label key={column.stage} data-hh-stage-option="" htmlFor={choiceId}>
                <input
                  id={choiceId}
                  type="radio"
                  name={`${boardId}-stage`}
                  data-hh-stage-choice={column.stage}
                  aria-controls={`${boardId}-${column.stage}-column`}
                  defaultChecked={columnIndex === 0}
                />
                <span>{column.stageLabel}</span>
                <span
                  style={{ color: colorVar('textMuted') }}
                >{`(${column.cards.length}${t('board.itemCount')})`}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* narrow / wide で別のカード群を描かない。同じ column DOM を CSS で 1 列 / 7 列へ
          変形するため、支援技術へ同じカードが二重に現れず hydration の分岐も生まれない。 */}
      <div data-hh-stage-columns="">
        {labelledColumns.map((column, columnIndex) => (
          <section
            key={column.stage}
            id={`${boardId}-${column.stage}-column`}
            data-hh-stage-column={column.stage}
            aria-labelledby={`${boardId}-${column.stage}-heading`}
            style={{ ...surfaceStyle, padding: spaceVar(3) }}
          >
            <h3 id={`${boardId}-${column.stage}-heading`} style={{ fontSize: 'var(--hh-font-size-md)', margin: 0 }}>
              {column.stageLabel}
              <span style={{ color: colorVar('textMuted') }}>{` (${column.cards.length}${t('board.itemCount')})`}</span>
            </h3>

            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: spaceVar(2) }}>
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
              <p style={{ color: colorVar('textMuted'), fontSize: 'var(--hh-font-size-sm)' }}>{t('table.empty')}</p>
            ) : null}
          </section>
        ))}
      </div>
    </section>
  );
}
