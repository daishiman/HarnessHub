// @vitest-environment jsdom
// P04 テストスタブ (SYS-USER-ORG-ADMIN-P04)
// UOA-A11Y-*: S17/S18 の axe a11y ゼロ違反 (acceptance 3 / quality_constraint axe-a11y-zero)。
//
// P05 の実画面はまだ存在しない。AD-2 は「docs/shared-layers.md §1 表に本 feature (user-org-admin) が
// 明記されている部品のみ消費する」と決めており、消費する部品一覧 (KPI カード/テーブル/一覧部品/
// インライン編集テーブル/状態チップ/確認ダイアログ) はすでに確定している。
// feat-hearing-intake の HI-A11Y-* と同じ考え方で、**AD-2 が指定した部品を AD-2 が指定した構成で
// 組んだ DOM** をここで先に検査する。ここで違反が出るなら P05 の画面も必ず違反する
// (部品単体の検査は packages/ui の HF-QA-A11Y-001 が担うので、ここでは重複させず「組み合わせ」を見る)。
//
// salary の非表示は「表示を消す」ではなく「DOM に一切出さない」設計 (AD-5) なので、
// S17 一覧の列定義に salary を含めていないこと自体もここで確認する。

import {
  ConfirmDialog,
  DataTable,
  type DataTableColumn,
  InlineEditTable,
  KpiCard,
  Select,
  TextInput,
  UiProvider,
} from '@harness-hub/ui';
import axe from 'axe-core';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AccountSettings } from '../../src/app/(dashboard)/settings/account/account-settings.js';
import { computeEditableRows, UserDashboard } from '../../src/app/(dashboard)/users/[id]/user-dashboard.js';
import { UserList } from '../../src/app/(dashboard)/users/user-list.js';

function mountScreen(node: ReactNode, title: string): void {
  const html = renderToStaticMarkup(
    <html lang="ja">
      <body>
        <main>
          <UiProvider>{node}</UiProvider>
        </main>
      </body>
    </html>,
  );
  const parsed = new DOMParser().parseFromString(`<!DOCTYPE html>${html}`, 'text/html');
  const titleEl = parsed.createElement('title');
  titleEl.textContent = title;
  parsed.head.appendChild(titleEl);
  document.replaceChild(document.importNode(parsed.documentElement, true), document.documentElement);
}

async function violationsOf(): Promise<readonly string[]> {
  const results = await axe.run(document, { resultTypes: ['violations'] });
  return results.violations.map((violation) => `${violation.id} (${violation.impact ?? 'n/a'}): ${violation.help}`);
}

// ---------------------------------------------------------------------------
// S17: ユーザー管理一覧 (AD-2 §画面構成: name/department/role/status。salary 列は非表示)
// ---------------------------------------------------------------------------

interface UserListRow {
  id: string;
  name: string;
  department: string;
  role: string;
  status: string;
}

const USER_LIST_COLUMNS: readonly DataTableColumn<UserListRow>[] = [
  { key: 'name', header: '氏名', sortable: true, value: (row) => row.name },
  { key: 'department', header: '部門', sortable: true, value: (row) => row.department },
  { key: 'role', header: 'ロール', sortable: true, value: (row) => row.role },
  { key: 'status', header: '状態', sortable: true, value: (row) => row.status },
];

const SAMPLE_USERS: readonly UserListRow[] = [
  { id: 'u-1', name: '山田太郎', department: '営業', role: 'workspace-admin', status: 'active' },
  { id: 'u-2', name: '佐藤花子', department: '開発', role: 'member', status: 'active' },
];

// ---------------------------------------------------------------------------
// S17: 個別ダッシュボード (KPI カード + role 選択 + department インライン編集)
// ---------------------------------------------------------------------------

interface EditableUserRow {
  id: string;
  field: string;
  value: string;
}

const DASHBOARD_ROWS: readonly EditableUserRow[] = [{ id: 'department', field: '部門', value: '営業' }];

// ---------------------------------------------------------------------------
// S18: アカウント設定 (プロフィール + 表示設定)
// ---------------------------------------------------------------------------

