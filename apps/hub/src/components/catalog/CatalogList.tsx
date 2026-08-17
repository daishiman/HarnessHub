'use client';

/**
 * S01 Workspace Catalog 一覧 (docs/screen-inventory.md S01)。
 *
 * 表示項目は screen-inventory の「name/summary/target/status/version/download count」に対応。
 * 一覧はポーリングしない (ADR §2.2) — 一覧の鮮度より、常時通信しないことによる CWV と無料枠の温存を採る。
 */
import type { CatalogEntry, PublishTarget } from '@harness-hub/schemas';
import {
  Button,
  DataTable,
  DegradedBanner,
  FilterBar,
  FilterTabs,
  ListState,
  Select,
  StatusChip,
  StickyHeaderOffset,
  TextInput,
} from '@harness-hub/ui';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import type { CatalogFailure, CatalogPort, CatalogScope } from '../../lib/catalog/index.js';
import { catalogCapabilities, httpCatalogPort } from '../../lib/catalog/index.js';
import { useRememberedViewMode, useUrlFilters, VIEW_MODE_STORAGE_KEYS } from '../../lib/list/remembered-filters.js';
import { type AppliedFilter, AppliedFilterChips } from '../filter/applied-filter-chips.js';

export interface CatalogListProps {
  scope: CatalogScope;
  /** テスト時に差し替える。既定は実 API。 */
  port?: CatalogPort;
  initialTarget?: PublishTarget | undefined;
  initialQuery?: string | undefined;
}

const TARGET_OPTIONS = [
  { value: '', label: 'すべての種別' },
  { value: 'skill', label: 'Skill' },
  { value: 'web_app', label: 'Web アプリ' },
] as const;

/**
 * 公開状態のタブ区分。
 *
 * `deprecated` (提供終了) を `suspended` (停止中) と同じ「停止」へ束ねるのは、
 * 導入する側にとって「いま入れられるか」だけが分岐で、止まった理由の違いは
 * 詳細画面で読めば足りるため。`null` はまだ公開処理が済んでいない行で、
 * 停止と同じ扱いにすると「止められた」と誤読されるので `unknown` に分ける。
 */
export type CatalogStatusGroup = 'available' | 'suspended' | 'unknown';

/** `release_status` → タブ区分。想定外の値も `unknown` に落として、勝手に available へ寄せない。 */
export function catalogStatusGroup(releaseStatus: CatalogEntry['release_status']): CatalogStatusGroup {
  if (releaseStatus === 'available') return 'available';
  if (releaseStatus === 'suspended' || releaseStatus === 'deprecated') return 'suspended';
  return 'unknown';
}

type CatalogTab = 'all' | CatalogStatusGroup;

const CATALOG_TABS: readonly { readonly value: CatalogTab; readonly label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'available', label: '導入できる' },
  { value: 'suspended', label: '停止' },
  { value: 'unknown', label: '公開前' },
];

interface CatalogFilters extends Record<string, string> {
  readonly tab: CatalogTab;
  readonly target: string;
  readonly query: string;
}

type CatalogFilterPatch = { readonly [K in keyof CatalogFilters]?: CatalogFilters[K] };

const CATALOG_FILTER_PARAMS = { tab: 'tab', target: 'target', query: 'q' } as const;

interface CatalogStatusCounts {
  readonly all: number;
  readonly available: number;
  readonly suspended: number;
  readonly unknown: number;
}

/**
 * 状態タブの件数。
 *
 * この一覧は cursor を持たず、権限を通した全件をそのまま受け取るので、
 * 受け取った集合を数えれば「認可後・cursor 適用前」の件数になる (受入条件 6)。
 * ただし種別・キーワードの絞り込みは**外して**数える — 状態タブは
 * 「いま見ている絞り込みの中の内訳」ではなく「状態ごとの総数」を出す欄なので。
 */
function countByStatus(entries: readonly CatalogEntry[]): CatalogStatusCounts {
  const counts = { all: entries.length, available: 0, suspended: 0, unknown: 0 };
  for (const entry of entries) counts[catalogStatusGroup(entry.release_status)] += 1;
  return counts;
}

interface StatusTabsProps {
  readonly current: CatalogTab;
  readonly counts: CatalogStatusCounts;
  readonly onSelect: (tab: CatalogTab) => void;
}

/** 状態で切り替えるタブ。押した瞬間に適用する (文字入力だけが submit を待つ)。 */
function StatusTabs({ current, counts, onSelect }: StatusTabsProps): ReactNode {
  return (
    // 一覧本体との間合いだけがこの画面の関心。切替そのものの見た目は FilterTabs が持つ
    <div style={{ padding: 'var(--hh-space-3) var(--hh-space-4) 0' }}>
      <FilterTabs
        label="公開状態で絞り込み"
        current={current}
        onSelect={onSelect}
        items={CATALOG_TABS.filter((tab) => tab.value !== 'unknown' || counts.unknown > 0).map((tab) => ({
          value: tab.value,
          label: tab.label,
          count: counts[tab.value],
        }))}
      />
    </div>
  );
}

