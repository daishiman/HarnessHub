import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Badge } from '../index.js';
import { renderWithUi } from '../test-utils.js';

describe('Badge', () => {
  it('内容を表示し、指定toneの配色を適用する', () => {
    renderWithUi(<Badge tone="warning">予約公開</Badge>);

    const badge = screen.getByText('予約公開');
    expect(badge.tagName).toBe('SPAN');
    expect(badge.getAttribute('style')).toContain('var(--hh-color-warning-soft)');
  });
});
