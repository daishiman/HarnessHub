/** HF-QA-A11Y-001: packages/ui の部品単体に対する axe 検査。違反 0 件をリリース条件とする (qa-018)。 */
import { render } from '@testing-library/react';
import axe, { type Result } from 'axe-core';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import {
  Alert,
  BarChart,
  Button,
  ConfirmDialog,
  DataTable,
  DegradedBanner,
  DonutChart,
  EmptyState,
  ErrorState,
  InlineEditTable,
  KpiCard,
  LineChart,
  MarkdownEditor,
  MarkdownView,
  ProgressBar,
  ScopeChip,
  Select,
  Skeleton,
  Sparkline,
  StageBoard,
  StatusChip,
  StepWizard,
  Tabs,
  TextInput,
  Textarea,
  ToastProvider,
  UiProvider,
} from '../index.js';

/**
 * 部品を landmark の内側に置いて検査する。
 * `main` で包むのは画面結合時の配置を模すためで、部品単体の違反を隠すものではない
 * (画面結合の検査は apps/hub 側の HF-QA-A11Y-002 が担う)。
 */
function renderForAxe(node: ReactNode): HTMLElement {
  const { container } = render(
    <UiProvider>
      <ToastProvider>
        <main>{node}</main>
      </ToastProvider>
    </UiProvider>,
  );
  return container;
}

/** 違反があれば rule id と対象 HTML を出して落とす。 */
async function collectViolations(container: HTMLElement): Promise<string[]> {
  const results = await axe.run(container, { resultTypes: ['violations'] });
  return results.violations.map(
    (violation: Result) =>
      `${violation.id}: ${violation.nodes.map((node) => node.html).join(' | ')}`,
  );
}

const rows = [
  { id: 'a', name: '経費精算', count: 12 },
  { id: 'b', name: '請求書チェック', count: 3 },
];

const chartSeries = [
  { name: '開発部', points: [{ label: '1週', value: 4 }, { label: '2週', value: 9 }] },
];

