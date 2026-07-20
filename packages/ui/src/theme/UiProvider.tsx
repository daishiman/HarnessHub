'use client';

/** テーマ・表示密度・言語を 1 箇所で保持し、design token の適用属性と文言解決を全部品へ供給する。 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  translateUiMessage,
  type UiLocale,
  type UiMessageKey,
} from '../i18n/dictionaries.js';
import type { Density, ThemeName, ThemePreference } from '../tokens/tokens.js';

/** 利用者の表示設定。正本はサーバの `user_settings` (PATCH /me) で、ここはその写し。 */
export interface UiPreferences {
  theme: ThemePreference;
  density: Density;
  locale: UiLocale;
}

export interface UiContextValue extends UiPreferences {
  /** `auto` を OS 設定で解決した実効テーマ。 */
  resolvedTheme: ThemeName;
  setTheme: (theme: ThemePreference) => void;
  setDensity: (density: Density) => void;
  setLocale: (locale: UiLocale) => void;
  /** 文言解決。画面側での文字列直書きを避けるための唯一の入口。 */
  t: (key: UiMessageKey) => string;
}

export const defaultUiPreferences: UiPreferences = {
  theme: 'auto',
  density: 'comfortable',
  locale: 'ja',
};

const UiContext = createContext<UiContextValue | null>(null);

const DARK_QUERY = '(prefers-color-scheme: dark)';

/** OS のダークモード設定を購読する。matchMedia の無い環境 (SSR / 一部テスト) では light 扱い。 */
function useSystemTheme(enabled: boolean): ThemeName {
  const [systemTheme, setSystemTheme] = useState<ThemeName>('light');

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const query = window.matchMedia(DARK_QUERY);
    const sync = (): void => setSystemTheme(query.matches ? 'dark' : 'light');

    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, [enabled]);

  return systemTheme;
}

export interface UiProviderProps {
  children: ReactNode;
  /** 初期表示設定。省略時は ja / comfortable / auto。 */
  defaultPreferences?: Partial<UiPreferences>;
  /** 設定変更の通知先。サーバへの保存 (PATCH /me) は consumer 側の責務。 */
  onPreferencesChange?: (preferences: UiPreferences) => void;
}

/**
 * 共通シェルの最上位に置く provider。
 * `data-theme` / `data-density` / `lang` を持つ要素を 1 枚描画し、
 * design token の CSS カスタムプロパティがその配下で切り替わるようにする。
 */
export function UiProvider({
  children,
  defaultPreferences,
  onPreferencesChange,
}: UiProviderProps): ReactNode {
  const [preferences, setPreferences] = useState<UiPreferences>({
    ...defaultUiPreferences,
    ...defaultPreferences,
  });

  const systemTheme = useSystemTheme(preferences.theme === 'auto');
  const resolvedTheme: ThemeName = preferences.theme === 'auto' ? systemTheme : preferences.theme;

  const update = useCallback(
    (patch: Partial<UiPreferences>) => {
      setPreferences((current) => {
        const next = { ...current, ...patch };
        onPreferencesChange?.(next);
        return next;
      });
    },
    [onPreferencesChange],
  );

  const value = useMemo<UiContextValue>(
    () => ({
      ...preferences,
      resolvedTheme,
      setTheme: (theme) => update({ theme }),
      setDensity: (density) => update({ density }),
      setLocale: (locale) => update({ locale }),
      t: (key) => translateUiMessage(preferences.locale, key),
    }),
    [preferences, resolvedTheme, update],
  );

  return (
    <UiContext.Provider value={value}>
      <div data-theme={preferences.theme} data-resolved-theme={resolvedTheme} data-density={preferences.density} lang={preferences.locale}>
        {children}
      </div>
    </UiContext.Provider>
  );
}

/** 表示設定と文言解決を取り出す。UiProvider の外で呼ぶと例外にする (設定の暗黙既定を作らない)。 */
export function useUi(): UiContextValue {
  const value = useContext(UiContext);
  if (!value) {
    throw new Error('useUi は UiProvider の内側で呼び出してください');
  }
  return value;
}

/** 文言解決だけが必要な部品向けの薄い hook。 */
export function useUiText(): (key: UiMessageKey) => string {
  return useUi().t;
}
