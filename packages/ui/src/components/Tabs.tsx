'use client';

/** タブ。矢印キーでの移動と roving tabindex を実装し、Tab キーはタブ群を 1 ストップとして扱う。 */
import { type KeyboardEvent as ReactKeyboardEvent, type ReactNode, useId, useRef, useState } from 'react';

import { colorVar, radiusVar, spaceVar } from '../internal/style.js';

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

export interface FilterTabItem<Value extends string = string> {
  readonly value: Value;
  readonly label: string;
  /**
   * 併記する件数。集計がまだ届いていない間は省略でき、そのときは数を出さない。
   *
   * `| undefined` を明示するのは `exactOptionalPropertyTypes` のため。呼び手は
   * `counts?.[tab.value]` のように「まだ無いかもしれない値」をそのまま渡すので、
   * 省略と undefined を同じ扱いにしておかないと呼び出し側が三項演算子だらけになる。
   */
  readonly count?: number | undefined;
}

export interface FilterTabsProps<Value extends string = string> {
  /** 何で絞り込む切替なのかの説明 (「状態で絞り込み」など)。 */
  label: string;
  items: readonly FilterTabItem<Value>[];
  current: Value;
  onSelect: (value: Value) => void;
}

/**
 * 同じ一覧の中身を絞り込む切替。`Tabs` とは別物。
 *
 * `Tabs` は `role="tablist"` + tabpanel の対応付けまで担う。こちらが切り替えるのは
 * 「同じ一覧に何を出すか」だけで、切替先の面が増えるわけではないので、押しボタンの束として
 * `aria-pressed` で「いま選ばれているもの」を伝える。tab を名乗ると矢印キー移動と
 * tabpanel の契約まで背負うことになり、実態と合わない。
 *
 * docs / sheets / catalog の 3 画面が同じ形を各自で書き起こしていたのをここへ集約した
 * (視覚の決定は packages/ui の層 1-3 に置く: architecture/harness-hub-design-system.md §1)。
 */
export function FilterTabs<Value extends string>({
  label,
  items,
  current,
  onSelect,
}: FilterTabsProps<Value>): ReactNode {
  return (
    // 押しボタンの束の入れ物は fieldset。既定の枠・余白・min-inline-size は flex を壊すので消す
    <fieldset
      aria-label={label}
      style={{
        margin: 0,
        border: 0,
        minInlineSize: 0,
        display: 'flex',
        flexWrap: 'wrap',
        gap: spaceVar(2),
      }}
    >
      {items.map((item) => {
        const selected = item.value === current;
        return (
          <button
            key={item.value}
            type="button"
            data-hh-focusable=""
            aria-pressed={selected}
            onClick={() => onSelect(item.value)}
            style={{
              minHeight: 'var(--hh-control-height)',
              padding: `0 ${spaceVar(3)}`,
              font: 'inherit',
              cursor: 'pointer',
              borderRadius: radiusVar('sm'),
              border: `1px solid ${colorVar('border')}`,
              background: colorVar(selected ? 'surfaceMuted' : 'surface'),
              color: colorVar('text'),
            }}
          >
            {item.label}
            {item.count === undefined ? null : <span style={{ marginInlineStart: spaceVar(1) }}>{item.count}</span>}
          </button>
        );
      })}
    </fieldset>
  );
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
          // biome-ignore lint/a11y/noNoninteractiveTabindex: WAI-ARIA APG の Tabs pattern が tabpanel を焦点可能にすることを求めている。中に操作要素が無いタブでもキーボードだけで本文へ到達し読めるようにするため必要
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
