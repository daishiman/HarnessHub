/** design tokens (色・余白・タイポ・表示密度) の正本。文字色は 4.5:1 を token 段階で保証する。 */
import { AA_CONTRAST_NON_TEXT, AA_CONTRAST_TEXT, contrastRatio } from './contrast.js';
import { focusRingRule } from './focus-ring.js';
import {
  breakpointTokens,
  type ColorTokenName,
  colorVariableName,
  type Density,
  kebab,
  type ThemeName,
  themeNames,
} from './token-names.js';

// 名前だけの葉モジュール (token-names.ts) を正本として再輸出する。公開 API の形は従来どおり
// `@harness-hub/ui` から同じ識別子で参照できる (HarnessHub-vwxc の client bundle 削減)。
export type { BreakpointName, ColorTokenName, Density, ThemeName, ThemePreference } from './token-names.js';
export {
  breakpointTokens,
  chartSeriesTokens,
  colorVariableName,
  densityNames,
  mediaDown,
  mediaUp,
  themeNames,
} from './token-names.js';

/**
 * light の色 token。
 *
 * mockup 実測値 (frontend-spec §2.1) のうち `--primary #1677ff` `--success #52c41a`
 * `--warning #fa8c16` `--danger #ff4d4f` は、白文字・白背景いずれでも 4.5:1 に届かない
 * (実測 3.3〜4.1:1)。shared-layers §1 は「コントラスト比 4.5:1 以上を **token 段階で保証**」を
 * 求めているため、**文字と塗りに使う段は同系のより濃い段へ寄せ**、mockup の明るい色は
 * 装飾用の `*Soft` 背景側に残す。この対応関係は `contrastRequirements` が機械検証する。
 */
/**
 * Option A「グラファイト × アンバー」。無彩色 (グラファイト) を基調にし、
 * 唯一の有彩アクセント `accentAi` (アンバー) は「実行中・ヒアリング中」など
 * 動作中の状態表現に限定する。AI 機能専用の色相 (紫・青など) は割り当てない
 * ことで「AI っぽさ」を出さない、が設計意図の核 (HarnessHub 配色仕様書 v2)。
 */
const lightColors = {
  /** アプリ外周・メイン領域の背景 */
  bg: '#f1f1ef',
  /** カード・パネルの面 */
  surface: '#ffffff',
  /** 面の中の弱い区画 (サイドバー・テーブル header 等) */
  surfaceMuted: '#e9e9e6',
  /** 装飾的な罫線 (3:1 を要求しない) */
  border: '#d9d9d5',
  /**
   * 入力欄の輪郭など、操作部品の境界。仕様書の指定値 (#c4c4bf) は
   * `surface`/`surfaceMuted` 双方で 3:1 を満たさなかったため、
   * token 契約 (`contrastRequirements`) を満たす濃さへ補正している。
   */
  borderStrong: '#84848a',
  /** 本文 */
  text: '#141417',
  /** 補足文・中立チップの文字 */
  textMuted: '#5c5c62',
  /** 主操作の塗り・アクティブ要素 (グラファイト) */
  primary: '#232326',
  primaryHover: '#3a3a3f',
  primarySoft: '#e3e3e0',
  onPrimary: '#ffffff',
  /**
   * 状態専用アクセント (アンバー)。「実行中」「ヒアリング中」等の動作中表現
   * 専用で、主要 CTA には使わない。AI ヒアリングパネルの HEARING タグもこの
   * 色を使い、AI 専用の別色は持たない。
   */
  accentAi: '#b45309',
  accentAiSoft: '#fbf3e2',
  onAccentAi: '#ffffff',
  /** 稼働中・完了 */
  success: '#166534',
  successSoft: '#ddefe3',
  /** 構築中・要確認 */
  warning: '#92580a',
  warningSoft: '#f3e8d3',
  /** 破壊的操作・エラー */
  danger: '#b91c1c',
  dangerHover: '#8f1717',
  dangerSoft: '#f6e2e0',
  onDanger: '#ffffff',
  /** チャート系列 (仕様書は近彩度のグラファイト系で統一するため、識別用に控えめな彩度で補完) */
  infoCyan: '#3f5b66',
  infoSoft: '#e3ebed',
  magenta: '#6b3b4a',
  magentaSoft: '#efe2e6',
  /** 下書き・中立チップの背景 */
  neutralSoft: '#e6e6e3',
  /** フォーカスリング。色のみに依存しないよう輪郭形状も併用する */
  focusRing: '#232326',
} as const satisfies Record<ColorTokenName, string>;

