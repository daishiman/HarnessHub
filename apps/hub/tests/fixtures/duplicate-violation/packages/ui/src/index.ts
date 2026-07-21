// HF-A4-DUP-002 用 fixture の owner package。ここが「正しい単一 owner」を演じる。
// 本物の packages/ui とは無関係で、detector の走査起点を差し替えたときだけ読まれる。
export const DuplicatedWidget = () => 'owner-implementation';
export type DuplicatedWidgetProps = { readonly label: string };
