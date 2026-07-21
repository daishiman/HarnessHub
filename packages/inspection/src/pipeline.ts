// 検査 pipeline の骨格。ルール群を正準順序へ固定して評価し、同一入力に対して常に同一の判定を返す。

import type {
  Finding,
  InspectionResult,
  InspectionRule,
  InspectionStage,
  InspectionTarget,
  PipelineDescriptor,
  RuleFinding,
} from './types';
import { INSPECTION_STAGES, InspectionRuleError } from './types';
import { resolveVerdict } from './verdict';

/** 構築済みの検査 pipeline。ルールは正準順序に整列済みで、以後変更されない。 */
export interface InspectionPipeline {
  readonly rules: readonly InspectionRule[];
}

function stageIndex(stage: InspectionStage): number {
  const index = INSPECTION_STAGES.indexOf(stage);
  return index < 0 ? INSPECTION_STAGES.length : index;
}

/** 文字列の比較は locale 非依存にする (実行環境で並びが変わらないようにするため)。 */
function compareStrings(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

function compareRules(a: InspectionRule, b: InspectionRule): number {
  return stageIndex(a.stage) - stageIndex(b.stage) || compareStrings(a.id, b.id);
}

function compareFindings(a: Finding, b: Finding): number {
  return (
    stageIndex(a.stage) - stageIndex(b.stage) ||
    compareStrings(a.ruleId, b.ruleId) ||
    compareStrings(a.location?.path ?? '', b.location?.path ?? '') ||
    (a.location?.line ?? 0) - (b.location?.line ?? 0) ||
    (a.location?.column ?? 0) - (b.location?.column ?? 0) ||
    compareStrings(a.message, b.message)
  );
}

/**
 * ルール群から pipeline を構築する。
 * 登録順に依存しないよう正準順序へ整列し、ID 重複はここで弾く (判定の食い違いを構築時に検出する)。
 */
export function createInspectionPipeline(rules: readonly InspectionRule[]): InspectionPipeline {
  const seen = new Set<string>();
  for (const rule of rules) {
    if (seen.has(rule.id)) {
      throw new InspectionRuleError(`ルール ID が重複しています: ${rule.id}`, rule.id);
    }
    seen.add(rule.id);
  }
  return { rules: Object.freeze([...rules].sort(compareRules)) };
}

/** 既存 pipeline を変更せず、ルールを追加した新しい pipeline を返す (拡張点)。 */
export function withRules(pipeline: InspectionPipeline, rules: readonly InspectionRule[]): InspectionPipeline {
  return createInspectionPipeline([...pipeline.rules, ...rules]);
}

/** pipeline の構成を外から比較可能な形で取り出す (Hub / Publisher の同一実装参照の検証用)。 */
export function describePipeline(pipeline: InspectionPipeline): PipelineDescriptor {
  const stages = {} as Record<InspectionStage, readonly string[]>;
  for (const stage of INSPECTION_STAGES) {
    stages[stage] = pipeline.rules.filter((rule) => rule.stage === stage).map((rule) => rule.id);
  }
  return {
    ruleIds: pipeline.rules.map((rule) => rule.id),
    stages,
  };
}

/** ルールが例外を投げた場合も判定を非決定にしないため、error finding へ封じ込める。 */
function evaluateRule(rule: InspectionRule, target: InspectionTarget): readonly Finding[] {
  let ruleFindings: readonly RuleFinding[];
  try {
    ruleFindings = rule.evaluate(target);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return [
      {
        ruleId: rule.id,
        stage: rule.stage,
        severity: 'error',
        message: `ルール評価が例外で失敗しました: ${reason}`,
      },
    ];
  }

  return ruleFindings.map((finding) => ({
    ruleId: rule.id,
    stage: rule.stage,
    severity: finding.severity ?? rule.severity,
    message: finding.message,
    ...(finding.location === undefined ? {} : { location: finding.location }),
  }));
}

/**
 * 検査を実行する。純関数であり、乱数・時刻・I/O を用いない。
 * findings は正準順序へ整列するため、ルールの登録順や評価順は結果に影響しない。
 */
export function inspect(pipeline: InspectionPipeline, target: InspectionTarget): InspectionResult {
  const findings: Finding[] = [];
  for (const rule of pipeline.rules) {
    findings.push(...evaluateRule(rule, target));
  }
  findings.sort(compareFindings);

  return {
    verdict: resolveVerdict(findings),
    findings,
    evaluatedRuleIds: pipeline.rules.map((rule) => rule.id),
  };
}

/** ルール配列から 1 回だけ検査する簡易入口。 */
export function runInspection(rules: readonly InspectionRule[], target: InspectionTarget): InspectionResult {
  return inspect(createInspectionPipeline(rules), target);
}
