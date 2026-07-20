/** チャート部品の単体テスト。図の代替 (表で見る) が同じデータを提示することを固定する。 */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { BarChart, DonutChart, KpiCard, LineChart, Sparkline } from '../index.js';
import { renderWithUi } from '../test-utils.js';

const series = [
  {
    name: '開発部',
    points: [
      { label: '1週', value: 4 },
      { label: '2週', value: 9 },
    ],
  },
  {
    name: '営業部',
    points: [
      { label: '1週', value: 2 },
      { label: '2週', value: 3 },
    ],
  },
];

describe('LineChart', () => {
  it('図として読み上げ用の要約を持つ', () => {
    renderWithUi(<LineChart title="週次の削減時間" series={series} />);

    const image = screen.getByRole('img');
    expect(image.getAttribute('aria-label')).toContain('開発部: 最小 4 最大 9');
  });

  it('系列ごとに線を描く', () => {
    const { container } = renderWithUi(<LineChart title="推移" series={series} />);
    expect(container.querySelectorAll('polyline')).toHaveLength(2);
  });

  it('系列を破線パターンでも区別する (色以外の手がかり)', () => {
    const { container } = renderWithUi(<LineChart title="推移" series={series} />);

    const dashes = [...container.querySelectorAll('polyline')].map((line) =>
      line.getAttribute('stroke-dasharray'),
    );
    expect(new Set(dashes).size).toBe(2);
  });

  it('「表で見る」で同じデータを表として出す', async () => {
    const user = userEvent.setup();
    renderWithUi(<LineChart title="週次の削減時間" series={series} />);

    await user.click(screen.getByRole('button', { name: '表で見る' }));

    expect(screen.getByRole('table')).toBeDefined();
    expect(screen.getByRole('columnheader', { name: '開発部' })).toBeDefined();
    expect(screen.getByRole('cell', { name: '9' })).toBeDefined();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('切替ボタンは展開状態を aria-expanded で伝える', async () => {
    const user = userEvent.setup();
    renderWithUi(<LineChart title="推移" series={series} />);

    const toggle = screen.getByRole('button', { name: '表で見る' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'グラフで見る' }).getAttribute('aria-expanded')).toBe('true');
  });
});

describe('BarChart', () => {
  const data = [
    { label: '経理', value: 12 },
    { label: '人事', value: 5 },
  ];

  it('データ件数分の棒を描く', () => {
    const { container } = renderWithUi(<BarChart title="部門別" data={data} />);
    expect(container.querySelectorAll('rect')).toHaveLength(2);
  });

  it('表の代替を持つ', async () => {
    const user = userEvent.setup();
    renderWithUi(<BarChart title="部門別" data={data} />);

    await user.click(screen.getByRole('button', { name: '表で見る' }));
    expect(screen.getByRole('cell', { name: '経理' })).toBeDefined();
    expect(screen.getByRole('cell', { name: '12' })).toBeDefined();
  });

  it('空データでも描画できる', () => {
    const { container } = renderWithUi(<BarChart title="部門別" data={[]} />);
    expect(container.querySelectorAll('rect')).toHaveLength(0);
  });
});

describe('DonutChart', () => {
  const data = [
    { label: '完了', value: 3 },
    { label: '進行中', value: 1 },
  ];

  it('割合を読み上げ要約に含める', () => {
    renderWithUi(<DonutChart title="状態の内訳" data={data} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('完了 75%');
  });

  it('凡例に値と割合をテキストで出す (色が判別できなくても読める)', () => {
    renderWithUi(<DonutChart title="内訳" data={data} />);
    expect(screen.getByText('完了: 3 (75%)')).toBeDefined();
  });

  it('データが無いことを要約で伝える', () => {
    renderWithUi(<DonutChart title="内訳" data={[]} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('データがありません');
  });
});

describe('Sparkline', () => {
  it('単体で読み上げ可能なラベルを持つ', () => {
    renderWithUi(<Sparkline label="直近 7 日の推移" values={[1, 3, 2]} />);
    expect(screen.getByRole('img', { name: '直近 7 日の推移' })).toBeDefined();
  });
});

describe('KpiCard', () => {
  it('指標名と値を表示する', () => {
    renderWithUi(<KpiCard label="今月の削減時間" value="128" unit="時間" />);

    expect(screen.getByText('今月の削減時間')).toBeDefined();
    expect(screen.getByText('時間')).toBeDefined();
  });

  it('増減を記号だけでなく文言でも伝える', () => {
    renderWithUi(
      <KpiCard label="削減額" value="1,200,000" delta={{ text: '前月比 +12%', trend: 'up' }} />,
    );

    expect(screen.getByText('増加:')).toBeDefined();
    expect(screen.getByText('前月比 +12%')).toBeDefined();
  });

  it('推移データがあればスパークラインを添える', () => {
    renderWithUi(<KpiCard label="利用者数" value="42" trendValues={[1, 2, 3]} />);
    expect(screen.getByRole('img', { name: '利用者数 の推移' })).toBeDefined();
  });

  it('推移データが無ければスパークラインを出さない', () => {
    renderWithUi(<KpiCard label="利用者数" value="42" />);
    expect(screen.queryByRole('img')).toBeNull();
  });
});