describe('契約: S17 ユーザー管理一覧の axe 違反 0 件 (salary 列を含まない構成)', () => {
  it('UOA-A11Y-001: DataTable (name/department/role/status) が axe 違反 0 件で描画される', async () => {
    mountScreen(
      <DataTable caption="ユーザー一覧" columns={USER_LIST_COLUMNS} rows={SAMPLE_USERS} rowKey={(row) => row.id} />,
      'ユーザー管理',
    );
    expect(await violationsOf()).toStrictEqual([]);
  });

  it('UOA-A11Y-002: 列定義に salary が含まれない (DOM 非存在。マスクではなく列自体を作らない設計)', () => {
    mountScreen(
      <DataTable caption="ユーザー一覧" columns={USER_LIST_COLUMNS} rows={SAMPLE_USERS} rowKey={(row) => row.id} />,
      'ユーザー管理',
    );
    expect(USER_LIST_COLUMNS.some((column) => column.key === 'salary')).toBe(false);
    expect(document.body.textContent).not.toMatch(/salary|年収/);
  });
});

describe('契約: S17 個別ダッシュボードの axe 違反 0 件 (KpiCard + InlineEditTable)', () => {
  it('UOA-A11Y-003: KpiCard (削減効果 rollup 表示) が axe 違反 0 件で描画される', async () => {
    mountScreen(
      <KpiCard label="年間削減時間" value="120" unit="時間" delta={{ text: '前期比 +12時間', trend: 'up' }} />,
      '個別ダッシュボード',
    );
    expect(await violationsOf()).toStrictEqual([]);
  });

  it('UOA-A11Y-004: 日本語ラベルの role 選択と department 編集が axe 違反 0 件で描画される', async () => {
    mountScreen(
      <>
        <Select
          label="ロール"
          value="workspace-admin"
          options={[
            { value: 'member', label: 'メンバー' },
            { value: 'workspace-admin', label: 'ワークスペース管理者' },
            { value: 'provider-admin', label: 'プロバイダー管理者' },
          ]}
          onChange={() => {}}
        />
        <InlineEditTable
          caption="ユーザー編集"
          columns={[{ key: 'value', header: '値', value: (row: EditableUserRow) => row.value, editable: true }]}
          rows={DASHBOARD_ROWS}
          rowKey={(row) => row.id}
          rowLabel={(row) => row.field}
          onCommit={() => {}}
        />
      </>,
      '個別ダッシュボード',
    );
    expect(await violationsOf()).toStrictEqual([]);
  });

  it('UOA-A11Y-005: 破壊的操作 (退職処理) の ConfirmDialog が axe 違反 0 件で描画され、可逆性が明示される', async () => {
    mountScreen(
      <ConfirmDialog
        open
        title="退職処理の確認"
        description="このユーザーを退職済みに変更します。"
        reversible={false}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
      '個別ダッシュボード',
    );
    expect(await violationsOf()).toStrictEqual([]);
  });
});

describe('契約: S18 アカウント設定の axe 違反 0 件', () => {
  it('UOA-A11Y-006: プロフィール (TextInput) + 表示設定 (Select) の組み合わせが axe 違反 0 件で描画される', async () => {
    mountScreen(
      <form>
        <TextInput label="表示名" name="displayName" type="text" required defaultValue="山田太郎" />
        <Select
          label="言語"
          name="language"
          options={[
            { value: 'ja', label: '日本語' },
            { value: 'en', label: 'English' },
          ]}
        />
      </form>,
      'アカウント設定',
    );
    expect(await violationsOf()).toStrictEqual([]);
  });
});

describe('Goodhart 対策: 検出器が実際に機能していることの生存確認', () => {
  it('UOA-A11Y-007: mountScreen は空 DOM を作らない (何も描画しないことで違反 0 件になる退化を防ぐ)', () => {
    mountScreen(
      <DataTable caption="ユーザー一覧" columns={USER_LIST_COLUMNS} rows={SAMPLE_USERS} rowKey={(row) => row.id} />,
      'ユーザー管理',
    );
    expect(document.body.textContent?.trim().length ?? 0).toBeGreaterThan(0);
  });

  it('UOA-A11Y-008: label の無い入力欄を混入させると axe が実際に違反を検出する (検出器の生存確認)', async () => {
    mountScreen(
      <form>
        {/* 意図的にラベル無しの input を混ぜる。TextInput/FormField を経由しない生 input なので違反が出るはず */}
        <input type="text" />
      </form>,
      '検出器の生存確認',
    );
    const violations = await violationsOf();
    expect(violations.length).toBeGreaterThan(0);
  });
});

