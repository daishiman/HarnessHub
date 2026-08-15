'use client';

/** 一覧表。ソートの aria-sort・見出しの scope・列幅固定によるレイアウトシフト抑制を一括で担保する。 */
import { type CSSProperties, type ReactNode, useId, useMemo, useState } from 'react';

import { colorVar, spaceVar, visuallyHidden } from '../internal/style.js';
import { CardGrid, DataCard, type DefinitionListItem } from '../shell/information.js';
import type { Salience } from '../shell/salience.js';
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
  /**
   * 列幅。指定するとレイアウトシフトを抑えられる。
   * **`narrowAs="card-collection"` のカード表示では効かない** (カードに列が無いため)。
   */
  width?: string;
  align?: 'start' | 'end';
  /**
   * 横スクロールしても左端に貼り付けたままにする。
   *
   * 列が多い表は狭い画面で必ず横へはみ出し、右の列を見にいくと「どの行の話か」が
   * 画面から消える。行を名指しする列 (氏名・コード) だけをここで固定する。
   * 指定できるのは先頭 1 列だけ (2 列目以降の固定は左に積み上がる幅の計算が要り、
   * 列幅の指定漏れで列同士が重なる)。`width` を併せて指定すること。
   *
   * **`narrowAs="card-collection"` のカード表示では効かない**。カードには列が無く、
   * 貼り付ける相手も横スクロールも存在しない。狭い画面で「どの行か」を見失う問題は、
   * カード側では 1 件が 1 枚に分かれること自体が解になっている。
   */
  sticky?: boolean;
  /**
   * カード表示 (`narrowAs="card-collection"`) にしたときの顕著度 (FR-IDS-005)。
   *
   * **表の列順とは別の判断**であることに注意する。表では左が重要だが、カードでは
   * 見出しの次に来るものが重要になる。表で 2 列目にある「状態」が、カードでは `lead` に
   * 並ぶことは珍しくない。
   *
   * 既定は先頭列が見出し (カードのタイトル)、残りが `metadata`。
   * 表としてしか使わない列 (`narrowAs` を指定しない表) では意味を持たない。
   */
  salience?: Salience;
}

interface DataTableBaseProps<TRow> {
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
  /**
   * 列見出しを表の上端に貼り付ける。行数が画面高を超える一覧で使う。
   *
   * 同時に箱の高さへ上限を与える。sticky は「スクロールする箱」の中でしか効かず、
   * 高さが内容なりに伸びる箱では貼り付く相手がいないため何も起きない。
   */
  stickyHeader?: boolean;
  /**
   * 狭い画面での表現。既定 `table` (これまでどおり横スクロールする表)。
   *
   * `card-collection` にすると、狭い画面では 1 行が 1 枚のカードになる。
   * 列が 4 つを超える一覧は、狭い画面では横スクロールしても全体を把握できない
   * (右を見ると左が消える) ため、行を分解して縦に積むほうが読める。
   *
   * 出し分けは CSS だけで行い、両方の表現を描いておく (SSR では画面幅が分からないため)。
   * 隠れているほうは `display: none` で支援技術からも消える。
   */
  narrowAs?: 'table' | 'card-collection';
  /**
   * 表現の選び方。既定 `auto` は `narrowAs` と画面幅だけで決める (これまでどおり)。
   *
   * `cards` / `table` を渡すと画面幅によらずその表現だけを描く。
   * 幅で決めるのは「その画面に収まるか」であり、`viewMode` で決めるのは
   * 「利用者が見比べたいか、1 件を読み切りたいか」という**別の判断**なので軸を分ける。
   */
  viewMode?: 'auto' | 'cards' | 'table';
  /**
   * 表現の切替を利用者へ開く。渡すと可視ラベル付きの切替が表・カードの上に出る。
   * `viewMode` と必ず対で使う (渡さないと押しても何も変わらない)。
   */
  onViewModeChange?: (mode: 'cards' | 'table') => void;
  /**
   * 表・カードの上に出す注記。
   *
   * 「並べ替えはこのページに表示中の分が対象」のような、**結果の読み方に関わる断り**を置く。
   * 表とカードの両方に同じものが要るので、画面側で表の上に `<p>` を書くのではなく
   * ここへ渡す (書き分けると、カード表示のときだけ注記が消える)。
   */
  note?: ReactNode;
  /**
   * 行を「要対応」として視覚的に強調する判定。省略時は強調しない。
   * 色だけに頼らないよう、強調行には支援技術向けの説明文 (`rowAttentionLabel`) も併せて
   * 名指し列の先頭に差し込む (WCAG 1.4.1 Use of Color)。
   */
}

