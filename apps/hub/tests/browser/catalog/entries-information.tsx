/**
 * 情報表示部品のカタログ見本。
 *
 * 「表・カード・定義リストのどれで出すか」を画面ごとに書き起こしていた状態をやめ、
 * 共通部品へ寄せた (部品への写し方は docs/frontend-ui-foundation-spec.md §5-1)。
 * ここに並べることで、その 4 類型の見た目が VRT の網に入る。
 */
import {
  Badge,
  Button,
  CardGrid,
  CursorPager,
  DataCard,
  DefinitionList,
  FilterBar,
  IdBadge,
  LiveStatus,
  Select,
  StatusChip,
  StickyHeaderOffset,
  TagRow,
  TextInput,
} from '@harness-hub/ui';

import type { CatalogEntry } from './entries.js';

/** 見本のデータは固定値にする (日付・件数が揺れると画素差分が出て VRT が不安定になる)。 */
export const informationCatalogEntries: readonly CatalogEntry[] = [
  {
    name: 'DefinitionList',
    group: 'data',
    render: () => (
      <DefinitionList
        label="このシートについて"
        columns={2}
        items={[
          { term: '会社名', description: '株式会社ハーネス' },
          { term: '申請者', description: '山田 太郎' },
          { term: '月間工数', description: '24 時間' },
          { term: '対象人数', description: '3 人', hint: '試算にのみ使います。' },
        ]}
      />
    ),
  },
  {
    name: 'TagRow',
    group: 'data',
    render: () => (
      <TagRow label="状態とスコープ">
        <StatusChip domain="sheet" status="generating" />
      </TagRow>
    ),
  },
  {
    name: 'CardGrid',
    group: 'data',
    render: () => (
      <CardGrid columns="cards">
        <DataCard title="請求書の突合" meta={[{ term: '種別', description: 'Skill' }]} />
        <DataCard title="日報の要約" meta={[{ term: '種別', description: 'Web アプリ' }]} />
      </CardGrid>
    ),
  },
  {
    name: 'DataCard',
    group: 'data',
    render: () => (
      <DataCard
        title="FB-0001"
        href="/feedback/fb-0001"
        tags={
          <TagRow>
            <StatusChip domain="feedback" status="open" />
          </TagRow>
        }
        meta={[
          { term: '種別', description: '不具合報告' },
          { term: '優先度', description: '高' },
        ]}
      />
    ),
  },
  {
    name: 'FilterBar',
    group: 'form',
    render: () => (
      // 補足文言を持つ欄と持たない欄を混ぜてある。両者で入力欄とボタンの頭が揃っていることが、
      // この見本で確かめたい唯一のこと (揃わないと帯全体が波打つ)。
      <FilterBar
        label="一覧の絞り込み"
        showLabel
        onSubmit={(event) => event.preventDefault()}
        actions={<Button type="submit">絞り込む</Button>}
      >
        <Select
          label="状態"
          value="open"
          onChange={() => undefined}
          options={[
            { value: 'open', label: '未対応' },
            { value: 'resolved', label: '対応済み' },
          ]}
        />
        <TextInput label="キーワード" value="" onChange={() => undefined} description="名前と説明から探します。" />
      </FilterBar>
    ),
  },
  {
    name: 'Badge',
    group: 'data',
    // docs-cms のカテゴリ・タグ・状態表示など、短いラベルを添えるだけの汎用見本。
    render: () => (
      <p>
        <Badge tone="info">下書き</Badge> <Badge tone="primary">公開済み</Badge> <Badge>タグ</Badge>
      </p>
    ),
  },
  {
    name: 'IdBadge',
    group: 'data',
    // 名前 (読むもの) と識別子 (照合・貼り付けに使うもの) の見え方の差を並べて確かめる見本
    render: () => (
      <p>
        株式会社ハーネス <IdBadge value="01KYRGHY94VEZWJFXXZCSQKKAX" label="ワークスペース ID" />
      </p>
    ),
  },
  {
    name: 'StickyHeaderOffset',
    group: 'layout',
    // 描画物を持たない部品 (見出し帯の高さを CSS 変数へ書き出すだけ)。
    // 見た目が無いので VRT で見るものは無いが、公開部品として被覆に載せるために置く。
    render: () => (
      <>
        <StickyHeaderOffset />
        <p>見た目を持たない部品です。見出し帯の高さを測り、絞り込み帯の貼り付け位置に渡します。</p>
      </>
    ),
  },
  {
    name: 'LiveStatus',
    group: 'feedback',
    render: () => <LiveStatus visible>12 件のフィードバックを表示中</LiveStatus>,
  },
  {
    name: 'CursorPager',
    group: 'navigation',
    render: () => (
      <CursorPager
        label="フィードバック一覧"
        canGoBack={false}
        canGoForward
        onBack={() => undefined}
        onForward={() => undefined}
      />
    ),
  },
];
