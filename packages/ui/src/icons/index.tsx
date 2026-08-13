/**
 * 共通シェル用のアイコン集合。
 *
 * 外部アイコンライブラリを足さないのは 2 つの理由による。
 * 1. First Load JS 予算 (120KiB) を占有する依存を増やしたくない。
 * 2. アイコンは「意味を持つ語彙」なので、名前の集合をこのファイルで閉じて
 *    画面側が任意の図形を持ち込めないようにしたい。
 *
 * 描画は 24x24 の stroke ベースで、色は常に `currentColor` を継ぐ。
 * 既定は `aria-hidden` で、意味は必ず隣接するテキストかラベルが担う
 * (アイコンだけの操作は `aria-label` を親側で付ける)。
 */
import type { ReactNode, SVGProps } from 'react';

/**
 * 使えるアイコン名。frontend-spec §3.0 のサイドバー 9 項目と、
 * ヘッダー・フッター・モーダルで必要になる操作アイコンだけを持つ。
 */
export const iconNames = [
  'home',
  'dashboard',
  'hearing',
  'sheet',
  'pipeline',
  'harness',
  'feedback',
  'docs',
  'tracking',
  'users',
  'settings',
  'search',
  'bell',
  'user',
  'chevronDown',
  'close',
  'menu',
  'more',
  'download',
  'externalLink',
  'plus',
] as const;

export type IconName = (typeof iconNames)[number];

/**
 * 各アイコンの中身。
 * `d` 属性の羅列にせず要素の配列で持つのは、円や線を混ぜたい図形があるため。
 */
const iconPaths: Record<IconName, ReactNode> = {
  home: (
    <>
      <path d="M4 11l8-7 8 7" />
      <path d="M6 9.5V20a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1V9.5" />
    </>
  ),
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </>
  ),
  hearing: (
    <>
      <path d="M4 5h16v10H8l-4 4z" />
      <path d="M8 9h8" />
      <path d="M8 12h5" />
    </>
  ),
  sheet: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <path d="M9 12h6" />
      <path d="M9 16h6" />
    </>
  ),
  pipeline: (
    <>
      <rect x="3" y="4" width="5" height="6" rx="1" />
      <rect x="16" y="4" width="5" height="6" rx="1" />
      <rect x="9.5" y="14" width="5" height="6" rx="1" />
      <path d="M5.5 10v2h13v-2" />
      <path d="M12 12v2" />
    </>
  ),
  harness: (
    <>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="M12 12l8-4.5" />
      <path d="M12 12v9" />
      <path d="M12 12L4 7.5" />
    </>
  ),
  feedback: (
    <>
      <path d="M12 3l2.6 5.6 6 .8-4.4 4.3 1.1 6.1L12 17l-5.3 2.8 1.1-6.1L3.4 9.4l6-.8z" />
    </>
  ),
  docs: (
    <>
      <path d="M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 1-2-2z" />
      <path d="M20 5a2 2 0 0 0-2-2h-5v18h5a2 2 0 0 0 2-2z" />
    </>
  ),
  tracking: (
    <>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M7 15l4-5 3 3 5-7" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M16 5.5a3.2 3.2 0 0 1 0 6" />
      <path d="M17.5 14.5A6 6 0 0 1 21 20" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </>
  ),
  bell: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  chevronDown: <path d="M6 9.5l6 6 6-6" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  more: (
    <>
      <circle cx="5" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="19" cy="12" r="1.4" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11" />
      <path d="M7.5 10.5L12 15l4.5-4.5" />
      <path d="M4 19h16" />
    </>
  ),
  externalLink: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4l-8 8" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
};

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name' | 'children'> {
  name: IconName;
  /** 表示サイズ (px)。既定は本文行に馴染む 20px。 */
  size?: number | undefined;
  /**
   * アイコン単体に意味を持たせる場合のラベル。
   * 渡すと `role="img"` + `aria-label` になり、省略すると装飾扱い (`aria-hidden`)。
   */
  label?: string | undefined;
}

/** 単一の SVG アイコン。色は `currentColor`、太さは 1.6px 固定で視覚的な重さを揃える。 */
export function Icon({ name, size = 20, label, ...rest }: IconProps): ReactNode {
  const semantic = label !== undefined;

  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: label 省略時は aria-hidden の装飾、指定時は role="img" + aria-label で名前を持つ
    <svg
      data-icon={name}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      {...(semantic ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      {...rest}
    >
      {iconPaths[name]}
    </svg>
  );
}