type DataTableAttentionProps<TRow> =
  | { readonly rowAttention?: undefined; readonly rowAttentionLabel?: never }
  | {
      readonly rowAttention: (row: TRow) => boolean;
      /** 強調行に付ける支援技術向けの説明文。判定と必須ペア。 */
      readonly rowAttentionLabel: string;
    };

export type DataTableProps<TRow> = DataTableBaseProps<TRow> & DataTableAttentionProps<TRow>;

const cellStyle: CSSProperties = {
  padding: `var(--hh-row-padding-y) ${spaceVar(3)}`,
  borderBottom: `1px solid ${colorVar('border')}`,
  textAlign: 'start',
};

/**
 * 列見出しの中身に共通で当てる寸法。
 * 並べ替えできる列 (button) とできない列 (span) の**両方**がこれを使うことで、
 * 記号の有無で見出しの高さが変わらなくなる。
 */
const headerInnerStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: spaceVar(1),
  minHeight: 'var(--hh-control-height)',
};

/**
 * 貼り付けた列の重なり順。数字を 1 か所に集めておかないと、
 * 「見出しの下に本文が潜る」「固定列が見出しの上に出る」が画面ごとに食い違う。
 * 画面の見出し帯 (15) と絞り込み帯 (14) より下に収める。
 */
const stickyLayer = { bodyColumn: 5, header: 10, headerColumn: 11 } as const;

/** 先頭列を貼り付けるかどうか。指定できるのは 1 列目だけなので、ここで 1 回だけ判定する。 */
function isStickyColumn<TRow>(columns: readonly DataTableColumn<TRow>[], index: number): boolean {
  return index === 0 && columns[0]?.sticky === true;
}

/**
 * 本文セルを左端へ貼り付ける指定。
 * 背景を必ず持たせるのは、指定が無いと後ろを流れていく列が透けて重なって読めなくなるため。
 */
function stickyBodyCellStyle<TRow>(columns: readonly DataTableColumn<TRow>[], index: number): CSSProperties {
  if (!isStickyColumn(columns, index)) return {};
  return {
    position: 'sticky',
    insetInlineStart: 0,
    zIndex: stickyLayer.bodyColumn,
    background: colorVar('surface'),
  };
}

/**
 * 要対応行の視覚強調スタイル。
 *
 * 色だけに頼らない設計は呼び出し側で担保済み (a11y ラベルを別途差し込む) なので、
 * ここでは見た目の強さだけを決める。他の行との差が伝わる強さにしつつ、
 * 表全体が「強調だらけ」に見えない (Phase 2: 一様に強くすると何も目立たなくなる) こと。
 */
