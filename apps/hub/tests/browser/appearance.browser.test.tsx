/**
 * 配色 (palette) の視覚回帰ゲート (feat-appearance-theming)。
 *
 * カタログ VRT は「部品ごとの見た目」を既定配色でだけ撮る。配色を 5 種へ増やした結果、
 * **既定以外の 4 配色は 1 枚も撮られていない**状態になった。配色の破綻 (面と文字が沈む、
 * 強調色が背景と同化する) は既定配色では起きず、他配色でだけ起きるため、
 * ここで追加配色を明示的に撮影対象へ載せる。
 *
 * 撮る 3 種類:
 *  1. 4 配色 × light/dark = 8 枚 — 既定 (gray) はカタログ側が全 group を撮っており重複するため除く
 *  2. テーマメニュー 1 枚 — 選択状態とスウォッチが分かる形で残す
 *  3. 4 画面幅 — 配色ではなく折り返し後のレイアウトが崩れていないかの参考
 */

import { defaultPaletteName, type PaletteName, paletteNames } from '@harness-hub/ui';
import { describe, expect, it } from 'vitest';
import { renderAppearanceMenu, renderAppearancePreview } from './appearance/preview.js';
import { type BrowserRoute, withBrowserSession } from './browser-harness.js';
import { expectMatchesBaseline, isUpdateMode } from './vrt.js';

/** 配色比較の撮影幅。基準画像の寸法を固定するため、テストごとに変えない。 */
const VRT_VIEWPORT = { width: 1024, height: 768 };

/**
 * 参考画像を撮る 4 幅。`viewportPresets` の 3 幅に、外付けディスプレイ相当の広い幅を足す。
 *
 * `viewportPresets` 自体へ 4 幅目を足さないのは、あれを走査している responsive の
 * オーバーフロー検査の対象まで黙って広がるため。撮影の都合をレイアウト検査へ持ち込まない。
 */
const WIDTH_PRESETS = {
  mobile: { width: 360, height: 800 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 },
  wide: { width: 1440, height: 900 },
} as const;

const themes = ['light', 'dark'] as const;

/** 既定配色を除いた追加配色。gray はカタログ VRT が全 group を撮っている。 */
const addedPalettes: readonly PaletteName[] = paletteNames.filter((palette) => palette !== defaultPaletteName);

interface Shot {
  readonly key: string;
  readonly route: BrowserRoute;
  readonly viewport: { readonly width: number; readonly height: number };
}

const paletteShots: readonly Shot[] = addedPalettes.flatMap((palette) =>
  themes.map((theme) => ({
    key: `appearance-${palette}-${theme}`,
    route: {
      path: `/appearance/${palette}/${theme}`,
      body: renderAppearancePreview(palette, theme),
      title: `appearance ${palette} ${theme}`,
      theme,
      palette,
    },
    viewport: VRT_VIEWPORT,
  })),
);

const menuShots: readonly Shot[] = [
  {
    key: 'appearance-menu-light',
    route: {
      path: '/appearance/menu/light',
      body: renderAppearanceMenu('light'),
      title: 'appearance menu',
      theme: 'light',
    },
    viewport: VRT_VIEWPORT,
  },
];

const widthShots: readonly Shot[] = Object.entries(WIDTH_PRESETS).map(([name, viewport]) => ({
  key: `appearance-width-${name}`,
  route: {
    path: `/appearance/width/${name}`,
    // 幅の参考画像は既定配色で撮る。配色と幅を同時に動かすと、崩れの原因がどちらか分からない
    body: renderAppearancePreview(defaultPaletteName, 'light'),
    title: `appearance width ${name}`,
    theme: 'light',
    palette: defaultPaletteName,
  },
  viewport,
}));

const shots: readonly Shot[] = [...paletteShots, ...menuShots, ...widthShots];
const routes: BrowserRoute[] = shots.map((shot) => shot.route);

describe('外観 (配色) VRT', () => {
  it.each(shots.map((shot) => [shot.key, shot] as const))('%s が基準画像と一致する', async (_key, shot) => {
    await withBrowserSession({ routes, viewport: shot.viewport }, async (session) => {
      await session.goto(shot.route.path, shot.viewport);
      const result = await expectMatchesBaseline(session, shot.key);
      // 更新モードでは比較していないので、通ったことを合格として扱わない
      expect(result.updated).toBe(isUpdateMode());
    });
  });

  /**
   * 配色を足したのに撮影対象へ載せ忘れる事故を落とす。
   * 枚数を式で書くのは、`paletteNames` が増えたときに自動で要求枚数が増えるようにするため。
   */
  it('追加配色 × テーマ 2 種を漏れなく撮る', () => {
    expect(addedPalettes).toHaveLength(paletteNames.length - 1);
    expect(paletteShots).toHaveLength(addedPalettes.length * themes.length);
    expect(widthShots).toHaveLength(Object.keys(WIDTH_PRESETS).length);
  });

  /**
   * 配色は `[data-palette][data-theme]` の 2 属性で当たる。`data-theme` が欠けると
   * 規則が 1 本も当たらず、全配色が既定色の写真になっても差分が出ない (無音の失効)。
   */
  it('配色を撮る route は明るさも必ず指定している', () => {
    for (const shot of shots) {
      if (shot.route.palette !== undefined) {
        expect(shot.route.theme).toBeDefined();
      }
    }
  });
});
