// findings から最終 verdict を畳み込む純関数。判定の食い違いを防ぐため集約規則はここ 1 箇所だけに置く。

import type { Finding, FindingSeverity, InspectionVerdict } from './types';

/** severity の強さ。大きいほど重い。 */
const SEVERITY_RANK: Readonly<Record<FindingSeverity, number>> = {
  info: 0,
  warn: 1,
  error: 2,
};

/** verdict の強さ。verdict 同士の合成 (複数 pipeline の結果統合) に使う。 */
const VERDICT_RANK: Readonly<Record<InspectionVerdict, number>> = {
  pass: 0,
  warn: 1,
  fail: 2,
};

export function severityRank(severity: FindingSeverity): number {
  return SEVERITY_RANK[severity];
}

export function verdictRank(verdict: InspectionVerdict): number {
  return VERDICT_RANK[verdict];
}

/**
 * findings を verdict へ畳み込む。
 * error が 1 件でもあれば fail、warn があれば warn、info のみ / 0 件なら pass。
 */
export function resolveVerdict(findings: readonly Finding[]): InspectionVerdict {
  let worst = 0;
  for (const finding of findings) {
    const rank = SEVERITY_RANK[finding.severity];
    if (rank > worst) {
      worst = rank;
    }
  }
  if (worst >= SEVERITY_RANK.error) {
    return 'fail';
  }
  if (worst >= SEVERITY_RANK.warn) {
    return 'warn';
  }
  return 'pass';
}

/** 複数の verdict のうち最も重いものを返す。空配列は pass。 */
export function mergeVerdicts(verdicts: readonly InspectionVerdict[]): InspectionVerdict {
  let worst: InspectionVerdict = 'pass';
  for (const verdict of verdicts) {
    if (VERDICT_RANK[verdict] > VERDICT_RANK[worst]) {
      worst = verdict;
    }
  }
  return worst;
}
