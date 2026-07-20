/** design tokens (色・余白・タイポ・表示密度) の正本。文字色は 4.5:1 を token 段階で保証する。 */
import {
  AA_CONTRAST_NON_TEXT,
  AA_CONTRAST_TEXT,
  contrastRatio,
} from './contrast.js';

export const themeNames = ['light', 'dark'] as const;
export type ThemeName = (typeof themeNames)[number];
/** 利用者の選択値。`auto` は OS 設定 (`prefers-color-scheme`) に追従する。 */
export type ThemePreference = ThemeName | 'auto';

export const densityNames = ['comfortable', 'compact'] as const;
export type Density = (typeof densityNames)[number];

/**
 * light の色 token。
 *
 * mockup 実測値 (frontend-spec §2.1) のうち `--primary #1677ff` `--success #52c41a`
 * `--warning #fa8c16` `--danger #ff4d4f` は、白文字・白背景いずれでも 4.5:1 に届かない
 * (実測 3.3〜4.1:1)。shared-layers §1 は「コントラスト比 4.5:1 以上を **token 段階で保証**」を
 * 求めているため、**文字と塗りに使う段は同系のより濃い段へ寄せ**、mockup の明るい色は
 * 装飾用の `*Soft` 背景側に残す。この対応関係は `contrastRequirements` が機械検証する。
 */
const lightColors = {
  /** 画面全体の背景 */
  bg: '#f5f7fa',
  /** カード・パネルの面 */
  surface: '#ffffff',
  /** 面の中の弱い区画 (テーブル header 等) */
  surfaceMuted: '#f0f0f0',
  /** 装飾的な罫線 (3:1 を要求しない) */
  border: '#d9d9d9',
  /** 入力欄の輪郭など、操作部品の境界 (弱い面 `surfaceMuted` の上でも 3:1 を満たす濃さにする) */
  borderStrong: '#808080',
  /** 本文 */
  text: '#1f2329',
  /** 補足文 */
  textMuted: '#5c6470',
  /** 主操作の塗り・リンク文字 */
  primary: '#0958d9',
  primaryHover: '#003eb3',
  primarySoft: '#e6f4ff',
  onPrimary: '#ffffff',
  /** AI 関連 (生成中・AI 回答・下書き) */
  accentAi: '#531dab',
  accentAiSoft: '#f9f0ff',
  onAccentAi: '#ffffff',
  /** 完了・Green 判定 */
  success: '#237804',
  successSoft: '#f6ffed',
  /** Yellow 判定・warn リスク */
  warning: '#ad4e00',
  warningSoft: '#fff7e6',
  /** 破壊的操作・Red 判定・エラー */
  danger: '#cf1322',
  dangerHover: '#a8071a',
  dangerSoft: '#fff1f0',
  onDanger: '#ffffff',
  /** チャート系列・タグ */
  infoCyan: '#006d75',
  infoSoft: '#e6fffb',
  magenta: '#c41d7f',
  magentaSoft: '#fff0f6',
  /** 中立チップの背景 */
  neutralSoft: '#f0f0f0',
  /** フォーカスリング。色のみに依存しないよう輪郭形状も併用する */
  focusRing: '#0958d9',
} as const;

export type ColorTokenName = keyof typeof lightColors;

const darkColors: Record<ColorTokenName, string> = {
  bg: '#14161a',
  surface: '#1c1f26',
  surfaceMuted: '#22262f',
  border: '#333842',
  borderStrong: '#737d8f',
  text: '#e8eaed',
  textMuted: '#a6adba',
  primary: '#4096ff',
  primaryHover: '#69b1ff',
  primarySoft: '#111a2c',
  onPrimary: '#14161a',
  accentAi: '#b37feb',
  accentAiSoft: '#1a1325',
  onAccentAi: '#14161a',
  success: '#95de64',
  successSoft: '#162312',
  warning: '#ffc069',
  warningSoft: '#2b1d11',
  danger: '#ff7875',
  dangerHover: '#ff9c99',
  dangerSoft: '#2a1215',
  onDanger: '#14161a',
  infoCyan: '#5cdbd3',
  infoSoft: '#112123',
  magenta: '#ff85c0',
  magentaSoft: '#291321',
  neutralSoft: '#22262f',
  focusRing: '#69b1ff',
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
} as const;
export type RadiusTokenName = keyof typeof radiusTokens;

/** タイポグラフィ。本文 16px を基準に、12px 未満は使わない。 */
export const typographyTokens = {
  fontFamily: "'Noto Sans JP', system-ui, -apple-system, 'Segoe UI', sans-serif",
  fontFamilyMono: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace",
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

/**
 * チャートの系列色の順序 (固定)。
 * 色だけに依存させないため、部品側で形状・ラベルを必ず併記する。
 */
export const chartSeriesTokens: readonly ColorTokenName[] = [
  'primary',
  'accentAi',
  'infoCyan',
  'warning',
  'magenta',
  'success',
];

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

/** 色 token に対応する CSS カスタムプロパティ名。 */
export function colorVariableName(token: ColorTokenName): string {
  return `--hh-color-${token.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)}`;
}

const kebab = (key: string): string => key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);

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
      '}',
    ].join('\n'),
    `[data-theme='dark'] {\n${colorBlock('dark')}\n}`,
    `@media (prefers-color-scheme: dark) {\n  [data-theme='auto'] {\n${colorBlock('dark', '  ')}\n  }\n}`,
    `[data-density='compact'] {\n${declarations(densityTokens.compact)}\n}`,
    // 操作部品のフォーカス可視化。色のみに頼らず輪郭と余白でも示す (WCAG 2.2 の 2.4.11 対応)。
    ":where([data-hh-focusable]):focus-visible {\n  outline: 2px solid var(--hh-color-focus-ring);\n  outline-offset: 2px;\n}",
  ].join('\n\n');
}
