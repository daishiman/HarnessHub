/** design tokens (色・余白・タイポ・表示密度) の正本。文字色は 4.5:1 を token 段階で保証する。 */
import { AA_CONTRAST_NON_TEXT, AA_CONTRAST_TEXT, contrastRatio } from './contrast.js';
import { focusRingRule } from './focus-ring.js';
import {
  breakpointTokens,
  type ColorTokenName,
  colorVariableName,
  type Density,
  kebab,
  type PaletteName,
  paletteNames,
  type ThemeName,
  themeNames,
} from './token-names.js';

// 名前だけの葉モジュール (token-names.ts) を正本として再輸出する。公開 API の形は従来どおり
// `@harness-hub/ui` から同じ識別子で参照できる (HarnessHub-vwxc の client bundle 削減)。
export type {
  BreakpointName,
  ColorTokenName,
  Density,
  PaletteName,
  ThemeName,
  ThemePreference,
} from './token-names.js';
export {
  breakpointTokens,
  chartSeriesTokens,
  colorVariableName,
  defaultPaletteName,
  densityNames,
  mediaDown,
  mediaUp,
  paletteNames,
  themeNames,
} from './token-names.js';

/**
 * light の色 token (Harness Studio デザインシステム Option A「グラファイト × アンバー」)。
 *
 * 設計の核は 3 つ。
 *   1. **主色は無彩色 (グラファイト)**。CI/ビルドツールらしい硬質さを出し、
 *      紫・ネオン・グラデーションを使わないことで "AI っぽさ" を排除する。
 *   2. **アンバー `accent` は状態専用**。「実行中」「ヒアリング中」など動作中の表現だけに使い、
 *      主要 CTA には使わない (CTA は `primary`)。
 *   3. **AI 機能を特別扱いしない**。旧 `accentAi` (紫) は廃止した。
 *
 * デザインシステム記載値からの逸脱は 2 つだけで、いずれも「文字・境界のコントラストを
 * token 段階で機械保証する」(shared-layers §1) という本リポジトリ側の既存契約を優先した結果である。
 * 逸脱は `contrastRequirements` が機械検証するので、値を戻すとテストが落ちる。
 *   - `accent`: 仕様値 `#b45309` は surface (白) では 5.02:1 だが bg `#f1f1ef` 上で 4.44:1 と
 *     AA を割る。同色相のまま 1 段暗い `#aa4e09` にして bg 上でも 4.88:1 を確保した。
 *   - `borderStrong`: 仕様値 `#c4c4bf` は surface 上 1.75:1 で、WCAG 1.4.11 (非テキスト 3:1) を
 *     大きく下回る。入力欄の輪郭が見えないことを意味するため `#868683` へ寄せた
 *     (弱い面 `surfaceMuted` の上でちょうど 3.00:1)。仕様側の淡い罫線は装飾用の `border` が担う。
 */
const lightColors = {
  /** アプリ外周 (アプリ外枠の外側)。面 `surface` との間に 3 段の明度差を作る一番外の段 */
  pageBg: '#e2e2df',
  /** メイン領域の背景 */
  bg: '#f1f1ef',
  /** カード・パネルの面 */
  surface: '#ffffff',
  /** サイドバー等の沈んだ面・面の中の弱い区画 (テーブル header 等) */
  surfaceMuted: '#e9e9e6',
  /** 装飾的な罫線 (3:1 を要求しない) */
  border: '#d9d9d5',
  /** 入力欄の輪郭・ホバー境界線 (弱い面 `surfaceMuted` の上でも 3:1 を満たす濃さにする) */
  borderStrong: '#868683',
  /** 本文 */
  text: '#141417',
  /** 補足文・キャプション */
  textMuted: '#5c5c62',
  /** ボタン・アクティブ要素・リンク文字 (グラファイト) */
  primary: '#232326',
  primaryHover: '#3a3a3f',
  primarySoft: '#e5e5e2',
  onPrimary: '#ffffff',
  /** 状態専用アンバー (実行中・ヒアリング中)。主要 CTA には使わない */
  accent: '#aa4e09',
  accentSoft: '#f7ecd9',
  onAccent: '#ffffff',
  /** 下書き・中立 */
  neutral: '#52525b',
  /** 稼働中・完了 */
  success: '#166534',
  successSoft: '#ddefe3',
  /** 構築中・要確認 */
  warning: '#92580a',
  warningSoft: '#f3e8d3',
  /** 破壊的操作・エラー */
  danger: '#b91c1c',
  dangerHover: '#911616',
  dangerSoft: '#f6e2e0',
  onDanger: '#ffffff',
  /** チャート系列・タグ専用 (UI の面・文字には使わない) */
  infoCyan: '#006d75',
  infoSoft: '#e0f2f1',
  /**
   * 本文コールアウト (ポイント・補足) 専用のブルー。
   * `primary` が無彩色グラファイトなので `primarySoft` を本文の注記面に使うと、
   * light では `neutralSoft` と見分けが付かないグレーの箱になる。
   */
  infoBlue: '#1d4ed8',
  infoBlueSoft: '#e7effb',
  magenta: '#a3125f',
  magentaSoft: '#f6e3ed',
  /** 中立チップの背景 */
  neutralSoft: '#e6e6e3',
  /** フォーカスリング。有彩色に頼らずグラファイトで示し、輪郭形状も併用する */
  focusRing: '#232326',
} as const satisfies Record<ColorTokenName, string>;

