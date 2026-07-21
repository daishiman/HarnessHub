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
  type SecretMatchContext,
  type SecretScanRuleDefinition,
} from './rules';

export {
  KNOWN_PUBLIC_EXAMPLE_SECRETS,
  SECRET_SCAN_ALLOW_MARKER,
  createDefaultSecretScanRules,
  isSuppressedSecretMatch,
  scanFilesForSecrets,
  secretScanExitCode,
} from './secret-scan-preset';

export {
  createInspectionPipeline,
  describePipeline,
  inspect,
  runInspection,
  withRules,
  type InspectionPipeline,
} from './pipeline';

export { mergeVerdicts, resolveVerdict, severityRank, verdictRank } from './verdict';
