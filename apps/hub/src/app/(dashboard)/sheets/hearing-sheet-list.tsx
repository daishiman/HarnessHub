'use client';

import type { HearingSheetStatus, SheetListItem, SheetListResponse } from '@harness-hub/schemas';
import {
  Alert,
  Button,
  CursorPager,
  DataTable,
  type DataTableColumn,
  FilterBar,
  ListState,
  Select,
  StatusChip,
  StickyHeaderOffset,
  TextInput,
} from '@harness-hub/ui';
import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type AppliedFilter, AppliedFilterChips } from '../../../components/filter/applied-filter-chips.js';
import { DateTimeText } from '../../../components/format/date-time-text.js';
import { extractApiErrorMessage } from '../../../features/hearing-intake/client-error.js';
import { FILTER_STORAGE_KEYS, useRememberedFilters } from '../../../lib/list/remembered-filters.js';

interface HearingSheetListProps {
  readonly tenantId: string;
  readonly workspaceId: string;
  /**
   * 共通ヘッダーの検索フォーム (`?q=`) から渡ってくる初期キーワード。
   * ここで受けることで「ヘッダーで検索 → 一覧が絞り込まれた状態で開く」が成立する。
   */
  readonly initialQuery?: string;
}

interface SheetFilters {
  readonly status: HearingSheetStatus | '';
  readonly department: string;
  readonly query: string;
}

const EMPTY_FILTERS: SheetFilters = { status: '', department: '', query: '' };

/** 状態列の並べ替えに使う手順の順番。表示名の五十音で並べても業務上の意味が無い。 */
const STATUS_ORDER: Readonly<Record<HearingSheetStatus, number>> = {
  received: 0,
  generating: 1,
  review: 2,
  completed: 3,
};

const STATUS_LABELS: Readonly<Record<HearingSheetStatus, string>> = {
  received: '受付',
  generating: '生成中',
  review: 'レビュー待ち',
  completed: '完了',
};

