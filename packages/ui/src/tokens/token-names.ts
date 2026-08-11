/**
 * design token の「名前」だけを持つ葉モジュール (依存ゼロ)。
 *
 * なぜ tokens.ts から切り出すか (HarnessHub-vwxc):
 *   部品は `internal/style.ts` 経由で `colorVariableName` と `chartSeriesTokens` しか使わないが、
 *   これらが tokens.ts に同居していると、tokens.ts が top-level で import している
 *   `contrast.js` (WCAG 比率計算) と `focus-ring.js`、および light/dark の色 **値** 表・
 *   `buildThemeCss` までブラウザ chunk へ到達可能になる。本番の CSS は静的な tokens.css
 *   (HarnessHub-2fo1) なので、これらは実行時には 1 バイトも使われない。
 *   名前 (= CSS カスタムプロパティ名の材料) だけをここへ降ろし、値・CSS 生成・コントラスト
 *   計算は tokens.ts 側に残すことで、client bundle からは名前しか運ばれなくなる。
 *
 * 公開契約は変わらない。index.ts は従来どおり tokens.js 経由で同じ識別子を re-export し、
 * tokens.ts はここを再輸出するので、consumer から見た import 元は `@harness-hub/ui` のまま。
 * このファイルへの deep import は禁止 (package 内部の実装分割にすぎない)。
 */

export const themeNames = ['light', 'dark'] as const;
export type ThemeName = (typeof themeNames)[number];
/** 利用者の選択値。`auto` は OS 設定 (`prefers-color-scheme`) に追従する。 */
export type ThemePreference = ThemeName | 'auto';

export const densityNames = ['comfortable', 'compact'] as const;
export type Density = (typeof densityNames)[number];

/**
 * 色 token の名前一覧。値 (hex) は tokens.ts の `colorTokens` が持つ。
 * 名前と値を別モジュールにしても取りこぼしが起きないよう、tokens.ts 側の
 * light/dark は `satisfies Record<ColorTokenName, string>` で全数を型検査する。
 */
export const colorTokenNames = [
  'bg',
  'surface',
  'surfaceMuted',
  'border',
  'borderStrong',
  'text',
  'textMuted',
  'primary',
  'primaryHover',
  'primarySoft',
  'onPrimary',
  'accentAi',
  'accentAiSoft',
  'onAccentAi',
  'success',
  'successSoft',
  'warning',
  'warningSoft',
  'danger',
  'dangerHover',
  'dangerSoft',
  'onDanger',
  'infoCyan',
  'infoSoft',
  'magenta',
  'magentaSoft',
  'neutralSoft',
  'focusRing',
] as const;

export type ColorTokenName = (typeof colorTokenNames)[number];

/**
 * 折り返し幅 (breakpoint)。
 *
 * 数値 (px) で持つのは、CSS カスタムプロパティが `@media` の条件式では評価されない
 * (`@media (min-width: var(--x))` は無効) ため。実際の分岐は base-css.ts が生成時に
 * この値を literal として埋め込む。ここを唯一の正本にすることで、
 * 「CSS のあちこちに 768px が直書きされ、片方だけ変わる」状態を防ぐ。
 *
 * 段階の根拠:
 *   sm 480 … 縦持ちスマホ (360px) と横持ち/小型タブレットの境目
 *   md 768 … ナビゲーションを横へ出せるようになる幅 (SidebarLayout の 2 カラム化点)
 *   lg 1120 … Container standard の最大幅。これ以上広げても行長が伸びるだけ
 */
export const breakpointTokens = {
  sm: 480,
  md: 768,
  lg: 1120,
} as const;
export type BreakpointName = keyof typeof breakpointTokens;

/** `breakpointTokens` から `@media` の前置きを作る。閾値の直書きを消すための唯一の入口。 */
export function mediaUp(name: BreakpointName): string {
  return `@media (min-width: ${breakpointTokens[name]}px)`;
}

/**
 * チャートの系列色の順序 (固定)。
 * 色だけに依存させないため、部品側で形状・ラベルを必ず併記する。
 */
export const chartSeriesTokens = [
  'primary',
  'accentAi',
  'infoCyan',
  'warning',
  'magenta',
  'success',
] as const satisfies readonly ColorTokenName[];

/** `fontSizeMd` → `font-size-md`。CSS カスタムプロパティ名の綴り換え。 */
export const kebab = (key: string): string => key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);

/** 色 token に対応する CSS カスタムプロパティ名。 */
export function colorVariableName(token: ColorTokenName): string {
  return `--hh-color-${kebab(token)}`;
}
