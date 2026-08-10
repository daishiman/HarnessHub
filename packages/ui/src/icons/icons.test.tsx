/**
 * アイコンの単体テスト。
 * アイコンは「意味を持たない装飾」か「名前を持つ図」のどちらかでなければならず、
 * その中間 (読み上げられるが名前がない) を作らないことを固定する。
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Icon, iconNames } from '../index.js';

describe('Icon', () => {
  it.each(iconNames)('%s を描画できる', (name) => {
    const { container } = render(<Icon name={name} />);
    const svg = container.querySelector('svg');

    expect(svg?.getAttribute('data-icon')).toBe(name);
    // 中身が空のアイコン名を作らない
    expect(svg?.children.length ?? 0).toBeGreaterThan(0);
  });

  it('label 省略時は装飾として支援技術から隠す', () => {
    const { container } = render(<Icon name="search" />);
    const svg = container.querySelector('svg');

    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('role')).toBeNull();
  });

  it('label 指定時は名前を持つ図になる', () => {
    render(<Icon name="search" label="検索" />);

    expect(screen.getByRole('img', { name: '検索' })).toBeDefined();
  });

  it('色は currentColor を継ぎ、生の色コードを持たない', () => {
    const { container } = render(<Icon name="bell" />);
    const svg = container.querySelector('svg');

    expect(svg?.getAttribute('stroke')).toBe('currentColor');
    expect(svg?.getAttribute('fill')).toBe('none');
  });

  it('サイズを指定できる', () => {
    const { container } = render(<Icon name="close" size={32} />);
    const svg = container.querySelector('svg');

    expect(svg?.getAttribute('width')).toBe('32');
    expect(svg?.getAttribute('height')).toBe('32');
    // 拡大しても座標系は 24 基準のまま
    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');
  });
});
