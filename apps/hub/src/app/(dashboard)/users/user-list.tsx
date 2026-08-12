'use client';

/**
 * S17 ユーザー管理一覧 (AD-2)。
 *
 * 列は name/status/department/role のみ (AD-5: salary は列自体を作らない。マスクではなく DOM 非存在)。
 * screens-a11y-contract.test.tsx の UOA-A11Y-001/002 が確定済みの列構成に合わせてある
 * (role/status は StatusChip 化した状態語彙ではなく、その契約テストと同じ plain value() で表示する)。
 */
import type { SessionRole, UserListItem, UserListResponse, UserStatus } from '@harness-hub/schemas';
import {
  Alert,
  Button,
  DataTable,
  type DataTableColumn,
  FilterBar,
  ListState,
  StickyHeaderOffset,
  TextInput,
} from '@harness-hub/ui';
import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from 'react';
import { type AppliedFilter, AppliedFilterChips } from '../../../components/filter/applied-filter-chips.js';
import { FILTER_STORAGE_KEYS, useRememberedFilters } from '../../../lib/list/remembered-filters.js';

interface UserListProps {
  readonly tenantId: string;
  /**
   * 共通ヘッダーの検索フォーム (`?q=`) から渡ってくる初期キーワード。
   * ここで受けることで「ヘッダーで検索 → 一覧が絞り込まれた状態で開く」が成立する。
   */
  readonly initialQuery?: string;
}

interface UserFilters {
  readonly query: string;
}

const EMPTY_FILTERS: UserFilters = { query: '' };

const ROLE_LABELS: Readonly<Record<SessionRole, string>> = {
  'provider-admin': 'プロバイダー管理者',
  'workspace-admin': 'ワークスペース管理者',
  member: 'メンバー',
};

const STATUS_LABELS: Readonly<Record<UserStatus, string>> = {
  active: '在籍',
  inactive: '退職済み',
};

/**
 * 列の並びは「誰か → いま依頼していい相手か → どこの人か → 何ができるか」の順にする。
 * 在籍の状態は行の読み方そのものを変える (退職済みの人に部門やロールを見ても意味がない) ので、
 * 属性 2 列より前に置く。列幅を全列に指定するのは、氏名の長さで列の位置が行ごとに動くと
 * 縦に見比べられなくなるため。
 */
function buildColumns(tenantId: string): readonly DataTableColumn<UserListItem>[] {
  return [
    {
      key: 'name',
      header: '氏名',
      sortable: true,
      // 行を名指しする列。狭い画面では 4 列でも横にはみ出すため、左端へ貼り付けて
      // 右の列を見にいっても「誰の行か」が画面から消えないようにする
      sticky: true,
      width: '14rem',
      value: (row) => row.name,
      render: (row) => <a href={`/users/${row.id}?tenant=${encodeURIComponent(tenantId)}`}>{row.name}</a>,
    },
    // 在籍かどうかは行の読み方そのものを変えるので、カードでも名前の次に置く
    {
      key: 'status',
      header: '状態',
      sortable: true,
      width: '8rem',
      value: (row) => STATUS_LABELS[row.status],
      salience: 'lead',
    },
    {
      key: 'department',
      header: '部門',
      sortable: true,
      width: '12rem',
      value: (row) => row.department ?? '部門未登録',
      salience: 'context',
    },
    {
      key: 'role',
      header: 'ロール',
      sortable: true,
      width: '14rem',
      value: (row) => ROLE_LABELS[row.role],
      salience: 'context',
    },
  ];
}

