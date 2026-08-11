'use client';

import type { SessionRole, UserDetail, UserStatus } from '@harness-hub/schemas';
/**
 * S17 個別ダッシュボード (AD-2)。
 *
 * - 削減効果 rollup (`metrics_rollups`) は feat-metrics-tracking 側にテーブル・repository が
 *   まだ存在しない (P03 指摘4 / ADR §実装追補・未解決事項)。ここで架空の数値を出すと SEC5
 *   (クライアント側で金額を再計算・捏造しない) に反するため、KpiCard は「まだ算出できません」の
 *   プレースホルダーで描画し、実データが揃うまでの空白を明示する。
 * - department は共通部品 `InlineEditTable`、role は日本語ラベル付きの `Select` で編集する。
 *   role の内部値を自由入力欄へ露出させず、API が受け付ける選択肢だけを提示する。
 * - salary の編集行は viewer が workspace-admin/provider-admin のときだけ配列に含める
 *   (AD-5: 「表示を消す」ではなく「そもそも行を作らない」)。
 * - 退職処理 (status: active → inactive) は不可逆側の遷移として ConfirmDialog を要求する。
 *   復職 (inactive → active) は元に戻せる操作なので確認なしで直接反映する。
 */
import type { InlineEditColumn, InlineEditCommit } from '@harness-hub/ui';
import {
  Alert,
  Button,
  CardGrid,
  ConfirmDialog,
  DefinitionList,
  InlineEditTable,
  KpiCard,
  LiveStatus,
  Panel,
  Select,
  Stack,
} from '@harness-hub/ui';
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

const ROLE_LABELS: Readonly<Record<SessionRole, string>> = {
  'provider-admin': 'プロバイダー管理者',
  'workspace-admin': 'ワークスペース管理者',
  member: 'メンバー',
};

const ROLE_OPTIONS = BASE_ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }));

interface EditableRow {
  readonly id: 'department' | 'salary';
  readonly field: string;
  readonly value: string;
}

/**
 * salary 行は viewer が admin 相当 (workspace-admin/provider-admin) のときだけ含める
 * (AD-5: マスクではなく行自体を作らない)。純粋関数として切り出し、fetch を伴わずに単体テストできるようにする。
 */
export function computeEditableRows(user: UserDetail, viewerRole: SessionRole | null): readonly EditableRow[] {
  const isAdminViewer = viewerRole !== null && atLeast(viewerRole, 'workspace-admin');
  const base: EditableRow[] = [{ id: 'department', field: '部門', value: user.department ?? '' }];
  if (isAdminViewer && typeof user.salary === 'number') {
    base.push({ id: 'salary', field: '年収 (円)', value: String(user.salary) });
  }
  return base;
}

/** 操作の起点。結果表示をこの単位で出し分ける。 */
type ActionScope = 'edit' | 'status';

interface ActionResult {
  readonly scope: ActionScope;
  readonly tone: 'success' | 'danger';
  readonly message: string;
}

/** 面の中に置く操作結果。見出しは成否で言い分けて、色だけに頼らせない。 */
function ActionResultAlert({
  result,
  scope,
}: {
  readonly result: ActionResult | null;
  readonly scope: ActionScope;
}): ReactNode {
  if (result === null || result.scope !== scope) return null;
  return (
    <Alert
      tone={result.tone}
      title={result.tone === 'success' ? '更新しました' : '更新できませんでした'}
      description={result.message}
    />
  );
}

