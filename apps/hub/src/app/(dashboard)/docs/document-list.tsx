'use client';

import type {
  AssetSummary,
  DocumentListItem,
  DocumentListResponse,
  DocumentScope,
  DocumentStatus,
  SessionRole,
} from '@harness-hub/schemas';
import {
  ActionLink,
  Badge,
  Button,
  CursorPager,
  DataTable,
  type DataTableColumn,
  FilterBar,
  FilterTabs,
  ListState,
  LiveStatus,
  ScopeChip,
  Select,
  StickyHeaderOffset,
  TextButton,
  TextInput,
  Thumbnail,
} from '@harness-hub/ui';
import dynamic from 'next/dynamic';
import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { type AppliedFilter, AppliedFilterChips } from '../../../components/filter/applied-filter-chips.js';
import { DateTimeText } from '../../../components/format/date-time-text.js';
import { NotionOpenLink } from '../../../components/notion/notion-open-link.js';
import { canWriteDocument, extractErrorMessage } from '../../../features/docs-cms/client-errors.js';
import { useRememberedViewMode, useUrlFilters, VIEW_MODE_STORAGE_KEYS } from '../../../lib/list/remembered-filters.js';

const DocumentEditPanel = dynamic(() => import('./document-edit-panel.js').then((module) => module.DocumentEditPanel), {
  loading: () => <LiveStatus visible>編集欄を読み込んでいます…</LiveStatus>,
});

interface DocumentListProps {
  readonly tenantId: string;
  readonly workspaceId: string;
  /**
   * 共通ヘッダーの検索フォーム (`?q=`) から渡ってくる初期キーワード。
   * ここで受けることで「ヘッダーで検索 → 一覧が絞り込まれた状態で開く」が成立する。
   */
  readonly initialQuery?: string;
  readonly sessionRole?: SessionRole | null;
  /** server page で docs.write_tenant を一度だけ判定した結果。安全側の既定値は false。 */
  readonly canCreateDocument?: boolean;
}

/**
 * 状態タブ。`unknown` は status が読めない行のための受け皿で、`published` / `draft` の
 * どちらにも混ぜない。混ぜると「公開が 1 件多い」といった静かな取り違えになる。
 */
type DocumentTab = 'all' | 'published' | 'draft' | 'unknown';

const DOCUMENT_TABS: readonly { readonly value: DocumentTab; readonly label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'published', label: '公開' },
  { value: 'draft', label: '非公開' },
  { value: 'unknown', label: '状態不明' },
];

/** タブ → API の `status`。「すべて」と「状態不明」は status を送らない (絞り込まない)。 */
function statusParamOfTab(tab: DocumentTab): DocumentStatus | '' {
  return tab === 'published' || tab === 'draft' ? tab : '';
}

interface DocumentFilters extends Record<string, string> {
  readonly tab: DocumentTab;
  readonly scope: DocumentScope | '';
  readonly query: string;
  readonly category: string;
  /**
   * タグの絞り込み。API 契約 (documentListQuerySchema) が `tag` 単数のみを受け付けるため、
   * 「複数タグの AND/OR 検索」までは今回のスコープに含めず、単一タグでの完全一致に留める。
   */
  readonly tag: string;
}

/** 1 項目だけ差し替えるときの入力。省略した項目は現在値を保つ。 */
type DocumentFilterPatch = {
  readonly [K in keyof DocumentFilters]?: DocumentFilters[K];
};

const EMPTY_FILTERS: DocumentFilters = { tab: 'all', scope: '', query: '', category: '', tag: '' };

/**
 * 絞り込みの各項目を URL のどのキーで表すか。
 * `q` だけ名前が違うのは、共通ヘッダーの検索フォームが既に `?q=` を使っているため
 * (ここで揃えないと、ヘッダーから検索した語が一覧へ渡らなくなる)。
 */
const DOCUMENT_FILTER_PARAMS = {
  tab: 'tab',
  scope: 'scope',
  query: 'q',
  category: 'category',
  tag: 'tag',
} as const;

/** 状態タブの件数。API から来なかった場合 (旧版応答) はタブに件数を出さない。 */
interface DocumentStatusCounts {
  readonly all: number;
  readonly published: number;
  readonly draft: number;
  readonly unknown: number;
}

