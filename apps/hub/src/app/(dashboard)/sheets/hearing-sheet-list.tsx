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
  StatusChip,
  StickyHeaderOffset,
  TextInput,
} from '@harness-hub/ui';
import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type AppliedFilter, AppliedFilterChips } from '../../../components/filter/applied-filter-chips.js';
import { DateTimeText } from '../../../components/format/date-time-text.js';
import { useRememberedViewMode, useUrlFilters, VIEW_MODE_STORAGE_KEYS } from '../../../lib/list/remembered-filters.js';

/**
 * problem details 抽出は失敗パスでしか使わないため動的 import にする(client JS 予算/qa-018 対策)。
 * 常時 import すると成功パスでも初期チャンクへ載ってしまう。
 */
async function extractApiErrorMessage(response: Response, fallback: string): Promise<string> {
  const mod = await import('../../../features/hearing-intake/client-error.js');
  return mod.extractApiErrorMessage(response, fallback);
}

interface HearingSheetListProps {
  readonly tenantId: string;
  readonly workspaceId: string;
  /**
   * 共通ヘッダーの検索フォーム (`?q=`) から渡ってくる初期キーワード。
   * ここで受けることで「ヘッダーで検索 → 一覧が絞り込まれた状態で開く」が成立する。
   */
  readonly initialQuery?: string;
}

/**
 * 状態タブ。個々の状態名 (受付・生成中・レビュー待ち) ではなく「対応中かどうか」で束ねる。
 *
 * 一覧を開く人が最初に知りたいのは「自分がまだ手を動かす分がいくつあるか」で、
 * その手前の細かい段階は行を見れば分かる。`unknown` は状態が読めない行の受け皿で、
 * `active` にも `completed` にも混ぜない (混ぜると件数が静かにずれる)。
 */
type SheetTab = 'all' | 'active' | 'completed' | 'unknown';

const SHEET_TABS: readonly { readonly value: SheetTab; readonly label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'active', label: '対応中' },
  { value: 'completed', label: '完了' },
  { value: 'unknown', label: '状態不明' },
];

/** タブ → API の `status_group`。「すべて」と「状態不明」は区分を送らない (絞り込まない)。 */
function statusGroupParamOfTab(tab: SheetTab): 'active' | 'completed' | '' {
  return tab === 'active' || tab === 'completed' ? tab : '';
}

interface SheetFilters extends Record<string, string> {
  readonly tab: SheetTab;
  readonly department: string;
  readonly query: string;
}

/** 1 項目だけ差し替えるときの入力。省略した項目は現在値を保つ。 */
type SheetFilterPatch = {
  readonly [K in keyof SheetFilters]?: SheetFilters[K];
};

const EMPTY_FILTERS: SheetFilters = { tab: 'all', department: '', query: '' };

/**
 * 絞り込みの各項目を URL のどのキーで表すか。
 * `q` だけ名前が違うのは、共通ヘッダーの検索フォームが既に `?q=` を使っているため。
 */
const SHEET_FILTER_PARAMS = {
  tab: 'tab',
  department: 'department',
  query: 'q',
} as const;

/** 状態タブの件数。API から来なかった場合 (旧版応答) はタブに件数を出さない。 */
interface SheetStatusCounts {
  readonly all: number;
  readonly active: number;
  readonly completed: number;
  readonly unknown: number;
}

interface StatusTabsProps {
  readonly current: SheetTab;
  readonly counts: SheetStatusCounts | null;
  readonly onSelect: (tab: SheetTab) => void;
}

/**
 * 状態で切り替えるタブ。押した瞬間に適用し、「絞り込む」の確定を待たない。
 *
 * `role="tablist"` ではなく押しボタンの group にしてある。tab の役割を名乗ると
 * 矢印キー移動と tabpanel の対応付けまで契約に入るが、ここで切り替わるのは同じ一覧の
 * 中身だけなので `aria-pressed` で「いま選ばれているもの」を伝えるほうが実態に合う。
 */
function StatusTabs({ current, counts, onSelect }: StatusTabsProps): ReactNode {
  return (
    // 押しボタンの束の入れ物は fieldset。既定の枠・余白・min-inline-size は flex を壊すので消す
    <fieldset
      aria-label="状態で絞り込み"
      style={{
        margin: 0,
        border: 0,
        minInlineSize: 0,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--hh-space-2)',
        padding: 'var(--hh-space-3) var(--hh-space-4) 0',
      }}
    >
      {SHEET_TABS.filter(
        // 状態不明は 0 件なら出さない。押しても「すべて」と同じ結果しか出ないタブを
        // 常設すると、状態不明という区分が存在するのに空だ、と読めてしまう
        (tab) => tab.value !== 'unknown' || (counts?.unknown ?? 0) > 0,
      ).map((tab) => (
        <button
          key={tab.value}
          type="button"
          data-hh-focusable=""
          aria-pressed={current === tab.value}
          onClick={() => onSelect(tab.value)}
          style={{
            minHeight: 'var(--hh-control-height)',
            padding: '0 var(--hh-space-3)',
            font: 'inherit',
            cursor: 'pointer',
            borderRadius: 'var(--hh-radius-sm)',
            border: '1px solid var(--hh-color-border)',
            background: current === tab.value ? 'var(--hh-color-surface-muted)' : 'var(--hh-color-surface)',
            color: 'var(--hh-color-text)',
          }}
        >
          {tab.label}
          {counts === null ? null : <span style={{ marginInlineStart: 'var(--hh-space-1)' }}>{counts[tab.value]}</span>}
        </button>
      ))}
    </fieldset>
  );
}