export function UserList({ tenantId, initialQuery = '' }: UserListProps): ReactNode {
  const [rows, setRows] = useState<readonly UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  // 一覧の取得失敗と書き出しの失敗を 1 つの state で持たない。
  // 混ぜると「書き出しに失敗した」だけで一覧まで読めなくなったように見える
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  // 絞り込み条件は個別ダッシュボードへ行って戻るまで覚えておく (毎回入れ直させない)。
  // ただしヘッダーの検索から開いたとき (`?q=`) は、指定された語を必ず優先する
  const {
    filters,
    draft: draftFilters,
    setDraft: setDraftFilters,
    apply,
    restored,
  } = useRememberedFilters<UserFilters>(
    FILTER_STORAGE_KEYS.users,
    { ...EMPTY_FILTERS, query: initialQuery },
    initialQuery !== '',
  );

  /** 一覧と CSV 書き出しで同じ条件を使う。片方だけ絞り込むと、画面と書き出しが食い違う。 */
  const searchParams = useCallback((): string => {
    const query = new URLSearchParams();
    // 空文字の `q` は送らない。契約側 (listSearchTermSchema) が空語を弾くため 400 になる
    if (filters.query !== '') query.set('q', filters.query);
    const serialized = query.toString();
    return serialized === '' ? '' : `?${serialized}`;
  }, [filters.query]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/users${searchParams()}`, {
        credentials: 'same-origin',
        headers: { 'x-harness-tenant-id': tenantId },
      });
      if (!response.ok) throw new Error('一覧を取得できませんでした。');
      const body = (await response.json()) as UserListResponse;
      setRows(body.items);
      setLoadError(null);
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : '一覧を取得できませんでした。');
    } finally {
      setLoading(false);
    }
  }, [searchParams, tenantId]);

  // 覚えていた条件の復元が済むまで待つ。先に問い合わせると、空の条件で取った一覧が
  // 一瞬出てから条件付きの一覧に差し替わり、件数が目の前で変わって見える
  useEffect(() => {
    if (!restored) return;
    void load();
  }, [load, restored]);

  // カスタムヘッダー (x-harness-tenant-id) が要るため <a href> 直リンクではなく
  // fetch → blob → 一時リンクのクリックで CSV ダウンロードを起こす。
  const exportCsv = useCallback(async (): Promise<void> => {
    setExporting(true);
    try {
      const response = await fetch(`/api/v1/users/export${searchParams()}`, {
        credentials: 'same-origin',
        headers: { 'x-harness-tenant-id': tenantId },
      });
      if (!response.ok) throw new Error('エクスポートに失敗しました。');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'users.csv';
      link.click();
      URL.revokeObjectURL(url);
      setExportError(null);
    } catch (cause) {
      setExportError(cause instanceof Error ? cause.message : 'エクスポートに失敗しました。');
    } finally {
      setExporting(false);
    }
  }, [searchParams, tenantId]);

  // 0 件の言い方を分ける。絞り込み結果の 0 件に「まだ登録されていません」は誤解を生む
  const hasFilters = filters.query !== '';
  const appliedFilters: readonly AppliedFilter[] = [
    ...(filters.query.trim() === '' ? [] : [{ label: '検索', value: filters.query.trim() }]),
  ];

  const applyFilters = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    apply({ query: draftFilters.query.trim() });
  };

  return (
    <>
      <StickyHeaderOffset />
      {/* 絞り込み欄の並びと余白は共通の FilterBar に任せる (画面ごとの書き起こしをやめる)。
          この画面は打ち込む条件が 1 つだけだが、他一覧と同じ器・同じ位置に置く */}
      <FilterBar
        label="利用者の絞り込み"
        sticky
        appliedChips={appliedFilters.length === 0 ? undefined : <AppliedFilterChips items={appliedFilters} />}
        onSubmit={applyFilters}
        actions={<Button type="submit">絞り込む</Button>}
      >
        <TextInput
          label="検索"
          description="氏名と部門を検索します。"
          value={draftFilters.query}
          onChange={(event) => setDraftFilters((current) => ({ ...current, query: event.target.value }))}
        />
      </FilterBar>
      <div style={{ padding: 'var(--hh-space-4)', borderBlockEnd: '1px solid var(--hh-color-border)' }}>
        <Button type="button" onClick={() => void exportCsv()} disabled={exporting}>
          {exporting ? '書き出しています…' : '一覧を CSV で書き出す'}
        </Button>
        {/* 絞り込み中は書き出しの範囲も同じであることを言う。ボタンの文言だけでは
            「全員が出る」と読まれうるため、条件が付いているときだけ添える */}
        {hasFilters ? (
          <p style={{ margin: 'var(--hh-space-2) 0 0', color: 'var(--hh-color-text-muted)' }}>
            いま絞り込んでいる条件のまま書き出します。
          </p>
        ) : null}
        {/* 書き出しの失敗は操作の隣に出す。一覧の表示とは別の話なので一覧を消さない */}
        {exportError === null ? null : <Alert tone="danger" title="操作エラー" description={exportError} />}
      </div>
      {/* 広い画面では表。氏名・部門・ロール・状態を行どうしで見比べる一覧なので縦の並びが要る
          (型の割当は docs/screen-inventory.md の profile)。
          狭い画面ではカードへ組み替える (4 列でも横へはみ出し、右を見ると誰の行か消えるため)。
          列構成は UOA-A11Y-001/002 の契約で固定されているため増減させない */}
      <ListState
        error={loadError}
        onRetry={() => void load()}
        loading={loading}
        isEmpty={rows.length === 0}
        emptyTitle={hasFilters ? '条件に合う利用者がいません' : '利用者がまだ登録されていません'}
        emptyDescription={
          hasFilters
            ? 'キーワードをゆるめるか、条件を外してもう一度お試しください。'
            : 'このテナントに参加した利用者が、ここに一覧で表示されます。'
        }
      >
        <DataTable
          caption="ユーザー一覧"
          columns={buildColumns(tenantId)}
          rows={rows}
          rowKey={(row) => row.id}
          loading={loading}
          stickyHeader
          narrowAs="card-collection"
        />
      </ListState>
    </>
  );
}
