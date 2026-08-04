'use client';

import type { SessionRole, UserDetail, UserStatus } from '@harness-hub/schemas';
/**
 * S17 個別ダッシュボード (AD-2)。
 *
 * - 削減効果 rollup (`metrics_rollups`) は feat-metrics-tracking 側にテーブル・repository が
 *   まだ存在しない (P03 指摘4 / ADR §実装追補・未解決事項)。ここで架空の数値を出すと SEC5
 *   (クライアント側で金額を再計算・捏造しない) に反するため、KpiCard は「まだ算出できません」の
 *   プレースホルダーで描画し、実データが揃うまでの空白を明示する。
 * - role/department の編集は共通部品 `InlineEditTable` (プレーンな text input ベース、`<select>` 相当の
 *   編集 UI は持たない) をそのまま使う。そのため role 列の draft 値は表示ラベルではなく生の role
 *   スラッグ (`workspace-admin` 等) を使う — ラベル文字列を編集させると PATCH に渡せない値になる。
 * - salary の編集行は viewer が workspace-admin/provider-admin のときだけ配列に含める
 *   (AD-5: 「表示を消す」ではなく「そもそも行を作らない」)。
 * - 退職処理 (status: active → inactive) は不可逆側の遷移として ConfirmDialog を要求する。
 *   復職 (inactive → active) は元に戻せる操作なので確認なしで直接反映する。
 */
import type { InlineEditColumn, InlineEditCommit } from '@harness-hub/ui';
import { Alert, ConfirmDialog, InlineEditTable, KpiCard } from '@harness-hub/ui';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
// lib/authz/index.js (barrel) は next-auth 依存の runtime.ts も re-export しており、
// client component からそれを import すると Buffer polyfill ごと client bundle に混入する
// (実測: client-bundle 予算超過、chunk 内容が @auth/core の AuthError だった)。
// 判定に必要な純粋関数だけを提供する types.js を直接 import して client bundle を汚さない。
import { atLeast, BASE_ROLES } from '../../../../lib/authz/types.js';

interface UserDashboardProps {
  readonly userId: string;
  readonly tenantId: string;
}

const STATUS_LABELS: Readonly<Record<UserStatus, string>> = {
  active: '在籍',
  inactive: '退職済み',
};

interface EditableRow {
  readonly id: 'department' | 'role' | 'salary';
  readonly field: string;
  readonly value: string;
}

/**
 * salary 行は viewer が admin 相当 (workspace-admin/provider-admin) のときだけ含める
 * (AD-5: マスクではなく行自体を作らない)。純粋関数として切り出し、fetch を伴わずに単体テストできるようにする。
 */
export function computeEditableRows(user: UserDetail, viewerRole: SessionRole | null): readonly EditableRow[] {
  const isAdminViewer = viewerRole !== null && atLeast(viewerRole, 'workspace-admin');
  const base: EditableRow[] = [
    { id: 'department', field: '部門', value: user.department ?? '' },
    { id: 'role', field: 'ロール', value: user.role },
  ];
  if (isAdminViewer && typeof user.salary === 'number') {
    base.push({ id: 'salary', field: '年収 (円)', value: String(user.salary) });
  }
  return base;
}

export function UserDashboard({ userId, tenantId }: UserDashboardProps): ReactNode {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [viewerRole, setViewerRole] = useState<SessionRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [offboardOpen, setOffboardOpen] = useState(false);

  const scopeHeaders = useMemo((): HeadersInit => ({ 'x-harness-tenant-id': tenantId }), [tenantId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [userResponse, meResponse] = await Promise.all([
        fetch(`/api/v1/users/${userId}`, { credentials: 'same-origin', headers: scopeHeaders }),
        fetch('/api/v1/me', { credentials: 'same-origin', headers: scopeHeaders }),
      ]);
      if (!userResponse.ok) throw new Error('ユーザー情報を取得できませんでした。');
      if (!meResponse.ok) throw new Error('自分のロールを確認できませんでした。');
      setUser((await userResponse.json()) as UserDetail);
      setViewerRole(((await meResponse.json()) as { role: SessionRole }).role);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'データを取得できませんでした。');
    } finally {
      setLoading(false);
    }
  }, [scopeHeaders, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(
    (): readonly EditableRow[] => (user === null ? [] : computeEditableRows(user, viewerRole)),
    [user, viewerRole],
  );

  const columns: readonly InlineEditColumn<EditableRow>[] = [
    { key: 'value', header: '値', value: (row) => row.value, editable: true },
  ];

  const patchUser = useCallback(
    async (body: Record<string, unknown>, onSuccess: string): Promise<void> => {
      try {
        const response = await fetch(`/api/v1/users/${userId}`, {
          method: 'PATCH',
          credentials: 'same-origin',
          headers: { ...scopeHeaders, 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          setError(
            response.status === 403
              ? 'この変更には権限が不足しています。'
              : '更新に失敗しました。入力内容を確認してください。',
          );
          return;
        }
        setError(null);
        setNotice(onSuccess);
        await load();
      } catch {
        setError('更新に失敗しました。');
      }
    },
    [load, scopeHeaders, userId],
  );

  const handleCommit = useCallback(
    (commit: InlineEditCommit): void => {
      if (commit.rowId === 'department') {
        const trimmed = commit.value.trim();
        void patchUser({ department: trimmed === '' ? null : trimmed }, '部門を更新しました。');
        return;
      }
      if (commit.rowId === 'role') {
        const value = commit.value as SessionRole;
        if (!BASE_ROLES.includes(value)) {
          setError(`ロールは ${BASE_ROLES.join(' / ')} のいずれかで入力してください。`);
          return;
        }
        void patchUser({ role: value }, 'ロールを更新しました。');
        return;
      }
      if (commit.rowId === 'salary') {
        const parsed = Number(commit.value);
        if (!Number.isInteger(parsed) || parsed < 0) {
          setError('年収は 0 以上の整数で入力してください。');
          return;
        }
        void patchUser({ salary: parsed }, '年収を更新しました。');
      }
    },
    [patchUser],
  );

  if (loading) return <p aria-live="polite">読み込み中です。</p>;
  if (user === null) return <p role="alert">ユーザーが見つかりませんでした。</p>;

  return (
    <>
      {error === null ? null : <Alert tone="danger" title="エラー" description={error} />}
      {notice === null ? null : <Alert tone="success" title="更新しました" description={notice} />}

      <dl>
        <dt>氏名</dt>
        <dd>{user.name}</dd>
        <dt>状態</dt>
        <dd>{STATUS_LABELS[user.status]}</dd>
      </dl>

      <KpiCard label="年間削減時間" value="—" unit="時間" />
      <p>
        この指標は集計機能 (metrics_rollups) が別機能側で未実装のため、現在は算出できません。実装完了後に反映されます。
      </p>

      <InlineEditTable
        caption="ユーザー編集"
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        rowLabel={(row) => row.field}
        onCommit={handleCommit}
      />

      {user.status === 'active' ? (
        <>
          <button type="button" onClick={() => setOffboardOpen(true)}>
            退職処理
          </button>
          <ConfirmDialog
            open={offboardOpen}
            title="退職処理の確認"
            description={`${user.name} を退職済みに変更します。`}
            reversible={false}
            onConfirm={() => {
              setOffboardOpen(false);
              void patchUser({ status: 'inactive' }, '退職処理を行いました。');
            }}
            onCancel={() => setOffboardOpen(false)}
          />
        </>
      ) : (
        <button type="button" onClick={() => void patchUser({ status: 'active' }, '復職処理を行いました。')}>
          復職処理
        </button>
      )}
    </>
  );
}
