'use client';

/** ボタン。用途 (主操作/副操作/破壊的操作) を variant で表し、色だけに意味を持たせない。 */
import type { ButtonHTMLAttributes, CSSProperties, ReactNode, Ref } from 'react';

import { colorVar, radiusVar, spaceVar } from '../internal/style.js';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: ButtonVariant;
  /** 処理中。押下を無効化し、支援技術へ `aria-busy` で伝える。 */
  loading?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

const variantStyles: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: colorVar('primary'),
    color: colorVar('onPrimary'),
    border: `1px solid ${colorVar('primary')}`,
  },
  secondary: {
    background: colorVar('surface'),
    color: colorVar('text'),
    border: `1px solid ${colorVar('borderStrong')}`,
  },
  danger: {
    background: colorVar('danger'),
    color: colorVar('onDanger'),
    border: `1px solid ${colorVar('danger')}`,
  },
  ghost: {
    background: 'transparent',
    color: colorVar('primary'),
    border: '1px solid transparent',
  },
};

/**
 * `type` は既定で `button`。フォーム内の意図しない submit を防ぐため、
 * 送信ボタンは呼び出し側が明示的に `type="submit"` を指定する。
 */
export function Button({
  variant = 'secondary',
  loading = false,
  disabled,
  type = 'button',
  style,
  children,
  ref,
  ...rest
}: ButtonProps): ReactNode {
  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      data-hh-focusable=""
      data-variant={variant}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spaceVar(2),
        minHeight: 'var(--hh-control-height)',
        padding: `0 ${spaceVar(4)}`,
        borderRadius: radiusVar('sm'),
        fontSize: 'var(--hh-font-size-md)',
        fontFamily: 'inherit',
        cursor: disabled === true || loading ? 'not-allowed' : 'pointer',
        ...variantStyles[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}
