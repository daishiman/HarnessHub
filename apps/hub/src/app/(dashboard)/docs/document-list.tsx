'use client';

import type { DocumentListItem, DocumentListResponse, DocumentScope, DocumentStatus } from '@harness-hub/schemas';
import {
  Button,
  CursorPager,
  DataTable,
  type DataTableColumn,
  FilterBar,
  ListState,
  LiveStatus,
  ScopeChip,
  Select,
  StatusChip,
  StickyHeaderOffset,
  TextInput,
} from '@harness-hub/ui';
import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { type AppliedFilter, AppliedFilterChips } from '../../../components/filter/applied-filter-chips.js';
import { DateTimeText } from '../../../components/format/date-time-text.js';
import { FILTER_STORAGE_KEYS, useRememberedFilters } from '../../../lib/list/remembered-filters.js';

interface DocumentListProps {
  readonly tenantId: string;
  readonly workspaceId: string;
  /**
   * 共通ヘッダーの検索フォーム (`?q=`) から渡ってくる初期キーワード。
   * ここで受けることで「ヘッダーで検索 → 一覧が絞り込まれた状態で開く」が成立する。
   */
  readonly initialQuery?: string;
}

interface DocumentFilters {
  readonly scope: DocumentScope | '';
  readonly status: DocumentStatus | '';
  readonly query: string;
}

const EMPTY_FILTERS: DocumentFilters = { scope: '', status: '', query: '' };

