/**
 * コンポーネントカタログ (HarnessHub-xaa3)。
 *
 * `@harness-hub/ui` の公開部品を 1 つ 1 つ実際に描画した見本を並べる。目的は 2 つある。
 *
 *  1. 視覚回帰 (VRT) の被写体を作る
 *     a11y (axe) と性能 (First Load JS 予算) は fail-closed で守られているのに、
 *     「見た目が崩れた」だけは検査経路が無く、CI が緑のまま壊れた画面が出せてしまう。
 *  2. 公開部品の見落としを検出する
 *     部品を足したのにカタログへ載せ忘れると、その部品だけ VRT の網から外れる。
 *     `catalog-coverage.test.ts` が `index.ts` と突き合わせて落とす。
 *
 * 設計上の約束: **entry の `name` は公開部品名そのもの**にし、1 部品 = 1 entry とする。
 * 「この entry は A と B を網羅している」という申告制にすると、実際には描いていない部品を
 * 網羅済みと書けてしまい、被覆率だけが緑になる。名前を鍵にすれば、載せた=描いた が一致する。
 */

import {
  ActionLink,
  Alert,
  AppShell,
  Button,
  buildShellCss,
  Card,
  Container,
  DegradedBanner,
  EmptyState,
  ErrorState,
  FormField,
  Icon,
  MarkdownEditor,
  NavList,
  PageHeader,
  Panel,
  ProgressBar,
  ScreenHeader,
  Select,
  SidebarLayout,
  Skeleton,
  Stack,
  StepWizard,
  Tabs,
  Textarea,
  TextInput,
  ToastProvider,
  UiProvider,
} from '@harness-hub/ui';
import type { ReactNode } from 'react';

import { dataCatalogEntries } from './entries-data.js';
import { shellCatalogEntries } from './entries-shell.js';

/** 見本を束ねる単位。VRT の 1 スクリーンショット = 1 group になる。 */
export type CatalogGroup = 'layout' | 'form' | 'feedback' | 'data' | 'chart' | 'navigation' | 'overlay';

export interface CatalogEntry {
  /** 公開部品名と完全一致させる (被覆検査の鍵)。 */
  name: string;
  group: CatalogGroup;
  /** 見本。props は「その部品が最も普通に使われる形」を選ぶ。 */
  render: () => ReactNode;
}

/**
 * 文脈を与える側に回るため単独の見本を持たない部品。
 * カタログ全体をこの 2 つで包んでいるので、描画自体は全 group で行われている。
 */
export const catalogWrappers = ['UiProvider', 'ToastProvider'] as const;

/**
 * 見本のデータは全て固定値にする。日付・乱数・件数の揺れが入ると、
 * 変更していないのに画素差分が出て、VRT が「たまに落ちる検査」に退化する。
 */
