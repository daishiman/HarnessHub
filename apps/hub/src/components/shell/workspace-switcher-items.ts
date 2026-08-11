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
  /** `label` が表示名ではなく Workspace ID へフォールバックした値なら true。 */
  readonly isIdentifier: boolean;
  readonly current: boolean;
}

/**
 * 所属 Workspace 一覧から切替候補を作る。
 *
 * 所属が 1 件以下なら**空配列**を返す。受入 1「所属 1 件の利用者には切替 UI を表示しない」を
 * `WorkspaceSwitcher` 側の `options.length < 2` 判定と噛み合わせるための契約で、
 * 「1 件だけの選択肢を出して選ばせる」無意味な操作を構造的に消している。
 *
 * 表示名は名前が分かるものだけ名前にし、分からないものは識別子のまま出す。名前が引けないことを
 * 理由に候補ごと落とさない —— 名前の有無が到達可否になってしまい、名称未設定の Workspace へ
 * 切り替えられなくなる。切替の成立条件はあくまで所属であって、表示名は表示の質の問題。
 */
export function workspaceSwitcherOptions(
  workspaceIds: readonly string[],
  currentWorkspaceId: string | null,
  returnTo?: string | undefined,
  workspaceNames: Readonly<Record<string, string>> = {},
): readonly WorkspaceSwitcherOption[] {
  if (workspaceIds.length < 2) return [];
  return workspaceIds.map((workspaceId) => ({
    href: workspaceEntryPath(workspaceId, returnTo),
    label: workspaceNames[workspaceId] ?? workspaceId,
    isIdentifier: workspaceNames[workspaceId] === undefined,
    current: workspaceId === currentWorkspaceId,
  }));
}
