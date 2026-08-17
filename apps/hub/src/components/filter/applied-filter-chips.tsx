import { Badge, TagRow, TextButton } from '@harness-hub/ui';
import type { ReactNode } from 'react';

export interface AppliedFilter {
  readonly label: string;
  readonly value: ReactNode;
  /**
   * この条件だけを外す操作。渡すとチップに解除ボタンが付く。
   *
   * 「絞り込みを全部解除」しか無いと、条件を 1 つだけ緩めたいときに他の条件まで
   * 入れ直すことになる。0 件になった原因の条件をその場で外せることが要る。
   */
  readonly onRemove?: () => void;
}

interface AppliedFilterChipsProps {
  readonly items: readonly AppliedFilter[];
}

/**
 * FilterBar の入力値ではなく、実際の一覧や集計へ適用済みの条件を表示する。
 *
 * 入力途中の値と確定済みの値を混同させないため、各画面は submit 後の state だけを渡す。
 */
export function AppliedFilterChips({ items }: AppliedFilterChipsProps): ReactNode {
  if (items.length === 0) return null;

  return (
    <TagRow label="適用中の絞り込み条件">
      {items.map((item) => (
        // ピルの形は共通の Badge が持つ。ここで書き起こしていたぶん、同じ画面に並ぶ
        // 状態チップ (StatusChip) と余白・境界線がわずかに違っていた。
        <Badge key={item.label} tone="neutral">
          <span data-hh-applied-filter-chip="">
            <strong>{item.label}:</strong> {item.value}
            {item.onRemove === undefined ? null : (
              // ラベルは「×」ではなく条件名を含める。並んだチップの解除ボタンが
              // 全部「×」だと、読み上げでどれを外すのか区別できない。
              // 見た目のない小さな操作なので TextButton。チップ本文との間合いだけを外側で開ける
              <span style={{ marginInlineStart: 'var(--hh-space-1)' }}>
                <TextButton tone="muted" onClick={item.onRemove} aria-label={`${item.label}の絞り込みを解除`}>
                  <span aria-hidden="true">×</span>
                </TextButton>
              </span>
            )}
          </span>
        </Badge>
      ))}
    </TagRow>
  );
}
