'use client';

/**
 * サイドバーの開閉状態 (HarnessHub 配色統一・サイドバートグル対応)。
 *
 * `ShellSidebar` 自体はサーバ部品のまま保つため (frontend-spec §3.0 のとおり全画面に載る)、
 * 開閉の state だけをこの薄い client provider に閉じ込める。`data-hh-sidebar-collapsed` を
 * 外側の div に立て、実際の表示・非表示は `buildShellCss()` 側の CSS 属性セレクタが行う
 * (JS の有無に関わらずレイアウトの正本は 1 枚の CSS、という既存方針を崩さない)。
 *
 * 開閉状態は `localStorage` に保存する。`useRememberedFilters` が絞り込み条件を
 * sessionStorage にしているのとは異なり、こちらは「次に開いたときも同じ見た目でいてほしい」
 * 種類の設定なので localStorage を選ぶ。復元は mount 後 (useEffect) の 1 回だけにし、
 * 初期 state は常に「展開」= サーバ描画と同じにして hydration mismatch を避ける
 * (`useRememberedFilters` と同じ形)。
 */
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import { Icon } from '../icons/index.js';
import { colorVar, radiusVar, visuallyHidden } from '../internal/style.js';

const STORAGE_KEY = 'harness-hub:sidebar-collapsed';

interface SidebarCollapseContextValue {
  collapsed: boolean;
  toggle: () => void;
}

const SidebarCollapseContext = createContext<SidebarCollapseContextValue | null>(null);

function readStoredCollapsed(): boolean | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return null;
  } catch {
    // 保存領域が使えない設定 (プライベートモード等) でも開閉自体は成立させる。覚えないだけ
    return null;
  }
}

function writeStoredCollapsed(value: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
  } catch {
    // 同上
  }
}

export interface SidebarCollapseProviderProps {
  children: ReactNode;
}

/**
 * 共通シェルの最上位 (`.hh-shell` を含む要素) を包む provider。
 * `SidebarToggleButton` はこの内側でだけ使える。
 */
export function SidebarCollapseProvider({ children }: SidebarCollapseProviderProps): ReactNode {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = readStoredCollapsed();
    if (stored !== null) setCollapsed(stored);
  }, []);

  const toggle = useCallback((): void => {
    setCollapsed((current) => {
      const next = !current;
      writeStoredCollapsed(next);
      return next;
    });
  }, []);

  return (
    <SidebarCollapseContext.Provider value={{ collapsed, toggle }}>
      <div data-hh-sidebar-collapsed={collapsed ? 'true' : 'false'}>{children}</div>
    </SidebarCollapseContext.Provider>
  );
}

function useSidebarCollapse(): SidebarCollapseContextValue {
  const value = useContext(SidebarCollapseContext);
  if (!value) {
    throw new Error('useSidebarCollapse (SidebarToggleButton) は SidebarCollapseProvider の内側で使ってください');
  }
  return value;
}

export interface SidebarToggleButtonProps {
  /** 展開中に読み上げる操作名 (「サイドバーを閉じる」など)。 */
  expandedLabel: string;
  /** 折りたたみ中に読み上げる操作名 (「サイドバーを開く」など)。 */
  collapsedLabel: string;
  /** md 以上でだけ出す (`hh-shell__desktop-only` 等) ためのクラス名。省略可。 */
  className?: string | undefined;
}

/**
 * サイドバーの開閉トグル。`ShellHeader` の先頭に置くことで、折りたたんだ後も
 * 常に押し戻せる場所に留まる (サイドバー自身の中に置くと、閉じた瞬間に
 * ボタンごと消えて再度開けなくなるため)。
 */
export function SidebarToggleButton({ expandedLabel, collapsedLabel, className }: SidebarToggleButtonProps): ReactNode {
  const { collapsed, toggle } = useSidebarCollapse();
  const label = collapsed ? collapsedLabel : expandedLabel;

  return (
    <button
      type="button"
      className={className}
      data-hh-focusable=""
      data-hh-sidebar-toggle=""
      aria-pressed={collapsed}
      onClick={toggle}
      title={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 'var(--hh-control-height)',
        minHeight: 'var(--hh-control-height)',
        padding: 0,
        color: colorVar('text'),
        background: 'transparent',
        border: 'none',
        borderRadius: radiusVar('full'),
        cursor: 'pointer',
      }}
    >
      <Icon name="menu" />
      <span style={visuallyHidden}>{label}</span>
    </button>
  );
}