export function UserDashboard({ userId, tenantId }: UserDashboardProps): ReactNode {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [viewerRole, setViewerRole] = useState<SessionRole | null>(null);
  const [loading, setLoading] = useState(true);
  // 「利用者の情報を読み込めなかった」と「変更を保存できなかった」を 1 つの state で持たない。
  // 混ぜると、ロールの入力を 1 回間違えただけで利用者の情報まで消えたように見える。
  const [loadError, setLoadError] = useState<string | null>(null);
  // 変更の結果は、その変更を起こした面の中に返す。この画面は「登録内容の変更」と
  // 「在籍の切り替え」の 2 か所から操作でき、画面上端にまとめると
  // どちらの結果なのかが読み手側にしか分からなくなる。
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);
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
      setLoadError(null);
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : 'データを取得できませんでした。');
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
    async (scope: ActionScope, body: Record<string, unknown>, onSuccess: string): Promise<void> => {
      try {
        const response = await fetch(`/api/v1/users/${userId}`, {
          method: 'PATCH',
          credentials: 'same-origin',
          headers: { ...scopeHeaders, 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          setActionResult({
            scope,
            tone: 'danger',
            message:
              response.status === 403
                ? 'この変更には権限が不足しています。'
                : '更新に失敗しました。入力内容を確認してください。',
          });
          return;
        }
        setActionResult({ scope, tone: 'success', message: onSuccess });
        await load();
      } catch {
        setActionResult({ scope, tone: 'danger', message: '更新に失敗しました。' });
      }
    },
    [load, scopeHeaders, userId],
  );

  const handleCommit = useCallback(
    (commit: InlineEditCommit): void => {
      if (commit.rowId === 'department') {
        const trimmed = commit.value.trim();
        void patchUser('edit', { department: trimmed === '' ? null : trimmed }, '部門を更新しました。');
        return;
      }
      if (commit.rowId === 'salary') {
        const parsed = Number(commit.value);
        if (!Number.isInteger(parsed) || parsed < 0) {
          setActionResult({ scope: 'edit', tone: 'danger', message: '年収は 0 以上の整数で入力してください。' });
          return;
        }
        void patchUser('edit', { salary: parsed }, '年収を更新しました。');
      }
    },
    [patchUser],
  );

  if (loading) return <LiveStatus>利用者の情報を読み込み中です。</LiveStatus>;
  // 読み込めていない = 画面に出せる中身が無い。ここだけが画面全体を置き換える条件で、
  // 変更の失敗ではこの分岐に入らない (表示中の情報を消さない)
  if (user === null)
    return (
      <Panel>
        <Stack gap={3}>
          <p role="alert" style={{ margin: 0 }}>
            {loadError ?? 'ユーザーが見つかりませんでした。'}
          </p>
          <div>
            <Button type="button" variant="secondary" onClick={() => void load()}>
              読み込み直す
            </Button>
          </div>
        </Stack>
      </Panel>
    );

  return (
    <Stack gap={4}>
      {/* 生の <dl> をやめて共通の定義リストへ。1 人分の属性を並べる箇所なので表にはしない (§5-1 の写し方) */}
      <Panel title="この利用者について">
        <DefinitionList
          label="利用者の基本情報"
          columns={2}
          items={[
            { term: '氏名', description: user.name },
            { term: '在籍の状態', description: STATUS_LABELS[user.status] },
          ]}
        />
      </Panel>

      <Panel title="削減効果" description="この利用者の業務がどれだけ楽になったかを表示する予定の欄です。">
        <CardGrid columns="kpi">
          <KpiCard label="年間削減時間" value="—" unit="時間" />
        </CardGrid>
        <p style={{ marginBlockEnd: 0 }}>
          集計の仕組みがまだ用意できていないため、いまは数値を出せません。用意ができ次第ここに表示します。
        </p>
      </Panel>

      <Panel
        title="登録内容の変更"
        description="ロールは選択欄から変更し、部門と年収は値をクリックして書き換えます。"
        flush
      >
        <div style={{ padding: 'var(--hh-space-4)' }}>
          <Select
            label="ロール"
            value={user.role}
            options={ROLE_OPTIONS}
            onChange={(event) =>
              void patchUser('edit', { role: event.currentTarget.value as SessionRole }, 'ロールを更新しました。')
            }
          />
        </div>
        <InlineEditTable
          caption="ユーザー編集"
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          rowLabel={(row) => row.field}
          onCommit={handleCommit}
        />
        {/* 書き換えの結果は書き換えた表のすぐ下に出す。画面上端の帯に出すと、
            表を見ている利用者の視野の外で結果が告知されることになる */}
        <ActionResultAlert result={actionResult} scope="edit" />
      </Panel>

      {/* 生の <button> は見た目も押せる幅も画面ごとにばらつくため共通の Button へ寄せる */}
      <Panel title="在籍の切り替え">
        <Stack gap={3}>
          {user.status === 'active' ? (
            <div>
              <Button type="button" variant="secondary" onClick={() => setOffboardOpen(true)}>
                退職済みにする
              </Button>
              <ConfirmDialog
                open={offboardOpen}
                title="退職処理の確認"
                description={`${user.name} を退職済みに変更します。`}
                reversible={false}
                onConfirm={() => {
                  setOffboardOpen(false);
                  void patchUser('status', { status: 'inactive' }, '退職処理を行いました。');
                }}
                onCancel={() => setOffboardOpen(false)}
              />
            </div>
          ) : (
            <div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void patchUser('status', { status: 'active' }, '復職処理を行いました。')}
              >
                在籍中に戻す
              </Button>
            </div>
          )}
          <ActionResultAlert result={actionResult} scope="status" />
        </Stack>
      </Panel>
    </Stack>
  );
}
