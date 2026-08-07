'use client';

/**
 * S17 ユーザー管理一覧 (AD-2)。
 *
 * 列は name/department/role/status のみ (AD-5: salary は列自体を作らない。マスクではなく DOM 非存在)。
 * screens-a11y-contract.test.tsx の UOA-A11Y-001/002 が確定済みの列構成に合わせてある
 * (role/status は StatusChip 化した状態語彙ではなく、その契約テストと同じ plain value() で表示する)。
 */
import type { SessionRole, UserListItem, UserListResponse, UserStatus } from '@harness-hub/schemas';
import { Alert, DataTable, type DataTableColumn } from '@harness-hub/ui';
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

const COLUMNS: readonly DataTableColumn<UserListItem>[] = [
  {
    key: 'name',
    header: '氏名',
    sortable: true,
    value: (row) => row.name,
    render: (row) => <a href={`/users/${row.id}`}>{row.name}</a>,
  },
  { key: 'department', header: '部門', sortable: true, value: (row) => row.department ?? '—' },
  { key: 'role', header: 'ロール', sortable: true, value: (row) => ROLE_LABELS[row.role] },
  { key: 'status', header: '状態', sortable: true, value: (row) => STATUS_LABELS[row.status] },
];

export function UserList({ tenantId }: UserListProps): ReactNode {
  const [rows, setRows] = useState<readonly UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '一覧を取得できませんでした。');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      {error === null ? null : <Alert tone="danger" title="読み込みエラー" description={error} />}
      <DataTable
        caption="ユーザー一覧"
        columns={COLUMNS}
        rows={rows}
        rowKey={(row) => row.id}
        loading={loading}
        emptyMessage="登録済みのユーザーはまだありません。"
      />
    </>
  );
}