const darkColors: Record<ColorTokenName, string> = {
  bg: '#1a1a1e',
  surface: '#242429',
  surfaceMuted: '#2e2e34',
  border: '#3f3f46',
  // 仕様書の指定値 (#52525b) は 3:1 契約を満たさず、同じ理由で補正
  borderStrong: '#8a8a92',
  text: '#fafafa',
  textMuted: '#b0b0b8',
  // 白黒反転 (役割は light と同じ)
  primary: '#fafafa',
  primaryHover: '#d4d4d8',
  primarySoft: '#2e2e34',
  onPrimary: '#141417',
  accentAi: '#fbbf6d',
  accentAiSoft: '#362a15',
  onAccentAi: '#1c1305',
  success: '#6ee7a0',
  successSoft: '#1a3323',
  warning: '#f2c464',
  warningSoft: '#362a15',
  danger: '#fca5a0',
  dangerHover: '#ffb9b5',
  dangerSoft: '#3b201f',
  onDanger: '#1c1305',
  infoCyan: '#9db8c2',
  infoSoft: '#26333a',
  magenta: '#c98fa3',
  magentaSoft: '#332229',
  neutralSoft: '#33333a',
  focusRing: '#fafafa',
};

/** テーマ別の色 token。 */
export const colorTokens: Record<ThemeName, Record<ColorTokenName, string>> = {
  light: lightColors,
  dark: darkColors,
};

/** 余白 (4px グリッド)。 */
export const spacingTokens = {
  '0': '0',
  '1': '4px',
  '2': '8px',
  '3': '12px',
  '4': '16px',
  '5': '24px',
  '6': '32px',
  '7': '48px',
} as const;
export type SpacingTokenName = keyof typeof spacingTokens;

/** 角丸。 */
export const radiusTokens = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  full: '9999px',
  /** カード専用 (HarnessHub 配色仕様書 v2 §6)。既存の 4 段階と揃えず単独値にするのは、
   * `md` を 10px へ寄せると Alert/Toast/Markdown コードブロックなど他の `md` 消費者まで
   * 一緒にずれてしまうため。カードだけが 8px でも 12px でもない仕様書指定値を持つ。 */
  card: '10px',
} as const;
export type RadiusTokenName = keyof typeof radiusTokens;

/** タイポグラフィ。本文 16px を基準に、12px 未満は使わない。 */
export const typographyTokens = {
  /**
   * UI 英数字は IBM Plex Sans、日本語グリフは Noto Sans JP へ字形単位でフォールバックする
   * (lang 分岐なしで 1 つの font-family 宣言に両方を並べる)。両方とも next/font/google の
   * self-host (apps/hub/src/app/fonts.ts) が `--font-*` へ実体を供給する。consumer 側で
   * その variable class が無い場合 (Storybook 等) は `var(--x, fallback)` の第 2 引数が効き、
   * 未設定でも font-family 宣言自体は壊れない。
   */
  fontFamily:
    "var(--font-ibm-plex-sans, 'IBM Plex Sans'), var(--font-noto-sans-jp, 'Noto Sans JP'), system-ui, -apple-system, 'Segoe UI', sans-serif",
  /** Harness ID・タグ・ログ表示用。 */
  fontFamilyMono:
    "var(--font-jetbrains-mono, 'JetBrains Mono'), ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace",
  fontSizeXs: '12px',
  fontSizeSm: '14px',
  fontSizeMd: '16px',
  fontSizeLg: '20px',
  fontSizeXl: '24px',
  lineHeightTight: '1.4',
  lineHeightNormal: '1.7',
  fontWeightNormal: '400',
  fontWeightBold: '700',
} as const;
export type TypographyTokenName = keyof typeof typographyTokens;

/**
 * 表示密度。`comfortable` の操作部品は 44px 角のタップ域を確保する (frontend-spec §6.1)。
 * `compact` でも 36px を下回らない。
 */