/**
 * dark の色 token。
 *
 * 白黒を反転させるが**役割は同じ**。背景 (`bg`) → 面 (`surface`) → 沈んだ面 (`surfaceMuted`)
 * の 3 段階の明度差を必ず保ち、黒を沈めすぎない。`borderStrong` だけは仕様値 `#52525b` が
 * surface 上 2.00:1 で非テキスト 3:1 を満たさないため `#77777e` へ持ち上げている
 * (light 側と同じ理由)。
 */
const darkColors: Record<ColorTokenName, string> = {
  pageBg: '#121215',
  bg: '#1a1a1e',
  surface: '#242429',
  surfaceMuted: '#2e2e34',
  border: '#3f3f46',
  borderStrong: '#77777e',
  text: '#fafafa',
  textMuted: '#b0b0b8',
  primary: '#fafafa',
  primaryHover: '#d4d4d8',
  primarySoft: '#32323a',
  onPrimary: '#141417',
  accent: '#fbbf6d',
  accentSoft: '#33240d',
  onAccent: '#1c1305',
  neutral: '#c0c0c8',
  success: '#6ee7a0',
  successSoft: '#1a3323',
  warning: '#f2c464',
  warningSoft: '#362a15',
  danger: '#fca5a0',
  dangerHover: '#ffc9c6',
  dangerSoft: '#3b201f',
  onDanger: '#1c1305',
  infoCyan: '#5cdbd3',
  infoSoft: '#112123',
  infoBlue: '#93c5fd',
  infoBlueSoft: '#152845',
  magenta: '#ff85c0',
  magentaSoft: '#291321',
  neutralSoft: '#33333a',
  focusRing: '#fafafa',
};

/** テーマ別の色 token。`palette=gray` の値そのもの。 */
export const colorTokens: Record<ThemeName, Record<ColorTokenName, string>> = {
  light: lightColors,
  dark: darkColors,
};

/**
 * 配色ごとに差し替える token の範囲。
 *
 * ここに**入れていない** token (success / warning / danger / accent / infoCyan / magenta / chart 系列、
 * および text / textMuted) は全配色で同一にする。状態色が配色で変わると「緑=完了・赤=エラー」という
 * 学習が配色を変えた瞬間に無効になり、色を意味の担い手として使えなくなるため。
 * 配色が持ち替えるのは「面・罫線・主色」= 地の性格だけに限る。
 */
export const paletteTokenNames = [
  'pageBg',
  'bg',
  'surface',
  'surfaceMuted',
  'border',
  'borderStrong',
  'primary',
  'primaryHover',
  'primarySoft',
  'onPrimary',
  'neutralSoft',
  'focusRing',
] as const satisfies readonly ColorTokenName[];

export type PaletteTokenName = (typeof paletteTokenNames)[number];

type PaletteColors = Record<PaletteTokenName, string>;

/** `gray` は基準なので base の値をそのまま写す (表を全配色で同じ形にして、検証を 1 本の loop にする)。 */
function basePaletteColors(theme: ThemeName): PaletteColors {
  return Object.fromEntries(paletteTokenNames.map((token) => [token, colorTokens[theme][token]])) as PaletteColors;
}

/**
 * 配色 × 明るさの色 token。
 *
 * 値は「gray と同じ明度段を保ったまま色相を寄せる」方針で決めている。面の 3 段
 * (pageBg → bg → surface → surfaceMuted) の明度差と、`borderStrong` が弱い面の上で 3:1 を
 * 満たすことは配色を変えても崩さない。`checkContrastRequirements()` が全 5 配色 × 2 明るさを
 * 走査するので、ここを触ると自動で AA 契約が再検査される。
 */
