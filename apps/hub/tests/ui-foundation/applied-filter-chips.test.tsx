// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppliedFilterChips } from '../../src/components/filter/applied-filter-chips.js';

afterEach(cleanup);

describe('CARD-LIST-CHIP-001: 適用中の条件をその場で外せる (受入条件 10)', () => {
  it('解除ボタンのラベルは条件名を含み、押すと該当条件だけを外す', async () => {
    const user = userEvent.setup();
    const removeStatus = vi.fn();
    const removeQuery = vi.fn();

    render(
      <AppliedFilterChips
        items={[
          { label: '状態', value: '下書き', onRemove: removeStatus },
          { label: 'キーワード', value: '請求', onRemove: removeQuery },
        ]}
      />,
    );

    // 解除ボタンが全部「×」だと、読み上げでどれを外すのか区別できない
    await user.click(screen.getByRole('button', { name: '状態の絞り込みを解除' }));

    expect(removeStatus).toHaveBeenCalledTimes(1);
    expect(removeQuery).not.toHaveBeenCalled();
  });

  it('外せない条件 (画面が持たない条件) には解除ボタンを出さない', () => {
    render(<AppliedFilterChips items={[{ label: '対象', value: 'この workspace' }]} />);

    expect(screen.queryByRole('button')).toBeNull();
  });
});
