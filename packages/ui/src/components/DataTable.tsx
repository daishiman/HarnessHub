'use client';

/** 一覧表。ソートの aria-sort・見出しの scope・列幅固定によるレイアウトシフト抑制を一括で担保する。 */
import { type CSSProperties, type ReactNode, useMemo, useState } from 'react';

import { colorVar, spaceVar, visuallyHidden } from '../internal/style.js';
import { useUiText } from '../theme/UiProvider.js';

/**
 * 表示上の並び順。値は `aria-sort` の語彙をそのまま使う。
 * DB 問合せの並び順 (`@harness-hub/db` の `SortDirection` = asc/desc) とは別概念なので名前を分ける。
 */
export type TableSortDirection = 'ascending' | 'descending';

export interface DataTableSort {
  columnKey: string;
  direction: TableSortDirection;
}

export interface DataTableColumn<TRow> {
  key: string;
  header: string;
  /** ソート可能にする。`value` が無い列はソートできない。 */
  sortable?: boolean;
  /** ソートと既定表示に使う値。 */
  value?: (row: TRow) => string | number;
  /** 独自描画。省略時は `value` の結果を表示する。 */
  render?: (row: TRow) => ReactNode;
  /** 列幅。指定するとレイアウトシフトを抑えられる。 */
  width?: string;
  align?: 'start' | 'end';
}

export interface DataTableProps<TRow> {
  /** 表題。スクリーンリーダーが表の目的を読み上げるために必須。 */
  caption: string;
  /** 表題を視覚的にのみ隠す。 */
  hideCaption?: boolean;
  columns: readonly DataTableColumn<TRow>[];
  rows: readonly TRow[];
  rowKey: (row: TRow) => string;
  /** ソート状態を外部管理する場合に渡す (サーバ side ソート)。 */
  sort?: DataTableSort;
  defaultSort?: DataTableSort;
  onSortChange?: (sort: DataTableSort) => void;
  /** 読み込み中はスケルトン行を出し、高さを確保して CLS を抑える。 */
  loading?: boolean;
  skeletonRowCount?: number;
  emptyMessage?: string;
}

const cellStyle: CSSProperties = {
  padding: `var(--hh-row-padding-y) ${spaceVar(3)}`,
  borderBottom: `1px solid ${colorVar('border')}`,
  textAlign: 'start',
};

/** 次に押したときのソート方向。同じ列なら反転、別の列なら昇順から。 */
function nextSort(current: DataTableSort | undefined, columnKey: string): DataTableSort {
  if (current?.columnKey === columnKey && current.direction === 'ascending') {
    return { columnKey, direction: 'descending' };
  }
  return { columnKey, direction: 'ascending' };
}

export function DataTable<TRow>({
  caption,
  hideCaption = false,
  columns,
  rows,
  rowKey,
  sort,
  defaultSort,
  onSortChange,
  loading = false,
  skeletonRowCount = 3,
  emptyMessage,
}: DataTableProps<TRow>): ReactNode {
  const t = useUiText();
  const [internalSort, setInternalSort] = useState<DataTableSort | undefined>(defaultSort);
  const activeSort = sort ?? internalSort;

  const sortedRows = useMemo(() => {
    // 外部管理 (sort prop あり) のときは並べ替え済みの行がそのまま渡ってくる前提。
    if (sort || !activeSort) return rows;

    const column = columns.find((candidate) => candidate.key === activeSort.columnKey);
    if (!column?.value) return rows;

    const read = column.value;
    const direction = activeSort.direction === 'ascending' ? 1 : -1;
    return [...rows].sort((left, right) => {
      const a = read(left);
      const b = read(right);
      if (a === b) return 0;
      return (a < b ? -1 : 1) * direction;
    });
  }, [rows, columns, activeSort, sort]);

  const handleSort = (columnKey: string): void => {
    const updated = nextSort(activeSort, columnKey);
    if (!sort) setInternalSort(updated);
    onSortChange?.(updated);
  };

  const directionLabel = (direction: TableSortDirection): string =>
    direction === 'ascending' ? t('table.sortedAscending') : t('table.sortedDescending');

  return (
    <table
      // 読み込み中は表全体を busy として告知する。骨組み行を aria-hidden で隠すと
      // 表の行数と読み上げ内容が食い違うため、隠さずに状態のほうを伝える
      aria-busy={loading || undefined}
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        tableLayout: 'fixed',
        color: colorVar('text'),
        background: colorVar('surface'),
      }}
    >
      <caption style={hideCaption ? visuallyHidden : { textAlign: 'start', padding: spaceVar(2) }}>{caption}</caption>
      <colgroup>
        {columns.map((column) => (
          <col key={column.key} style={column.width ? { width: column.width } : undefined} />
        ))}
      </colgroup>
      <thead style={{ background: colorVar('surfaceMuted') }}>
        <tr>
          {columns.map((column) => {
            const isSorted = activeSort?.columnKey === column.key;
            const canSort = column.sortable === true && column.value !== undefined;

            return (
              <th
                key={column.key}
                scope="col"
                aria-sort={isSorted && activeSort ? activeSort.direction : undefined}
                style={{ ...cellStyle, textAlign: column.align ?? 'start' }}
              >
                {canSort ? (
                  <button
                    type="button"
                    data-hh-focusable=""
                    onClick={() => handleSort(column.key)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: spaceVar(1),
                      minHeight: 'var(--hh-control-height)',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      font: 'inherit',
                      color: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    {column.header}
                    {/* 記号は装飾。状態は aria-sort と下の読み上げ文で伝える */}
                    <span aria-hidden="true">
                      {isSorted && activeSort ? (activeSort.direction === 'ascending' ? '▲' : '▼') : '↕'}
                    </span>
                    <span style={visuallyHidden}>
                      {isSorted && activeSort ? directionLabel(activeSort.direction) : t('action.sort')}
                    </span>
                  </button>
                ) : (
                  column.header
                )}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {loading
          ? Array.from({ length: skeletonRowCount }, (_, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: 骨組み行は件数固定の装飾で識別子を持たず、並べ替えも差し込みも起きないため index が唯一の安定 key
              <tr key={`skeleton-${index}`}>
                {columns.map((column) => (
                  <td key={column.key} style={cellStyle}>
                    <span
                      style={{
                        display: 'block',
                        height: '1em',
                        borderRadius: 'var(--hh-radius-sm)',
                        background: colorVar('surfaceMuted'),
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))
          : sortedRows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((column) => (
                  <td key={column.key} style={{ ...cellStyle, textAlign: column.align ?? 'start' }}>
                    {column.render ? column.render(row) : column.value?.(row)}
                  </td>
                ))}
              </tr>
            ))}
        {!loading && sortedRows.length === 0 ? (
          <tr>
            <td colSpan={columns.length} style={{ ...cellStyle, color: colorVar('textMuted') }}>
              {emptyMessage ?? t('table.empty')}
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}