interface StatusTabsProps {
  readonly current: DocumentTab;
  readonly counts: DocumentStatusCounts | null;
  readonly onSelect: (tab: DocumentTab) => void;
}

/**
 * 状態で切り替えるタブ。押した瞬間に適用し、「絞り込む」の確定を待たない。
 *
 * タブは**移動**の感覚で押されるので、押した後にもう一度確定操作を求めると壊れて見える。
 * 一方で文字入力は submit まで待つ (1 文字ごとに問い合わせを飛ばさないため) — この非対称は意図的。
 *
 * `role="tablist"` ではなく押しボタンの group にしてある。tab の役割を名乗ると矢印キーでの
 * 移動と tabpanel の対応付けまで契約に入るが、ここで切り替わるのは同じ一覧の中身だけなので
 * `aria-pressed` で「いま選ばれているもの」を伝えるほうが実態に合う。
 */
function StatusTabs({ current, counts, onSelect }: StatusTabsProps): ReactNode {
  return (
    // 一覧本体との間合いだけがこの画面の関心。切替そのものの見た目は FilterTabs が持つ
    <div style={{ padding: 'var(--hh-space-3) var(--hh-space-4) 0' }}>
      <FilterTabs
        label="状態で絞り込み"
        current={current}
        onSelect={onSelect}
        items={DOCUMENT_TABS.filter(
          // 状態不明は 0 件なら出さない。押しても「すべて」と同じ結果しか出ないタブを
          // 常設すると、状態不明という区分が存在するのに空だ、と読めてしまう
          (tab) => tab.value !== 'unknown' || (counts?.unknown ?? 0) > 0,
        ).map((tab) => ({ value: tab.value, label: tab.label, count: counts?.[tab.value] }))}
      />
    </div>
  );
}

/** 公開/非公開の表示ラベル。既存 status の言い換えであり、外部への公開 URL の有無とは無関係 (全 API は認証必須のまま)。 */
function publicStatusLabel(status: DocumentStatus): string {
  return status === 'published' ? '公開' : '非公開';
}

/**
 * asset_summary は「無い」ことがあり得る (画像・表・コードのどれも含まない本文)。
 * API 契約上は null だが、一覧のフィクスチャや将来のクエリ簡略化で undefined も
 * 来かねないため、どちらも「バッジ無し」として同じに扱う (== null で両方拾う)。
 */
function assetBadges(summary: AssetSummary | null | undefined): ReactNode {
  if (summary == null) return null;
  const items: string[] = [];
  if (summary.image_count > 0) items.push(`画像 ${summary.image_count}`);
  if (summary.has_table) items.push('表あり');
  if (summary.has_code) items.push('コードあり');
  if (items.length === 0) return null;
  return (
    <>
      {items.map((label) => (
        <Badge key={label} tone="neutral">
          {label}
        </Badge>
      ))}
    </>
  );
}

interface DocumentTitleCellProps {
  readonly doc: DocumentListItem;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly editing: boolean;
  readonly canEdit: boolean;
  readonly onToggleEdit: () => void;
}

/**
 * タイトル列の中身。DataTable は狭い画面でこの列の描画結果を `<p>` (見出しレベル "none") で
 * 包むため、ここで使えるのは span/a/img/button のような phrasing content だけに限る
 * (div を混ぜると HTML の構文規則で `<p>` が実描画時に途中で閉じられ、hydration がずれる)。
 * 分類・要約の編集フォーム (div でラップされた TextInput/Textarea) はこの中に置けないため、
 * 一覧の外の別領域 (DocumentEditPanel) に切り出し、ここでは編集領域を開くボタンだけを持つ。
 */
