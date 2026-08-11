'use client';

/**
 * S17 ユーザー管理一覧 (AD-2)。
 *
 * 列は name/status/department/role のみ (AD-5: salary は列自体を作らない。マスクではなく DOM 非存在)。
 * screens-a11y-contract.test.tsx の UOA-A11Y-001/002 が確定済みの列構成に合わせてある
 * (role/status は StatusChip 化した状態語彙ではなく、その契約テストと同じ plain value() で表示する)。
 */
import type { SessionRole, UserListItem, UserListResponse, UserStatus } from '@harness-hub/schemas';
import { Alert, Button, DataTable, type DataTableColumn, ListState } from '@harness-hub/ui';
import { type ReactNode, useCallback, useEffect, useState } from 'react';

interface UserListProps {
  readonly tenantId: string;
}

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

export function UserList({ tenantId }: UserListProps): ReactNode {
  const [rows, setRows] = useState<readonly UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  // 一覧の取得失敗と書き出しの失敗を 1 つの state で持たない。
  // 混ぜると「書き出しに失敗した」だけで一覧まで読めなくなったように見える
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/users', {
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
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  // カスタムヘッダー (x-harness-tenant-id) が要るため <a href> 直リンクではなく
  // fetch → blob → 一時リンクのクリックで CSV ダウンロードを起こす。
  const exportCsv = useCallback(async (): Promise<void> => {
    setExporting(true);
    try {
      const response = await fetch('/api/v1/users/export', {
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
  }, [tenantId]);

  return (
    <>
      <div style={{ padding: 'var(--hh-space-4)', borderBlockEnd: '1px solid var(--hh-color-border)' }}>
        <Button type="button" onClick={() => void exportCsv()} disabled={exporting}>
          {exporting ? '書き出しています…' : '一覧を CSV で書き出す'}
        </Button>
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
        emptyTitle="利用者がまだ登録されていません"
        emptyDescription="このテナントに参加した利用者が、ここに一覧で表示されます。"
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
