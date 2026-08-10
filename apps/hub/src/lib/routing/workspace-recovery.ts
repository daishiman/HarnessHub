/**
 * 「作業する Workspace が決まっていない」状態の利用者向け表現 (feat-workspace-switch-ux 受入 5)。
 *
 * scope 未解決は**失敗ではなく回復可能な状態**である。にもかかわらず認可層が返す語彙
 * (`missing_tenant_scope` / `ambiguous_scope`) をそのまま画面へ出すと、利用者には
 * 「403」「権限がない」としか読めず、実際には自分で選び直すだけで直る状況で行き止まりになる。
 *
 * 文言と復帰先をここに 1 つだけ置く理由は、この状態が **3 つの別々の層**に現れるため:
 *   - edge middleware の拒否ページ (`deny-navigation.ts`。React が使えないので文字列 HTML)
 *   - RSC の画面状態 (`components/screen-states.tsx`)
 *   - `/` のランディング (所属 Workspace の選択)
 * 層ごとに文言を書くと、同じ状態が画面によって別の説明になり、利用者は毎回読み直すことになる。
 *
 * なお qa-118 の「401/403 は ErrorState のみ (旧データを描画しない)」契約は緩めない。
 * ここが定めるのは ErrorState の**文言と回復導線**だけで、旧 scope データの継続表示は許さない。
 */

/** 回復導線の飛び先。Workspace 選択はランディングが唯一の入口 (`app/page.tsx`)。 */
export const WORKSPACE_RECOVERY_HREF = '/';

/** 回復導線のリンク文言。「戻る」ではなく「選ぶ」と書いて、次にやることを示す。 */
export const WORKSPACE_RECOVERY_ACTION_LABEL = 'Workspace を選び直す';

export interface WorkspaceRecoveryNotice {
  readonly title: string;
  readonly description: string;
  readonly actionLabel: string;
  readonly actionHref: string;
}

/**
 * scope が未解決な理由の区別。
 *
 * - `unresolved`: どの Workspace で作業するかがまだ決まっていない (`missing_tenant_scope`)
 * - `conflicting`: URL の指定と端末に記憶された Workspace が食い違っている (`ambiguous_scope`)
 *
 * どちらも「選び直せば直る」点は同じだが、原因が違うと利用者の次の行動も変わるため分けてある。
 */
export type WorkspaceRecoveryReason = 'unresolved' | 'conflicting';

const NOTICES: Readonly<Record<WorkspaceRecoveryReason, WorkspaceRecoveryNotice>> = {
  unresolved: {
    title: '作業する Workspace が決まっていません',
    description:
      '複数の Workspace に所属している場合、どの Workspace で作業するかを先に選ぶ必要があります。権限の問題ではないので、選び直せばそのまま続けられます。',
    actionLabel: WORKSPACE_RECOVERY_ACTION_LABEL,
    actionHref: WORKSPACE_RECOVERY_HREF,
  },
  conflicting: {
    title: '対象の Workspace の指定が食い違っています',
    description:
      'URL で指定された Workspace と、この端末に記憶されている Workspace が一致しません。どちらで作業するかを選び直してください。',
    actionLabel: WORKSPACE_RECOVERY_ACTION_LABEL,
    actionHref: WORKSPACE_RECOVERY_HREF,
  },
};

export function workspaceRecoveryNotice(reason: WorkspaceRecoveryReason): WorkspaceRecoveryNotice {
  return NOTICES[reason];
}
