/**
 * ランディング (`/`) から「どの workspace で作業するか」を確定させる動線。
 *
 * 2 件以上の workspace に所属する利用者は、`hh_active_workspace` cookie が無い限り
 * `resolveActiveWorkspaceId` が active workspace を確定できず、業務画面が
 * missing_tenant_scope で 403 になる。cookie を書く経路がどこにも無いと利用者は自力で復帰できないため、
 * 「選ぶ → cookie を書く」受け口をこの 1 ファイル + `/signin/workspace` route に閉じる。
 *
 * URL の組み立てと受理判定を 1 箇所に置く理由は signin-entry.ts と同じ (画面側と route handler が
 * 別々に組むと、片方だけ検証を忘れた版が残る)。
 */

import { DEFAULT_POST_SIGNIN_LANDING } from './post-signin-landing.js';

/**
 * 選択を受ける route の path。`/signin` 配下に置くのは、この経路が
 * authz.ts の PUBLIC_PATH_PREFIXES にある `/signin` の前方一致で公開されるため。
 * 公開経路にしてよいのは、route 自身が session cookie を検証し、claims の所属一覧に
 * 無い値を一切受理しない (fail-closed) から。認可の判断を middleware から奪ってはいない。
 */
export const WORKSPACE_ENTRY_PATH = '/signin/workspace';

/** 選択された workspace を載せる query 名。 */
export const WORKSPACE_QUERY_PARAM = 'workspace';

export type WorkspaceEntryResolution =
  | { readonly ok: true; readonly workspaceId: string; readonly location: string }
  | { readonly ok: false; readonly location: string };

/**
 * 選択値を受理できるかと、その後の遷移先を決める。
 *
 * 判定は「session claims の所属一覧に含まれるか」だけ。`resolveActiveWorkspaceId` を通さないのは、
 * あちらが「cookie 未指定なら所属 1 件のとき自動確定する」フォールバックを持つためで、
 * ここでは query 未指定を誤りとして扱いたい (勝手に 1 件目へ倒すと、利用者が選んだつもりの無い
 * workspace が cookie に焼き付く)。所属一覧との突き合わせという規則自体は同一。
 *
 * 受理できないときはランディングへ戻す。理由を query に載せないのは、この経路で弾かれるのは
 * 「所属していない workspace ID を指定した」場合であり、応答の差を所属有無の総当たりに使わせないため。
 */
export function resolveWorkspaceEntry(
  raw: string | null | undefined,
  memberWorkspaceIds: readonly string[],
): WorkspaceEntryResolution {
  if (typeof raw !== 'string' || !memberWorkspaceIds.includes(raw)) {
    return { ok: false, location: '/' };
  }
  return { ok: true, workspaceId: raw, location: DEFAULT_POST_SIGNIN_LANDING };
}

/** 選択リンクの href。workspace ID は任意文字列を取り得るため必ず encode する。 */
export function workspaceEntryPath(workspaceId: string): string {
  return `${WORKSPACE_ENTRY_PATH}?${WORKSPACE_QUERY_PARAM}=${encodeURIComponent(workspaceId)}`;
}
