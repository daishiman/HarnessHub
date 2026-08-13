/**
 * モバイルのボトムタブ (frontend-spec §6.2)。
 *
 * slot は 5 つ固定で、うち 4 つが主要画面・最後の 1 つが「その他」シート。
 * 数を固定にしているのは、増やすと 1 つあたりのタップ域が 44px を割るため。
 *
 * 表示・非表示は CSS 側 (`.hh-shell__tabbar`) が担当し、
 * この部品は < md でしか見えない前提で書いている。
 *
 * 部品全体は Server Component のまま保ち、「その他」の `<details>/<summary>` だけを
 * 共通の小さな client island にする。dialog と違って focus trap は持たせず、外側クリック・
 * Escape・別メニューとの排他的な開閉とフォーカス復帰だけを追加する。
 */
import type { ReactNode } from 'react';

import { Icon } from '../icons/index.js';
import { colorVar, radiusVar, spaceVar } from '../internal/style.js';
import { isResolvedCurrentNav, resolveCurrentNavTarget, type ShellNavItem } from './nav-model.js';
import { TransientDisclosure } from './TransientDisclosure.js';

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
  const resolvedTarget = resolveCurrentNavTarget([...primary, ...overflow], currentHref);

  const moreIsCurrent = overflow.some((item) => isResolvedCurrentNav(item, resolvedTarget));

  return (
    <nav className="hh-shell__tabbar" aria-label={label}>
      {primary.map((item) => {
        const current = isResolvedCurrentNav(item, resolvedTarget);
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

      <TransientDisclosure className="hh-shell__more">
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
              const current = isResolvedCurrentNav(item, resolvedTarget);
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
      </TransientDisclosure>
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
