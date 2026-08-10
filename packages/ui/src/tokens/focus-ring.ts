/**
 * フォーカス可視化の宣言を 1 箇所に置く。
 *
 * token 層 (`buildThemeCss`) は `[data-hh-focusable]` を付けた自作部品を、base 層 (`buildBaseCss`) は
 * ネイティブの操作要素を対象にする。対象セレクタは違うが「どう見えるか」は同じでなければならないため、
 * 宣言本体をここへ 1 つだけ置く。2 か所に書くと片方だけ太さや色を変えたときに
 * 「部品とネイティブ要素でフォーカスリングが違う」という視覚のほつれが生まれる。
 */

/** フォーカスリングの宣言本体 (WCAG 2.2 の 2.4.11 非遮蔽・2.4.13 外観に対応)。 */
export const focusRingDeclarations = [
  '  outline: 2px solid var(--hh-color-focus-ring);',
  '  outline-offset: 2px;',
].join('\n');

/** 任意のセレクタへフォーカスリングを適用する CSS 規則を組み立てる。 */
export function focusRingRule(selector: string): string {
  return `${selector} {\n${focusRingDeclarations}\n}`;
}
