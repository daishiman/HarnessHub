/**
 * 識別子バッジの単体テスト。
 *
 * 押さえるのは「省略された全文へ、マウスなしで辿り着けること」の一点に尽きる。
 * 見た目の省略は CSS が担当するので jsdom では観測できないが、
 * **全文が DOM に残っていること**と**キーボードで開けること**は観測できる。
 */
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { IdBadge } from '../index.js';
import { renderWithUi } from '../test-utils.js';

const VALUE = '01KYRGHY94VEZWJFXXZCSQKKAX';

describe('IdBadge', () => {
  it('短縮表示ではなく全文を DOM に残す (コピーした値が使えるように)', () => {
    const { container } = renderWithUi(<IdBadge value={VALUE} label="ワークスペース ID" />);

    const full = container.querySelector('[data-hh-id-badge-full]');
    expect(full?.textContent).toBe(VALUE);
  });

  it('閉じたままでも読み上げ名が「種別 + 全文」になる', () => {
    // details は既定で閉じている。この状態で名前が全文でないと、
    // 支援技術の利用者は「開かないと何の ID か分からない」状態になる。
    // 名前を summary に付けるのは、AT が焦点を当てて読むのが summary 側だから
    // (details 自体の名前は開閉の入口としては読まれない)
    const { container } = renderWithUi(<IdBadge value={VALUE} label="ワークスペース ID" />);

    expect(container.querySelector('summary')?.getAttribute('aria-label')).toBe(`ワークスペース ID: ${VALUE}`);
  });

  it('種別を渡さないときは全文だけを読み上げ名にする', () => {
    const { container } = renderWithUi(<IdBadge value={VALUE} />);

    expect(container.querySelector('summary')?.getAttribute('aria-label')).toBe(VALUE);
  });

  /**
   * 「マウスなしで全文へ辿り着ける」を担保しているのは、素の `<details>/<summary>` を
   * 使っていること自体である (summary は素で焦点を受け取り Enter / Space で開く)。
   *
   * jsdom は summary を tab 順に含めず、Enter による開閉も実装していないため、
   * キー操作そのものは観測できない。代わりに **その保証が壊れる改変** を落とす:
   * 開く操作を summary 以外へ移す、`tabindex="-1"` で焦点から外す、
   * `role` を上書きして disclosure でなくする、のいずれかが入ればここで失敗する。
   */
  it('開く操作を素の summary が持つ (焦点と Enter を自前実装に置き換えない)', async () => {
    const user = userEvent.setup();
    const { container } = renderWithUi(<IdBadge value={VALUE} label="ワークスペース ID" />);

    const details = container.querySelector('details');
    const summary = container.querySelector('summary');
    expect(details?.open).toBe(false);
    expect(summary?.getAttribute('tabindex')).toBeNull();
    expect(summary?.getAttribute('role')).toBeNull();

    (summary as HTMLElement).focus();
    expect(document.activeElement).toBe(summary);

    await user.click(summary as HTMLElement);
    expect(details?.open).toBe(true);
  });

  /**
   * `title` は支援技術ごとに読むか分かれ、ポインタを重ねないと出ない。
   * 「情報を伝える唯一の手段」に戻す改変をここで落とす (WCAG 1.4.13 / 4.1.2)。
   */
  it('全文の出しどころを title 属性に頼らない', () => {
    const { container } = renderWithUi(<IdBadge value={VALUE} label="ワークスペース ID" />);

    expect(container.querySelector('[title]')).toBeNull();
  });

  it('短縮表示は読み上げから外す (同じ値が二度読まれるのを防ぐ)', () => {
    const { container } = renderWithUi(<IdBadge value={VALUE} />);

    expect(container.querySelector('[data-hh-id-badge-short]')?.getAttribute('aria-hidden')).toBe('true');
  });
});