function DocumentTitleCell({
  doc,
  tenantId,
  workspaceId,
  editing,
  canEdit,
  onToggleEdit,
}: DocumentTitleCellProps): ReactNode {
  const href = `/docs/${doc.id}?tenant=${tenantId}&workspace=${workspaceId}`;
  const manuallyEdited = doc.thumbnail_source === 'manual' || doc.excerpt_source === 'manual';
  const scheduled = doc.status === 'draft' && doc.publish_at !== null && doc.publish_at > Date.now();

  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--hh-space-2)' }}>
      {doc.thumbnail_url == null ? null : <Thumbnail src={doc.thumbnail_url} />}
      <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 'var(--hh-space-1)', minWidth: 0 }}>
        <a href={href} data-hh-focusable="" style={{ color: 'var(--hh-color-primary)' }}>
          {doc.title}
        </a>
        <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 'var(--hh-space-1)' }}>
          {doc.category == null ? null : (
            <Badge key="category" tone="info">
              {doc.category}
            </Badge>
          )}
          {manuallyEdited ? (
            <Badge key="manual" tone="warning">
              編集済み
            </Badge>
          ) : null}
          {scheduled ? (
            <Badge key="scheduled" tone="warning">
              予約公開: <DateTimeText value={doc.publish_at} />
            </Badge>
          ) : null}
          {(doc.tags ?? []).map((tag) => (
            <Badge key={tag} tone="neutral">
              {tag}
            </Badge>
          ))}
          {assetBadges(doc.asset_summary)}
        </span>
        {doc.excerpt == null ? null : (
          <span
            style={{
              color: 'var(--hh-color-text-muted)',
              fontSize: 'var(--hh-font-size-sm)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {doc.excerpt}
          </span>
        )}
        {canEdit ? (
          <TextButton aria-expanded={editing} onClick={onToggleEdit}>
            {editing ? '編集を閉じる' : '分類・要約を編集'}
          </TextButton>
        ) : null}
      </span>
    </span>
  );
}

