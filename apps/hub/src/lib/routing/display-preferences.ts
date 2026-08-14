/**
 * サーバの `user_settings` を root layout の `UiProvider` 初期値へ変換する。
 *
 * client 側から `/api/v1/me/display-settings` を fetch して後から上書きする形は取らない。
 * 理由は 2 つある:
 *   (a) 初期描画は既定テーマで出てから設定値へ切り替わるため、再読込のたびに配色がちらつく。
 *   (b) 上書き専用の client component を 1 つ足すと webpack が @harness-hub/ui を別 chunk へ割り、
 *       その chunk が (dashboard)/(workspace) 配下の全 route の First Load JS に載る
 *       (実測 2026-08-13: +3856 bytes / route で G13 予算ゲートが 4 route 超過した)。
 * `UiProvider` は元から `defaultPreferences` を受ける契約なので、サーバ値はそこへ直接渡す。
 *
 * 注意: `next/headers` を使う Server Component 専用。
 */
import type { Density, ThemePreference, UiLocale, UiPreferences } from '@harness-hub/ui';

import { userOrgAdminRuntime } from '../../features/user-org-admin/runtime.js';
import { resolveShellIdentity } from './shell-identity.js';

/**
 * サーバの語彙 (`system`) と UI の語彙 (`auto`) を突き合わせる。
 * 保存値は AD-2 §S18 の `user_settings.theme` が正本で、UI 側の名前へ寄せるのはこの 1 箇所だけにする。
 */
function toUiTheme(theme: string): ThemePreference {
  switch (theme) {
    case 'light':
    case 'dark':
      return theme;
    default:
      // `system` および未知の値。OS 追従が最も害の小さい既定なので auto へ倒す。
      return 'auto';
  }
}

function toUiDensity(density: string): Density {
  return density === 'compact' ? 'compact' : 'comfortable';
}

function toUiLocale(language: string): UiLocale {
  return language === 'en' ? 'en' : 'ja';
}

/**
 * サインイン済みなら保存済みの表示設定を返す。未認証・取得失敗では `undefined` を返し、
 * `UiProvider` の既定値 (ja / comfortable / auto) をそのまま使わせる。
 *
 * 表示設定は画面の見た目だけを決める値なので、取得できないことを理由に画面全体を落とさない。
 * 認証そのものの判定は `resolveShellIdentity()` 側が持ち、ここでは結果を読むだけにする。
 */
export async function resolveUiPreferences(): Promise<UiPreferences | undefined> {
  try {
    const identity = await resolveShellIdentity();
    if (identity.subject === null) return undefined;

    const settings = await userOrgAdminRuntime().service.getDisplaySettings(identity.subject);
    return {
      theme: toUiTheme(settings.theme),
      density: toUiDensity(settings.density),
      locale: toUiLocale(settings.language),
    };
  } catch {
    // cookie 読取 (request scope 外の SSR) と設定取得のどちらで転んでも既定値へ落とす。
    // ここは root layout から呼ばれるので、投げると画面全体が 500 になる。
    return undefined;
  }
}