function attentionRowStyle(): CSSProperties {
  // border / box-shadow は table-row (<tr>) には描画されない (CSS 2.1 の table model の仕様)。
  // <li> (カード) 側では効くが、<tr> 側では静かに無視されて背景だけの差になり、
  // 2 つの見た目が食い違う。両方で確実に効く background だけに絞る。
  return { background: colorVar('warningSoft') };
}

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
  stickyHeader = false,
  narrowAs = 'table',
  viewMode = 'auto',
  onViewModeChange,
  note,
  rowAttention,
  rowAttentionLabel,
}: DataTableProps<TRow>): ReactNode {
  const t = useUiText();
  // 同じ画面に一覧が 2 つ並んでも、狭い画面の並べ替え欄とそのラベルが取り違わないようにする
  const sortSelectId = useId();
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

  const noteLine =
    note === undefined ? null : (
      <p style={{ margin: 0, paddingBlockEnd: spaceVar(2), fontSize: 'var(--hh-font-size-sm)' }}>{note}</p>
    );

  const table = (
    // 列が増えるほど表の最小幅は伸びるので、狭い画面では必ず親を超える。
    // 箱の側で横スクロールを受け止めないと、画面全体が横へずれて他の内容まで読めなくなる。
    // tabIndex を付けるのは、スクロールできる領域がキーボードだけでは操作できなくなるため
    // (axe の scrollable-region-focusable が要求する)。ただし tabIndex だけを持つ div は
    // 支援技術から見ると「役割不明の止まり木」になるので、caption 由来の名前を与えて
    // 「何をスクロールしているのか」を読み上げられる形にする。overflow の指定は base 層が持つ。
    // role は group にする。region (= landmark) にすると表の数だけ landmark が増え、
    // 同名の表が 2 つ並んだ画面で axe の landmark-unique に触れる (実際に触れた)。
    // biome-ignore lint/a11y/useSemanticElements: <fieldset> はフォームの入力群をまとめる要素で、表の外枠に使うと意味が食い違う。ここで欲しいのは名前を持つ「ひとかたまり」だけなので role=group が最小
    <div
      data-hh-scroll-x=""
      role="group"
      aria-label={caption}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: スクロール可能領域はキーボード単独では動かせず WCAG 2.1.1 / axe scrollable-region-focusable が tabindex を要求するため
      tabIndex={0}
      // 高さの上限は「画面の 7 割」と「40rem」の小さいほう。
      // vh だけだと大画面で表 1 枚が画面を占有し、40rem だけだと小画面で下端が切れる。
      style={stickyHeader ? { maxHeight: 'min(70vh, 40rem)', overflowY: 'auto' } : undefined}
    >
      <table
        // 読み込み中は表全体を busy として告知する。骨組み行を aria-hidden で隠すと
        // 表の行数と読み上げ内容が食い違うため、隠さずに状態のほうを伝える
        aria-busy={loading || undefined}
        style={{
          width: '100%',
          // 列数ぶんの下限を持たせる。これが無いと table-layout: fixed が幅 100% に従うため、
          // 狭い画面では列が均等に潰れて 2〜3 文字で折り返し、箱の横スクロールも一切起きない
          // (= スクロールできる箱を用意した意味が無くなる)。下限値は base 層の変数が持つ。
          minWidth: `calc(${columns.length} * var(--hh-table-column-min))`,
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
            {columns.map((column, index) => {
              const isSorted = activeSort?.columnKey === column.key;
              const canSort = column.sortable === true && column.value !== undefined;
              const stuckColumn = isStickyColumn(columns, index);

              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={isSorted && activeSort ? activeSort.direction : undefined}
                  style={{
                    ...cellStyle,
                    textAlign: column.align ?? 'start',
                    // 縦と横は同じ position: sticky の中で両方指定する。別々の要素へ分けると
                    // 左上の角のセルがどちらか一方でしか貼り付かず、隅だけ内容が流れる
                    ...(stickyHeader || stuckColumn
                      ? {
                          position: 'sticky',
                          // 行が透けて重なって見えないよう背景も持たせる
                          background: colorVar('surfaceMuted'),
                          ...(stickyHeader ? { insetBlockStart: 0 } : {}),
                          ...(stuckColumn ? { insetInlineStart: 0 } : {}),
                          zIndex: stuckColumn ? stickyLayer.headerColumn : stickyLayer.header,
                        }
                      : {}),
                  }}
                >
                  {canSort ? (
                    <button
                      type="button"
                      data-hh-focusable=""
                      onClick={() => handleSort(column.key)}
                      style={{
                        ...headerInnerStyle,
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
                    // ソートできない列も同じ高さ・同じ幅の記号スロットを持たせる。
                    // 素のテキストのままだと、並べ替え記号を持つ列だけ見出しが高くなり、
                    // 列見出しの文字が上下にずれて並ぶ (画面ごとの不揃いに見える原因)。
                    <span style={headerInnerStyle}>
                      {column.header}
                      <span aria-hidden="true" style={{ visibility: 'hidden' }}>
                        ↕
                      </span>
                    </span>
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
                  {columns.map((column, columnIndex) => (
                    <td key={column.key} style={{ ...cellStyle, ...stickyBodyCellStyle(columns, columnIndex) }}>
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
            : sortedRows.map((row) => {
                const attention = rowAttention?.(row) ?? false;
                return (
                  <tr key={rowKey(row)} style={attention ? attentionRowStyle() : undefined}>
                    {columns.map((column, columnIndex) => (
                      <td
                        key={column.key}
                        style={{
                          ...cellStyle,
                          textAlign: column.align ?? 'start',
                          ...stickyBodyCellStyle(columns, columnIndex),
                        }}
                      >
                        {/* 色だけに頼らず、名指し列の先頭に強調理由を読み上げさせる */}
                        {attention && columnIndex === 0 ? (
                          <span style={visuallyHidden}>{rowAttentionLabel}: </span>
                        ) : null}
                        {column.render ? column.render(row) : column.value?.(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
          {!loading && sortedRows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ ...cellStyle, color: colorVar('textMuted') }}>
                {emptyMessage ?? t('table.empty')}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );

  // 切替は「いま何で見ているか」が押す前に読めることが要る。アイコンだけにすると
  // 押して初めて分かる操作になるので、可視ラベルを必ず持たせる (WCAG 2.4.6 / 受入条件 1)。
  // aria-pressed で「いま選ばれているほう」を支援技術にも同じ粒度で伝える。
  const viewModeToggle =
    onViewModeChange === undefined || viewMode === 'auto' ? null : (
      // 押しボタンの束は fieldset が正しい入れ物 (role="group" の再実装をしない)。
      // 既定の枠・余白と `min-inline-size: min-content` は flex を壊すので消す
      <fieldset
        aria-label="表示の切替"
        style={{
          margin: 0,
          border: 0,
          padding: 0,
          minInlineSize: 0,
          display: 'flex',
          gap: spaceVar(1),
          paddingBlockEnd: spaceVar(2),
        }}
      >
        {(
          [
            { mode: 'cards', label: 'カードで見る' },
            { mode: 'table', label: '表で見る' },
          ] as const
        ).map((option) => (
          <button
            key={option.mode}
            type="button"
            data-hh-focusable=""
            aria-pressed={viewMode === option.mode}
            onClick={() => onViewModeChange(option.mode)}
            style={{
              minHeight: 'var(--hh-control-height)',
              padding: `0 ${spaceVar(3)}`,
              font: 'inherit',
              cursor: 'pointer',
              borderRadius: 'var(--hh-radius-sm)',
              border: `1px solid ${colorVar('border')}`,
              background: viewMode === option.mode ? colorVar('surfaceMuted') : colorVar('surface'),
              color: colorVar('text'),
            }}
          >
            {option.label}
          </button>
        ))}
      </fieldset>
    );

  if (narrowAs === 'table' && viewMode !== 'cards') {
    // これまでどおり。注記が無ければ包む要素も足さない (既存画面の DOM を変えない)
    return noteLine === null && viewModeToggle === null ? (
      table
    ) : (
      <>
        {viewModeToggle}
        {noteLine}
        {table}
      </>
    );
  }

  const [titleColumn, ...restColumns] = columns;
  const cellOf = (column: DataTableColumn<TRow>, row: TRow): ReactNode =>
    column.render ? column.render(row) : column.value?.(row);
  const itemsOf = (row: TRow, level: Salience): readonly DefinitionListItem[] =>
    restColumns
      // 段の宣言が無い列は metadata。カードで真っ先に読ませたい列だけを明示させる
      // (既定を lead にすると、宣言し忘れた列が全部大きく出て段差が消える)
      .filter((column) => (column.salience ?? 'metadata') === level)
      .map((column) => ({ term: column.header, description: cellOf(column, row) }));

  const sortableColumns = columns.filter((column) => column.sortable === true && column.value !== undefined);
  // 選択欄の値は「向き:列キー」。区切りを前に置くのは、列キー側に区切り文字が含まれていても
  // 最初の 1 個で切れば必ず正しく分かれるため (向き側は ascending/descending の 2 語しか無い)。
  // NUL 区切りは使えない。SSR で書き出した HTML をブラウザが読み直すとき、属性値の U+0000 は
  // HTML の解析規則で U+FFFD へ置き換えられ、読み戻した値が書いた値と一致しなくなる
  // (jsdom のクライアント描画だけを見ていると気づけない壊れ方をする)。
  const sortValue = activeSort === undefined ? '' : `${activeSort.direction}:${activeSort.columnKey}`;

  const cards = (
    // biome-ignore lint/a11y/useSemanticElements: 表と同じく、名前を持つ「ひとかたまり」だけが欲しい
    <div role="group" aria-label={caption}>
      {/*
        カードには列見出しが無いので、見出しを押して並べ替えるという手段がそのまま消える。
        並べ替えの操作子を 1 つの選択欄へ畳み、「列 × 昇順/降順」を候補として全部並べる。
        ボタン 2 つ (列を選ぶ / 向きを反転する) に分けないのは、いまどの順で並んでいるかを
        2 か所読まないと分からなくなるため。選択欄なら現在の並びが表示値そのものになる。
        並べ替えの状態は表と共有しているので、広い画面へ戻しても並びは変わらない。
      */}
      {sortableColumns.length === 0 ? null : (
        <div style={{ display: 'flex', alignItems: 'center', gap: spaceVar(2), paddingBlockEnd: spaceVar(3) }}>
          <label htmlFor={`${sortSelectId}-select`} style={{ fontSize: 'var(--hh-font-size-sm)' }}>
            {t('action.sort')}
          </label>
          <select
            id={`${sortSelectId}-select`}
            data-hh-focusable=""
            value={sortValue}
            onChange={(event) => {
              const separator = event.target.value.indexOf(':');
              if (separator < 0) return;
              const updated: DataTableSort = {
                columnKey: event.target.value.slice(separator + 1),
                direction: event.target.value.slice(0, separator) as TableSortDirection,
              };
              if (!sort) setInternalSort(updated);
              onSortChange?.(updated);
            }}
            style={{ minHeight: 'var(--hh-control-height)', font: 'inherit' }}
          >
            {activeSort === undefined ? <option value="">—</option> : null}
            {sortableColumns.flatMap((column) =>
              (['ascending', 'descending'] as const).map((direction) => (
                <option key={`${column.key}-${direction}`} value={`${direction}:${column.key}`}>
                  {`${column.header} · ${directionLabel(direction)}`}
                </option>
              )),
            )}
          </select>
        </div>
      )}

      {!loading && sortedRows.length === 0 ? (
        <p style={{ margin: 0, color: colorVar('textMuted') }}>{emptyMessage ?? t('table.empty')}</p>
      ) : (
        <CardGrid as="ul" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {loading
            ? Array.from({ length: skeletonRowCount }, (_, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: 骨組みは件数固定の装飾で識別子を持たない
                <li key={`skeleton-${index}`}>
                  <DataCard
                    headingLevel="none"
                    title={
                      <span
                        style={{
                          display: 'block',
                          height: '1em',
                          width: '60%',
                          borderRadius: 'var(--hh-radius-sm)',
                          background: colorVar('surfaceMuted'),
                        }}
                      />
                    }
                  />
                </li>
              ))
            : sortedRows.map((row) => {
                const attention = rowAttention?.(row) ?? false;
                return (
                  <li key={rowKey(row)} style={attention ? attentionRowStyle() : undefined}>
                    <DataCard
                      // 見出しにしない。表とカードは常に両方 DOM にあるので、ここを見出しにすると
                      // 表を見ている広い画面でも、隠れているカードぶんの見出しが目次に並ぶ
                      headingLevel="none"
                      title={
                        <>
                          {/* 色だけに頼らず、カードの見出しの前に強調理由を読み上げさせる */}
                          {attention ? <span style={visuallyHidden}>{rowAttentionLabel}: </span> : null}
                          {titleColumn === undefined ? null : cellOf(titleColumn, row)}
                        </>
                      }
                      lead={itemsOf(row, 'lead')}
                      context={itemsOf(row, 'context')}
                      meta={itemsOf(row, 'metadata')}
                    />
                  </li>
                );
              })}
        </CardGrid>
      )}
    </div>
  );

  // 利用者が選んだときは、その 1 つだけを描く。両方描いて CSS で隠す必要があるのは
  // 「画面幅で決める」場合だけで (SSR では幅が分からない)、意思で決まっているなら
  // 隠す相手そのものが要らない。DOM も読み上げも半分になる。
  if (viewMode === 'cards' || viewMode === 'table') {
    return (
      <>
        {viewModeToggle}
        {noteLine}
        {viewMode === 'cards' ? cards : table}
      </>
    );
  }

  return (
    <>
      {noteLine}
      {/* 両方描いて、表示するほうを CSS が選ぶ (SSR では画面幅が分からないため)。
          隠れているほうは display: none なので支援技術からも二重に読まれない */}
      <div data-hh-viewport="wide">{table}</div>
      <div data-hh-viewport="narrow">{cards}</div>
    </>
  );
}
