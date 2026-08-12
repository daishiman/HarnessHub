'use client';

/**
 * ボトムシート (frontend-spec §6.3 の変換パターン P6)。
 *
 * モバイルでは中央モーダルより下端から出るシートのほうが親指の届く範囲に収まる。
 * 確認ダイアログだけは中央のまま維持する規則なので、そちらは ConfirmDialog を使う。
 *
 * フォーカスの閉じ込め・Esc 閉じ・背面スクロール停止は Modal と同じ規則を共有する。
 */
import { type MouseEvent as ReactMouseEvent, type ReactNode, useCallback, useId, useRef } from 'react';

import { Icon } from '../icons/index.js';
import { useFocusTrap, useScrollLock } from '../internal/focus-trap.js';
import { colorVar, radiusVar, spaceVar } from '../internal/style.js';
import { useUi } from '../theme/UiProvider.js';

export interface BottomSheetProps {
  open: boolean;
  title: string;
  /** 未保存の入力を持つ場合は false にし、保存・破棄確認から明示的に閉じる。 */
  dismissible?: boolean | undefined;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheet({ open, title, dismissible = true, onClose, children }: BottomSheetProps): ReactNode {
  const { t } = useUi();
  const id = useId();
  const titleId = `${id}-title`;
  const sheetRef = useRef<HTMLDivElement>(null);

  const { onKeyDown } = useFocusTrap(open, sheetRef, dismissible ? onClose : undefined);
  useScrollLock(open);

  const handleBackdropClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      if (event.target !== event.currentTarget) return;
      onClose();
    },
    [onClose],
  );

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'flex-end',
        background: 'rgba(0, 0, 0, 0.45)',
      }}
    >
      {/* 背景は押せる要素として置く (理由は Modal と同じ) */}
      {dismissible ? (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={handleBackdropClick}
          style={{ position: 'absolute', inset: 0, background: 'transparent', border: 'none', cursor: 'default' }}
        />
      ) : null}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        style={{
          position: 'relative',
          width: '100%',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          background: colorVar('surface'),
          color: colorVar('text'),
          borderStartStartRadius: radiusVar('lg'),
          borderStartEndRadius: radiusVar('lg'),
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* つまみ。押せる部品ではないので装飾扱いにする */}
        <div
          aria-hidden
          style={{
            width: '36px',
            height: '4px',
            margin: `${spaceVar(2)} auto 0`,
            borderRadius: radiusVar('full'),
            background: colorVar('border'),
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spaceVar(2),
            padding: `${spaceVar(3)} ${spaceVar(4)}`,
          }}
        >
          <h2 id={titleId} style={{ flex: 1, margin: 0, fontSize: 'var(--hh-font-size-lg)' }}>
            {title}
          </h2>
          {dismissible ? (
            <button
              type="button"
              onClick={onClose}
              aria-label={t('action.close')}
              data-hh-focusable=""
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 'var(--hh-control-height)',
                minHeight: 'var(--hh-control-height)',
                color: colorVar('textMuted'),
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Icon name="close" />
            </button>
          ) : null}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: `0 ${spaceVar(4)} ${spaceVar(4)}` }}>{children}</div>
      </div>
    </div>
  );
}
