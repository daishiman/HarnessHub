/**
 * 共通シェルとオーバーレイのカタログ見本。
 *
 * entries.tsx が 500 行を超えて責務の境界が見えにくくなったため、画面を包む部品と
 * 画面へ重なる部品をここへ分離する。固定値だけで描画し、VRT の画像を決定論的に保つ。
 */
import type { ShellNavItem } from '@harness-hub/ui';
import {
  BottomSheet,
  Button,
  ConfirmDialog,
  MobileTabBar,
  Modal,
  ShellFooter,
  ShellHeader,
  ShellSidebar,
  WorkspaceSwitcher,
} from '@harness-hub/ui';

import type { CatalogEntry } from './entries.js';

/** シェル系部品が共有する導線の見本。実際の並び (利用頻度順) に合わせてある。 */
const shellNavItems = [
  { href: '/sheets', label: 'ヒアリングシート', icon: 'sheet' },
  { href: '/catalog', label: '業務ツール', icon: 'harness' },
  { href: '/docs', label: 'ドキュメント', icon: 'docs' },
  { href: '/feedback', label: '改善要望', icon: 'feedback', badgeCount: 3 },
  { href: '/users', label: 'ユーザー管理', icon: 'users' },
] as const satisfies readonly ShellNavItem[];

export const shellCatalogEntries: readonly CatalogEntry[] = [
  {
    name: 'ShellSidebar',
    group: 'navigation',
    render: () => (
      <div className="hh-catalog-sidebar-preview">
        <ShellSidebar
          label="主要ナビゲーション"
          currentHref="/sheets"
          brand={<strong>Harness Hub</strong>}
          items={shellNavItems}
        />
      </div>
    ),
  },
  {
    name: 'WorkspaceSwitcher',
    group: 'navigation',
    // 切替 UI は「候補が 2 件以上あるとき」しか現れないため、見本もその状態を写す。
    // 1 件以下の見え方 (現在値の表示だけ) は ShellHeader 側の見本が兼ねている。
    render: () => (
      <WorkspaceSwitcher
        label="ワークスペース"
        currentName="営業ワークスペース"
        switchLabel="ワークスペースを切り替える"
        options={[
          { href: '/w/sales', label: '営業ワークスペース', current: true },
          { href: '/w/cs', label: 'カスタマーサクセス', current: false },
        ]}
      />
    ),
  },
  {
    name: 'ShellHeader',
    group: 'navigation',
    render: () => (
      <ShellHeader
        workspaceName="営業ワークスペース"
        workspaceLabel="ワークスペース"
        screenTitle="ヒアリングシート"
        searchAction="/sheets"
        searchLabel="ヒアリングシートを検索"
        searchPlaceholder="シートのタイトル・コードで探す"
        notificationsHref="/settings/account"
        notificationsLabel="通知設定"
        unreadCount={2}
        unreadLabel="未読"
        accountName="山田 太郎"
        accountRoleLabel="ワークスペース管理者"
        accountMenuLabel="アカウントメニュー"
        accountLinks={[{ href: '/settings/account', label: 'アカウント設定' }]}
        signOutHref="/api/auth/signout"
        signOutLabel="サインアウト"
      />
    ),
  },
  {
    name: 'ShellFooter',
    group: 'navigation',
    render: () => (
      <ShellFooter label="フッター情報" links={[{ href: '/legal', label: '利用規約・プライバシーポリシー' }]} />
    ),
  },
  {
    name: 'MobileTabBar',
    group: 'navigation',
    render: () => (
      <div className="hh-catalog-tabbar-preview">
        <MobileTabBar
          label="画面切替"
          moreLabel="その他"
          currentHref="/sheets"
          items={shellNavItems.slice(0, 4)}
          moreItems={shellNavItems.slice(4)}
        />
      </div>
    ),
  },
  // 画面全体に覆いかぶさる部品は専用 group へ隔離する。同じページに置くと
  // 他の部品の見本を覆い隠し、その部品の基準画像が「隠れた状態」で固定されてしまう。
  {
    name: 'Modal',
    group: 'overlay',
    render: () => (
      <Modal
        open
        title="公開設定を変更"
        description="変更は保存するまで反映されません。"
        footer={<Button>保存する</Button>}
        onClose={() => undefined}
      >
        <p>本文が入る。</p>
      </Modal>
    ),
  },
  {
    name: 'BottomSheet',
    group: 'overlay',
    render: () => (
      <BottomSheet open title="その他" onClose={() => undefined}>
        <p>画面下から迫り上がる面。狭い画面での追加操作をここへ寄せる。</p>
      </BottomSheet>
    ),
  },
  {
    name: 'ConfirmDialog',
    group: 'overlay',
    render: () => (
      <ConfirmDialog
        open
        title="公開を取り消しますか？"
        description="利用者からは見えなくなります。"
        reversible
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />
    ),
  },
];
