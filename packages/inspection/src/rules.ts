// ルール登録の口 (拡張点)。3 系統それぞれのルール生成ヘルパを提供し、判定内容そのものは consumer feature が渡す。

import { InspectionRuleError } from './types';
import type {
  FindingSeverity,
  InspectionRule,
  InspectionStage,
  InspectionTarget,
  RuleFinding,
} from './types';

/** ルール定義の共通入力。stage は各ヘルパが固定する。 */
interface RuleDefinition {
  readonly id: string;
  /** 既定 severity。省略時は 'error'。 */
  readonly severity?: FindingSeverity;
  readonly evaluate: (target: InspectionTarget) => readonly RuleFinding[];
}

/** ID の健全性だけを検証する。判定内容には一切踏み込まない。 */
function assertRuleId(id: string): void {
  if (id.trim().length === 0) {
    throw new InspectionRuleError('ルール ID が空です', id);
  }
  if (id !== id.trim()) {
    throw new InspectionRuleError('ルール ID の前後に空白を含められません', id);
  }
}

function defineRule(stage: InspectionStage, definition: RuleDefinition): InspectionRule {
  assertRuleId(definition.id);
  return {
    id: definition.id,
    stage,
    severity: definition.severity ?? 'error',
    evaluate: definition.evaluate,
  };
}

/** static validation 系のルールを作る (構文・構造・必須項目などの静的検証)。 */
export function defineStaticValidationRule(definition: RuleDefinition): InspectionRule {
  return defineRule('static-validation', definition);
}

/** policy 判定系のルールを作る (どの policy を適用するかは consumer feature が決める)。 */
export function definePolicyRule(definition: RuleDefinition): InspectionRule {
  return defineRule('policy', definition);
}

/** secret scan ルールの入力。検出パターンは呼び出し側が渡す (ここに業務的なパターンは埋め込まない)。 */
export interface SecretScanRuleDefinition {
  readonly id: string;
  readonly severity?: FindingSeverity;
  /** 検出パターン。flags は内部で 'g' を強制し、lastIndex は毎回リセットする。 */
  readonly pattern: RegExp;
  /** finding メッセージの組み立て。既定は「マスク済み一致文字列」を含む定型文。 */
  readonly message?: (maskedMatch: string) => string;
}

/**
 * 検出値の中身を残さないマスク。
 * 先頭 2 文字 + 伏字 + 元の長さ、という決定的な表現に落とす (秘密そのものをログに残さないため)。
 */
export function maskSecret(value: string): string {
  const head = value.slice(0, 2);
  return `${head}***(len=${value.length})`;
}

/**
 * secret scan 系のルールを作る。
 * 正規表現の lastIndex は状態を持つため、評価のたびに新しい RegExp を作って決定性を保証する。
 */
export function defineSecretScanRule(definition: SecretScanRuleDefinition): InspectionRule {
  assertRuleId(definition.id);
  const flags = definition.pattern.flags.includes('g')
    ? definition.pattern.flags
    : `${definition.pattern.flags}g`;
  const source = definition.pattern.source;
  const buildMessage = definition.message ?? ((masked: string) => `秘密情報らしき値を検出しました: ${masked}`);

  return {
    id: definition.id,
    stage: 'secret-scan',
    severity: definition.severity ?? 'error',
    evaluate: (target: InspectionTarget): readonly RuleFinding[] => {
      const findings: RuleFinding[] = [];
      for (const file of target.files) {
        const lines = file.content.split('\n');
        for (let index = 0; index < lines.length; index += 1) {
          const line = lines[index] ?? '';
          // 評価ごとに新規生成することで、前回の lastIndex を持ち越さない。
          const matcher = new RegExp(source, flags);
          let match = matcher.exec(line);
          while (match !== null) {
            findings.push({
              message: buildMessage(maskSecret(match[0])),
              location: { path: file.path, line: index + 1, column: match.index + 1 },
            });
            // 幅 0 一致による無限ループを避ける。
            if (match[0].length === 0) {
              matcher.lastIndex += 1;
            }
            match = matcher.exec(line);
          }
        }
      }
      return findings;
    },
  };
}
