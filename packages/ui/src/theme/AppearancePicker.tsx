'use client';

/**
 * 外観 (配色 5 種 × 明るさ 3 種) の切替 UI。
 *
 * 見た目の決定だけを持ち、サーバ保存は持たない。選択は `useUi()` へ即時反映し、
 * 確定値を `onChange` で外へ渡す — 保存先 (`user_settings`) を知るのは consumer 側の責務で、
 * design system が特定アプリの API を知らない状態を保つため。
 *
 * スウォッチの色は、見本要素**自身**に `data-palette` / `data-theme` を付けて
 * `var(--hh-color-*)` を引く。CSS カスタムプロパティは継承するので、この 2 属性が
 * 付いた部分木だけが別配色に切り替わり、「まだ選んでいない配色の見本」を描ける
 * (tokens.css は 5 配色 × light/dark を `[data-palette='X'][data-theme='Y']` として全て出荷済み)。
 *
 * JS の値テーブル (`paletteColorTokens`) を引かないのは、それが tokens.ts (662 行) を
 * client chunk へ載せ、全 (dashboard) route の初期 JS を +6.4 KiB 押し上げるため。
 * 実測 (2026-08-15): この経路で 11 route が 120 KiB 予算を超えた。
 */

import { type CSSProperties, type ReactNode, useId } from 'react';

import { colorVar, radiusVar, spaceVar, visuallyHidden } from '../internal/style.js';
import { type PaletteName, paletteNames, type ThemeName, type ThemePreference } from '../tokens/token-names.js';
import { useUi } from './UiProvider.js';

/** 配色の表示名。token 名 (gray など) をそのまま画面へ出さないための対応表。 */
const PALETTE_LABELS: Readonly<Record<PaletteName, string>> = {
  gray: 'グレー',
  blue: 'ブルー',
  beige: 'ベージュ',
  green: 'グリーン',
  navy: 'ネイビー',
};

const THEME_OPTIONS: readonly { readonly value: ThemePreference; readonly label: string }[] = [
  { value: 'auto', label: '自動' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/**
 * 操作面の一辺。WCAG 2.2 の Target Size (Minimum) は 24px だが、
 * 密集した色見本を指で押し分けるため AAA 側の 44px を採る。
 */
const TOUCH_TARGET = '44px';

export interface AppearanceSelection {
  readonly theme: ThemePreference;
  readonly palette: PaletteName;
  /** `auto` を OS 設定で解決した実効テーマ。選択直後の値で、`useUi()` の再描画を待たない。 */
  readonly resolvedTheme: ThemeName;
}

export interface AppearancePickerProps {
  /** 選択確定時の通知先。サーバ保存はここで行う。 */
  onChange?: ((selection: AppearanceSelection) => void) | undefined;
  /** ラジオグループの name 接頭辞。同一ページに 2 つ置くとき、group が混ざらないようにする。 */
  name?: string | undefined;
  /** 保存結果などの補足表示 (`role="status"` を持つ要素を想定)。 */
  footer?: ReactNode | undefined;
}

const fieldsetStyle: CSSProperties = {
  border: 0,
  margin: 0,
  padding: 0,
  minInlineSize: 0,
};

const legendStyle: CSSProperties = {
  padding: 0,
  marginBlockEnd: spaceVar(1),
  fontSize: 'var(--hh-font-size-sm)',
  fontWeight: 600,
  color: colorVar('textMuted'),
};

/** OS 設定を読んで `auto` を解決する。matchMedia が無い環境 (SSR / 一部テスト) は light 扱い。 */
function resolveTheme(theme: ThemePreference): ThemeName {
  if (theme !== 'auto') return theme;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** 選択中であることを、枠の太さと色の両方で示す (色だけだと色覚特性によっては読み取れない)。 */
function selectionRing(selected: boolean): CSSProperties {
  return {
    outline: selected ? `2px solid ${colorVar('primary')}` : '1px solid transparent',
    outlineOffset: '2px',
  };
}

export function AppearancePicker({ onChange, name, footer }: AppearancePickerProps): ReactNode {
  const { theme, palette, resolvedTheme, setTheme, setPalette } = useUi();
  const generatedName = useId();
  const groupName = name ?? generatedName;

  const apply = (next: { theme?: ThemePreference; palette?: PaletteName }): void => {
    const nextTheme = next.theme ?? theme;
    const nextPalette = next.palette ?? palette;
    if (next.theme !== undefined) setTheme(next.theme);
    if (next.palette !== undefined) setPalette(next.palette);
    onChange?.({ theme: nextTheme, palette: nextPalette, resolvedTheme: resolveTheme(nextTheme) });
  };

  return (
    <div style={{ display: 'grid', gap: spaceVar(3) }}>
      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>配色</legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spaceVar(1) }}>
          {paletteNames.map((option) => {
            const selected = option === palette;
            return (
              <label
                key={option}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minInlineSize: TOUCH_TARGET,
                  minBlockSize: TOUCH_TARGET,
                  cursor: 'pointer',
                  borderRadius: radiusVar('md'),
                  ...selectionRing(selected),
                }}
              >
                <input
                  type="radio"
                  name={`${groupName}-palette`}
                  value={option}
                  checked={selected}
                  onChange={() => apply({ palette: option })}
                  style={visuallyHidden}
                />
                {/* 見本は装飾なので支援技術から隠し、名前は下の視覚的に隠したテキストで与える */}
                {/* 見本は「今の明るさで、その配色がどう見えるか」を出す。
                    明るさを固定すると、Dark 中の利用者に Light の見本を見せることになる。
                    `data-theme` へ嗜好値 (auto) ではなく解決済みの明るさを渡すのは、
                    auto 用の規則が @media 下にあり「今の見え方」と一致しない場合があるため。 */}
                <span
                  aria-hidden="true"
                  data-palette={option}
                  data-theme={resolvedTheme}
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    inlineSize: '28px',
                    blockSize: '28px',
                    borderRadius: radiusVar('full'),
                    background: colorVar('surface'),
                    border: `1px solid ${colorVar('border')}`,
                  }}
                >
                  <span
                    style={{
                      inlineSize: '14px',
                      blockSize: '14px',
                      borderRadius: radiusVar('full'),
                      background: colorVar('primary'),
                    }}
                  />
                </span>
                <span style={visuallyHidden}>
                  {PALETTE_LABELS[option]}
                  {selected ? ' (選択中)' : ''}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>明るさ</legend>
        <div style={{ display: 'flex', gap: spaceVar(1) }}>
          {THEME_OPTIONS.map((option) => {
            const selected = option.value === theme;
            return (
              <label
                key={option.value}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: '1 1 0',
                  minBlockSize: TOUCH_TARGET,
                  padding: `0 ${spaceVar(2)}`,
                  cursor: 'pointer',
                  fontSize: 'var(--hh-font-size-sm)',
                  fontWeight: selected ? 600 : 400,
                  color: selected ? colorVar('onPrimary') : colorVar('text'),
                  background: selected ? colorVar('primary') : colorVar('surface'),
                  border: `1px solid ${selected ? colorVar('primary') : colorVar('borderStrong')}`,
                  borderRadius: radiusVar('md'),
                }}
              >
                <input
                  type="radio"
                  name={`${groupName}-theme`}
                  value={option.value}
                  checked={selected}
                  onChange={() => apply({ theme: option.value })}
                  style={visuallyHidden}
                />
                {option.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      {footer}
    </div>
  );
}
