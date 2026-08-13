/** データ表示とチャートの固定カタログ見本。 */
import {
  BarChart,
  DataTable,
  DonutChart,
  InlineEditTable,
  KpiCard,
  LineChart,
  MarkdownView,
  ScopeChip,
  Sparkline,
  Stack,
  StageBoard,
  StatusChip,
  Thumbnail,
} from '@harness-hub/ui';

import type { CatalogEntry } from './entries.js';

interface DemoRow {
  id: string;
  name: string;
  owner: string;
  status: string;
}

/** Thumbnail 見本の被写体。外部依存を作らないよう data URI の SVG に固定する。 */
const SAMPLE_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#3f3f46"/><circle cx="40" cy="40" r="20" fill="#f59e0b"/></svg>',
  );

const demoRows: readonly DemoRow[] = [
  { id: '1', name: '見積もり作成支援', owner: '営業部', status: '公開中' },
  { id: '2', name: '在庫確認ツール', owner: '物流部', status: '下書き' },
];

export const dataCatalogEntries: readonly CatalogEntry[] = [
  {
    name: 'DataTable',
    group: 'data',
    render: () => (
      <DataTable
        caption="配布状況"
        rowKey={(row: DemoRow) => row.id}
        rows={demoRows}
        columns={[
          {
            key: 'name',
            header: 'ツール名',
            value: (row: DemoRow) => row.name,
            sortable: true,
          },
          {
            key: 'owner',
            header: '管理者',
            value: (row: DemoRow) => row.owner,
          },
          {
            key: 'status',
            header: '公開状態',
            value: (row: DemoRow) => row.status,
          },
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
          {
            key: 'name',
            header: 'ツール名',
            value: (row: DemoRow) => row.name,
          },
          {
            key: 'owner',
            header: '管理者',
            value: (row: DemoRow) => row.owner,
            editable: true,
          },
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
          {
            stage: 'hearing',
            cards: [{ id: 'c1', title: 'ヒアリング実施', meta: '営業部' }],
          },
          {
            stage: 'build',
            cards: [{ id: 'c2', title: '画面の実装', meta: '開発部', risk: 'warn' }],
          },
        ]}
      />
    ),
  },
  {
    name: 'MarkdownView',
    group: 'data',
    render: () => <MarkdownView content={'## 見出し\n\n- 箇条書き 1\n- 箇条書き 2\n\n本文です。'} />,
  },
  {
    name: 'Thumbnail',
    group: 'data',
    // src はネットワークに出ない inline SVG にする。外部 URL を撮ると、
    // 相手側の都合で画素が変わり VRT が「たまに落ちる検査」に退化する。
    render: () => (
      <Stack gap={2} direction="horizontal">
        <Thumbnail src={SAMPLE_IMAGE} />
        <Thumbnail src={SAMPLE_IMAGE} size="block" width="compact" />
      </Stack>
    ),
  },
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
];
