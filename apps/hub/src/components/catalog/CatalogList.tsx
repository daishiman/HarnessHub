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
  ListState,
  Select,
  StatusChip,
  StickyHeaderOffset,
  TextInput,
} from '@harness-hub/ui';
import { useCallback, useEffect, useState } from 'react';
import type { CatalogFailure, CatalogPort, CatalogScope } from '../../lib/catalog/index.js';
import { catalogCapabilities, httpCatalogPort } from '../../lib/catalog/index.js';
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
  const [target, setTarget] = useState<string>(initialTarget ?? '');
  const [query, setQuery] = useState<string>(initialQuery ?? '');
  // 入力中の値と、実際に問い合わせへ適用した値を分ける。
  // これを分けないと 1 文字入力するたび effect が走り、submit でも同じ要求を重ねてしまう。
  const [appliedTarget, setAppliedTarget] = useState<string>(initialTarget ?? '');
  const [appliedQuery, setAppliedQuery] = useState<string>(initialQuery ?? '');
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
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, filterGeneration]);

  const capabilities = failure === null ? null : catalogCapabilities(failure.kind);
  const showBanner = failure !== null && capabilities?.canBrowse === true;
  const showError = failure !== null && capabilities?.canBrowse === false;
  // scope が切り替わった瞬間に、前 tenant/workspace の取得結果を 1 frame も再利用しない。
  const visibleEntries = entriesScopeKey === scopeKey ? entries : [];
  const appliedFilters: readonly AppliedFilter[] = [
    ...(appliedTarget === ''
      ? []
      : [
          {
            label: '種別',
            value: TARGET_OPTIONS.find((option) => option.value === appliedTarget)?.label ?? appliedTarget,
          },
        ]),
    ...(appliedQuery.trim() === '' ? [] : [{ label: 'キーワード', value: appliedQuery.trim() }]),
  ];

  return (
    <div>
      <StickyHeaderOffset />
      {showBanner ? <DegradedBanner description={failure.message} /> : null}

      <FilterBar
        label="業務ツールの絞り込み"
        sticky
        appliedChips={appliedFilters.length === 0 ? undefined : <AppliedFilterChips items={appliedFilters} />}
        onSubmit={(event) => {
          event.preventDefault();
          setAppliedTarget(target);
          setAppliedQuery(query);
          setFilterGeneration((value) => value + 1);
        }}
        actions={<Button type="submit">絞り込む</Button>}
      >
        <Select
          label="種別"
          options={TARGET_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
          value={target}
          onChange={(event) => setTarget(event.currentTarget.value)}
        />
        <TextInput
          label="キーワード"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
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
        emptyTitle={
          appliedTarget === '' && appliedQuery === ''
            ? '公開されている業務ツールはまだありません'
            : '条件に合う業務ツールがありません'
        }
        emptyDescription={
          appliedTarget === '' && appliedQuery === ''
            ? '公開が済むと、ここに導入できる業務ツールが並びます。'
            : '種別やキーワードを変えてお試しください。'
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
