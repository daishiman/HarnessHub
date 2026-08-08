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
  Alert,
  AppShell,
  BarChart,
  Button,
  Card,
  ConfirmDialog,
  Container,
  DataTable,
  DegradedBanner,
  DonutChart,
  EmptyState,
  ErrorState,
  FormField,
  InlineEditTable,
  KpiCard,
  LineChart,
  MarkdownEditor,
  MarkdownView,
  NavList,
  PageHeader,
  ProgressBar,
  ScopeChip,
  Select,
  SidebarLayout,
  Skeleton,
  Sparkline,
  Stack,
  StageBoard,
  StatusChip,
  StepWizard,
  Tabs,
  Textarea,
  TextInput,
  ToastProvider,
  UiProvider,
} from '@harness-hub/ui';
import type { ReactNode } from 'react';

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

interface DemoRow {
  id: string;
  name: string;
  owner: string;
  status: string;
}

const demoRows: readonly DemoRow[] = [
  { id: '1', name: '見積もり作成支援', owner: '営業部', status: '公開中' },
  { id: '2', name: '在庫確認ツール', owner: '物流部', status: '下書き' },
];

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
  { name: 'ProgressBar', group: 'feedback', render: () => <ProgressBar label="生成の進捗" value={40} /> },
  { name: 'Skeleton', group: 'feedback', render: () => <Skeleton lines={3} /> },

  // --- data ---------------------------------------------------------------
  {
    name: 'DataTable',
    group: 'data',
    render: () => (
      <DataTable
        caption="配布状況"
        rowKey={(row: DemoRow) => row.id}
        rows={demoRows}
        columns={[
          { key: 'name', header: 'ツール名', value: (row: DemoRow) => row.name, sortable: true },
          { key: 'owner', header: '管理者', value: (row: DemoRow) => row.owner },
          { key: 'status', header: '公開状態', value: (row: DemoRow) => row.status },
        ]}
      />
    ),
  },
  {
    name: 'InlineEditTable',
    group: 'data',
    render: () => (
      <InlineEditTable
        caption="係数"
        rows={demoRows}
        rowKey={(row: DemoRow) => row.id}
        rowLabel={(row: DemoRow) => row.name}
        onCommit={() => undefined}
        columns={[
          { key: 'name', header: 'ツール名', value: (row: DemoRow) => row.name },
          { key: 'owner', header: '管理者', value: (row: DemoRow) => row.owner, editable: true },
        ]}
      />
    ),
  },
  {
    name: 'StatusChip',
    group: 'data',
    render: () => (
      <Stack gap={2} direction="horizontal">
        <StatusChip domain="publish" status="published" />
        <StatusChip domain="publish" status="needs_fix" />
        <StatusChip domain="feedback" status="open" />
      </Stack>
    ),
  },
  {
    name: 'ScopeChip',
    group: 'data',
    render: () => (
      <Stack gap={2} direction="horizontal">
        <ScopeChip scope="tenant" name="株式会社サンプル" />
        <ScopeChip scope="project" name="見積もりツール" />
      </Stack>
    ),
  },
  {
    name: 'StageBoard',
    group: 'data',
    render: () => (
      <StageBoard
        label="構築の進み具合"
        columns={[
          { stage: 'hearing', cards: [{ id: 'c1', title: 'ヒアリング実施', meta: '営業部' }] },
          { stage: 'build', cards: [{ id: 'c2', title: '画面の実装', meta: '開発部', risk: 'warn' }] },
        ]}
      />
    ),
  },
  {
    name: 'MarkdownView',
    group: 'data',
    render: () => <MarkdownView content={'## 見出し\n\n- 箇条書き 1\n- 箇条書き 2\n\n本文です。'} />,
  },

  // --- chart --------------------------------------------------------------
  {
    name: 'KpiCard',
    group: 'chart',
    render: () => (
      <KpiCard
        label="公開中のツール"
        value="128"
        unit="件"
        delta={{ text: '+12', trend: 'up' }}
        trendValues={[3, 5, 4, 8, 7, 10]}
      />
    ),
  },
  {
    name: 'BarChart',
    group: 'chart',
    render: () => (
      <BarChart
        title="部署別の利用数"
        data={[
          { label: '営業', value: 42 },
          { label: '物流', value: 28 },
          { label: '総務', value: 15 },
        ]}
      />
    ),
  },
  {
    name: 'LineChart',
    group: 'chart',
    render: () => (
      <LineChart
        title="週次の公開数"
        series={[
          {
            name: '公開',
            points: [
              { label: '第1週', value: 4 },
              { label: '第2週', value: 7 },
              { label: '第3週', value: 5 },
            ],
          },
        ]}
      />
    ),
  },
  {
    name: 'DonutChart',
    group: 'chart',
    render: () => (
      <DonutChart
        title="公開状態の内訳"
        data={[
          { label: '公開中', value: 60 },
          { label: '下書き', value: 25 },
          { label: '却下', value: 15 },
        ]}
      />
    ),
  },
  {
    name: 'Sparkline',
    group: 'chart',
    render: () => <Sparkline label="直近の推移" values={[2, 4, 3, 6, 5, 9]} />,
  },

  // --- overlay ------------------------------------------------------------
  // 画面全体に覆いかぶさる部品は専用 group へ隔離する。同じページに置くと
  // 他の部品の見本を覆い隠し、その部品の基準画像が「隠れた状態」で固定されてしまう。
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
