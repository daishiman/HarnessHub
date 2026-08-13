'use client';

/** ボタン。用途 (主操作/副操作/破壊的操作) を variant で表し、色だけに意味を持たせない。 */
import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';

import { type ActionVariant, actionBaseStyle, actionVariantStyles } from '../internal/style.js';

/** 押せるものの意味づけは `<button>` / `<a>` で共通 (internal/style.ts が正本)。 */
export type ButtonVariant = ActionVariant;

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: ButtonVariant;
  /** 処理中。押下を無効化し、支援技術へ `aria-busy` で伝える。 */
  loading?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

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
        ...actionBaseStyle,
        cursor: disabled === true || loading ? 'not-allowed' : 'pointer',
        ...actionVariantStyles[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}