export const paletteColorTokens: Record<PaletteName, Record<ThemeName, PaletteColors>> = {
  gray: { light: basePaletteColors('light'), dark: basePaletteColors('dark') },
  blue: {
    light: {
      pageBg: '#dde4ee',
      bg: '#eef2f9',
      surface: '#ffffff',
      surfaceMuted: '#e5ebf5',
      border: '#d5deea',
      borderStrong: '#6f798c',
      primary: '#1e3a8a',
      primaryHover: '#2b4ba6',
      primarySoft: '#dde5f3',
      onPrimary: '#ffffff',
      neutralSoft: '#e3e9f3',
      focusRing: '#1e3a8a',
    },
    dark: {
      pageBg: '#0d1220',
      bg: '#131a2a',
      surface: '#1c2436',
      surfaceMuted: '#263046',
      border: '#38445c',
      borderStrong: '#8593ad',
      primary: '#dbe7ff',
      primaryHover: '#b9cdf5',
      primarySoft: '#2b3852',
      onPrimary: '#101828',
      neutralSoft: '#2c3850',
      focusRing: '#dbe7ff',
    },
  },
  beige: {
    light: {
      pageBg: '#e7e0d3',
      bg: '#f6f2ea',
      surface: '#fffefb',
      surfaceMuted: '#ede7da',
      border: '#ded6c6',
      borderStrong: '#7d7466',
      primary: '#3b3227',
      primaryHover: '#574a38',
      primarySoft: '#eae2d2',
      onPrimary: '#fffefb',
      neutralSoft: '#ebe4d6',
      focusRing: '#3b3227',
    },
    dark: {
      pageBg: '#17140f',
      bg: '#1f1b15',
      surface: '#2a251d',
      surfaceMuted: '#353027',
      border: '#474135',
      borderStrong: '#948a76',
      primary: '#f7f0e2',
      primaryHover: '#ded6c4',
      primarySoft: '#3a3428',
      onPrimary: '#1a160f',
      neutralSoft: '#3b3529',
      focusRing: '#f7f0e2',
    },
  },
  green: {
    light: {
      pageBg: '#dbe7dd',
      bg: '#eef5f0',
      surface: '#ffffff',
      surfaceMuted: '#e4efe8',
      border: '#d2e0d6',
      borderStrong: '#69796e',
      primary: '#14532d',
      primaryHover: '#1f6b3d',
      primarySoft: '#dcebe1',
      onPrimary: '#ffffff',
      neutralSoft: '#e2ece6',
      focusRing: '#14532d',
    },
    dark: {
      pageBg: '#0d1512',
      bg: '#141d18',
      surface: '#1d2721',
      surfaceMuted: '#27332c',
      border: '#3a473f',
      borderStrong: '#88998e',
      primary: '#e3f3e8',
      primaryHover: '#c2ddcb',
      primarySoft: '#2b3a31',
      onPrimary: '#101a14',
      neutralSoft: '#2d3c33',
      focusRing: '#e3f3e8',
    },
  },
  navy: {
    light: {
      pageBg: '#d7dded',
      bg: '#eaeef8',
      surface: '#ffffff',
      surfaceMuted: '#e0e6f4',
      border: '#ced7ea',
      borderStrong: '#6a7590',
      primary: '#172554',
      primaryHover: '#24376f',
      primarySoft: '#dce3f2',
      onPrimary: '#ffffff',
      neutralSoft: '#dee5f2',
      focusRing: '#172554',
    },
    dark: {
      pageBg: '#0a0f1e',
      bg: '#101728',
      surface: '#192134',
      surfaceMuted: '#232d44',
      border: '#35415a',
      borderStrong: '#8390ab',
      primary: '#dde6fb',
      primaryHover: '#bac9ee',
      primarySoft: '#28334d',
      onPrimary: '#0c1322',
      neutralSoft: '#2a344e',
      focusRing: '#dde6fb',
    },
  },
};

/** 配色 × 明るさを重ねた実効の色 token。CSS 生成とコントラスト検証の唯一の解決経路。 */
export function resolvePaletteColors(palette: PaletteName, theme: ThemeName): Record<ColorTokenName, string> {
  return { ...colorTokens[theme], ...paletteColorTokens[palette][theme] };
}

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