const scenarios: Array<[string, ReactNode]> = [
  ['Button', <Button variant="primary">公開する</Button>],
  [
    'TextInput',
    <TextInput label="プロジェクト名" description="30 文字以内" required defaultValue="経費精算" />,
  ],
  ['TextInput (エラー時)', <TextInput label="メール" error="形式が正しくありません" />],
  [
    'Select',
    <Select
      label="公開範囲"
      placeholder="選択してください"
      options={[
        { value: 'workspace', label: 'ワークスペース内' },
        { value: 'tenant', label: 'テナント全体' },
      ]}
    />,
  ],
  ['Textarea', <Textarea label="説明" description="Markdown が使えます" />],
  [
    'DataTable',
    <DataTable
      caption="ハーネス一覧"
      columns={[
        { key: 'name', header: '名前', value: (row: (typeof rows)[number]) => row.name, sortable: true },
        { key: 'count', header: '導入数', value: (row: (typeof rows)[number]) => row.count },
      ]}
      rows={rows}
      rowKey={(row) => row.id}
      defaultSort={{ columnKey: 'name', direction: 'ascending' }}
    />,
  ],
  [
    'DataTable (読み込み中)',
    <DataTable
      caption="読み込み中の一覧"
      columns={[{ key: 'name', header: '名前', value: (row: (typeof rows)[number]) => row.name }]}
      rows={[]}
      rowKey={(row) => row.id}
      loading
    />,
  ],
  [
    'InlineEditTable',
    <InlineEditTable
      caption="ユーザー一覧"
      columns={[
        { key: 'name', header: '名前', value: (row: (typeof rows)[number]) => row.name, editable: true },
        { key: 'count', header: '件数', value: (row: (typeof rows)[number]) => String(row.count) },
      ]}
      rows={rows}
      rowKey={(row) => row.id}
      rowLabel={(row) => row.name}
      onCommit={() => undefined}
    />,
  ],
  ['ProgressBar', <ProgressBar label="公開処理の進捗" value={60} />],
  ['ProgressBar (不確定)', <ProgressBar label="検査中" />],
  ['Skeleton', <Skeleton lines={3} />],
  ['StatusChip', <StatusChip domain="publish" status="approval_pending" />],
  ['ScopeChip', <ScopeChip scope="workspace" name="開発部" />],
  [
    'ConfirmDialog',
    <ConfirmDialog
      open
      title="リリースを停止しますか"
      description="停止すると新規の導入ができなくなります。"
      reversible={false}
      onConfirm={() => undefined}
      onCancel={() => undefined}
    />,
  ],
  ['Alert', <Alert tone="success" title="公開しました" description="一覧に反映されています。" />],
  ['ErrorState', <ErrorState />],
  ['EmptyState', <EmptyState action={<Button>作成する</Button>} />],
  ['DegradedBanner', <DegradedBanner />],
  [
    'Tabs',
    <Tabs
      label="ハーネス詳細"
      items={[
        { id: 'overview', label: '概要', content: <p>概要</p> },
        { id: 'releases', label: 'リリース', content: <p>リリース</p> },
      ]}
    />,
  ],
  [
    'StepWizard',
    <StepWizard
      label="公開ウィザード"
      steps={[
        { id: 'basic', title: '基本情報', content: <TextInput label="名前" /> },
        { id: 'confirm', title: '確認', content: <p>内容を確認してください。</p> },
      ]}
    />,
  ],
  [
    'StageBoard',
    <StageBoard
      label="構築パイプライン"
      columns={[
        { stage: 'hearing', cards: [{ id: 'c1', title: '経費精算の自動化', meta: '担当: 佐藤', risk: 'warn' }] },
        { stage: 'design', cards: [] },
      ]}
      onMoveCard={() => undefined}
    />,
  ],
  [
    'MarkdownView',
    <MarkdownView
      content={'# 手順\n\n1. 準備する\n2. 実行する\n\n[詳細](https://example.com)'}
    />,
  ],
  ['MarkdownEditor', <MarkdownEditor label="本文" value="# 見出し" onValueChange={() => undefined} />],
  ['KpiCard', <KpiCard label="今月の削減時間" value="128" unit="時間" trendValues={[1, 4, 3]} />],
  ['LineChart', <LineChart title="週次の削減時間" series={chartSeries} />],
  ['BarChart', <BarChart title="部門別の削減時間" data={[{ label: '経理', value: 12 }]} />],
  ['DonutChart', <DonutChart title="状態の内訳" data={[{ label: '完了', value: 3 }]} />],
  ['Sparkline', <Sparkline label="直近 7 日の推移" values={[1, 3, 2]} />],
];

describe('HF-QA-A11Y-001: 部品単体の axe 違反が 0 件', () => {
  it.each(scenarios)('%s', async (_name, node) => {
    const violations = await collectViolations(renderForAxe(node));
    expect(violations).toEqual([]);
  });

  it('部品を組み合わせた画面片でも違反 0 件', async () => {
    const violations = await collectViolations(
      renderForAxe(
        <>
          <h1>ハーネス一覧</h1>
          <DegradedBanner />
          <KpiCard label="導入数" value="42" />
          <TextInput label="検索" hideLabel placeholder="キーワード" />
          <DataTable
            caption="ハーネス一覧"
            columns={[
              {
                key: 'name',
                header: '名前',
                value: (row: (typeof rows)[number]) => row.name,
                sortable: true,
              },
              {
                key: 'status',
                header: '状態',
                render: () => <StatusChip domain="release" status="available" />,
              },
            ]}
            rows={rows}
            rowKey={(row) => row.id}
          />
          <Button variant="primary">プラグインを公開</Button>
        </>,
      ),
    );

    expect(violations).toEqual([]);
  });
});
