/** テーブル部品の単体テスト。ソートの読み上げ状態・空表示・スケルトンによる高さ確保を固定する。 */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DataTable, type DataTableColumn, type DataTableProps, InlineEditTable } from '../index.js';
import { renderWithUi } from '../test-utils.js';

/**
 * 問い合わせ結果の N 番目を取り出す。非 null 断言 (`!`) を使わないのは、
 * 要素が足りないときに「何番目が無かったか」を出して落としたいため。
 */
function nth<T>(elements: readonly T[], index: number): T {
  const element = elements[index];
  if (element === undefined) {
    throw new Error(`${index} 番目の要素がありません (取得できた件数: ${elements.length})`);
  }
  return element;
}

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
  it('rowAttention と読み上げlabelは型で必須ペアになる', () => {
    // @ts-expect-error rowAttentionLabel の無い強調判定は undefined を読み上げうるため拒否する
    const invalid: DataTableProps<Row> = {
      caption: '一覧',
      columns,
      rows,
      rowKey: (row) => row.id,
      rowAttention: () => true,
    };
    expect(invalid.rowAttentionLabel).toBeUndefined();
  });
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
    expect(within(nth(headers, 0)).queryByRole('button')).not.toBeNull();
    expect(within(nth(headers, 2)).queryByRole('button')).toBeNull();
  });

  it('押すたびに昇順→降順を切り替え、aria-sort に反映する', async () => {
    const user = userEvent.setup();
    renderWithUi(<DataTable caption="一覧" columns={columns} rows={rows} rowKey={(row) => row.id} />);

    const nameHeader = nth(screen.getAllByRole('columnheader'), 0);
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

    const countHeader = nth(screen.getAllByRole('columnheader'), 1);
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

    await user.click(within(nth(screen.getAllByRole('columnheader'), 0)).getByRole('button'));

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

  it('先頭列に sticky を指定すると、見出しと本文の両方が左端へ貼り付く', () => {
    renderWithUi(
      <DataTable
        caption="一覧"
        columns={[{ ...nth(columns, 0), sticky: true, width: '12rem' }, nth(columns, 1), nth(columns, 2)]}
        rows={rows}
        rowKey={(row) => row.id}
        stickyHeader
      />,
    );

    // 見出しは縦横どちらにも貼り付く。片方だけだと左上の角のセルで内容が流れる
    const firstHeader = nth(screen.getAllByRole('columnheader'), 0).getAttribute('style') ?? '';
    expect(firstHeader).toContain('position: sticky');
    expect(firstHeader).toContain('inset-block-start: 0');
    expect(firstHeader).toContain('inset-inline-start: 0');

    // 本文セルは背景を必ず持つ。無いと後ろを流れる列が透けて読めなくなる
    const firstCell = nth([...document.querySelectorAll('tbody tr td')], 0).getAttribute('style') ?? '';
    expect(firstCell).toContain('position: sticky');
    expect(firstCell).toContain('inset-inline-start: 0');
    expect(firstCell).toContain('background:');

    // 2 列目は貼り付けない (固定できるのは先頭 1 列だけ)
    expect(nth([...document.querySelectorAll('tbody tr td')], 1).getAttribute('style') ?? '').not.toContain(
      'position: sticky',
    );
  });

  it('sticky を指定しなければどのセルも貼り付かない', () => {
    renderWithUi(<DataTable caption="一覧" columns={columns} rows={rows} rowKey={(row) => row.id} />);

    for (const cell of document.querySelectorAll('td, th')) {
      expect(cell.getAttribute('style') ?? '').not.toContain('position: sticky');
    }
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

    await user.click(nth(screen.getAllByRole('button'), 0));
    expect(screen.getByLabelText('いろは の 名前')).toBeDefined();
  });

  it('Enter で確定を通知する', async () => {
    const user = userEvent.setup();
    const onCommit = setup();

    await user.click(nth(screen.getAllByRole('button'), 0));
    await user.clear(screen.getByLabelText('いろは の 名前'));
    await user.type(screen.getByLabelText('いろは の 名前'), 'あたらしい{Enter}');

    expect(onCommit).toHaveBeenCalledWith({ rowId: 'b', columnKey: 'name', value: 'あたらしい' });
  });

  it('Escape で編集を取り消す', async () => {
    const user = userEvent.setup();
    const onCommit = setup();

    await user.click(nth(screen.getAllByRole('button'), 0));
    await user.type(screen.getByLabelText('いろは の 名前'), 'x{Escape}');

    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('いろは の 名前')).toBeNull();
  });
});

/**
 * 狭い画面でのカード表示 (`narrowAs="card-collection"`)。
 *
 * SSR では画面幅が分からないので、表とカードを両方描いて CSS が片方を隠す。
 * jsdom には base 層の CSS が届かないため、ここでは「どちらが表示されるか」ではなく
 * 「切り替えの目印が正しく付いているか」と「両者が同じ状態を見ているか」を固定する。
 */
