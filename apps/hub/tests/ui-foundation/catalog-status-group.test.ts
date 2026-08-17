import { describe, expect, it } from 'vitest';

import { catalogStatusGroup } from '../../src/components/catalog/CatalogList';

/**
 * Catalog は Docs / Sheets と違い、状態の畳み込みをサーバーではなく画面側で行う
 * (cursor を持たず認可後の全件を受け取るため)。写像がここだけに閉じるので、
 * 受入条件 5 の「unknown を個別状態タブへ誤分類しない」もここで固定する。
 */
describe('CARD-LIST-CATALOG-STATUS-001: release_status からタブ区分への写像', () => {
  it('available はそのまま「導入できる」に入る', () => {
    expect(catalogStatusGroup('available')).toBe('available');
  });

  it('suspended と deprecated は同じ「停止」に畳まれる', () => {
    expect(catalogStatusGroup('suspended')).toBe('suspended');
    expect(catalogStatusGroup('deprecated')).toBe('suspended');
  });

  it('null と未知の値は unknown へ落ち、available に寄らない', () => {
    expect(catalogStatusGroup(null)).toBe('unknown');
    // 将来 catalog 側が状態を増やしても、既知タブの件数を静かに水増ししない
    expect(catalogStatusGroup('preview' as never)).toBe('unknown');
  });
});