export const catalogEntries: readonly CatalogEntry[] = [
  // --- layout -------------------------------------------------------------
  {
    name: 'Container',
    group: 'layout',
    render: () => <Container size="narrow">最大幅を決める箱。行長が伸びすぎるのを防ぐ。</Container>,
  },
  {
    name: 'Stack',
    group: 'layout',
    render: () => (
      <Stack gap={3} direction="horizontal">
        <span>要素 A</span>
        <span>要素 B</span>
        <span>要素 C</span>
      </Stack>
    ),
  },
  {
    name: 'Card',
    group: 'layout',
    render: () => (
      <Card title="カードの見出し" description="補足説明" actions={<Button variant="ghost">操作</Button>}>
        本文が入る。
      </Card>
    ),
  },
  {
    name: 'PageHeader',
    group: 'layout',
    render: () => (
      <PageHeader title="画面の名前" description="この画面で何ができるかの説明。" actions={<Button>新規作成</Button>} />
    ),
  },
  {
    name: 'AppShell',
    group: 'layout',
    render: () => (
      <AppShell brand="Harness Hub" headerActions={<Button variant="secondary">アカウント</Button>}>
        本文領域。
      </AppShell>
    ),
  },
  {
    name: 'Panel',
    group: 'layout',
    render: () => (
      <Panel title="面の見出し" description="カード状の面。画面の中で情報のかたまりを区切る。">
        本文が入る。
      </Panel>
    ),
  },
  {
    name: 'ScreenHeader',
    group: 'layout',
    render: () => (
      <ScreenHeader
        title="ヒアリングシート詳細"
        description="この画面で何ができるかの説明。"
        breadcrumbs={[{ href: '/sheets', label: 'シート' }, { label: 'HS-0001' }]}
        breadcrumbsLabel="現在地"
        actions={<ActionLink href="/sheets/new">新規作成</ActionLink>}
      />
    ),
  },
  {
    name: 'Icon',
    group: 'layout',
    render: () => (
      <Stack gap={3} direction="horizontal">
        <Icon name="sheet" label="ヒアリングシート" />
        <Icon name="docs" label="ドキュメント" />
        <Icon name="feedback" label="改善要望" />
        <Icon name="settings" label="設定" />
      </Stack>
    ),
  },
  {
    name: 'SidebarLayout',
    group: 'layout',
    render: () => (
      <SidebarLayout nav={<NavList label="見本ナビ" currentHref="/a" items={[{ href: '/a', label: '一覧' }]} />}>
        本文列。
      </SidebarLayout>
    ),
  },

  // --- navigation ---------------------------------------------------------
  {
    name: 'NavList',
    group: 'navigation',
    render: () => (
      <NavList
        label="主要ナビゲーション"
        currentHref="/catalog"
        items={[
          { href: '/catalog', label: '業務ツール' },
          { href: '/docs', label: 'ドキュメント' },
          { href: '/feedback', label: 'フィードバック' },
        ]}
      />
    ),
  },
  {
    name: 'Tabs',
    group: 'navigation',
    render: () => (
      <Tabs
        label="公開状態"
        defaultActiveId="all"
        items={[
          { id: 'all', label: 'すべて', content: <p>すべての件数。</p> },
          { id: 'draft', label: '下書き', content: <p>下書きの件数。</p> },
        ]}
      />
    ),
  },
  {
    name: 'StepWizard',
    group: 'navigation',
    render: () => (
      <StepWizard
        label="公開手続き"
        defaultActiveIndex={0}
        steps={[
          { id: 'input', title: '入力', content: <p>内容を入力します。</p> },
          { id: 'confirm', title: '確認', content: <p>内容を確認します。</p> },
        ]}
      />
    ),
  },

  // --- form ---------------------------------------------------------------
  {
    name: 'Button',
    group: 'form',
    render: () => (
      <Stack gap={2} direction="horizontal">
        <Button>主要</Button>
        <Button variant="secondary">副次</Button>
        <Button variant="danger">破壊的</Button>
        <Button variant="ghost">控えめ</Button>
        <Button loading>処理中</Button>
      </Stack>
    ),
  },
  {
    name: 'TextInput',
    group: 'form',
    render: () => <TextInput label="ツール名" description="30 文字まで" defaultValue="見積もり作成支援" required />,
  },
  {
    name: 'Textarea',
    group: 'form',
    render: () => <Textarea label="説明" defaultValue="どんなツールかを書きます。" rows={3} />,
  },
  {
    name: 'ActionLink',
    group: 'form',
    render: () => (
      <Stack gap={2} direction="horizontal">
        <ActionLink href="/sheets/new">新規作成</ActionLink>
        <ActionLink href="/sheets" variant="secondary">
          一覧へ戻る
        </ActionLink>
      </Stack>
    ),
  },
  {
    name: 'Select',
    group: 'form',
    render: () => (
      <Select
        label="公開範囲"
        placeholder="選択してください"
        options={[
          { value: 'tenant', label: 'テナント全体' },
          { value: 'workspace', label: 'ワークスペース' },
        ]}
      />
    ),
  },
  {
    name: 'FormField',
    group: 'form',
    render: () => (
      // エラー表示の見え方まで基準に含める (崩れやすいのは正常時ではなく異常時の表示)
      <FormField label="担当者" error="担当者を選んでください。" required>
        {(control) => <input type="text" id={control.id} aria-invalid={control['aria-invalid']} />}
      </FormField>
    ),
  },
  {
    name: 'MarkdownEditor',
    group: 'form',
    render: () => (
      <MarkdownEditor label="本文" value={'## 見出し\n\n本文です。'} onValueChange={() => undefined} rows={4} />
    ),
  },

  // --- feedback -----------------------------------------------------------
  {
    name: 'Alert',
    group: 'feedback',
    render: () => (
      <Stack gap={3}>
        <Alert tone="info" title="お知らせ" description="内容の説明。" />
        <Alert tone="warning" title="注意" description="確認が必要です。" />
        <Alert tone="danger" title="失敗" description="保存できませんでした。" />
      </Stack>
    ),
  },
  { name: 'ErrorState', group: 'feedback', render: () => <ErrorState /> },
  {
    name: 'EmptyState',
    group: 'feedback',
    render: () => <EmptyState description="まだ 1 件もありません。" action={<Button>作成する</Button>} />,
  },
  {
    name: 'DegradedBanner',
    group: 'feedback',
    render: () => <DegradedBanner description="一部の情報が古い可能性があります。" />,
  },
  {
    name: 'ProgressBar',
    group: 'feedback',
    render: () => <ProgressBar label="生成の進捗" value={40} />,
  },
  { name: 'Skeleton', group: 'feedback', render: () => <Skeleton lines={3} /> },

  ...dataCatalogEntries,
  ...shellCatalogEntries,
];