export function HearingSheetList({ tenantId, workspaceId, initialQuery = '' }: HearingSheetListProps): ReactNode {
  const [rows, setRows] = useState<readonly SheetListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completionNotice, setCompletionNotice] = useState<string | null>(null);
  // 絞り込み条件は詳細画面へ行って戻るまで覚えておく。
  // ただしヘッダーの検索から開いたとき (`?q=`) は、指定された語を必ず優先する
  const {
    filters,
    draft: draftFilters,
    setDraft: setDraftFilters,
    apply,
    restored,
  } = useRememberedFilters<SheetFilters>(
    FILTER_STORAGE_KEYS.sheets,
    { ...EMPTY_FILTERS, query: initialQuery },
    initialQuery !== '',
  );
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<readonly (string | null)[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const previousStatuses = useRef(new Map<string, SheetListItem['status']>());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ limit: '25' });
      if (filters.status !== '') query.set('status', filters.status);
      if (filters.department !== '') query.set('department', filters.department);
      if (filters.query !== '') query.set('q', filters.query);
      if (cursor !== null) query.set('cursor', cursor);
      const response = await fetch(`/api/v1/sheets?${query.toString()}`, {
        credentials: 'same-origin',
        headers: {
          'x-harness-tenant-id': tenantId,
          'x-harness-workspace-id': workspaceId,
        },
      });
      if (!response.ok) throw new Error(await extractApiErrorMessage(response, '一覧を取得できませんでした。'));
      const body = (await response.json()) as SheetListResponse;
      const completed = body.items.find(
        (row) =>
          previousStatuses.current.get(row.id) === 'generating' &&
          (row.status === 'review' || row.status === 'completed'),
      );
      if (completed !== undefined) setCompletionNotice(`${completed.code} の生成が完了しました。`);
      previousStatuses.current = new Map(body.items.map((row) => [row.id, row.status]));
      setRows(body.items);
      setNextCursor(body.next_cursor);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '一覧を取得できませんでした。');
    } finally {
      setLoading(false);
    }
  }, [cursor, filters, tenantId, workspaceId]);

  // 覚えていた条件の復元が済むまで待つ。先に問い合わせると、空の条件で取った一覧が
  // 一瞬出てから条件付きの一覧に差し替わり、件数が目の前で変わって見える
  useEffect(() => {
    if (!restored) return;
    void load();
  }, [load, restored]);

  useEffect(() => {
    if (!rows.some((row) => row.status === 'generating')) return;
    const timer = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(timer);
  }, [load, rows]);

  const columns = useMemo<readonly DataTableColumn<SheetListItem>[]>(
    () => [
      // 行を名指しする列を先頭に置き、左端へ貼り付ける。6 列あるので狭い画面では必ず横へはみ出し、
      // 右の列を見にいったときに「どのシートの行か」が画面から消えてしまう
      {
        key: 'code',
        header: 'シート番号 / 業務名',
        sortable: true,
        sticky: true,
        width: '20rem',
        render: (row: SheetListItem) => (
          <a href={`/sheets/${row.id}?tenant=${tenantId}&workspace=${workspaceId}`}>
            {row.code} {row.title}
          </a>
        ),
        value: (row: SheetListItem) => `${row.code} ${row.title}`,
      },
      {
        key: 'status',
        header: '状態',
        sortable: true,
        width: '9rem',
        // 並べ替えの基準は状態名の五十音ではなく進み具合。受付から完了まで手順の順に並べる
        value: (row: SheetListItem) => STATUS_ORDER[row.status],
        render: (row: SheetListItem) => (
          <span aria-live="polite">
            <StatusChip domain="sheet" status={row.status} />
          </span>
        ),
        // カードでは番号・業務名の次に「いまどこまで進んでいるか」を読ませる
        salience: 'lead',
      },
      {
        key: 'domain',
        header: '業務領域 / 部署',
        sortable: true,
        width: '16rem',
        value: (row: SheetListItem) => `${row.domain} / ${row.department ?? '部署未登録'}`,
        salience: 'context',
      },
      {
        key: 'scale',
        header: '対象人数 / 月間工数',
        width: '12rem',
        // 人数と工数の 2 つの数字を 1 列に出しているため、どちらを基準にした並びかを
        // 見出しから読み取れない。誤解される並べ替えを付けるより、付けない方を選ぶ
        value: (row: SheetListItem) => `${row.people} 人 / ${row.hours} h`,
        salience: 'context',
      },
      {
        key: 'applicant',
        header: '申請者',
        sortable: true,
        width: '10rem',
        value: (row: SheetListItem) => row.applicant.name,
      },
      {
        key: 'updated',
        header: '更新日時',
        sortable: true,
        width: '13rem',
        // 並べ替えは元の日時で行う。表示用に整形した文字列で比較すると年をまたいだ順序が崩れる
        value: (row: SheetListItem) => row.updated_at,
        // 日付だけだと、同じ日に何度も直したシートが全部同じ表示になり、
        // 新しい順に並べ替えても順序の根拠が画面から消える
        render: (row: SheetListItem) => <DateTimeText value={row.updated_at} />,
      },
    ],
    [tenantId, workspaceId],
  );

  // 0 件の言い方を分ける。絞り込み結果の 0 件に「まだありません」は誤解を生む
  const hasFilters = filters.status !== '' || filters.department !== '' || filters.query !== '';
  const appliedFilters: readonly AppliedFilter[] = [
    ...(filters.status === '' ? [] : [{ label: '状態', value: STATUS_LABELS[filters.status] }]),
    ...(filters.department.trim() === '' ? [] : [{ label: '部署', value: filters.department.trim() }]),
    ...(filters.query.trim() === '' ? [] : [{ label: '全文検索', value: filters.query.trim() }]),
  ];

  const applyFilters = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setCursor(null);
    setCursorHistory([]);
    apply({
      status: draftFilters.status,
      department: draftFilters.department.trim(),
      query: draftFilters.query.trim(),
    });
  };

  return (
    <>
      <StickyHeaderOffset />
      {completionNotice === null ? null : <Alert tone="success" title="生成完了" description={completionNotice} />}
      {/* 絞り込み欄の並びと余白は共通の FilterBar に任せる (画面ごとの書き起こしをやめる) */}
      <FilterBar
        label="ヒアリングシートの絞り込み"
        sticky
        appliedChips={appliedFilters.length === 0 ? undefined : <AppliedFilterChips items={appliedFilters} />}
        onSubmit={applyFilters}
        actions={<Button type="submit">絞り込む</Button>}
      >
        <Select
          label="状態"
          value={draftFilters.status}
          onChange={(event) =>
            setDraftFilters((current) => ({
              ...current,
              status: event.target.value as HearingSheetStatus | '',
            }))
          }
          options={[
            { value: '', label: 'すべて' },
            { value: 'received', label: '受付' },
            { value: 'generating', label: '生成中' },
            { value: 'review', label: 'レビュー待ち' },
            { value: 'completed', label: '完了' },
          ]}
        />
        <TextInput
          label="部署"
          value={draftFilters.department}
          onChange={(event) => setDraftFilters((current) => ({ ...current, department: event.target.value }))}
        />
        <TextInput
          label="全文検索"
          description="HS コード、業務名、業務領域などを検索します。"
          value={draftFilters.query}
          onChange={(event) => setDraftFilters((current) => ({ ...current, query: event.target.value }))}
        />
      </FilterBar>
      {/* 広い画面では表。人数・工数・更新日を行どうしで見比べて対応の順番を決める一覧なので、
          縦の並びが要る (型の割当は docs/screen-inventory.md の profile)。
          代わりに見出し行を貼り付けて、下までスクロールしても何の列か分かるようにする。
          狭い画面では 6 列が横へはみ出して見比べ自体が成立しないため、1 件 1 枚のカードにする */}
      {/* 取得失敗と 0 件を混ぜない。失敗したときは件数の話をせず再読み込みだけを出す */}
      <ListState
        error={error}
        onRetry={() => void load()}
        loading={loading}
        isEmpty={rows.length === 0}
        emptyTitle={hasFilters ? '条件に合うヒアリングシートがありません' : 'ヒアリングシートはまだありません'}
        emptyDescription={
          hasFilters
            ? '状態・部署・キーワードをゆるめてお試しください。'
            : '「新しく作成」から最初の 1 件を登録できます。'
        }
      >
        <DataTable
          caption="ヒアリングシート一覧"
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          loading={loading}
          stickyHeader
          narrowAs="card-collection"
          // 並べ替えは取得済みの 25 件の中だけで効く。全件が並ぶと誤解されると
          // 「上位が抜けている」と読まれてしまうため、範囲を先に断っておく。
          // 部品に持たせているのは、カード表示のときだけ断りが消えるのを防ぐため
          note="並べ替えはこのページに表示中の分が対象です (広い画面では列の見出しから、狭い画面では並び替えの選択欄から操作できます)。"
        />
      </ListState>
      <CursorPager
        label="ヒアリングシート一覧"
        disabled={loading}
        canGoBack={cursorHistory.length > 0}
        canGoForward={nextCursor !== null}
        onBack={() => {
          const previous = cursorHistory.at(-1);
          setCursor(previous ?? null);
          setCursorHistory((current) => current.slice(0, -1));
        }}
        onForward={() => {
          setCursorHistory((current) => [...current, cursor]);
          setCursor(nextCursor);
        }}
      />
    </>
  );
}
