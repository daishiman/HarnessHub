/**
 * 情報の並べ方部品 (定義リスト・タグ帯・カード・カード格子・絞り込み帯) の単体テスト。
 *
 * 見た目ではなく「仕様が要求している構造」を固定する:
 * 定義リストが dt/dd の対応を崩さないこと、チップのまとまりが名前を持つこと、
 * カードの見出し階層を呼び出し側が選べること、そして axe 違反 0 件。
 */
import { render, screen, within } from '@testing-library/react';
import axe, { type Result } from 'axe-core';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import {
  CardGrid,
  DataCard,
  DefinitionList,
  type DefinitionListItem,
  FilterBar,
  ScreenHeader,
  type ShellNavGroup,
  ShellSidebar,
  TagRow,
} from '../index.js';
import { renderWithUi } from '../test-utils.js';

const items: readonly DefinitionListItem[] = [
  { term: '種別', description: 'スキル' },
  { term: '公開範囲', description: 'ワークスペース内', hint: '所属メンバーだけが導入できます' },
];

/** N 番目を取り出す。足りないときに「何番目が無かったか」を出して落としたいので `!` を使わない。 */
function nthElement<T>(elements: readonly T[], index: number): T {
  const element = elements[index];
  if (element === undefined) throw new Error(`${index} 番目の要素がありません (件数: ${elements.length})`);
  return element;
}

async function axeViolations(container: HTMLElement): Promise<readonly Result[]> {
  const result = await axe.run(container, { rules: { region: { enabled: false } } });
  return result.violations;
}

describe('DefinitionList', () => {
  it('項目名と値を dt/dd の対で出す', () => {
    render(<DefinitionList items={items} />);

    const terms = screen.getAllByRole('term');
    const definitions = screen.getAllByRole('definition');
    expect(terms.map((node) => node.textContent)).toEqual(['種別', '公開範囲']);
    expect(definitions).toHaveLength(2);
    expect(definitions[1]?.textContent).toContain('ワークスペース内');
  });

  it('補足は値の中に添えて、独立した項目にしない', () => {
    render(<DefinitionList items={items} />);

    // 補足を別の dd にすると「値が 2 つある項目」に見えるため、同じ dd の中に置く
    expect(screen.getAllByRole('definition')).toHaveLength(2);
    expect(screen.getByText('所属メンバーだけが導入できます')).toBeTruthy();
  });

  it('2 列指定でも狭い画面で潰れないよう、列数は CSS 変数へ委ねる', () => {
    const { container } = render(<DefinitionList items={items} columns={2} />);

    const list = container.querySelector('[data-hh-definition-list="2"]');
    expect(list).not.toBeNull();
    // 閾値の判断は base 層 (--hh-dl-columns) が持つ。部品側に px を持たせない
    expect((list as HTMLElement).style.gridTemplateColumns).toContain('--hh-dl-columns');
  });

  it('同じ画面に複数置くときのために名前を付けられる', () => {
    render(<DefinitionList items={items} label="ツールの属性" />);

    expect(screen.getByLabelText('ツールの属性')).toBeTruthy();
  });
});

describe('TagRow', () => {
  it('チップのまとまりに既定の読み上げ名を与える', () => {
    render(
      <TagRow>
        <span>公開中</span>
      </TagRow>,
    );

    expect(screen.getByRole('group', { name: '状態とスコープ' })).toBeTruthy();
  });
});

