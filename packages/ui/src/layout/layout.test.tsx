/** レイアウト骨格の単体テスト。ランドマークと見出しの唯一性を固定する。 */
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppShell, Card, Container, containerSizes, NavList, PageHeader, SidebarLayout, Stack } from '../index.js';
import { renderWithUi } from '../test-utils.js';

describe('AppShell', () => {
  it('banner と main のランドマークを 1 つずつ作る', () => {
    renderWithUi(<AppShell brand="Harness Hub">本文</AppShell>);

    expect(screen.getAllByRole('banner')).toHaveLength(1);
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });

  it('スキップリンクが main のアンカーを指す', () => {
    renderWithUi(<AppShell brand="Harness Hub">本文</AppShell>);

    const skip = screen.getByRole('link', { name: '本文へスキップ' });
    expect(skip.getAttribute('href')).toBe('#main');
    expect(screen.getByRole('main').getAttribute('id')).toBe('main');
  });

  /**
   * ブランド名を見出しにすると、画面側の h1 と合わせて h1 が 2 つになる。
   * 「シェルが見出しを持たない」ことをここで固定する。
   */
  it('ブランド名は見出しではなくリンクとして描く', () => {
    renderWithUi(<AppShell brand="Harness Hub">本文</AppShell>);

    expect(screen.getByRole('link', { name: 'Harness Hub' }).tagName).toBe('A');
    expect(screen.queryByRole('heading', { name: 'Harness Hub' })).toBeNull();
  });

  it('シェルと画面を組み合わせても h1 は 1 つだけ', () => {
    renderWithUi(
      <AppShell brand="Harness Hub">
        <PageHeader title="ユーザー管理" />
      </AppShell>,
    );

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
});

describe('PageHeader', () => {
  it('title を h1、description と操作を併せて描く', () => {
    renderWithUi(
      <PageHeader
        title="ドキュメント"
        description="共通とテナントの文書"
        actions={<button type="button">新規</button>}
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'ドキュメント' })).toBeDefined();
    expect(screen.getByText('共通とテナントの文書')).toBeDefined();
    expect(screen.getByRole('button', { name: '新規' })).toBeDefined();
  });

  it('パンくずを現在位置の nav として描く', () => {
    renderWithUi(<PageHeader title="詳細" breadcrumbs={<a href="/docs">ドキュメント</a>} />);

    expect(screen.getByRole('navigation', { name: '現在位置' })).toBeDefined();
  });

  it('description を渡さなければ余分な段落を作らない', () => {
    const { container } = renderWithUi(<PageHeader title="一覧" />);

    expect(container.querySelectorAll('p')).toHaveLength(0);
  });
});

describe('NavList', () => {
  const items = [
    { href: '/docs', label: 'ドキュメント' },
    { href: '/users', label: 'ユーザー管理' },
  ];

  it('名前付きの navigation ランドマークにする', () => {
    renderWithUi(<NavList items={items} label="主要ナビゲーション" />);

    expect(screen.getByRole('navigation', { name: '主要ナビゲーション' })).toBeDefined();
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });

  /** 現在地を色だけで示すと色覚特性によっては伝わらないため aria-current も要求する。 */
  it('現在地の項目にだけ aria-current="page" を付ける', () => {
    renderWithUi(<NavList items={items} label="主要ナビゲーション" currentHref="/users" />);

    expect(screen.getByRole('link', { name: 'ユーザー管理' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'ドキュメント' }).getAttribute('aria-current')).toBeNull();
  });

  it('現在地が未指定なら aria-current を付けない', () => {
    renderWithUi(<NavList items={items} label="主要ナビゲーション" />);

    for (const link of screen.getAllByRole('link')) {
      expect(link.getAttribute('aria-current')).toBeNull();
    }
  });
});

describe('SidebarLayout', () => {
  it('ナビゲーションと内容の両方を描く', () => {
    renderWithUi(
      <SidebarLayout nav={<NavList items={[{ href: '/docs', label: 'ドキュメント' }]} label="主要ナビゲーション" />}>
        <p>内容</p>
      </SidebarLayout>,
    );

    expect(screen.getByRole('navigation', { name: '主要ナビゲーション' })).toBeDefined();
    expect(screen.getByText('内容')).toBeDefined();
  });
});

describe('Container / Stack / Card', () => {
  it.each(Object.keys(containerSizes) as (keyof typeof containerSizes)[])(
    'Container の %s が段階に応じた最大幅を持つ',
    (size) => {
      const { container } = renderWithUi(<Container size={size}>内容</Container>);
      const element = container.querySelector('[data-hh-container]') as HTMLElement;

      expect(element.getAttribute('data-hh-container')).toBe(size);
      expect(element.style.maxWidth).toBe(containerSizes[size]);
    },
  );

  it('Stack の余白が 4px グリッドの token 変数になる', () => {
    const { container } = renderWithUi(
      <Stack gap={5}>
        <span>a</span>
      </Stack>,
    );

    const stack = container.querySelector('[data-hh-stack]') as HTMLElement;
    expect(stack.style.gap).toBe('var(--hh-space-5)');
  });

  it('Card は title を渡さなければ空の見出しを作らない', () => {
    renderWithUi(<Card>内容</Card>);

    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.getByText('内容')).toBeDefined();
  });

  it('Card の title は h2 として描く (画面の h1 と衝突させない)', () => {
    renderWithUi(
      <Card title="公開状態" description="最新の配信状況">
        内容
      </Card>,
    );

    expect(screen.getByRole('heading', { level: 2, name: '公開状態' })).toBeDefined();
    expect(screen.getByText('最新の配信状況')).toBeDefined();
  });
});
