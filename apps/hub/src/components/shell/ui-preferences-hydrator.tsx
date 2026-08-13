'use client';

/**
 * サーバの `user_settings` を、root layout が持つ UiProvider へ反映する。
 *
 * root layout は未ログイン画面も包むため、そこで本人設定 API を読むと公開画面まで 401 fetch が走る。
 * この部品はログイン済み画面だけが通る HubShell に置き、dashboard / workspace の両 route group を
 * 1 か所で覆う。描画は増やさず、取得に失敗した場合は UiProvider の安全な既定値を維持する。
 */
import type { DisplaySettingsResponse } from '@harness-hub/schemas';
import type { ThemePreference as UiThemePreference } from '@harness-hub/ui';
import { useUi } from '@harness-hub/ui';
import { type ReactNode, useEffect, useRef } from 'react';

interface UiPreferencesHydratorProps {
  readonly tenantId: string;
}

function toUiTheme(theme: DisplaySettingsResponse['theme']): UiThemePreference {
  return theme === 'system' ? 'auto' : theme;
}

export function UiPreferencesHydrator({ tenantId }: UiPreferencesHydratorProps): ReactNode {
  const ui = useUi();
  // useUi() の値は設定変更ごとに新しくなる。ref で最新値を読み、effect を tenant 変更時だけ走らせる。
  const uiRef = useRef(ui);
  uiRef.current = ui;

  useEffect(() => {
    const controller = new AbortController();
    const initial = uiRef.current;

    const hydrate = async (): Promise<void> => {
      try {
        const response = await fetch('/api/v1/me/display-settings', {
          credentials: 'same-origin',
          headers: { 'x-harness-tenant-id': tenantId },
          signal: controller.signal,
        });
        if (!response.ok) return;

        const settings = (await response.json()) as DisplaySettingsResponse;
        if (controller.signal.aborted) return;

        // 読込中に利用者が設定を変えた項目は、遅れて返った GET で巻き戻さない。
        const current = uiRef.current;
        if (current.theme === initial.theme) current.setTheme(toUiTheme(settings.theme));
        if (current.density === initial.density) current.setDensity(settings.density);
        if (current.locale === initial.locale) current.setLocale(settings.language);
      } catch {
        // 共通シェルを設定 API の一時障害で落とさない。アカウント設定画面では取得失敗を別途表示する。
      }
    };

    void hydrate();
    return () => controller.abort();
  }, [tenantId]);

  return null;
}