describe('ScreenHeader', () => {
  it('タグを見出しの直後に置き、見出しの外へ漏らさない', () => {
    render(
      <ScreenHeader
        title="ドキュメント詳細"
        tags={
          <TagRow>
            <span>公開中</span>
          </TagRow>
        }
      />,
    );

    const heading = screen.getByRole('heading', { level: 1, name: 'ドキュメント詳細' });
    const tags = screen.getByRole('group', { name: '状態とスコープ' });
    // 見出しとタグが同じブロック (見出し帯の左ブロック) に入っていれば、帯ごと sticky にしたときに一緒に残る。
    // 見出しは主要操作と同じ行に入るぶん 1 段深いので、親どうしではなく包含関係で見る
    const block = tags.parentElement?.parentElement;
    expect(block).not.toBeNull();
    expect(block?.contains(heading)).toBe(true);
  });

  it('主要操作を見出しと同じ行に置く', () => {
    render(<ScreenHeader title="ドキュメント一覧" actions={<button type="button">新しく作成</button>} />);

    const heading = screen.getByRole('heading', { level: 1, name: 'ドキュメント一覧' });
    const action = screen.getByRole('button', { name: '新しく作成' });
    // 見出しと操作が同じ行にあることが「1 つのかたまり」に見えるための条件。
    // 別の行に落ちると、説明文の長さしだいで操作だけが見出しから離れていく
    expect(heading.parentElement).toBe(action.parentElement?.parentElement);
  });

  it('sticky を指定したときだけ貼り付ける', () => {
    const { container: plain } = render(<ScreenHeader title="一覧" />);
    const { container: pinned } = render(<ScreenHeader title="一覧" sticky />);

    expect(plain.querySelector('[data-hh-screen-header="static"]')).not.toBeNull();
    const header = pinned.querySelector('[data-hh-screen-header="sticky"]') as HTMLElement;
    expect(header.style.position).toBe('sticky');
    expect(header.style.insetBlockStart).toBe('var(--hh-shell-header-offset, 0px)');
    // 重なり順はシェルのヘッダー (20) より下、表の見出し (10) より上
    expect(header.style.zIndex).toBe('15');
  });
});

describe('DataCard', () => {
  it('見出しをリンクにし、リンク名を見出しと一致させる', () => {
    render(<DataCard title="運用手順書" href="/docs/1" />);

    const heading = screen.getByRole('heading', { level: 3, name: '運用手順書' });
    expect(within(heading).getByRole('link', { name: '運用手順書' }).getAttribute('href')).toBe('/docs/1');
  });

  it('href が無いときは見出しだけを出す', () => {
    render(<DataCard title="運用手順書" />);

    expect(screen.queryByRole('link')).toBeNull();
  });

  it('見出しの階層を呼び出し側が選べる', () => {
    render(<DataCard title="運用手順書" headingLevel={2} />);

    expect(screen.getByRole('heading', { level: 2, name: '運用手順書' })).toBeTruthy();
  });

  it('meta は定義リストとして出す', () => {
    render(<DataCard title="運用手順書" meta={[{ term: '更新日', description: '2026-08-11' }]} />);

    expect(screen.getByRole('term').textContent).toBe('更新日');
  });

  it('lead / description / meta が別々の顕著度で描かれる (3 段が 2 段に潰れない)', () => {
    // 以前は要約 (description) と属性 (meta) がどちらも sm + textMuted で、
    // 見出し以外が 1 段に潰れていた。段が復活しても画面は一見成立してしまうので、
    // 「3 つの段が互いに違う」ことを構造として固定する。
    const { container } = render(
      <DataCard
        title="運用手順書"
        lead={[{ term: '状態', description: '公開中' }]}
        description="日々の運用手順をまとめたもの。"
        meta={[{ term: '更新日', description: '2026-08-11' }]}
      />,
    );

    const lists = [...container.querySelectorAll('dl')];
    expect(lists.map((list) => list.getAttribute('data-hh-salience'))).toEqual(['lead', 'metadata']);

    const leadValue = within(nthElement(lists, 0)).getByRole('definition');
    const metaValue = within(nthElement(lists, 1)).getByRole('definition');
    const summary = screen.getByText('日々の運用手順をまとめたもの。');
    const sizes = [leadValue, summary, metaValue].map((node) => (node as HTMLElement).style.fontSize);
    expect(new Set(sizes).size).toBe(3);
  });
});

describe('CardGrid', () => {
  it('列数ではなく最小幅だけを決め、折り返しをブラウザに任せる', () => {
    const { container } = render(
      <CardGrid columns="kpi">
        <span>1</span>
      </CardGrid>,
    );

    const grid = container.querySelector('[data-hh-card-grid="kpi"]') as HTMLElement;
    expect(grid.style.gridTemplateColumns).toContain('auto-fit');
    // min(100%, 200px) にしておかないと、画面より広い最小幅が横スクロールを生む
    expect(grid.style.gridTemplateColumns).toContain('min(100%, 200px)');
  });
});