describe('DataTable の狭い画面表現', () => {
  const cardColumns: DataTableColumn<Row>[] = [
    { key: 'name', header: '名前', value: (row) => row.name, sortable: true },
    { key: 'count', header: '件数', value: (row) => row.count, sortable: true, salience: 'lead' },
    { key: 'note', header: 'メモ', render: () => '—' },
  ];

  const renderCards = (): void => {
    renderWithUi(
      <DataTable
        caption="利用者一覧"
        columns={cardColumns}
        rows={rows}
        rowKey={(row) => row.id}
        narrowAs="card-collection"
      />,
    );
  };

  it('表とカードの両方を描き、出し分けの目印を持たせる', () => {
    renderCards();

    const wide = document.querySelector('[data-hh-viewport="wide"]');
    const narrow = document.querySelector('[data-hh-viewport="narrow"]');
    expect(wide?.querySelector('table')).not.toBeNull();
    // カード側に表を作らない (両方が表だと、狭い画面での横スクロールが解消しない)
    expect(narrow?.querySelector('table')).toBeNull();
    expect(narrow?.querySelectorAll('li')).toHaveLength(rows.length);
  });

  it('先頭列をカードの見出しにし、残りは宣言した段へ振り分ける', () => {
    renderCards();

    const card = nth([...(document.querySelector('[data-hh-viewport="narrow"]')?.querySelectorAll('li') ?? [])], 0);
    // 先頭列 (名前) がカードの名前になる。段の指定があってもこの座は動かさない。
    // ただし文書の見出し (h1..h6) にはしない。表とカードは常に両方 DOM にあるので、
    // 見出しにすると表を見ている広い画面でも隠れたカードぶんの見出しが目次に並ぶ
    expect(within(card).queryByRole('heading')).toBeNull();
    expect(nth([...card.querySelectorAll('p')], 0).textContent).toBe('いろは');
    // salience を宣言した列だけが lead、宣言しなかった列は metadata に落ちる
    const salience = [...card.querySelectorAll('dl')].map((list) => list.getAttribute('data-hh-salience'));
    expect(salience).toEqual(['lead', 'metadata']);
    expect(within(nth([...card.querySelectorAll('dl')], 0)).getByRole('term').textContent).toBe('件数');
  });

  it('カード側の並べ替えは選択欄になり、表と同じ状態を動かす', async () => {
    const user = userEvent.setup();
    renderCards();

    // 初期状態は既定の並び (rows の順)
    expect(bodyTexts(0)).toEqual(['いろは', 'あさひ', 'うたげ']);

    await user.selectOptions(screen.getByLabelText('並び替え'), 'descending:count');

    // 選択欄はカード側にしかないが、状態は表と共有しているので表の並びも変わる。
    // 広い画面へ戻したときに並びが巻き戻らないことがここで担保される
    expect(bodyTexts(0)).toEqual(['あさひ', 'いろは', 'うたげ']);
    const cardTitles = [
      ...(document.querySelector('[data-hh-viewport="narrow"]')?.querySelectorAll('article > p:first-of-type') ?? []),
    ].map((title) => title.textContent);
    expect(cardTitles).toEqual(['あさひ', 'いろは', 'うたげ']);
  });

  it('並べ替えの候補に列と向きの組を全部並べる', () => {
    renderCards();

    const options = [...screen.getByLabelText('並び替え').querySelectorAll('option')].map((option) => option.value);
    // 並べ替え可能な 2 列 × 昇順/降順。value を持たない「メモ」列は候補に出さない
    expect(options).toEqual(['', 'ascending:name', 'descending:name', 'ascending:count', 'descending:count']);
    // SSR で書き出した HTML を読み直しても値が変わらない文字だけを使う
    expect(options.some((option) => option.includes('\u0000'))).toBe(false);
  });

  it('注記は表とカードの両方に効く 1 つとして出す', () => {
    renderWithUi(
      <DataTable
        caption="利用者一覧"
        columns={cardColumns}
        rows={rows}
        rowKey={(row) => row.id}
        narrowAs="card-collection"
        note="並べ替えはこのページに表示中の分が対象です。"
      />,
    );

    // 画面側が表の上に書くと、カード表示のときだけ注記が消える。
    // 部品が持てば 1 つ書くだけで両方に効く
    const notes = screen.getAllByText('並べ替えはこのページに表示中の分が対象です。');
    expect(notes).toHaveLength(1);
    expect(nth(notes, 0).compareDocumentPosition(nth([...document.querySelectorAll('table')], 0))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('0 件のときはカード側にも理由を出す', () => {
    renderWithUi(
      <DataTable
        caption="利用者一覧"
        columns={cardColumns}
        rows={[]}
        rowKey={(row) => row.id}
        narrowAs="card-collection"
      />,
    );

    // 表側の空セルとカード側の文言で 2 か所。空欄のまま黙らせない
    expect(screen.getAllByText('該当するデータがありません')).toHaveLength(2);
  });
});