const SAMPLE_USER_DETAIL = {
  id: 'u-1',
  name: '山田太郎',
  department: '営業',
  role: 'workspace-admin' as const,
  status: 'active' as const,
  salary: 6_000_000,
  last_login_at: null,
  email: 'yamada@example.com',
};

describe('P05 実装後の受入契約: S17 一覧の実コンポーネント', () => {
  it('UOA-A11Y-101: 実画面 users/page.tsx (S17一覧) の axe 違反 0 件 (実データ取得込み)', async () => {
    mountScreen(<UserList tenantId="tenant-a" />, 'ユーザー管理');
    expect(await violationsOf()).toStrictEqual([]);
    expect(document.querySelector('table')).not.toBeNull();
    // salary は AD-5 により列自体を作らない設計。実コンポーネントでも DOM に出ないことを固定する
    expect(document.body.textContent).not.toMatch(/salary|年収/);
  });
});

describe('P05 実装後の受入契約: S17 個別ダッシュボードの実コンポーネント', () => {
  it('UOA-A11Y-102a: 初期状態 (fetch 未解決) の axe 違反 0 件', async () => {
    mountScreen(<UserDashboard userId="u-1" tenantId="tenant-a" />, '個別ダッシュボード');
    expect(await violationsOf()).toStrictEqual([]);
    expect(document.body.textContent).toContain('読み込み中');
  });

  it('UOA-A11Y-102b: computeEditableRows は role を自由入力にせず、admin viewer のときだけ salary 行を含む', () => {
    const adminRows = computeEditableRows(SAMPLE_USER_DETAIL, 'workspace-admin');
    expect(adminRows.map((row) => row.id)).toEqual(['department', 'salary']);

    const memberRows = computeEditableRows(SAMPLE_USER_DETAIL, 'member');
    expect(memberRows.map((row) => row.id)).toEqual(['department']);

    const noViewerRows = computeEditableRows(SAMPLE_USER_DETAIL, null);
    expect(noViewerRows.map((row) => row.id)).toEqual(['department']);
  });

  it('UOA-A11Y-102c: role 選択 + InlineEditTable + KpiCard + ConfirmDialog の組み合わせに axe 違反が無い', async () => {
    mountScreen(
      <>
        <KpiCard label="年間削減時間" value="—" unit="時間" />
        <Select
          label="ロール"
          value="workspace-admin"
          options={[
            { value: 'member', label: 'メンバー' },
            { value: 'workspace-admin', label: 'ワークスペース管理者' },
            { value: 'provider-admin', label: 'プロバイダー管理者' },
          ]}
          onChange={() => {}}
        />
        <InlineEditTable
          caption="ユーザー編集"
          columns={[
            { key: 'value', header: '値', value: (row: { id: string; value: string }) => row.value, editable: true },
          ]}
          rows={computeEditableRows(SAMPLE_USER_DETAIL, 'workspace-admin').map((row) => ({
            id: row.id,
            value: row.value,
          }))}
          rowKey={(row) => row.id}
          rowLabel={() => 'フィールド'}
          onCommit={() => {}}
        />
        <ConfirmDialog
          open
          title="退職処理の確認"
          description="対象ユーザーを退職済みに変更します。"
          reversible={false}
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      </>,
      '個別ダッシュボード',
    );
    expect(await violationsOf()).toStrictEqual([]);
  });
});

describe('P05 実装後の受入契約: S18 アカウント設定の実コンポーネント', () => {
  it('UOA-A11Y-103: 実画面 settings/account/page.tsx (S18) の axe 違反 0 件 (初期 loading 状態)', async () => {
    mountScreen(<AccountSettings tenantId="tenant-a" />, 'アカウント設定');
    expect(await violationsOf()).toStrictEqual([]);
    expect(document.body.textContent).toContain('読み込み中');
  });
});

describe('P05 受入層への引き継ぎ (実画面が実装対象のため it.todo)', () => {
  it.todo('UOA-A11Y-104: role 別 (member/owner/workspace-admin/provider-admin) の画面差分が axe 違反を生まないこと');
});
