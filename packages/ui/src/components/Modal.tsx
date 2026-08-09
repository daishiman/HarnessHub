'use client';

/**
 * 汎用モーダル。frontend-spec §3.2 の各画面のモーダル (導入手順・ダウンロード・
 * 詳細プレビューなど) が個別に組み立てないための共通の器。
 *
 * 「確認して実行する」用途は ConfirmDialog を使うこと。可逆性の明示という
 * 判断がそちらには必須で、この汎用モーダルにはその強制がない。
 */
import {
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useId,
  useRef,
} from 'react';
import { Icon } from '../icons/index.js';
import { useFocusTrap, useScrollLock } from '../internal/focus-trap.js';
import { colorVar, radiusVar, spaceVar, surfaceStyle } from '../internal/style.js';
import { useUi } from '../theme/UiProvider.js';

/** 横幅。内容量ではなく用途で選べるよう 3 段階に固定する。 */
export type ModalSize = 'sm' | 'md' | 'lg';

const modalWidths: Record<ModalSize, string> = {
  sm: 'min(420px, 100%)',
  md: 'min(640px, 100%)',
  lg: 'min(880px, 100%)',
};

const backdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 50,
  display: 'grid',
  placeItems: 'center',
  background: 'rgba(0, 0, 0, 0.45)',
  padding: spaceVar(4),
};

export interface ModalProps {
  open: boolean;
  /** 見出し。`aria-labelledby` の参照先になるので省略できない。 */
  title: string;
  /** 補足説明。渡すと `aria-describedby` で読み上げに含まれる。 */
  description?: string | undefined;
  size?: ModalSize | undefined;
  /** 右下に置く操作列。省略すると閉じるボタンだけが残る。 */
  footer?: ReactNode | undefined;
  /**
   * 背景クリックで閉じるか。既定は閉じる。
   * 入力途中の内容を失わせたくないモーダルでは false にする。
   */
  closeOnBackdrop?: boolean | undefined;
  onClose: () => void;
  children: ReactNode;
}

/** 見出し・本文・操作列の 3 段構成を固定したモーダル。 */
export function Modal({
  open,
  title,
  description,
  size = 'md',
  footer,
  closeOnBackdrop = true,
  onClose,
  children,
}: ModalProps): ReactNode {
  const { t } = useUi();
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  const dialogRef = useRef<HTMLDivElement>(null);

  const { onKeyDown } = useFocusTrap(open, dialogRef, onClose);
  useScrollLock(open);

  // 背景そのものを押したときだけ閉じる。中身のクリックが親へ伝播しても無視する。
  const handleBackdropClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      // 背面 button そのものを押したときだけ閉じる
      if (event.target !== event.currentTarget) return;
      onClose();
    },
    [onClose],
  );

  if (!open) return null;

  return (
    <div style={backdropStyle}>
      {/* 背景は「押せる要素」として置く。div に onClick を付けるとキーボードから
          到達できない操作になるため、閉じる意味を持った button にしている。
          tab 順からは外し (tabIndex -1)、閉じ方はヘッダーの閉じるボタンと Esc が正規の導線。 */}
      {closeOnBackdrop ? (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={handleBackdropClick}
          style={{ position: 'absolute', inset: 0, background: 'transparent', border: 'none', cursor: 'default' }}
        />
      ) : null}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        {...(description === undefined ? {} : { 'aria-describedby': descriptionId })}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        style={{
          ...surfaceStyle,
          position: 'relative',
          width: modalWidths[size],
          maxHeight: 'calc(100vh - 2 * var(--hh-space-5))',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: radiusVar('lg'),
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: spaceVar(3),
            padding: spaceVar(5),
            paddingBottom: spaceVar(3),
          }}
        >
          <div style={{ flex: 1 }}>
            <h2 id={titleId} style={{ margin: 0, fontSize: 'var(--hh-font-size-lg)' }}>
              {title}
            </h2>
            {description === undefined ? null : (
              <p
                id={descriptionId}
                style={{
                  margin: `${spaceVar(2)} 0 0`,
                  color: colorVar('textMuted'),
                  fontSize: 'var(--hh-font-size-sm)',
                  lineHeight: 'var(--hh-line-height-normal)',
                }}
              >
                {description}
              </p>
            )}
          </div>

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
              padding: 0,
              color: colorVar('textMuted'),
              background: 'transparent',
              border: 'none',
              borderRadius: radiusVar('sm'),
              cursor: 'pointer',
            }}
          >
            <Icon name="close" />
          </button>
        </div>

        {/* 本文だけを伸縮させ、見出しと操作列は常に見える位置に留める */}
        <div style={{ flex: 1, overflowY: 'auto', padding: `0 ${spaceVar(5)}` }}>{children}</div>

        {footer === undefined ? null : (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: spaceVar(2),
              padding: spaceVar(5),
              paddingTop: spaceVar(4),
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
