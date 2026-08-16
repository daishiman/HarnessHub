/**
 * 外観 (配色・テーマ) の端末側の控え。
 *
 * 正本はサーバの `user_settings` (1 利用者 1 行) で、ここはその写しにすぎない。
 * それでも端末に持つのは、次の読み込みで「前回選んだ見た目」を最初の描画から出すため —
 * サーバへ問い合わせてから切り替えると、その往復のあいだ既定の配色が一瞬見えてしまう。
 *
 * 保存するのは配色とテーマだけで、利用者を特定できる値は書かない。
 */

import { type PaletteName, paletteNames, type ThemePreference } from '@harness-hub/ui';

const STORAGE_KEY = 'hh.appearance';

export interface StoredAppearance {
  readonly theme: ThemePreference;
  readonly palette: PaletteName;
}

const THEME_VALUES: readonly ThemePreference[] = ['auto', 'light', 'dark'];

function isPalette(value: unknown): value is PaletteName {
  return typeof value === 'string' && (paletteNames as readonly string[]).includes(value);
}

function isTheme(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_VALUES as readonly string[]).includes(value);
}

/** 読めない・壊れている・保存が使えない場合は undefined を返す (既定へ落とす)。 */
export function readStoredAppearance(): Partial<StoredAppearance> | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return undefined;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return undefined;
    // 分解して受け取るのは、索引アクセス (`record['theme']`) を挟まずに型を絞るため。
    // 値の妥当性は下の型ガードだけが決め、ここでは形だけを剥がす。
    const { theme, palette } = parsed as { readonly theme?: unknown; readonly palette?: unknown };
    return {
      ...(isTheme(theme) ? { theme } : {}),
      ...(isPalette(palette) ? { palette } : {}),
    };
  } catch {
    // Safari のプライベート閲覧など localStorage が例外を投げる環境がある。
    // 見た目の控えが取れないだけなので、画面を落とさず既定へ落とす。
    return undefined;
  }
}

export function writeStoredAppearance(value: StoredAppearance): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // 同上。保存できなくても操作そのものは成立させる。
  }
}
