'use client';

/** 複数行テキスト入力。Markdown エディタの下地としても使う。 */
import type { ReactNode, Ref, TextareaHTMLAttributes } from 'react';

import { controlStyle, spaceVar } from '../internal/style.js';
import { FormField } from './FormField.js';

export interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'required' | 'className'> {
  label: string;
  // 省略可能な表示 prop は `| undefined` を明示する (理由は FormFieldProps のコメント)
  hideLabel?: boolean | undefined;
  description?: string | undefined;
  error?: string | undefined;
  required?: boolean | undefined;
  ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea({
  label,
  hideLabel,
  description,
  error,
  required,
  rows = 6,
  style,
  ref,
  ...rest
}: TextareaProps): ReactNode {
  return (
    <FormField
      label={label}
      hideLabel={hideLabel}
      description={description}
      error={error}
      required={required}
    >
      {(control) => (
        <textarea
          {...rest}
          {...control}
          ref={ref}
          rows={rows}
          data-hh-focusable=""
          style={{
            ...controlStyle(Boolean(error)),
            padding: spaceVar(2),
            lineHeight: 'var(--hh-line-height-normal)',
            resize: 'vertical',
            ...style,
          }}
        />
      )}
    </FormField>
  );
}
