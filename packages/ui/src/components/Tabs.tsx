'use client';

/** タブ。矢印キーでの移動と roving tabindex を実装し、Tab キーはタブ群を 1 ストップとして扱う。 */
import { type KeyboardEvent as ReactKeyboardEvent, type ReactNode, useId, useRef, useState } from 'react';

import { colorVar, spaceVar } from '../internal/style.js';

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  /** タブ群が何の切替なのかの説明。 */
  label: string;
  items: readonly TabItem[];
  /** 選択状態を外部管理する場合に渡す。 */
  activeId?: string;
  defaultActiveId?: string;
  onActiveIdChange?: (id: string) => void;
}

export function Tabs({ label, items, activeId, defaultActiveId, onActiveIdChange }: TabsProps): ReactNode {
  const baseId = useId();
  const [internalActiveId, setInternalActiveId] = useState<string>(defaultActiveId ?? items[0]?.id ?? '');
  const currentId = activeId ?? internalActiveId;
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());

  const selectableItems = items.filter((item) => item.disabled !== true);

  const activate = (id: string): void => {
    if (activeId === undefined) setInternalActiveId(id);
    onActiveIdChange?.(id);
    tabRefs.current.get(id)?.focus();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    const currentIndex = selectableItems.findIndex((item) => item.id === currentId);
    if (currentIndex < 0) return;

    const move = (offset: number): void => {
      // 端では反対側へ回り込む。到達できないタブを作らないため。
      const nextIndex = (currentIndex + offset + selectableItems.length) % selectableItems.length;
      const next = selectableItems[nextIndex];
      if (next) {
        event.preventDefault();
        activate(next.id);
      }
    };

    switch (event.key) {
      case 'ArrowRight':
        move(1);
        break;
      case 'ArrowLeft':
        move(-1);
        break;
      case 'Home':
        move(-currentIndex);
        break;
      case 'End':
        move(selectableItems.length - 1 - currentIndex);
        break;
      default:
        break;
    }
  };

  return (
    <div>
      <div role="tablist" aria-label={label} onKeyDown={handleKeyDown} style={{ display: 'flex', gap: spaceVar(1) }}>
        {items.map((item) => {
          const selected = item.id === currentId;
          return (
            <button
              key={item.id}
              ref={(node) => {
                if (node) tabRefs.current.set(item.id, node);
                else tabRefs.current.delete(item.id);
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.id}`}
              // 選択中のタブだけを Tab キーの到達点にする (roving tabindex)
              tabIndex={selected ? 0 : -1}
              disabled={item.disabled}
              data-hh-focusable=""
              onClick={() => activate(item.id)}
              style={{
                minHeight: 'var(--hh-control-height)',
                padding: `0 ${spaceVar(3)}`,
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${selected ? colorVar('primary') : 'transparent'}`,
                color: selected ? colorVar('primary') : colorVar('textMuted'),
                font: 'inherit',
                cursor: item.disabled === true ? 'not-allowed' : 'pointer',
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${baseId}-panel-${item.id}`}
          aria-labelledby={`${baseId}-tab-${item.id}`}
          hidden={item.id !== currentId}
          tabIndex={0}
          data-hh-focusable=""
          style={{ padding: spaceVar(3) }}
        >
          {item.id === currentId ? item.content : null}
        </div>
      ))}
    </div>
  );
}
