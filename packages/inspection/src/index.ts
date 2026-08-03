// packages/inspection の公開 API。Hub 正式検査と Publisher ローカル pre-check はこの入口のみを参照する。

export {
  ARCHIVE_LIMITS,
  ARCHIVE_RULE_IDS,
  type ArchiveEntry,
  type ArchiveHeaderReport,
  inspectArchiveHeader,
} from './archive';
export {
  createPackageInspectionRules,
  PACKAGE_MANIFEST_PATH,
  PACKAGE_REQUIRED_META_KEYS,
  PACKAGE_RULE_IDS,
} from './package-rules';
export {
  createInspectionPipeline,
  describePipeline,
  type InspectionPipeline,
  inspect,
  runInspection,
  withRules,
} from './pipeline';
export { createPublishInspectionRules, PUBLISH_INSPECTION_REQUIRED_STAGES } from './publish-inspection';

export {
  definePolicyRule,
  defineSecretScanRule,
  defineStaticValidationRule,
  maskSecret,
  type SecretMatchContext,
  type SecretScanRuleDefinition,
} from './rules';

export {
  createDefaultSecretScanRules,
  isSuppressedSecretMatch,
  KNOWN_PUBLIC_EXAMPLE_SECRETS,
  SECRET_SCAN_ALLOW_MARKER,
  scanFilesForSecrets,
  secretScanExitCode,
} from './secret-scan-preset';
export {
  type Finding,
  type FindingLocation,
  type FindingSeverity,
  INSPECTION_STAGES,
  type InspectionFile,
  type InspectionResult,
  type InspectionRule,
  InspectionRuleError,
  type InspectionStage,
  type InspectionTarget,
  type InspectionVerdict,
  type PipelineDescriptor,
  type RuleFinding,
} from './types';

export { mergeVerdicts, resolveVerdict, severityRank, verdictRank } from './verdict';
