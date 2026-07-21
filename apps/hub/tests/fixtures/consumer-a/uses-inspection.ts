// 第 2 consumer 系統による @harness-hub/inspection の利用。Publisher ローカル pre-check 側の系統を模す
import {
  createInspectionPipeline,
  definePolicyRule,
  defineSecretScanRule,
  defineStaticValidationRule,
  describePipeline,
  type InspectionResult,
  type InspectionRule,
  type InspectionTarget,
  inspect,
  type PipelineDescriptor,
  runInspection,
} from '@harness-hub/inspection';

export const boundInspect = inspect;
export const boundRunInspection = runInspection;
export const boundCreateInspectionPipeline = createInspectionPipeline;

/**
 * 挙動同値検証 (HF-A4-CONTRACT-003) 用の共有ルール集合。
 * Hub 正式検査側と同じ定義を使い、同一入力に対する判定が一致することを確かめる。
 *
 * 3 stage (static-validation / secret-scan / policy) を必ず 1 件以上埋める。
 * stage が欠けていると「stage 順の正準整列」が検証されず、
 * 両 consumer が揃って空ルールへ退化した故障を素通りさせるため。
 */
export const sharedRules: readonly InspectionRule[] = [
  defineStaticValidationRule({
    id: 'manifest-name-required',
    evaluate: (target) =>
      typeof target.metadata['name'] === 'string' && target.metadata['name'] !== ''
        ? []
        : [{ message: 'manifest の name が未指定です' }],
  }),
  defineStaticValidationRule({
    id: 'no-empty-file',
    severity: 'warn',
    evaluate: (target) =>
      target.files
        .filter((file) => file.content.trim().length === 0)
        .map((file) => ({ message: '空ファイルです', location: { path: file.path } })),
  }),
  defineSecretScanRule({
    id: 'secret-aws-access-key',
    pattern: /AKIA[0-9A-Z]{16}/,
  }),
  definePolicyRule({
    id: 'policy-max-files',
    severity: 'warn',
    evaluate: (target) => (target.files.length > 2 ? [{ message: 'ファイル数が上限を超えています' }] : []),
  }),
];

/** Publisher ローカル pre-check 相当の実行経路 (簡易入口を使う) */
export function preCheck(target: InspectionTarget): InspectionResult {
  return runInspection(sharedRules, target);
}

export function describeSharedPipeline(): PipelineDescriptor {
  return describePipeline(createInspectionPipeline(sharedRules));
}
