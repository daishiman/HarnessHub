'use client';

/** ラベル・補足・エラーと入力欄の a11y 配線を一括で担保する。個別画面で aria-* を書かせない。 */
import { useId, type CSSProperties, type ReactNode } from 'react';

import { useUiText } from '../theme/UiProvider.js';
import { colorVar, spaceVar, visuallyHidden } from '../internal/style.js';

/** FormField が入力欄へ渡す属性一式。独自の入力部品もこれを受け取れば a11y を満たせる。 */
export interface FieldControlProps {
  id: string;
  required: boolean;
  'aria-describedby': string | undefined;
  'aria-invalid': boolean | undefined;
}

/**
 * 表示 prop の省略可能な項目には `| undefined` を明示する (`exactOptionalPropertyTypes: true` 前提)。
 * これらの prop は「未指定」と「明示的な undefined」で意味が変わらない (どちらも「説明なし」) ため、
 * 両方を受け取れることを型に書くのが正直な表現。consumer に conditional spread を強いない狙いもある。
 * 逆に、未指定と undefined で意味が変わる契約 (PATCH の「項目を消す」等) では `?:` のままにする。
 */
export interface FormFieldProps {
  /** ラベルは必須。視覚的に隠す場合も `hideLabel` を使い、ラベル自体は必ず持たせる。 */
  label: string;
  /** ラベルを視覚的にのみ隠す (支援技術へは読ませる)。 */
  hideLabel?: boolean | undefined;
  /** 入力の補足説明。 */
  description?: string | undefined;
  /** エラー文言。平易な日本語 + 次の一手を書く。 */
  error?: string | undefined;
  required?: boolean | undefined;
  children: (control: FieldControlProps) => ReactNode;
}

const labelStyle: CSSProperties = {
  display: 'block',
  marginBottom: spaceVar(1),
  color: colorVar('text'),
  fontSize: 'var(--hh-font-size-sm)',
  fontWeight: 'var(--hh-font-weight-bold)',
};

/**
 * 入力欄 1 つ分の枠。`children` へ渡る属性を入力欄に展開することで、
 * label の for/id・説明の aria-describedby・エラーの aria-invalid が必ず揃う。
 */
export function FormField({
  label,
  hideLabel = false,
  description,
  error,
  required = false,
  children,
}: FormFieldProps): ReactNode {
  const id = useId();
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  const t = useUiText();

  const describedBy = [description ? descriptionId : null, error ? errorId : null]
    .filter((value): value is string => value !== null)
    .join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginBottom: spaceVar(3) }}>
      <label htmlFor={id} style={hideLabel ? visuallyHidden : labelStyle}>
        {label}
        {required ? (
          <span style={{ color: colorVar('danger'), marginInlineStart: spaceVar(1) }}>
            {t('field.required')}
          </span>
        ) : null}
      </label>

      {children({
        id,
        required,
        'aria-describedby': describedBy === '' ? undefined : describedBy,
        'aria-invalid': error ? true : undefined,
      })}

      {description ? (
        <span
          id={descriptionId}
          style={{ marginTop: spaceVar(1), color: colorVar('textMuted'), fontSize: 'var(--hh-font-size-sm)' }}
        >
          {description}
        </span>
      ) : null}

      {error ? (
        <span
          id={errorId}
          style={{ marginTop: spaceVar(1), color: colorVar('danger'), fontSize: 'var(--hh-font-size-sm)' }}
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}