/** 状態列の並べ替えに使う手順の順番。表示名の五十音で並べても業務上の意味が無い。 */
const STATUS_ORDER: Readonly<Record<HearingSheetStatus, number>> = {
  received: 0,
  generating: 1,
  review: 2,
  completed: 3,
};

export function HearingSheetList({ tenantId, workspaceId, initialQuery = '' }: HearingSheetListProps): ReactNode {
  const [rows, setRows] = useState<readonly SheetListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completionNotice, setCompletionNotice] = useState<string | null>(null);
  // 絞り込み条件の正本は URL。共有・再読込・戻る/進むが同じ 1 つの規則で揃う
  const {
    filters,
    draft: draftFilters,
    setDraft: setDraftFilters,
    apply,
    restored,
  } = useUrlFilters<SheetFilters>({ ...EMPTY_FILTERS, query: initialQuery }, SHEET_FILTER_PARAMS);
  // 表示形式だけは記憶から復元する。件数を変えないので共有した相手の結果を左右しない
  const [viewMode, setViewMode] = useRememberedViewMode(VIEW_MODE_STORAGE_KEYS.sheets);
  const [statusCounts, setStatusCounts] = useState<SheetStatusCounts | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<readonly (string | null)[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const previousStatuses = useRef(new Map<string, SheetListItem['status']>());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ limit: '25' });
      const statusGroup = statusGroupParamOfTab(filters.tab);
      if (statusGroup !== '') query.set('status_group', statusGroup);
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
      const body = (await response.json()) as SheetListResponse & {
        readonly status_counts?: SheetStatusCounts;
      };
      setStatusCounts(body.status_counts ?? null);
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

  /**
   * 1 項目だけ差し替えて確定する。
   *
   * spread ではなく項目ごとに書き出す。`Record<string, string>` を継承した型を spread すると、
   * 省略されたキーが `string | undefined` に緩んで型が合わなくなる。
   */
  const applyPatch = useCallback(
    (patch: SheetFilterPatch): void => {
      setCursor(null);
      setCursorHistory([]);
      apply({
        tab: patch.tab ?? filters.tab,
        department: patch.department ?? filters.department,
        query: patch.query ?? filters.query,
      });
    },
    [apply, filters],
  );

  // 0 件の言い方を分ける。絞り込み結果の 0 件に「まだありません」は誤解を生む
  const hasFilters = filters.tab !== 'all' || filters.department !== '' || filters.query !== '';
  const appliedFilters: readonly AppliedFilter[] = [
    ...(filters.tab === 'all'
      ? []
      : [
          {
            label: '状態',
            value: SHEET_TABS.find((tab) => tab.value === filters.tab)?.label ?? filters.tab,
            onRemove: () => applyPatch({ tab: 'all' }),
          },
        ]),
    ...(filters.department.trim() === ''
      ? []
      : [{ label: '部署', value: filters.department.trim(), onRemove: () => applyPatch({ department: '' }) }]),
    ...(filters.query.trim() === ''
      ? []
      : [{ label: '全文検索', value: filters.query.trim(), onRemove: () => applyPatch({ query: '' }) }]),
  ];

  const applyFilters = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    applyPatch({
      department: draftFilters.department.trim(),
      query: draftFilters.query.trim(),
    });
  };

  return (
    <>
      <StickyHeaderOffset />
      <StatusTabs current={filters.tab} counts={statusCounts} onSelect={(tab) => applyPatch({ tab })} />
      {completionNotice === null ? null : <Alert tone="success" title="生成完了" description={completionNotice} />}
      {/* 絞り込み欄の並びと余白は共通の FilterBar に任せる (画面ごとの書き起こしをやめる) */}
      <FilterBar
        label="ヒアリングシートの絞り込み"
        sticky
        appliedChips={appliedFilters.length === 0 ? undefined : <AppliedFilterChips items={appliedFilters} />}
        onSubmit={applyFilters}
        actions={<Button type="submit">絞り込む</Button>}
      >
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
          // レビュー待ちを要対応として強調する。ai_job_status (failed/dead) も強調対象に
          // したいが、一覧 API のレスポンス型 (SheetListItem) にこのフィールドが無く、
          // 詳細取得用の別スキーマにしか無いため現状は対象外 (該当シートは詳細画面で確認する)
          rowAttention={(row) => row.status === 'review'}
          rowAttentionLabel="要対応"
          viewMode={viewMode}
          onViewModeChange={setViewMode}
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
