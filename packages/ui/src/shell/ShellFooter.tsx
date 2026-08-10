/**
 * 共通フッター。規約・プライバシーなどの法的情報への導線を全画面から届かせる。
 * 内容はリンクだけなのでサーバ部品のまま置ける。
 */
import type { ReactNode } from 'react';

import { colorVar, spaceVar } from '../internal/style.js';

export interface ShellFooterLink {
  href: string;
  label: string;
  /** 別タブで開く外部リンクかどうか。 */
  external?: boolean | undefined;
}

export interface ShellFooterProps {
  /** フッター領域の読み上げ名。ページ内に複数の contentinfo を作らないため landmark 名を渡す。 */
  label: string;
  links: readonly ShellFooterLink[];
  /** 著作権表記など。年はサーバ側で決めて渡す (部品内で現在時刻を読まない)。 */
  note?: string | undefined;
}

export function ShellFooter({ label, links, note }: ShellFooterProps): ReactNode {
  return (
    <footer
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: spaceVar(4),
        padding: `${spaceVar(4)} ${spaceVar(5)}`,
        borderBlockStart: `1px solid ${colorVar('border')}`,
        color: colorVar('textMuted'),
        fontSize: 'var(--hh-font-size-sm)',
      }}
    >
      {/* landmark 名は nav 側に付ける。footer 自体へ aria-label を付けると
          role が contentinfo にならない入れ子位置で無効になるため */}
      <nav aria-label={label}>
        <ul
          style={{
            listStyle: 'none',
            display: 'flex',
            flexWrap: 'wrap',
            gap: spaceVar(4),
            margin: 0,
            padding: 0,
          }}
        >
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                data-hh-focusable=""
                style={{ color: colorVar('textMuted') }}
                {...(link.external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {note === undefined ? null : <span style={{ marginInlineStart: 'auto' }}>{note}</span>}
    </footer>
  );
}
