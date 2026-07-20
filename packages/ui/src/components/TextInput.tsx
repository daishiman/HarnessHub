'use client';

/** 1 行テキスト入力。ラベルを必須 prop にして、ラベル無し入力を型の段階で作れなくする。 */
import type { InputHTMLAttributes, ReactNode, Ref } from 'react';

import { controlStyle } from '../internal/style.js';
import { FormField } from './FormField.js';

export interface TextInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'required' | 'className'> {
  label: string;
  // 省略可能な表示 prop は `| undefined` を明示する (理由は FormFieldProps のコメント)
  hideLabel?: boolean | undefined;
  description?: string | undefined;
  error?: string | undefined;
  required?: boolean | undefined;
  ref?: Ref<HTMLInputElement>;
}

export function TextInput({
  label,
  hideLabel,
  description,
  error,
  required,
  style,
  ref,
  ...rest
}: TextInputProps): ReactNode {
  return (
    <FormField
      label={label}
      hideLabel={hideLabel}
      description={description}
      error={error}
      required={required}
    >
      {(control) => (
        <input
          {...rest}
          {...control}
          ref={ref}
          data-hh-focusable=""
          style={{ ...controlStyle(Boolean(error)), ...style }}
        />
      )}
    </FormField>
  );
}