/**
 * 詳細への遷移リンク。
 *
 * `next/link` は使わない。この app は既存画面 (`/sheets`) を含め素の `<a>` で遷移する規約で、
 * 1 本のリンクのために router runtime 3.3 KiB(gzip) を初期チャンクへ積むと G13 予算を割る (実測 2026-08-01)。
 * また **scope を必ず引き継ぐ**。詳細画面は tenant/workspace を URL から読むため、
 * 落とすと遷移した先が毎回「Workspace が特定できません」になる。
 */
function detailHref(scope: CatalogScope, projectId: string): string {
  const params = new URLSearchParams({ tenant: scope.tenantId, workspace: scope.workspaceId });
  return `/catalog/${encodeURIComponent(projectId)}?${params.toString()}`;
}

export function CatalogList({ scope, port = httpCatalogPort, initialTarget, initialQuery }: CatalogListProps) {
  const scopeKey = `${scope.tenantId}\u0000${scope.workspaceId}`;
  const [entries, setEntries] = useState<readonly CatalogEntry[]>([]);
  const [entriesScopeKey, setEntriesScopeKey] = useState<string>(scopeKey);
  // 入力中の値 (draft) と、実際に問い合わせへ適用した値 (filters) を分ける。
  // これを分けないと 1 文字入力するたび effect が走り、submit でも同じ要求を重ねてしまう。
  // 適用済みの値の正本は URL なので、同じ URL を共有すれば相手にも同じ一覧が出る。
  const { filters, draft, setDraft, apply, restored } = useUrlFilters<CatalogFilters>(
    { tab: 'all', target: initialTarget ?? '', query: initialQuery ?? '' },
    CATALOG_FILTER_PARAMS,
  );
  const [viewMode, setViewMode] = useRememberedViewMode(VIEW_MODE_STORAGE_KEYS.catalog);
  const appliedTarget = filters.target;
  const appliedQuery = filters.query;
  const [filterGeneration, setFilterGeneration] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [failure, setFailure] = useState<CatalogFailure | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      const result = await port.listEntries(
        scope,
        {
          ...(appliedTarget === '' ? {} : { target: appliedTarget as PublishTarget }),
          ...(appliedQuery === '' ? {} : { q: appliedQuery }),
        },
        signal,
      );
      if (signal?.aborted === true) return;
      if (result.ok) {
        setEntries(result.value.items);
        setEntriesScopeKey(scopeKey);
        setFailure(null);
      } else {
        // 縮退時も取得済みの entries は消さない。「Hub が落ちても見えていたものは見え続ける」(§6.1)
        setFailure(result.failure);
      }
      setLoading(false);
    },
    [port, scope, scopeKey, appliedTarget, appliedQuery],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: filterGeneration は同じ条件で再送信するときにも effect を張り直す世代印
  useEffect(() => {
    // URL からの復元が済むまで待つ。先に問い合わせると、条件なしの一覧が一瞬出てから
    // 条件付きに差し替わり、件数が目の前で変わって見える
    if (!restored) return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, filterGeneration, restored]);

  const capabilities = failure === null ? null : catalogCapabilities(failure.kind);
  const showBanner = failure !== null && capabilities?.canBrowse === true;
  const showError = failure !== null && capabilities?.canBrowse === false;
  // scope が切り替わった瞬間に、前 tenant/workspace の取得結果を 1 frame も再利用しない。
  const scopedEntries = entriesScopeKey === scopeKey ? entries : [];
  // 件数は状態の絞り込みを外した集合から数える。数えた後で状態タブを当てる順にしないと、
  // 選んでいるタブ以外が常に 0 件になる
  const statusCounts = countByStatus(scopedEntries);
  const visibleEntries =
    filters.tab === 'all'
      ? scopedEntries
      : scopedEntries.filter((row) => catalogStatusGroup(row.release_status) === filters.tab);

  const applyPatch = useCallback(
    (patch: CatalogFilterPatch): void => {
      apply({
        tab: patch.tab ?? filters.tab,
        target: patch.target ?? filters.target,
        query: patch.query ?? filters.query,
      });
      setFilterGeneration((value) => value + 1);
    },
    [apply, filters],
  );

  const appliedFilters: readonly AppliedFilter[] = [
    ...(filters.tab === 'all'
      ? []
      : [
          {
            label: '公開状態',
            value: CATALOG_TABS.find((tab) => tab.value === filters.tab)?.label ?? filters.tab,
            onRemove: () => applyPatch({ tab: 'all' }),
          },
        ]),
    ...(appliedTarget === ''
      ? []
      : [
          {
            label: '種別',
            value: TARGET_OPTIONS.find((option) => option.value === appliedTarget)?.label ?? appliedTarget,
            onRemove: () => applyPatch({ target: '' }),
          },
        ]),
    ...(appliedQuery.trim() === ''
      ? []
      : [{ label: 'キーワード', value: appliedQuery.trim(), onRemove: () => applyPatch({ query: '' }) }]),
  ];
  const hasFilters = filters.tab !== 'all' || appliedTarget !== '' || appliedQuery !== '';

  return (
    <div>
      <StickyHeaderOffset />
      {showBanner ? <DegradedBanner description={failure.message} /> : null}
      <StatusTabs current={filters.tab} counts={statusCounts} onSelect={(tab) => applyPatch({ tab })} />

      <FilterBar
        label="業務ツールの絞り込み"
        sticky
        appliedChips={appliedFilters.length === 0 ? undefined : <AppliedFilterChips items={appliedFilters} />}
        onSubmit={(event) => {
          event.preventDefault();
          applyPatch({ target: draft.target, query: draft.query.trim() });
        }}
        actions={<Button type="submit">絞り込む</Button>}
      >
        <Select
          label="種別"
          options={TARGET_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
          value={draft.target}
          onChange={(event) => {
            // currentTarget はハンドラを抜けると null に戻る。setDraft の更新関数は後で呼ばれるので、
            // 値はここで取り出しておく (更新関数の中で読むと null 参照で落ちる)。
            const { value } = event.target;
            setDraft((current) => ({ ...current, target: value }));
          }}
        />
        <TextInput
          label="キーワード"
          value={draft.query}
          onChange={(event) => {
            const { value } = event.target;
            setDraft((current) => ({ ...current, query: value }));
          }}
          description="名前と説明から探します。"
        />
      </FilterBar>

      {/* 「一覧を見ることすらできない失敗」と「0 件」を同じ場所で出し分ける。
          縮退 (canBrowse=true) は上のバナーが担い、取得済みの一覧はそのまま残す */}
      <ListState
        error={showError ? failure.message : null}
        onRetry={() => setFilterGeneration((value) => value + 1)}
        loading={loading}
        isEmpty={visibleEntries.length === 0}
        emptyTitle={hasFilters ? '条件に合う業務ツールがありません' : '公開されている業務ツールはまだありません'}
        emptyDescription={
          hasFilters
            ? '状態・種別・キーワードを変えるか、上の条件を解除してお試しください。'
            : '公開が済むと、ここに導入できる業務ツールが並びます。'
        }
      >
        {/* 広い画面では表。導入数や版を行どうしで見比べて選ぶ一覧なので、縦の並びが要る
            (型の割当は docs/screen-inventory.md の profile)。
            下までスクロールしても何の列か分かるよう、見出し行だけ貼り付ける。
            狭い画面では 6 列が必ず横へはみ出し、右を見ると左が消えて見比べ自体が成立しないので、
            1 件 1 枚のカードへ組み替える (見比べは諦め、1 件を読み切れることを採る) */}
        <DataTable<CatalogEntry>
          caption="業務ツール一覧"
          loading={loading}
          rows={visibleEntries}
          rowKey={(row) => row.project_id}
          stickyHeader
          narrowAs="card-collection"
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          columns={[
            {
              key: 'name',
              header: '名前',
              sortable: true,
              value: (row) => row.name,
              render: (row) => <a href={detailHref(scope, row.project_id)}>{row.name}</a>,
            },
            // カードでは「何のツールか」が最初に要る。表の 2 列目という位置ではなく、
            // 情報としての重さで段を決める (FR-IDS-005)
            { key: 'summary', header: 'どんなツールか', value: (row) => row.summary, salience: 'context' },
            {
              key: 'target',
              header: '種別',
              sortable: true,
              value: (row) => row.target,
              render: (row) => (row.target === 'skill' ? 'Skill' : 'Web アプリ'),
              salience: 'metadata',
            },
            {
              key: 'status',
              header: '公開状態',
              value: (row) => row.release_status ?? '',
              render: (row) =>
                row.release_status === null ? '未公開' : <StatusChip domain="release" status={row.release_status} />,
              // 導入していい状態かどうかは、名前の次に読ませる
              salience: 'lead',
            },
            { key: 'version', header: '最新の版', value: (row) => row.stable_version ?? '公開前', salience: 'lead' },
            {
              key: 'download_count',
              header: '導入数',
              sortable: true,
              align: 'end',
              value: (row) => row.download_count,
              salience: 'metadata',
            },
          ]}
        />
      </ListState>
    </div>
  );
}
