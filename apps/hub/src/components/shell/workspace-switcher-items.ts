/**
 * 共通シェルの Workspace 切替候補を組み立てる (feat-workspace-switch-ux 受入 1・3)。
 *
 * `packages/ui` の `WorkspaceSwitcher` は「見た目」しか持たず route を知らない。
 * ここが hub にとっての具体 —— どの href へ飛ばすか —— を担う。
 *
 * 所属判定を書き写さないこと。`resolveActiveWorkspaceId` (middleware 側) が
 * 「所属一覧に含まれるものだけ受理する」規則の単一実装であり、切替後の受理も
 * `/signin/workspace` route が同じ規則で再検証する。ここが作るのは**リンクだけ**で、
 * ここを騙しても cookie は書き換わらない (fail-closed)。
 */

import { workspaceEntryPath } from '../../lib/routing/workspace-entry.js';

export interface WorkspaceSwitcherOption {
  readonly href: string;
  readonly label: string;
  readonly current: boolean;
}

/**
 * 所属 Workspace 一覧から切替候補を作る。
 *
 * 所属が 1 件以下なら**空配列**を返す。受入 1「所属 1 件の利用者には切替 UI を表示しない」を
 * `WorkspaceSwitcher` 側の `options.length < 2` 判定と噛み合わせるための契約で、
 * 「1 件だけの選択肢を出して選ばせる」無意味な操作を構造的に消している。
 *
 * 表示名は現状 workspace ID をそのまま使う。session claims (`workspace_ids`) が識別子しか
 * 持たず、名前を引くには DB 参照が要るため。名前を出すのは表示の改善であって切替の成立条件では
 * ないので、ここでは識別子のまま常時切替を成立させる方を採る。
 */
export function workspaceSwitcherOptions(
  workspaceIds: readonly string[],
  currentWorkspaceId: string | null,
  returnTo?: string | undefined,
): readonly WorkspaceSwitcherOption[] {
  if (workspaceIds.length < 2) return [];
  return workspaceIds.map((workspaceId) => ({
    href: workspaceEntryPath(workspaceId, returnTo),
    label: workspaceId,
    current: workspaceId === currentWorkspaceId,
  }));
}