describe('FilterBar', () => {
  it('絞り込みのまとまりに名前を与え、既定では見出しを読み上げ専用にする', () => {
    render(
      <FilterBar label="ドキュメントの絞り込み">
        <span>状態</span>
      </FilterBar>,
    );

    const group = screen.getByRole('group', { name: 'ドキュメントの絞り込み' });
    const label = within(group).getByText('ドキュメントの絞り込み');
    expect(label.style.position).toBe('absolute');
  });

  it('showLabel で見える見出しにできる', () => {
    render(
      <FilterBar label="ドキュメントの絞り込み" showLabel>
        <span>状態</span>
      </FilterBar>,
    );

    const group = screen.getByRole('group', { name: 'ドキュメントの絞り込み' });
    expect(within(group).getByText('ドキュメントの絞り込み').style.position).toBe('');
  });

  it('sticky 時は shell と screen header の累積位置を使い、適用中条件を同じ帯に残す', () => {
    const { container } = render(
      <FilterBar label="ドキュメントの絞り込み" sticky appliedChips={<span>状態: 公開中</span>}>
        <span>状態</span>
      </FilterBar>,
    );

    const bar = container.querySelector<HTMLElement>('[data-hh-filter-bar]');
    if (bar === null) throw new Error('FilterBar がありません');
    expect(bar.style.position).toBe('sticky');
    expect(bar.style.insetBlockStart).toBe(
      'var(--hh-screen-header-offset, calc(var(--hh-shell-header-offset, 0px) + var(--hh-screen-header-height, 0px)))',
    );
    expect(within(bar).getByText('状態: 公開中').closest('[data-hh-filter-applied]')).not.toBeNull();
  });
});

const navGroups: readonly ShellNavGroup[] = [
  {
    title: '業務',
    items: [{ href: '/sheets', label: 'ヒアリングシート', icon: 'sheet' }],
  },
  {
    title: '分析',
    items: [{ href: '/metrics', label: 'ダッシュボード', icon: 'dashboard' }],
  },
];

describe('ShellSidebar の分類', () => {
  it('分類ごとにリストを分け、各リストに分類名を与える', () => {
    render(<ShellSidebar groups={navGroups} label="主要ナビゲーション" />);

    expect(screen.getByRole('list', { name: '業務' })).toBeTruthy();
    expect(screen.getByRole('list', { name: '分析' })).toBeTruthy();
  });

  it('分類なし (items) で渡したときは分類名を出さない', () => {
    render(
      <ShellSidebar
        items={[{ href: '/sheets', label: 'ヒアリングシート', icon: 'sheet' }]}
        label="主要ナビゲーション"
      />,
    );

    // 「主要ナビゲーション」が分類名として本文に現れると、nav の名前と二重に読まれる
    expect(screen.queryByRole('list', { name: '主要ナビゲーション' })).toBeNull();
    expect(screen.getByRole('link', { name: 'ヒアリングシート' })).toBeTruthy();
  });
});

describe('情報部品の axe 検査', () => {
  const cases: readonly { name: string; node: ReactNode }[] = [
    { name: 'DefinitionList', node: <DefinitionList items={items} label="属性" /> },
    {
      name: 'DataCard',
      node: (
        <DataCard
          title="運用手順書"
          href="/docs/1"
          tags={
            <TagRow>
              <span>公開中</span>
            </TagRow>
          }
          description="日々の運用でやることをまとめています。"
          meta={[{ term: '更新日', description: '2026-08-11' }]}
        />
      ),
    },
    {
      name: 'CardGrid',
      node: (
        <CardGrid>
          <DataCard title="A" headingLevel={2} />
          <DataCard title="B" headingLevel={2} />
        </CardGrid>
      ),
    },
    {
      name: 'FilterBar',
      node: (
        <FilterBar label="絞り込み">
          <label>
            状態
            <select>
              <option>すべて</option>
            </select>
          </label>
        </FilterBar>
      ),
    },
    { name: 'ShellSidebar (分類あり)', node: <ShellSidebar groups={navGroups} label="主要ナビゲーション" /> },
  ];

  for (const testCase of cases) {
    it(`${testCase.name} に違反がない`, async () => {
      const { container } = renderWithUi(testCase.node);
      expect(await axeViolations(container)).toEqual([]);
    });
  }
});
