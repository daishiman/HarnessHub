'use client';

/** 破壊的操作の確認ダイアログ。可逆かどうかの明示・フォーカストラップ・Esc 閉じを統一パターンで担保する。 */
import { type KeyboardEvent as ReactKeyboardEvent, type ReactNode, useCallback, useEffect, useId, useRef } from 'react';

import { colorVar, radiusVar, spaceVar, surfaceStyle } from '../internal/style.js';
import { useUi } from '../theme/UiProvider.js';
import { Button } from './Button.js';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** 何が起きるかの説明。平易な日本語で書く。 */
  description: string;
  /**
   * 操作が取り消せるかどうか。
   * 必須にすることで「可逆性を明示しないダイアログ」を作れなくしている。
   */
  reversible: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  reversible,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): ReactNode {
  const { t } = useUi();
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // 開いた時点のフォーカス位置を覚えておき、閉じたら必ず戻す。
  useEffect(() => {
    if (!open) return;

    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    (focusables?.[0] ?? dialogRef.current)?.focus();

    return () => {
      returnFocusRef.current?.focus?.();
    };
  }, [open]);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCancel();
        return;
      }
      if (event.key !== 'Tab') return;

      // ダイアログ外へフォーカスが逃げないように端で巻き戻す。
      const focusables = [...(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [])];

      // 件数ではなく値そのものを確かめる。空配列の除外と型の絞り込みが 1 度で済む
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (first === undefined || last === undefined) return;

      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onCancel],
  );

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        background: 'rgba(0, 0, 0, 0.45)',
        padding: spaceVar(4),
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        style={{
          ...surfaceStyle,
          width: 'min(480px, 100%)',
          padding: spaceVar(5),
          borderRadius: radiusVar('lg'),
        }}
      >
        <h2 id={titleId} style={{ margin: 0, fontSize: 'var(--hh-font-size-lg)' }}>
          {title}
        </h2>

        <p id={descriptionId} style={{ color: colorVar('text'), lineHeight: 'var(--hh-line-height-normal)' }}>
          {description}
        </p>

        {/* 可逆性は毎回同じ位置・同じ文言で示し、利用者が読み飛ばしても形で気づけるようにする */}
        <p
          style={{
            color: reversible ? colorVar('textMuted') : colorVar('danger'),
            fontSize: 'var(--hh-font-size-sm)',
          }}
        >
          {reversible ? t('dialog.reversibleHint') : t('dialog.destructiveHint')}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spaceVar(2) }}>
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel ?? t('action.cancel')}
          </Button>
          <Button variant={reversible ? 'primary' : 'danger'} onClick={onConfirm}>
            {confirmLabel ?? t('action.confirm')}
          </Button>
        </div>
      </div>
    </div>
  );
}
