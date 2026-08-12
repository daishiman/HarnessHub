import { TagRow } from '@harness-hub/ui';
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
        <span
          key={item.label}
          data-hh-applied-filter-chip=""
          style={{
            alignItems: 'center',
            background: 'var(--hh-color-surface-muted)',
            border: '1px solid var(--hh-color-border)',
            borderRadius: 'var(--hh-radius-full)',
            display: 'inline-flex',
            fontSize: 'var(--hh-font-size-sm)',
            gap: 'var(--hh-space-1)',
            padding: 'var(--hh-space-1) var(--hh-space-2)',
          }}
        >
          <strong>{item.label}:</strong> {item.value}
        </span>
      ))}
    </TagRow>
  );
}
