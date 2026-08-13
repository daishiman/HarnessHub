/**
 * 共通シェルのナビゲーション項目モデル。
 *
 * 「どの画面をどのアイコンで、どの順で出すか」はアプリ側 (hub) の知識なので、
 * 共通層は形と現在地判定だけを持ち、項目そのものは持たない。
 */
import type { IconName } from '../icons/index.js';

export interface ShellNavItem {
  href: string;
  label: string;
  icon: IconName;
  /** 未読などの件数バッジ。0 と undefined は出さない。 */
  badgeCount?: number | undefined;
}

/**
 * 現在地判定。
 *
 * `usePathname` を使わず引数で受け取るのは、シェルをサーバ部品のままにして
 * client bundle を増やさないため (frontend-spec §2 の First Load JS 予算)。
 *
 * 判定は「完全一致」か「配下パス」。クエリ文字列は捨てる。
 * `/sheets` が `/sheetsx` に誤って一致しないよう、境界は `/` で確かめる。
 */
export function isCurrentNav(item: ShellNavItem, currentHref: string | undefined): boolean {
  if (currentHref === undefined) return false;

  const target = stripQuery(item.href);
  const current = stripQuery(currentHref);

  if (target === current) return true;
  // ルートはあらゆるパスの前方一致になるので、配下判定から除く
  if (target === '/') return false;
  return current.startsWith(`${target}/`);
}

/**
 * 複数の nav 項目が同時に `isCurrentNav` を満たす場合 (あるnav項目の href が
 * 別の nav 項目の配下パスになっている。例: `/metrics` と `/metrics/usage`) に、
 * 最も長く一致した 1 件だけを現在地として選ぶ。
 *
 * 全 nav グループを横断した項目一覧を渡すこと。グループ単位で個別に呼ぶと、
 * 別グループにある祖先パスの項目と二重に一致したままになる。
 */
export function resolveCurrentNavTarget(
  items: readonly ShellNavItem[],
  currentHref: string | undefined,
): string | undefined {
  let best: string | undefined;
  for (const item of items) {
    if (!isCurrentNav(item, currentHref)) continue;
    const target = stripQuery(item.href);
    if (best === undefined || target.length > best.length) best = target;
  }
  return best;
}

/** `resolveCurrentNavTarget` が選んだ現在地と、この項目自身の href が一致するか。 */
export function isResolvedCurrentNav(item: ShellNavItem, resolvedTarget: string | undefined): boolean {
  return resolvedTarget !== undefined && stripQuery(item.href) === resolvedTarget;
}

function stripQuery(href: string): string {
  const cut = href.search(/[?#]/);
  const path = cut === -1 ? href : href.slice(0, cut);
  // 末尾スラッシュの有無で現在地判定がぶれないよう正規化する
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
}
