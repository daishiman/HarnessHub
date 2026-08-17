'use client';

/**
 * アカウントメニューへ置く外観切替。`AppearancePicker` (見た目) に、hub の保存経路を足した層。
 *
 * 保存は 2 か所へ行う:
 *  - 端末の控え (`appearance-storage`) … `UiProvider` の `onPreferencesChange` 経由で自動
 *  - サーバの `user_settings` … ここから PATCH。集計 (配色の利用状況) の母数になる
 *
 * PATCH は `theme` と `resolved_theme` を必ず対で送る。API 側は「明示した Light/Dark と
 * 実表示の矛盾」を拒否する契約なので、片方だけ送ると 400 になる。
 *
 * `next/dynamic` による遅延読込は採らない。親の `ShellHeader` はアカウントメニューを
 * `<details>` の標準開閉で作るため中身は閉じていても常に mount され、`<details>` の
 * `toggle` を見て後から mount する形にしても、実測 (2026-08-15) の初期 JS 削減は
 * route あたり 144 bytes だった — 遅延読込のランタイムが同量だけ初期チャンクへ載るため。
 */

import { AppearancePicker, type AppearanceSelection } from '@harness-hub/ui';
import { type ReactNode, useCallback, useState } from 'react';

export interface AppearanceControlProps {
  /** API のスコープヘッダーに使うテナント ID。 */
  readonly tenantId: string;
}

type SaveState = 'idle' | 'failed';

/** UI の `auto` と API の `system` は同じ意味。語彙が違うのは表示側と契約側で歴史が別れているため。 */
function toApiTheme(theme: AppearanceSelection['theme']): 'system' | 'light' | 'dark' {
  return theme === 'auto' ? 'system' : theme;
}

export function AppearanceControl({ tenantId }: AppearanceControlProps): ReactNode {
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const save = useCallback(
    (selection: AppearanceSelection): void => {
      // 見た目はすでに切り替わっている。保存の失敗で選択を巻き戻さないのは、
      // 「押したのに戻る」より「この端末では効いているが次回は既定に戻る」ほうが混乱が小さいため。
      void fetch('/api/v1/me/display-settings', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'x-harness-tenant-id': tenantId, 'content-type': 'application/json' },
        body: JSON.stringify({
          theme: toApiTheme(selection.theme),
          resolved_theme: selection.resolvedTheme,
          palette: selection.palette,
        }),
      })
        .then((response) => setSaveState(response.ok ? 'idle' : 'failed'))
        .catch(() => setSaveState('failed'));
    },
    [tenantId],
  );

  return (
    <AppearancePicker
      name="hh-account-appearance"
      onChange={save}
      footer={
        // 成功時は無言。切り替わった画面そのものが結果なので、毎回の成功メッセージは雑音になる。
        <p role="status" style={{ margin: 0, fontSize: 'var(--hh-font-size-sm)', color: 'var(--hh-color-danger)' }}>
          {saveState === 'failed' ? 'この端末では切り替わりましたが、設定を保存できませんでした。' : ''}
        </p>
      }
    />
  );
}
