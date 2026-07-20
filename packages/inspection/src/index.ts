// packages/inspection の公開 API。Hub 正式検査と Publisher ローカル pre-check はこの入口のみを参照する。

export {
  INSPECTION_STAGES,
  InspectionRuleError,
  type Finding,
  type FindingLocation,
  type FindingSeverity,
  type InspectionFile,
  type InspectionResult,
  type InspectionRule,
  type InspectionStage,
  type InspectionTarget,
  type InspectionVerdict,
  type PipelineDescriptor,
  type RuleFinding,
} from './types';

export {
  defineStaticValidationRule,
  definePolicyRule,
  defineSecretScanRule,
  maskSecret,
  type SecretScanRuleDefinition,
} from './rules';

export {
  createInspectionPipeline,
  describePipeline,
  inspect,
  runInspection,
  withRules,
  type InspectionPipeline,
} from './pipeline';

export { mergeVerdicts, resolveVerdict, severityRank, verdictRank } from './verdict';
