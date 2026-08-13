'use client';

/**
 * 見た目はリンク、意味はボタン。`ActionLink` (見た目はボタン・意味はリンク) の対。
 *
 * 「開閉する」「1 件だけ取り消す」のような**遷移しない小さな操作**を、
 * 塊の中に文章と同じ大きさで置きたい場面がある。そこに `Button` を置くと
 * 44px の操作域と塗りが本文の流れを断ち切るため、これまで各画面が
 * `<button style={{ background: 'none', border: 'none', padding: 0 }}>` を
 * 書き起こしていた。書き起こすたびに色・字の大きさ・下線の有無がずれるので、
 * ここに 1 つだけ置く。
 *
 * `<span>` ではなく `<button>` なのは、キーボード操作と支援技術への役割の伝達を
 * ブラウザ既定に任せるため。`<button>` は phrasing content なので、
 * `<p>` の中 (DataTable の狭幅描画など) にも安全に置ける。
 */
import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';

import { colorVar } from '../internal/style.js';

export interface TextButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'style'> {
  /** 破壊的な操作 (取り消し・削除) は色を danger に寄せる。 */
  tone?: 'primary' | 'danger' | 'muted';
  ref?: Ref<HTMLButtonElement>;
}

const toneColor = { primary: 'primary', danger: 'danger', muted: 'textMuted' } as const;

export function TextButton(props: TextButtonProps): ReactNode {
  const { tone = 'primary', type = 'button', disabled, children, ref, ...untrustedRest } = props;
  // JavaScript 呼出し・型の迂回で style/className が渡されても、canonical 表現を壊さない。
  // 局所の必要性は tone 等の意味的 prop として部品契約へ昇格させる。
  const {
    style: _ignoredStyle,
    className: _ignoredClassName,
    ...rest
  } = untrustedRest as typeof untrustedRest & {
    style?: unknown;
    className?: unknown;
  };
  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      data-hh-focusable=""
      data-tone={tone}
      disabled={disabled}
      style={{
        // 文章の流れに載せるため、面としての装飾は持たない
        background: 'none',
        border: 'none',
        padding: 0,
        alignSelf: 'flex-start',
        textAlign: 'inherit',
        fontFamily: 'inherit',
        fontSize: 'var(--hh-font-size-sm)',
        lineHeight: 'var(--hh-line-height-normal)',
        color: disabled === true ? colorVar('textMuted') : colorVar(toneColor[tone]),
        cursor: disabled === true ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}
