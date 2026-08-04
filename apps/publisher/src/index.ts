/**
 * `@harness-hub/publisher` の公開 API (AD-1)。
 * `plugins/harness-hub-publisher/` の薄いラッパーは CLI (`bin/harness-publisher.mjs`) だけを
 * 子プロセスとして起動するため通常はここを import しないが、テストや将来の in-process 利用のために
 * 各サブディレクトリの公開面をここへ集約する。
 */
export { type CredentialStoreAdapter, scopesForCommand } from './auth/index.js';
export { type FeedbackCommandOptions, runFeedbackCommand } from './cli/feedback-command.js';
export { type PublishCommandOptions, type PublishCommandResult, runPublishCommand } from './cli/publish-command.js';
export { buildPackageArchive, collectPackageFiles, completePackageManifest } from './core/index.js';
export { extractDeployUrl, registerWranglerDeployment, runWranglerDeploy } from './deploy/index.js';
export { runLocalPreCheck } from './inspection-client/index.js';
