'use client';

/** 一覧のまま値を直接編集する表。編集開始・確定・取消をキーボードだけで完結できるようにする。 */
import { useState, type ReactNode } from 'react';

import { colorVar, controlStyle, spaceVar, visuallyHidden } from '../internal/style.js';
import { useUi } from '../theme/UiProvider.js';

export interface InlineEditColumn<TRow> {
  key: string;
  header: string;
  value: (row: TRow) => string;
  /** 編集可能にする。省略時は読み取り専用。 */
  editable?: boolean;
}

export interface InlineEditCommit {
  rowId: string;
  columnKey: string;
  value: string;
}

export interface InlineEditTableProps<TRow> {
  caption: string;
  columns: readonly InlineEditColumn<TRow>[];
  rows: readonly TRow[];
  rowKey: (row: TRow) => string;
  /** 各行を人が識別できる名前。編集欄のラベルに使う。 */
  rowLabel: (row: TRow) => string;
  onCommit: (commit: InlineEditCommit) => void;
}

interface EditingCell {
  rowId: string;
  columnKey: string;
  draft: string;
}

export function InlineEditTable<TRow>({
  caption,
  columns,
  rows,
  rowKey,
  rowLabel,
  onCommit,
}: InlineEditTableProps<TRow>): ReactNode {
  const { t } = useUi();
  const [editing, setEditing] = useState<EditingCell | null>(null);

  const commit = (): void => {
    if (editing) onCommit({ rowId: editing.rowId, columnKey: editing.columnKey, value: editing.draft });
    setEditing(null);
  };

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', color: colorVar('text') }}>
      <caption style={{ textAlign: 'start', padding: spaceVar(2) }}>{caption}</caption>
      <thead style={{ background: colorVar('surfaceMuted') }}>
        <tr>
          {columns.map((column) => (
            <th key={column.key} scope="col" style={{ textAlign: 'start', padding: spaceVar(2) }}>
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const id = rowKey(row);
          const label = rowLabel(row);

          return (
            <tr key={id}>
              {columns.map((column) => {
                const isEditing = editing?.rowId === id && editing.columnKey === column.key;

                return (
                  <td
                    key={column.key}
                    style={{ padding: spaceVar(2), borderBottom: `1px solid ${colorVar('border')}` }}
                  >
                    {isEditing ? (
                      <input
                        // 編集欄には行と列が分かるラベルを与える。表の位置情報だけに頼らせない
                        aria-label={`${label} の ${column.header}`}
                        autoFocus
                        data-hh-focusable=""
                        value={editing.draft}
                        onChange={(event) => setEditing({ ...editing, draft: event.target.value })}
                        onBlur={commit}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            commit();
                          } else if (event.key === 'Escape') {
                            event.preventDefault();
                            setEditing(null);
                          }
                        }}
                        style={controlStyle()}
                      />
                    ) : column.editable === true ? (
                      <button
                        type="button"
                        data-hh-focusable=""
                        onClick={() =>
                          setEditing({ rowId: id, columnKey: column.key, draft: column.value(row) })
                        }
                        style={{
                          minHeight: 'var(--hh-control-height)',
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          font: 'inherit',
                          color: 'inherit',
                          textAlign: 'start',
                          cursor: 'pointer',
                        }}
                      >
                        {column.value(row)}
                        <span style={visuallyHidden}>{` — ${t('action.edit')}: ${label} の ${column.header}`}</span>
                      </button>
                    ) : (
                      column.value(row)
                    )}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