/**
 * 角丸。段階は Harness Studio デザインシステム §7 のコンポーネント表に対応する。
 *   sm 4px … 入力欄内部の小片・コードブロック
 *   md 8px … ボタン
 *   card 10px … Harness カード等の一覧要素
 *   lg 12px … シート・モーダル (モバイルのアプリ外枠上端もここ)
 *   frame 14px … アプリ外枠
 *   full … ステータスバッジのピル型
 */
export const radiusTokens = {
  sm: '4px',
  md: '8px',
  card: '10px',
  // 段は sm / md / card / frame の 4 つだけ。旧 `lg: 12px` は card と frame の中間に立ち、
  // 同じ役割の面が画面ごとに 10px と 12px へ割れる原因だったため削除した。
  // 値を残しておくと型が通ってしまい、5 段目がいつでも復活する。
  frame: '14px',
  full: '9999px',
} as const;
export type RadiusTokenName = keyof typeof radiusTokens;

/**
 * 影 (elevation)。無彩色基調では明度差だけで階層を作りにくいため、
 * アプリ外枠と迫り上がるシートにだけ影を許す。色は持たず不透明度だけで表現し、
 * dark でも同じ宣言が使えるようにしている (dark で白い影を敷くと霞んで見えるため)。
 */
export const shadowTokens = {
  /** アプリ外枠 */
  frame: '0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px rgb(0 0 0 / 0.06)',
  /** モバイルの「その他」シートなど、下から迫り上がる面 */
  raised: '0 -8px 24px rgb(0 0 0 / 0.18)',
} as const;
export type ShadowTokenName = keyof typeof shadowTokens;

/**
 * タイポグラフィ。本文 16px を基準に、12px 未満は使わない。
 *
 * 書体は Harness Studio デザインシステム §3 に従い 2 系統に分ける。
 *   - `fontFamily`: UI 英数字を IBM Plex Sans、日本語はシステムフォント (ヒラギノ角ゴ /
 *     游ゴシック) が受け持つ。英数字だけを Plex に寄せると和欧混植で字面が揃うため、
 *     日本語 Web フォント (IBM Plex Sans JP) は読み込みサイズを理由に採用しない。
 *   - `fontFamilyMono`: Harness ID・タグ・ログ・ステータスバッジを JetBrains Mono。
 *     識別子を等幅にすることで、桁数の違いが目で分かるようにする。
 * どちらも SIL Open Font License 1.1 (商用可・クレジット不要)。
 * 読み込みは self-host subset + `display: swap` (Workers 制約と CWV のため CDN 直参照はしない)。
 *
 * 本文サイズをデザインシステムの 13〜14px でなく 16px のままにしているのは、
 * 本リポジトリが日本語を主言語とし、かつ WCAG 1.4.4 の 200% 拡大時の破綻を避けるため。
 * デザインシステム側の 13〜14px は英数字 UI を前提にした値であり、
 * 日本語では同じ級数でも字面が小さく見える (この差は §3 の「日本語本文」欄と整合する)。
 */
export const typographyTokens = {
  fontFamily:
    "'IBM Plex Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', system-ui, -apple-system, 'Segoe UI', sans-serif",
  fontFamilyMono: "'JetBrains Mono', ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace",
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
  { foreground: 'accent', background: 'surface', minRatio: AA_CONTRAST_TEXT, usage: '実行中状態の文字' },
  { foreground: 'accent', background: 'bg', minRatio: AA_CONTRAST_TEXT, usage: '背景上の実行中状態の文字' },
  { foreground: 'accent', background: 'accentSoft', minRatio: AA_CONTRAST_TEXT, usage: '実行中チップの文字' },
  { foreground: 'onAccent', background: 'accent', minRatio: AA_CONTRAST_TEXT, usage: '実行中塗りの文字' },
  { foreground: 'neutral', background: 'surface', minRatio: AA_CONTRAST_TEXT, usage: '下書き・中立の文字' },
  { foreground: 'neutral', background: 'neutralSoft', minRatio: AA_CONTRAST_TEXT, usage: '中立チップの文字' },
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
  { foreground: 'infoBlue', background: 'surface', minRatio: AA_CONTRAST_TEXT, usage: 'コールアウト見出しの文字' },
  { foreground: 'infoBlue', background: 'infoBlueSoft', minRatio: AA_CONTRAST_TEXT, usage: 'コールアウト面上の見出し' },
  { foreground: 'text', background: 'infoBlueSoft', minRatio: AA_CONTRAST_TEXT, usage: 'コールアウト面上の本文' },
  { foreground: 'magenta', background: 'surface', minRatio: AA_CONTRAST_TEXT, usage: 'タグの文字' },
  { foreground: 'magenta', background: 'magentaSoft', minRatio: AA_CONTRAST_TEXT, usage: 'タグチップの文字' },
  { foreground: 'borderStrong', background: 'surface', minRatio: AA_CONTRAST_NON_TEXT, usage: '入力欄の輪郭' },
  { foreground: 'borderStrong', background: 'surfaceMuted', minRatio: AA_CONTRAST_NON_TEXT, usage: '弱い面の上の輪郭' },
  { foreground: 'focusRing', background: 'surface', minRatio: AA_CONTRAST_NON_TEXT, usage: 'フォーカスリング' },
  { foreground: 'focusRing', background: 'bg', minRatio: AA_CONTRAST_NON_TEXT, usage: '背景上のフォーカスリング' },
];

