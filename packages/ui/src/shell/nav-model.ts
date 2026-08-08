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

function stripQuery(href: string): string {
  const cut = href.search(/[?#]/);
  const path = cut === -1 ? href : href.slice(0, cut);
  // 末尾スラッシュの有無で現在地判定がぶれないよう正規化する
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
}