export function DocumentList({ tenantId, workspaceId, initialQuery = '' }: DocumentListProps): ReactNode {
  const [rows, setRows] = useState<readonly DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 絞り込み条件は詳細画面へ行って戻るまで覚えておく (毎回入れ直させない)
  const {
    filters,
    draft: draftFilters,
    setDraft: setDraftFilters,
    apply,
    restored,
  } = useRememberedFilters<DocumentFilters>(
    FILTER_STORAGE_KEYS.docs,
    { ...EMPTY_FILTERS, query: initialQuery },
    initialQuery !== '',
  );
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<readonly (string | null)[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ limit: '25' });
      if (filters.scope !== '') query.set('scope', filters.scope);
      if (filters.status !== '') query.set('status', filters.status);
      // 空文字の `q` は送らない。契約側 (listSearchTermSchema) が空語を弾くため 400 になる
      if (filters.query !== '') query.set('q', filters.query);
      if (cursor !== null) query.set('cursor', cursor);
      const response = await fetch(`/api/v1/docs?${query.toString()}`, {
        credentials: 'same-origin',
        headers: {
          'x-harness-tenant-id': tenantId,
          'x-harness-workspace-id': workspaceId,
        },
      });
      if (!response.ok) throw new Error('一覧を取得できませんでした。');
      const body = (await response.json()) as DocumentListResponse;
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

  // 0 件のときの言い方を分ける。絞り込んだ結果の 0 件に「まだありません」と出すと、
  // 条件を外せば見つかるものまで「存在しない」と読めてしまう
  const hasFilters = filters.scope !== '' || filters.status !== '' || filters.query !== '';
  const appliedFilters: readonly AppliedFilter[] = [
    ...(filters.scope === '' ? [] : [{ label: 'スコープ', value: filters.scope === 'common' ? '共通' : 'テナント' }]),
    ...(filters.status === ''
      ? []
      : [{ label: '状態', value: filters.status === 'published' ? '公開済み' : '下書き' }]),
    ...(filters.query.trim() === '' ? [] : [{ label: '検索', value: filters.query.trim() }]),
  ];

  const applyFilters = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setCursor(null);
    setCursorHistory([]);
    apply({ scope: draftFilters.scope, status: draftFilters.status, query: draftFilters.query.trim() });
  };

  /**
   * 列の並びは「何の文書か → 誰向けか → 読める状態か → いつの版か」。
   *
   * 広い画面を表にするのは、手順書を探すときに「公開済みのものだけを更新順に見比べる」という
   * 読み方をするため。カードだと 1 件ずつしか読めず、見比べに向かない。
   * 狭い画面ではその見比べ自体が成立しないので、カードへ切り替えて 1 件を読み切れる形にする。
   *
   * **タイトル列だけ `width` を指定しない。** 他 3 列を必要な幅で固定して余りをタイトルに
   * 吸わせると、長い題名でも折り返さずに済む (タイトルに幅を与えると、そこだけ 2 行になる)。
   */
  const columns = useMemo<readonly DataTableColumn<DocumentListItem>[]>(
    () => [
      {
        key: 'title',
        header: 'タイトル',
        sortable: true,
        // 行を名指しする列。横スクロールしても「どの文書の行か」を画面に残す
        sticky: true,
        value: (row) => row.title,
        render: (row) => <a href={`/docs/${row.id}?tenant=${tenantId}&workspace=${workspaceId}`}>{row.title}</a>,
      },
      {
        key: 'scope',
        header: '適用範囲',
        width: '9rem',
        value: (row) => (row.scope === 'common' ? '共通' : 'テナント'),
        render: (row) => (
          <ScopeChip
            scope={row.scope === 'common' ? 'common' : 'tenant'}
            name={row.scope === 'common' ? '共通' : 'テナント'}
          />
        ),
        salience: 'context',
      },
      {
        key: 'status',
        header: '状態',
        sortable: true,
        width: '9rem',
        value: (row) => (row.status === 'published' ? '公開済み' : '下書き'),
        render: (row) => <StatusChip domain="document" status={row.status} />,
        salience: 'context',
      },
      {
        key: 'updated',
        header: '更新日時',
        sortable: true,
        width: '13rem',
        // 並べ替えは元の値で行う。整形した文字列で比較すると年をまたいだ順序が崩れる
        value: (row) => row.updated_at,
        render: (row) => <DateTimeText value={row.updated_at} />,
        salience: 'metadata',
      },
    ],
    [tenantId, workspaceId],
  );

  return (
    <>
      <StickyHeaderOffset />
      <FilterBar
        label="ドキュメントの絞り込み"
        sticky
        appliedChips={appliedFilters.length === 0 ? undefined : <AppliedFilterChips items={appliedFilters} />}
        onSubmit={applyFilters}
        actions={<Button type="submit">絞り込む</Button>}
      >
        <Select
          label="スコープ"
          value={draftFilters.scope}
          onChange={(event) =>
            setDraftFilters((current) => ({ ...current, scope: event.target.value as DocumentScope | '' }))
          }
          options={[
            { value: '', label: 'すべて' },
            { value: 'common', label: '共通' },
            { value: 'tenant', label: 'テナント' },
          ]}
        />
        <Select
          label="状態"
          value={draftFilters.status}
          onChange={(event) =>
            setDraftFilters((current) => ({ ...current, status: event.target.value as DocumentStatus | '' }))
          }
          options={[
            { value: '', label: 'すべて' },
            { value: 'draft', label: '下書き' },
            { value: 'published', label: '公開済み' },
          ]}
        />
        {/* 検索欄は絞り込み欄の最後に置く。並びは全画面で「選ぶ条件 → 打ち込む条件」で統一する */}
        <TextInput
          label="検索"
          description="タイトルを検索します (本文は対象外)。"
          value={draftFilters.query}
          onChange={(event) => setDraftFilters((current) => ({ ...current, query: event.target.value }))}
        />
      </FilterBar>

      {/* 読み込み中・取得失敗・0 件・一覧の 4 状態を同じ場所で出し分ける。
          「一覧が空」と「まだ読み込んでいない」と「読み込めなかった」が同じ見た目になると、
          待てば出るのか・そもそも無いのか・やり直すべきなのかが分からない
          (frontend-ui-foundation-spec §3)。出し分けは共通の ListState に任せる */}
      <div style={{ padding: 'var(--hh-space-4)' }}>
        {/* 読み込めなかったときに件数を読み上げない (0 件と失敗の取り違えを声でも起こさない) */}
        <LiveStatus>
          {error !== null
            ? 'ドキュメントを読み込めませんでした。'
            : loading
              ? 'ドキュメントを読み込んでいます。'
              : `${rows.length} 件のドキュメントを表示中`}
        </LiveStatus>

        <ListState
          error={error}
          onRetry={() => void load()}
          loading={loading}
          isEmpty={rows.length === 0}
          emptyTitle={hasFilters ? '条件に合うドキュメントがありません' : 'ドキュメントはまだありません'}
          emptyDescription={
            hasFilters
              ? 'スコープ・状態・キーワードをゆるめてお試しください。'
              : '業務ツールの使い方や運用手順を、最初の 1 本から書き始められます。'
          }
        >
          <DataTable
            caption="ドキュメント一覧"
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            loading={loading}
            stickyHeader
            narrowAs="card-collection"
            // 並べ替えは取得済みの 25 件の中だけで効く。全件が並ぶと誤解されると
            // 「上位が抜けている」と読まれてしまうため、範囲を先に断っておく
            note="並べ替えはこのページに表示中の分が対象です (広い画面では列の見出しから、狭い画面では並び替えの選択欄から操作できます)。"
          />
        </ListState>
      </div>

      <CursorPager
        label="ドキュメント一覧"
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
