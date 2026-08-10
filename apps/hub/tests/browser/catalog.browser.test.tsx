/**
 * コンポーネントカタログの視覚回帰ゲート (HarnessHub-xaa3)。
 *
 * a11y と性能は fail-closed で守られているのに、視覚だけ検査経路が無かった。
 * ここで全公開部品を light / dark の 2 テーマで描画し、基準画像との画素差分を判定する。
 *
 * group 単位で 1 枚撮るのは、部品ごとに撮ると基準画像が数十枚になり、
 * 些細な変更でも大量の画像更新が発生してレビューで中身を見なくなるため。
 * 一方でページを 1 枚に統合すると、差分がどの部品由来か分からなくなる。その中間を採る。
 */
import { basename } from 'node:path';

import { describe, expect, it } from 'vitest';

import { type BrowserRoute, withBrowserSession } from './browser-harness.js';
import { catalogGroups, renderCatalogGroup } from './catalog/entries.js';
import { baselineDir, expectMatchesBaseline, isUpdateMode } from './vrt.js';

/** 撮影時の幅。基準画像の寸法を固定するため、テストごとに変えない。 */
const VRT_VIEWPORT = { width: 1024, height: 768 };

const themes = ['light', 'dark'] as const;

const routes: BrowserRoute[] = catalogGroups.flatMap((group) =>
  themes.map((theme) => ({
    path: `/catalog/${group}/${theme}`,
    body: renderCatalogGroup(group),
    title: `catalog ${group} ${theme}`,
    theme,
  })),
);

describe('コンポーネントカタログ VRT', () => {
  it.each(routes.map((route) => [route.path, route] as const))('%s が基準画像と一致する', async (_path, route) => {
    await withBrowserSession({ routes, viewport: VRT_VIEWPORT }, async (session) => {
      await session.goto(route.path, VRT_VIEWPORT);
      const key = route.path.replaceAll('/', '-').replace(/^-/, '');
      const result = await expectMatchesBaseline(session, key);
      // 更新モードでは比較していないので、通ったことを合格として扱わない
      expect(result.updated).toBe(isUpdateMode());
    });
  });

  /**
   * カタログ自体が空になっていないことの確認。entry を全部消しても
   * 「撮影対象 0 枚で全部 pass」になってしまい、ゲートが無音で無効化される。
   */
  it('撮影対象がテーマ 2 種 × group 数だけある', () => {
    expect(catalogGroups.length).toBeGreaterThan(0);
    expect(routes).toHaveLength(catalogGroups.length * themes.length);
  });

  /**
   * Node を Rosetta で起動しても Chromium の描画条件は macOS のまま変わらない。
   * CPU architecture を key に含めると、同じ画像なのに基準なしで全件落ちるため OS だけに固定する。
   */
  it('基準画像は Node architecture ではなく OS 単位で選ぶ', () => {
    expect(basename(baselineDir())).toBe(process.platform);
  });
});
