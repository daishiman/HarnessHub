'use client';

/** 単一選択。ネイティブ select を使い、キーボード操作と IME/モバイル UI を OS へ委ねる。 */
import type { ReactNode, Ref, SelectHTMLAttributes } from 'react';

import { controlStyle } from '../internal/style.js';
import { FormField } from './FormField.js';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'required' | 'children' | 'className'> {
  label: string;
  options: readonly SelectOption[];
  hideLabel?: boolean;
  description?: string;
  error?: string;
  required?: boolean;
  /** 未選択を表す先頭項目。必須項目で「未選択」を明示したいときに使う。 */
  placeholder?: string;
  ref?: Ref<HTMLSelectElement>;
}

export function Select({
  label,
  options,
  hideLabel,
  description,
  error,
  required,
  placeholder,
  style,
  ref,
  ...rest
}: SelectProps): ReactNode {
  return (
    <FormField
      label={label}
      hideLabel={hideLabel}
      description={description}
      error={error}
      required={required}
    >
      {(control) => (
        <select
          {...rest}
          {...control}
          ref={ref}
          data-hh-focusable=""
          style={{ ...controlStyle(Boolean(error)), ...style }}
        >
          {placeholder === undefined ? null : <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FormField>
  );
}
