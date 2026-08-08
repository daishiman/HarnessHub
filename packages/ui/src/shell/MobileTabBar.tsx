/**
 * モバイルのボトムタブ (frontend-spec §6.2)。
 *
 * slot は 5 つ固定で、うち 4 つが主要画面・最後の 1 つが「その他」シート。
 * 数を固定にしているのは、増やすと 1 つあたりのタップ域が 44px を割るため。
 *
 * 表示・非表示は CSS 側 (`.hh-shell__tabbar`) が担当し、
 * この部品は < md でしか見えない前提で書いている。
 *
 * **サーバ部品のまま (`'use client'` を付けない) にしてある。**
 * ここは全画面に載る唯一の対話部品なので、client 化すると開閉のためだけの JS が
 * 全 route の First Load JS に乗る (実測 +7.8 KiB / 予算 120 KiB は残り数 KiB しか無い)。
 * 「その他」の開閉は `<details>/<summary>` の標準機能に寄せ、見た目だけ CSS で整える。
 * disclosure (開閉) は dialog と違って focus trap を必要としないため、
 * ナビの overflow としては標準要素で十分に成立する。
 */
import type { ReactNode } from 'react';

import { Icon } from '../icons/index.js';
import { colorVar, radiusVar, spaceVar } from '../internal/style.js';
import { isCurrentNav, type ShellNavItem } from './nav-model.js';

/** ボトムタブに置ける主要 slot の数 (「その他」を除く)。 */
export const mobileTabPrimarySlots = 4;

export interface MobileTabBarProps {
  /** 主要 slot。5 つ目は常に「その他」なので、渡すのは 4 件まで。超過分は「その他」へ回す。 */
  items: readonly ShellNavItem[];
  /** 「その他」シートに並べる残りの項目。 */
  moreItems: readonly ShellNavItem[];
  currentHref?: string | undefined;
  label: string;
  /**
   * 5 つ目の slot の名前。
   * i18n 辞書 (`useUi`) から引くと UiProvider ごと client bundle へ入るため、呼び出し側から文字列で受け取る。
   */
  moreLabel?: string | undefined;
}

export function MobileTabBar({
  items,
  moreItems,
  currentHref,
  label,
  moreLabel = 'その他',
}: MobileTabBarProps): ReactNode {
  // slot 数を型で縛れないので、あふれた分は捨てずに「その他」へ送る
  const primary = items.slice(0, mobileTabPrimarySlots);
  const overflow = [...items.slice(mobileTabPrimarySlots), ...moreItems];

  const moreIsCurrent = overflow.some((item) => isCurrentNav(item, currentHref));

  return (
    <nav className="hh-shell__tabbar" aria-label={label}>
      {primary.map((item) => {
        const current = isCurrentNav(item, currentHref);
        return (
          <a
            key={item.href}
            href={item.href}
            data-hh-focusable=""
            {...(current ? { 'aria-current': 'page' as const } : {})}
            style={{ ...tabStyle, color: current ? colorVar('primary') : colorVar('textMuted') }}
          >
            <TabBadge count={item.badgeCount}>
              <Icon name={item.icon} size={22} />
            </TabBadge>
            <span style={tabLabelStyle}>{item.label}</span>
          </a>
        );
      })}

      <details className="hh-shell__more">
        <summary
          className="hh-shell__more-summary"
          data-hh-focusable=""
          // summary は「内容から名前を取る」対象として扱われないことがあるため、名前は明示で持たせる
          aria-label={moreLabel}
          {...(moreIsCurrent ? { 'aria-current': 'page' as const } : {})}
          style={{ ...tabStyle, color: moreIsCurrent ? colorVar('primary') : colorVar('textMuted') }}
        >
          <Icon name="more" size={22} />
          <span style={tabLabelStyle}>{moreLabel}</span>
        </summary>

        <div className="hh-shell__more-panel">
          <p style={moreTitleStyle}>{moreLabel}</p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {overflow.map((item) => {
              const current = isCurrentNav(item, currentHref);
              return (
                <li key={item.href}>
                  <a
                    href={item.href}
                    data-hh-focusable=""
                    {...(current ? { 'aria-current': 'page' as const } : {})}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spaceVar(3),
                      minHeight: 'var(--hh-control-height)',
                      padding: `0 ${spaceVar(2)}`,
                      borderRadius: radiusVar('sm'),
                      color: current ? colorVar('primary') : colorVar('text'),
                      textDecoration: 'none',
                    }}
                  >
                    <Icon name={item.icon} />
                    <span>{item.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </details>
    </nav>
  );
}

const tabStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  gap: '2px',
  minHeight: '56px',
  padding: `${spaceVar(1)} 0`,
  textDecoration: 'none',
};

const tabLabelStyle = {
  fontSize: 'var(--hh-font-size-xs)',
  lineHeight: 'var(--hh-line-height-tight)',
};

const moreTitleStyle = {
  margin: 0,
  padding: `0 ${spaceVar(2)} ${spaceVar(2)}`,
  fontSize: 'var(--hh-font-size-sm)',
  fontWeight: 'var(--hh-font-weight-bold)',
  color: colorVar('textMuted'),
};

/** 未読件数バッジ。0 と undefined は出さない。 */
function TabBadge({ count, children }: { count?: number | undefined; children: ReactNode }): ReactNode {
  if (count === undefined || count <= 0) return <>{children}</>;

  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      {children}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          insetBlockStart: '-4px',
          insetInlineEnd: '-8px',
          minWidth: '16px',
          padding: '0 3px',
          borderRadius: radiusVar('full'),
          background: colorVar('danger'),
          color: colorVar('onDanger'),
          fontSize: 'var(--hh-font-size-xs)',
          lineHeight: '16px',
          textAlign: 'center',
        }}
      >
        {count}
      </span>
    </span>
  );
}