export const densityTokens: Record<Density, { controlHeight: string; rowPaddingY: string; gap: string }> = {
  comfortable: { controlHeight: '44px', rowPaddingY: '12px', gap: '12px' },
  compact: { controlHeight: '36px', rowPaddingY: '6px', gap: '8px' },
};

/** コントラスト検証の 1 項目。 */
export interface ContrastRequirement {
  foreground: ColorTokenName;
  background: ColorTokenName;
  minRatio: number;
  usage: string;
}

/**
 * token 段階のコントラスト契約。
 * 「文字として使う組合せ」は 4.5:1、「操作部品の境界・図形」は 3:1 を要求する。
 * 新しい色 token を足すときは、必ずここに使い方を登録すること。
 */
export const contrastRequirements: readonly ContrastRequirement[] = [
  { foreground: 'text', background: 'surface', minRatio: AA_CONTRAST_TEXT, usage: '本文' },
  { foreground: 'text', background: 'bg', minRatio: AA_CONTRAST_TEXT, usage: '背景上の本文' },
  { foreground: 'text', background: 'surfaceMuted', minRatio: AA_CONTRAST_TEXT, usage: 'テーブル header の文字' },
  { foreground: 'textMuted', background: 'surface', minRatio: AA_CONTRAST_TEXT, usage: '補足文' },
  { foreground: 'textMuted', background: 'bg', minRatio: AA_CONTRAST_TEXT, usage: '背景上の補足文' },
  { foreground: 'textMuted', background: 'neutralSoft', minRatio: AA_CONTRAST_TEXT, usage: '中立チップの文字' },
  { foreground: 'primary', background: 'surface', minRatio: AA_CONTRAST_TEXT, usage: 'リンク文字' },
  { foreground: 'primary', background: 'bg', minRatio: AA_CONTRAST_TEXT, usage: '背景上のリンク文字' },
  { foreground: 'primary', background: 'primarySoft', minRatio: AA_CONTRAST_TEXT, usage: '主状態チップの文字' },
  { foreground: 'onPrimary', background: 'primary', minRatio: AA_CONTRAST_TEXT, usage: '主ボタンの文字' },
  { foreground: 'onPrimary', background: 'primaryHover', minRatio: AA_CONTRAST_TEXT, usage: '主ボタン hover の文字' },
  { foreground: 'accentAi', background: 'surface', minRatio: AA_CONTRAST_TEXT, usage: 'AI 関連の文字' },
  { foreground: 'accentAi', background: 'accentAiSoft', minRatio: AA_CONTRAST_TEXT, usage: 'AI チップの文字' },
  { foreground: 'onAccentAi', background: 'accentAi', minRatio: AA_CONTRAST_TEXT, usage: 'AI 塗りの文字' },
  { foreground: 'success', background: 'surface', minRatio: AA_CONTRAST_TEXT, usage: '完了の文字' },
  { foreground: 'success', background: 'successSoft', minRatio: AA_CONTRAST_TEXT, usage: '完了チップの文字' },
  { foreground: 'warning', background: 'surface', minRatio: AA_CONTRAST_TEXT, usage: '警告の文字' },
  { foreground: 'warning', background: 'warningSoft', minRatio: AA_CONTRAST_TEXT, usage: '警告チップの文字' },
  { foreground: 'danger', background: 'surface', minRatio: AA_CONTRAST_TEXT, usage: 'エラーの文字' },
  { foreground: 'danger', background: 'dangerSoft', minRatio: AA_CONTRAST_TEXT, usage: 'エラーチップの文字' },
  { foreground: 'onDanger', background: 'danger', minRatio: AA_CONTRAST_TEXT, usage: '破壊的操作ボタンの文字' },
  { foreground: 'onDanger', background: 'dangerHover', minRatio: AA_CONTRAST_TEXT, usage: '破壊的操作 hover の文字' },
  { foreground: 'infoCyan', background: 'surface', minRatio: AA_CONTRAST_TEXT, usage: '情報の文字' },
  { foreground: 'infoCyan', background: 'infoSoft', minRatio: AA_CONTRAST_TEXT, usage: '情報チップの文字' },
  { foreground: 'magenta', background: 'surface', minRatio: AA_CONTRAST_TEXT, usage: 'タグの文字' },
  { foreground: 'magenta', background: 'magentaSoft', minRatio: AA_CONTRAST_TEXT, usage: 'タグチップの文字' },
  { foreground: 'borderStrong', background: 'surface', minRatio: AA_CONTRAST_NON_TEXT, usage: '入力欄の輪郭' },
  { foreground: 'borderStrong', background: 'surfaceMuted', minRatio: AA_CONTRAST_NON_TEXT, usage: '弱い面の上の輪郭' },
  { foreground: 'focusRing', background: 'surface', minRatio: AA_CONTRAST_NON_TEXT, usage: 'フォーカスリング' },
  { foreground: 'focusRing', background: 'bg', minRatio: AA_CONTRAST_NON_TEXT, usage: '背景上のフォーカスリング' },
];