/** VRT が回す単位。entry の group から導出するので、group を足せば自動で対象が増える。 */
export const catalogGroups: readonly CatalogGroup[] = [...new Set(catalogEntries.map((entry) => entry.group))];

/**
 * 1 group ぶんのページ。見出しに部品名を出すのは、差分画像を見たときに
 * 「どの部品が変わったのか」を画像だけで特定できるようにするため。
 */
export function renderCatalogGroup(group: CatalogGroup): ReactNode {
  return (
    <UiProvider>
      <ToastProvider>
        {group === 'navigation' ? <style>{catalogShellPreviewCss}</style> : null}
        <Container size="standard">
          <Stack gap={6}>
            <PageHeader title={`コンポーネントカタログ: ${group}`} />
            {catalogEntries
              .filter((entry) => entry.group === group)
              .map((entry) => (
                <Card key={entry.name} title={entry.name}>
                  {entry.render()}
                </Card>
              ))}
          </Stack>
        </Container>
      </ToastProvider>
    </UiProvider>
  );
}

/**
 * shell 部品は本番では HubShell が `buildShellCss()` を 1 度だけ注入する。
 * カタログも同じ CSS を使い、Card の中では desktop sidebar と mobile tabbar の
 * 両方が見えるよう、preview の外枠だけを局所的に固定する。
 */
const catalogShellPreviewCss = `${buildShellCss()}
.hh-catalog-sidebar-preview .hh-shell__sidebar {
  display: block;
  position: relative;
  width: 220px;
  height: auto;
}
.hh-catalog-sidebar-preview .hh-shell__nav-label {
  display: inline;
}
.hh-catalog-sidebar-preview .hh-shell__nav-link {
  justify-content: flex-start;
}
.hh-catalog-tabbar-preview {
  position: relative;
  min-height: 72px;
}
.hh-catalog-tabbar-preview .hh-shell__tabbar {
  position: absolute;
  display: grid;
  inset-inline: 0;
  inset-block-end: 0;
}
`;
