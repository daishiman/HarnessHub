/** テーブル部品の単体テスト。ソートの読み上げ状態・空表示・スケルトンによる高さ確保を固定する。 */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DataTable, type DataTableColumn, InlineEditTable } from '../index.js';
import { renderWithUi } from '../test-utils.js';

interface Row {
  id: string;
  name: string;
  count: number;
}

const rows: Row[] = [
  { id: 'b', name: 'いろは', count: 3 },
  { id: 'a', name: 'あさひ', count: 10 },
  { id: 'c', name: 'うたげ', count: 1 },
];

const columns: DataTableColumn<Row>[] = [
  { key: 'name', header: '名前', value: (row) => row.name, sortable: true },
  { key: 'count', header: '件数', value: (row) => row.count, sortable: true, align: 'end' },
  { key: 'note', header: 'メモ', render: () => '—' },
];

const bodyTexts = (columnIndex: number): string[] =>
  [...document.querySelectorAll('tbody tr')].map((row) => row.querySelectorAll('td')[columnIndex]?.textContent ?? '');

describe('DataTable', () => {
  it('caption で表の目的を伝える', () => {
    renderWithUi(<DataTable caption="利用者一覧" columns={columns} rows={rows} rowKey={(row) => row.id} />);
    expect(screen.getByRole('table', { name: '利用者一覧' })).toBeDefined();
  });

  it('見出しに scope="col" を付ける', () => {
    renderWithUi(<DataTable caption="一覧" columns={columns} rows={rows} rowKey={(row) => row.id} />);
    for (const header of screen.getAllByRole('columnheader')) {
      expect(header.getAttribute('scope')).toBe('col');
    }
  });

  it('ソート可能な列だけボタンにする', () => {
    renderWithUi(<DataTable caption="一覧" columns={columns} rows={rows} rowKey={(row) => row.id} />);

    const headers = screen.getAllByRole('columnheader');
    expect(within(headers[0]!).queryByRole('button')).not.toBeNull();
    expect(within(headers[2]!).queryByRole('button')).toBeNull();
  });

  it('押すたびに昇順→降順を切り替え、aria-sort に反映する', async () => {
    const user = userEvent.setup();
    renderWithUi(<DataTable caption="一覧" columns={columns} rows={rows} rowKey={(row) => row.id} />);

    const nameHeader = screen.getAllByRole('columnheader')[0]!;
    await user.click(within(nameHeader).getByRole('button'));

    expect(nameHeader.getAttribute('aria-sort')).toBe('ascending');
    expect(bodyTexts(0)).toEqual(['あさひ', 'いろは', 'うたげ']);

    await user.click(within(nameHeader).getByRole('button'));
    expect(nameHeader.getAttribute('aria-sort')).toBe('descending');
    expect(bodyTexts(0)).toEqual(['うたげ', 'いろは', 'あさひ']);
  });

  it('数値列も値として比較する (文字列比較にしない)', async () => {
    const user = userEvent.setup();
    renderWithUi(<DataTable caption="一覧" columns={columns} rows={rows} rowKey={(row) => row.id} />);

    const countHeader = screen.getAllByRole('columnheader')[1]!;
    await user.click(within(countHeader).getByRole('button'));

    expect(bodyTexts(1)).toEqual(['1', '3', '10']);
  });

  it('未ソートの列は aria-sort を持たない', () => {
    renderWithUi(
      <DataTable
        caption="一覧"
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        defaultSort={{ columnKey: 'name', direction: 'ascending' }}
      />,
    );

    expect(screen.getAllByRole('columnheader')[1]?.getAttribute('aria-sort')).toBeNull();
  });

  it('外部管理時は並べ替えず onSortChange だけ通知する', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    renderWithUi(
      <DataTable
        caption="一覧"
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        sort={{ columnKey: 'name', direction: 'ascending' }}
        onSortChange={onSortChange}
      />,
    );

    await user.click(within(screen.getAllByRole('columnheader')[0]!).getByRole('button'));

    expect(onSortChange).toHaveBeenCalledWith({ columnKey: 'name', direction: 'descending' });
    // 渡された順序のまま描画される (並べ替えはサーバ側の責務)
    expect(bodyTexts(0)).toEqual(['いろは', 'あさひ', 'うたげ']);
  });

  it('0 件のときは空メッセージを出す', () => {
    renderWithUi(<DataTable caption="一覧" columns={columns} rows={[]} rowKey={(row) => row.id} />);
    expect(screen.getByText('該当するデータがありません')).toBeDefined();
  });

  it('空メッセージを差し替えられる', () => {
    renderWithUi(
      <DataTable
        caption="一覧"
        columns={columns}
        rows={[]}
        rowKey={(row) => row.id}
        emptyMessage="まだ登録がありません"
      />,
    );
    expect(screen.getByText('まだ登録がありません')).toBeDefined();
  });

  it('読み込み中はスケルトン行で高さを確保する (CLS 抑制)', () => {
    renderWithUi(
      <DataTable caption="一覧" columns={columns} rows={[]} rowKey={(row) => row.id} loading skeletonRowCount={4} />,
    );

    expect(document.querySelectorAll('tbody tr')).toHaveLength(4);
    expect(screen.queryByText('該当するデータがありません')).toBeNull();
  });

  it('列幅指定を colgroup へ出す', () => {
    renderWithUi(
      <DataTable
        caption="一覧"
        columns={[{ key: 'name', header: '名前', value: (row) => row.name, width: '200px' }]}
        rows={rows}
        rowKey={(row) => row.id}
      />,
    );

    expect(document.querySelector('col')?.getAttribute('style')).toContain('200px');
  });
});

describe('InlineEditTable', () => {
  const editColumns = [
    { key: 'name', header: '名前', value: (row: Row) => row.name, editable: true },
    { key: 'count', header: '件数', value: (row: Row) => String(row.count) },
  ];

  const setup = (onCommit = vi.fn()) => {
    renderWithUi(
      <InlineEditTable
        caption="ユーザー"
        columns={editColumns}
        rows={rows}
        rowKey={(row) => row.id}
        rowLabel={(row) => row.name}
        onCommit={onCommit}
      />,
    );
    return onCommit;
  };

  it('編集可能セルだけをボタンにする', () => {
    setup();
    expect(screen.getAllByRole('button')).toHaveLength(rows.length);
  });

  it('編集欄には行と列が分かるラベルを付ける', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getAllByRole('button')[0]!);
    expect(screen.getByLabelText('いろは の 名前')).toBeDefined();
  });

  it('Enter で確定を通知する', async () => {
    const user = userEvent.setup();
    const onCommit = setup();

    await user.click(screen.getAllByRole('button')[0]!);
    await user.clear(screen.getByLabelText('いろは の 名前'));
    await user.type(screen.getByLabelText('いろは の 名前'), 'あたらしい{Enter}');

    expect(onCommit).toHaveBeenCalledWith({ rowId: 'b', columnKey: 'name', value: 'あたらしい' });
  });

  it('Escape で編集を取り消す', async () => {
    const user = userEvent.setup();
    const onCommit = setup();

    await user.click(screen.getAllByRole('button')[0]!);
    await user.type(screen.getByLabelText('いろは の 名前'), 'x{Escape}');

    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('いろは の 名前')).toBeNull();
  });
});
