import { Badge, TagRow } from '@harness-hub/ui';
import type { ReactNode } from 'react';

export interface AppliedFilter {
  readonly label: string;
  readonly value: ReactNode;
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
          </span>
        </Badge>
      ))}
    </TagRow>
  );
}
