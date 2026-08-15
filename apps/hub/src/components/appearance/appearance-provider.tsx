'use client';

/**
 * `UiProvider` に「前回の選択」を与える薄い client 層。
 *
 * root layout を server component のまま保ちたいので、端末側の控え
 * (`appearance-storage`) の読み出しはここに閉じる。初期描画は既定値で行い、
 * hydration 後に控えを適用する — `useState` の初期値で localStorage を読むと
 * server が描いた HTML と食い違い、hydration mismatch になるため。
 *
 * サーバの `user_settings` との突き合わせは行わない。設定画面 (S18) が読み込み時に
 * 正本を読んで `useUi()` へ反映するので、ここで二重に取りに行くと、公開画面
 * (未サインイン) でも 401 になる問い合わせを毎回出すことになる。
 */

import { type UiPreferences, UiProvider, useUi } from '@harness-hub/ui';
import { type ReactNode, useEffect } from 'react';

import { readStoredAppearance, writeStoredAppearance } from './appearance-storage.js';

function persist(preferences: UiPreferences): void {
  writeStoredAppearance({ theme: preferences.theme, palette: preferences.palette });
}

/** hydration 後に控えを流し込む。控えが無ければ何もしない (既定のまま)。 */
function StoredAppearanceSync(): ReactNode {
  const { setTheme, setPalette } = useUi();

  useEffect(() => {
    const stored = readStoredAppearance();
    if (stored === undefined) return;
    if (stored.theme !== undefined) setTheme(stored.theme);
    if (stored.palette !== undefined) setPalette(stored.palette);
  }, [setPalette, setTheme]);

  return null;
}

export function AppearanceProvider({ children }: { readonly children: ReactNode }): ReactNode {
  return (
    <UiProvider onPreferencesChange={persist}>
      <StoredAppearanceSync />
      {children}
    </UiProvider>
  );
}