export function DocumentList({
  tenantId,
  workspaceId,
  initialQuery = '',
  sessionRole = null,
  canCreateDocument = false,
}: DocumentListProps): ReactNode {
  const [rows, setRows] = useState<readonly DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // 絞り込み条件の正本は URL query。共有・再読込・戻る/進むが同じ 1 つの規則で揃う。
  // sessionStorage には条件を置かない (置くと、共有した URL の条件が記憶で上書きされる)。
  const {
    filters,
    draft: draftFilters,
    setDraft: setDraftFilters,
    apply,
    restored,
  } = useUrlFilters<DocumentFilters>({ ...EMPTY_FILTERS, query: initialQuery }, DOCUMENT_FILTER_PARAMS);
  // 覚えるのは表示形式だけ。何件出るかを変えないので、共有相手の結果を左右しない
  const [viewMode, setViewMode] = useRememberedViewMode(VIEW_MODE_STORAGE_KEYS.docs);
  const [statusCounts, setStatusCounts] = useState<DocumentStatusCounts | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<readonly (string | null)[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ limit: '25' });
      if (filters.scope !== '') query.set('scope', filters.scope);
      // タブは「すべて」「状態不明」のとき status を送らない。状態不明は API 側に述語が無く、
      // 件数 0 なら押せないタブなので、絞り込みとしては「すべて」と同じ集合を出す
      const statusParam = statusParamOfTab(filters.tab);
      if (statusParam !== '') query.set('status', statusParam);
      // 空文字の `q` は送らない。契約側 (listSearchTermSchema) が空語を弾くため 400 になる
      if (filters.query !== '') query.set('q', filters.query);
      if (filters.category !== '') query.set('category', filters.category);
      if (filters.tag !== '') query.set('tag', filters.tag);
      if (cursor !== null) query.set('cursor', cursor);
      const response = await fetch(`/api/v1/docs?${query.toString()}`, {
        credentials: 'same-origin',
        headers: {
          'x-harness-tenant-id': tenantId,
          'x-harness-workspace-id': workspaceId,
        },
      });
      if (!response.ok) throw new Error(await extractErrorMessage(response, '一覧を取得できませんでした。'));
      const body = (await response.json()) as DocumentListResponse & {
        readonly status_counts?: DocumentStatusCounts;
      };
      setRows(body.items);
      setNextCursor(body.next_cursor);
      // 件数はページを送っても変わらない (API が cursor 適用前の集合から数えている)。
      // 応答に無い場合は 0 を埋めず null のままにして、タブに「(0)」と嘘を出さない
      setStatusCounts(body.status_counts ?? null);
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

  const handleSaved = useCallback((updated: DocumentListItem) => {
    setRows((current) => current.map((row) => (row.id === updated.id ? updated : row)));
  }, []);

  // 0 件のときの言い方を分ける。絞り込んだ結果の 0 件に「まだありません」と出すと、
  // 条件を外せば見つかるものまで「存在しない」と読めてしまう
  const hasFilters =
    filters.tab !== 'all' ||
    filters.scope !== '' ||
    filters.query !== '' ||
    filters.category !== '' ||
    filters.tag !== '';

  // 条件を 1 つだけ動かす。cursor も同時に戻すのは、2 ページ目のまま条件を変えると
  // 「1 ページ目を飛ばした結果」が出て、件数と並びが噛み合わなくなるため
  const applyPatch = useCallback(
    (patch: DocumentFilterPatch): void => {
      setCursor(null);
      setCursorHistory([]);
      // spread ではなく項目ごとに書き出す。`Record<string, string>` を継承した型を
      // spread すると、省略されたキーが `string | undefined` に緩んで型が合わなくなる
      apply({
        tab: patch.tab ?? filters.tab,
        scope: patch.scope ?? filters.scope,
        query: patch.query ?? filters.query,
        category: patch.category ?? filters.category,
        tag: patch.tag ?? filters.tag,
      });
    },
    [apply, filters],
  );

  const appliedFilters: readonly AppliedFilter[] = [
    ...(filters.scope === ''
      ? []
      : [
          {
            label: 'スコープ',
            value: filters.scope === 'common' ? '共通' : 'テナント',
            onRemove: () => applyPatch({ scope: '' }),
          },
        ]),
    ...(filters.tab === 'all'
      ? []
      : [
          {
            label: '状態',
            value: DOCUMENT_TABS.find((item) => item.value === filters.tab)?.label ?? filters.tab,
            onRemove: () => applyPatch({ tab: 'all' }),
          },
        ]),
    ...(filters.category.trim() === ''
      ? []
      : [{ label: 'カテゴリ', value: filters.category.trim(), onRemove: () => applyPatch({ category: '' }) }]),
    ...(filters.tag.trim() === ''
      ? []
      : [{ label: 'タグ', value: filters.tag.trim(), onRemove: () => applyPatch({ tag: '' }) }]),
    ...(filters.query.trim() === ''
      ? []
      : [{ label: '検索', value: filters.query.trim(), onRemove: () => applyPatch({ query: '' }) }]),
  ];

  const applyFilters = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    applyPatch({
      scope: draftFilters.scope,
      query: draftFilters.query.trim(),
      category: draftFilters.category.trim(),
      tag: draftFilters.tag.trim(),
    });
  };

  const clearFilters = (): void => {
    setCursor(null);
    setCursorHistory([]);
    apply(EMPTY_FILTERS);
  };

  // 列構成は 4 列固定。既定表示はカード (S15.LIST)。テーブルは同じ column model の切替。
  // タイトル列だけ幅を持たせない (LISTERG-06) — 幅を入れると
  // 長い題名がその列の中だけで折り返し、行の高さが 1 行分ずれて見比べが崩れる。
  const columns = useMemo<readonly DataTableColumn<DocumentListItem>[]>(
    () => [
      {
        key: 'title',
        header: 'タイトル',
        render: (row: DocumentListItem) => (
          <DocumentTitleCell
            doc={row}
            tenantId={tenantId}
            workspaceId={workspaceId}
            editing={expandedId === row.id}
            canEdit={canWriteDocument(sessionRole, row.scope)}
            onToggleEdit={() => setExpandedId((current) => (current === row.id ? null : row.id))}
          />
        ),
        value: (row: DocumentListItem) => row.title,
      },
      {
        key: 'scope',
        header: '適用範囲',
        width: '9rem',
        salience: 'lead',
        value: (row: DocumentListItem) => (row.scope === 'common' ? '共通' : 'テナント'),
        render: (row: DocumentListItem) => (
          <ScopeChip
            scope={row.scope === 'common' ? 'common' : 'tenant'}
            name={row.scope === 'common' ? '共通' : 'テナント'}
          />
        ),
      },
      {
        key: 'status',
        header: '状態',
        width: '8rem',
        salience: 'lead',
        value: (row: DocumentListItem) =>
          row.status === 'draft' && row.publish_at !== null && row.publish_at > Date.now()
            ? '予約公開'
            : publicStatusLabel(row.status),
        render: (row: DocumentListItem) => (
          <Badge
            tone={
              row.status === 'draft' && row.publish_at !== null && row.publish_at > Date.now()
                ? 'warning'
                : row.status === 'published'
                  ? 'primary'
                  : 'neutral'
            }
          >
            {row.status === 'draft' && row.publish_at !== null && row.publish_at > Date.now()
              ? '予約公開'
              : publicStatusLabel(row.status)}
          </Badge>
        ),
      },
      {
        key: 'updated',
        header: '更新日時',
        width: '13rem',
        value: (row: DocumentListItem) => row.updated_at,
        render: (row: DocumentListItem) => <DateTimeText value={row.updated_at} />,
      },
    ],
    [tenantId, workspaceId, expandedId, sessionRole],
  );

  const expandedDoc = rows.find((row) => row.id === expandedId) ?? null;

  return (
    <>
      <StickyHeaderOffset />
      <StatusTabs current={filters.tab} counts={statusCounts} onSelect={(tab) => applyPatch({ tab })} />
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
        <TextInput
          label="カテゴリ"
          description="完全一致で絞り込みます。"
          value={draftFilters.category}
          onChange={(event) => setDraftFilters((current) => ({ ...current, category: event.target.value }))}
        />
        <TextInput
          label="タグ"
          description="1 件だけ指定できます。"
          value={draftFilters.tag}
          onChange={(event) => setDraftFilters((current) => ({ ...current, tag: event.target.value }))}
        />
        {/* 検索欄は絞り込み欄の最後に置く。並びは全画面で「選ぶ条件 → 打ち込む条件」で統一する */}
        <TextInput
          label="検索"
          description="タイトル・本文・タグのいずれかに含まれる語で探します。"
          value={draftFilters.query}
          onChange={(event) => setDraftFilters((current) => ({ ...current, query: event.target.value }))}
        />
      </FilterBar>

      {/* 読み込み中・取得失敗・0 件・一覧の 4 状態を同じ場所で出し分ける。
          「一覧が空」と「まだ読み込んでいない」と「読み込めなかった」が同じ見た目になると、
          待てば出るのか・そもそも無いのか・やり直すべきなのかが分からない
          (frontend-ui-foundation-spec §3)。出し分けは共通の ListState に任せる */}
      <div style={{ padding: 'var(--hh-space-4)' }}>
        {/* 連携済みなら一覧の上に「Notionで開く」導線を出す (S18 Notion連携) */}
        <NotionOpenLink tenantId={tenantId} workspaceId={workspaceId} />
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
              ? 'スコープ・状態・カテゴリ・タグ・キーワードをゆるめてお試しください。'
              : canCreateDocument
                ? '業務ツールの使い方や運用手順を、最初の 1 本から書き始められます。'
                : 'ドキュメントを作成するには、workspace-admin（ワークスペース管理者）以上の権限が必要です。'
          }
          emptyAction={
            hasFilters ? (
              <Button onClick={clearFilters}>絞り込みを解除</Button>
            ) : canCreateDocument ? (
              <ActionLink href={`/docs/new?tenant=${tenantId}&workspace=${workspaceId}`} variant="primary">
                最初のドキュメントを作成
              </ActionLink>
            ) : undefined
          }
        >
          {/* 広い/中間の画面では表 (更新順に見比べて読む一覧のため)、狭い画面ではカードに
              切り替える (docs/screen-inventory.md S15.LIST profile)。 */}
          <DataTable
            caption="ドキュメント一覧"
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            loading={loading}
            narrowAs="card-collection"
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </ListState>

        {expandedDoc === null ? null : (
          <DocumentEditPanel
            doc={expandedDoc}
            tenantId={tenantId}
            workspaceId={workspaceId}
            onSaved={handleSaved}
            onClose={() => setExpandedId(null)}
          />
        )}
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