export interface ContrastCheckResult extends ContrastRequirement {
  theme: ThemeName;
  ratio: number;
  passes: boolean;
}

/**
 * 指定テーマ (省略時は全テーマ) のコントラスト契約を検証する。
 * consumer 側の CI からも同じ判定を再実行できるよう公開 API にしている。
 */
export function checkContrastRequirements(theme?: ThemeName): ContrastCheckResult[] {
  const targets: readonly ThemeName[] = theme ? [theme] : themeNames;

  return targets.flatMap((name) =>
    contrastRequirements.map((requirement) => {
      const palette = colorTokens[name];
      const ratio = contrastRatio(palette[requirement.foreground], palette[requirement.background]);
      return { ...requirement, theme: name, ratio, passes: ratio >= requirement.minRatio };
    }),
  );
}

/** `{ fontSizeMd: '16px' }` を `  --hh-font-size-md: 16px;` の並びにする。 */
function declarations(entries: Record<string, string>, namespace?: string): string {
  const prefix = namespace ? `--hh-${namespace}-` : '--hh-';
  return Object.entries(entries)
    .map(([key, value]) => `  ${prefix}${kebab(key)}: ${value};`)
    .join('\n');
}

const colorBlock = (theme: ThemeName, indent = ''): string =>
  Object.entries(colorTokens[theme])
    .map(([token, value]) => `${indent}  ${colorVariableName(token as ColorTokenName)}: ${value};`)
    .join('\n');

/**
 * design token を CSS カスタムプロパティとして出力する。
 * テーマは `data-theme`、密度は `data-density` の属性切替で適用する (frontend-spec §2.1)。
 */
export function buildThemeCss(): string {
  return [
    [
      ':root {',
      colorBlock('light'),
      declarations(spacingTokens, 'space'),
      declarations(radiusTokens, 'radius'),
      declarations(typographyTokens),
      declarations(densityTokens.comfortable),
      // 分岐そのものは base-css.ts が literal で持つ。ここに出すのは、部品や app 側が
      // 「今どの段階を境にしているか」を CSS/JS から参照できるようにするため
      declarations(
        Object.fromEntries(Object.entries(breakpointTokens).map(([name, value]) => [name, `${value}px`])),
        'breakpoint',
      ),
      '}',
    ].join('\n'),
    // ネイティブ部品 (スクロールバー・select の展開部・日付ピッカー・フォーム部品の枠) は
    // token を読まないので、`color-scheme` で明示しないと dark 配色の上に明色の部品が乗る。
    // light / dark / auto の 3 系統すべてで宣言する (どれか 1 つでも欠けるとそこだけ破綻する)。
    `[data-theme='light'] {\n  color-scheme: light;\n}`,
    `[data-theme='dark'] {\n${colorBlock('dark')}\n  color-scheme: dark;\n}`,
    // auto の既定側は light。OS が dark のときだけ下の media が上書きする。
    `[data-theme='auto'] {\n  color-scheme: light;\n}`,
    `@media (prefers-color-scheme: dark) {\n  [data-theme='auto'] {\n${colorBlock('dark', '  ')}\n    color-scheme: dark;\n  }\n}`,
    `[data-density='compact'] {\n${declarations(densityTokens.compact)}\n}`,
    // 操作部品のフォーカス可視化。色のみに頼らず輪郭と余白でも示す (WCAG 2.2 の 2.4.11 対応)。
    // 宣言本体は focus-ring.ts が正本 (ネイティブ要素向けの base 層と見え方を揃えるため)。
    focusRingRule(':where([data-hh-focusable]):focus-visible'),
  ].join('\n\n');
}
