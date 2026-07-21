// 検査 pipeline を Hub 実行文脈へ結線するだけの層。判定ルールも実行アルゴリズムも持たない
// 実装の正本は @harness-hub/inspection。ここで同名 export を作らないこと (第 4 acceptance の duplicate detector 対象)
import {
  createInspectionPipeline,
  type InspectionPipeline,
  type InspectionResult,
  type InspectionRule,
  type InspectionTarget,
  inspect,
} from '@harness-hub/inspection';

/**
 * Hub 側のルール登録簿。
 * consumer feature (feat-publish-pipeline 等) が自分のルールを登録し、
 * Hub の正式検査と Publisher のローカル pre-check が同一 package の実装で評価される状態を保つ。
 */
export interface HubInspectionRegistry {
  register(rules: readonly InspectionRule[]): void;
  /** 登録済みルールから pipeline を構築する。正準順序への整列は package 側が行う */
  buildPipeline(): InspectionPipeline;
}

export function createHubInspectionRegistry(): HubInspectionRegistry {
  const rules: InspectionRule[] = [];
  return {
    register(added) {
      rules.push(...added);
    },
    buildPipeline() {
      return createInspectionPipeline(rules);
    },
  };
}

/** Hub 正式検査の実行入口。評価そのものは package の inspect に委譲する */
export function runHubInspection(registry: HubInspectionRegistry, target: InspectionTarget): InspectionResult {
  return inspect(registry.buildPipeline(), target);
}