export interface ContrastCheckResult extends ContrastRequirement {
  theme: ThemeName;
  palette: PaletteName;
  ratio: number;
  passes: boolean;
}

/**
 * 指定テーマ (省略時は全テーマ) × 指定配色 (省略時は全配色) のコントラスト契約を検証する。
 * consumer 側の CI からも同じ判定を再実行できるよう公開 API にしている。
 *
 * 既定を「全配色」にしているのは、配色を足したときに検査を足し忘れる余地を消すため。
 * `paletteColorTokens` に 1 配色増やすだけで、その配色も自動で同じ契約に晒される。
 */
export function checkContrastRequirements(theme?: ThemeName, palette?: PaletteName): ContrastCheckResult[] {
  const themeTargets: readonly ThemeName[] = theme ? [theme] : themeNames;
  const paletteTargets: readonly PaletteName[] = palette ? [palette] : paletteNames;

  return paletteTargets.flatMap((paletteName) =>
    themeTargets.flatMap((name) => {
      const colors = resolvePaletteColors(paletteName, name);
      return contrastRequirements.map((requirement) => {
        const ratio = contrastRatio(colors[requirement.foreground], colors[requirement.background]);
        return {
          ...requirement,
          theme: name,
          palette: paletteName,
          ratio,
          passes: ratio >= requirement.minRatio,
        };
      });
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

/** 配色が差し替える token だけを宣言として出す (基準 `gray` との差分だけを CSS へ載せる)。 */
const paletteBlock = (palette: PaletteName, theme: ThemeName, indent = ''): string =>
  paletteTokenNames
    .map((token) => `${indent}  ${colorVariableName(token)}: ${paletteColorTokens[palette][theme][token]};`)
    .join('\n');

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
      declarations(shadowTokens, 'shadow'),
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
    // 配色の上書き。`gray` は :root / [data-theme='dark'] そのものなので出さない。
    //
    // 詳細度の並びが要点:
    //   [data-palette='X']                  (0,1,0) … light の面・主色
    //   [data-theme='dark']                 (0,1,0) … 基準配色の dark (上より前に出るので、
    //                                                  同点なら後勝ちで palette 側が勝つ)
    //   [data-palette='X'][data-theme='dark'] (0,2,0) … palette の dark が最終的に勝つ
    // palette の light 側と dark 側が **同じ token 集合**を出すことが前提で、
    // 片方だけ足すと dark で light の面が残る。`paletteTokenNames` を両方の鍵にしている理由。
    ...paletteNames
      .filter((palette) => palette !== 'gray')
      .flatMap((palette) => [
        `[data-palette='${palette}'] {\n${paletteBlock(palette, 'light')}\n}`,
        `[data-palette='${palette}'][data-theme='dark'] {\n${paletteBlock(palette, 'dark')}\n}`,
        `@media (prefers-color-scheme: dark) {\n  [data-palette='${palette}'][data-theme='auto'] {\n${paletteBlock(palette, 'dark', '  ')}\n  }\n}`,
      ]),
    `[data-density='compact'] {\n${declarations(densityTokens.compact)}\n}`,
    // 操作部品のフォーカス可視化。色のみに頼らず輪郭と余白でも示す (WCAG 2.2 の 2.4.11 対応)。
    // 宣言本体は focus-ring.ts が正本 (ネイティブ要素向けの base 層と見え方を揃えるため)。
    focusRingRule(':where([data-hh-focusable]):focus-visible'),
  ].join('\n\n');
}
