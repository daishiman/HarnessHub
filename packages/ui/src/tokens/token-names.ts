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
 *
 * 命名の方針 (Harness Studio デザインシステム / Option A グラファイト × アンバー):
 *   主色 `primary` は無彩色 (グラファイト) で、有彩の `accent` (アンバー) は
 *   **状態表現専用**。旧 `accentAi` / `accentAiSoft` / `onAccentAi` は
 *   「AI 機能を特別扱いしない」方針により廃止し、`accent` 系へ統合した
 *   (AI 専用色を置くこと自体が "AI っぽさ" の正体だったため)。
 *   `accent` を主要 CTA に使ってはならない — CTA は常に `primary`。
 */
export const colorTokenNames = [
  'pageBg',
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
  'accent',
  'accentSoft',
  'onAccent',
  'neutral',
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
  'infoBlue',
  'infoBlueSoft',
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
 * 段階の根拠 (Harness Studio デザインシステム §4 のレスポンシブ表を正本とする):
 *   sm 480 … 縦持ちスマホ (360px) と横持ちの境目。デザインシステムの 3 区分には
 *            現れない**モバイル内部の下位閾値**で、FilterBar が 1 列へ落ちる点だけに使う。
 *            ここを 640 に寄せると 480〜640px でボタンの上に不要な空きが出るため残す。
 *   md 641 … 〜640px = モバイル (サイドバー非表示 + 下部固定タブバー) の直上。
 *            641px からタブレット = サイドバーをアイコンのみ 68px で常設する。
 *   lg 1025 … 1025px 以上がデスクトップ = フルサイドバー (212px, アイコン + ラベル)。
 *
 * 641 / 1025 という半端な値は「〜640 / 641〜1024 / 1025〜」という仕様の区切りを
 * min-width だけで表現した結果である。640 や 1024 にすると境界の 1px が
 * 両方の区分に属してしまい、どちらの見た目になるかが宣言順に依存する。
 */
export const breakpointTokens = {
  sm: 480,
  md: 641,
  lg: 1025,
} as const;
export type BreakpointName = keyof typeof breakpointTokens;

/** `breakpointTokens` から `@media` の前置きを作る。閾値の直書きを消すための唯一の入口。 */
export function mediaUp(name: BreakpointName): string {
  return `@media (min-width: ${breakpointTokens[name]}px)`;
}

/**
 * `breakpointTokens` から上限側の `@media` を作る。`mediaUp` の対。
 *
 * 閾値から 0.02px 引くのは、同じ名前の `mediaUp` と境界が重ならないようにするため。
 * 引かないと 480px ちょうどの幅で上下どちらの規則も当たり、後に書いたほうが勝つという
 * 読みでしか説明できない状態になる。0.02 という端数は sub-pixel の画面幅を
 * 取りこぼさないための慣行値 (1px 引くと 479.5px の端末で穴が空く)。
 */
export function mediaDown(name: BreakpointName): string {
  return `@media (max-width: ${breakpointTokens[name] - 0.02}px)`;
}

/**
 * チャートの系列色の順序 (固定)。
 * 色だけに依存させないため、部品側で形状・ラベルを必ず併記する。
 *
 * 「有彩色は状態表現のみ」の原則の唯一の例外がここ。系列を隣と見分けるには
 * 色相差が要り、無彩色の濃淡だけでは 6 系列を区別できないため、
 * `infoCyan` / `magenta` は**チャートとタグ以外に使わない**という制約付きで残す。
 * 先頭 2 系列を `primary` (グラファイト) → `accent` (アンバー) にして、
 * 系列が 2 本までのグラフは基調色だけで描き切れるようにしている。
 */
export const chartSeriesTokens = [
  'primary',
  'accent',
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
