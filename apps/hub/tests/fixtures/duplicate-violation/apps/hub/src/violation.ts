// HF-A4-DUP-002 用 fixture: 意図的な違反 1「owner package 外に同名 export」。
// detector がこれを検出できなければ、A4 のゲートは常時緑になる故障を起こしている。
export const DuplicatedWidget = () => 'copy-pasted-implementation';
