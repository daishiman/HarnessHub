/**
 * `harness-publisher` CLI エントリポイント (AD-1 cli/)。
 *
 * argv を解析し `publish`/`feedback` サブコマンドへ dispatch する。process.exit や
 * process.argv の読み取りはここでは行わない (`bin/harness-publisher.mjs` 側の責務) —
 * `main()` を純粋に「argv 配列 → exit code」の関数として保つことで、実行環境に触れずに
 * このファイル自体をテストできるようにする。
 */
import { publishTargetSchema, publishVisibilitySchema } from '@harness-hub/schemas';

import { createCredentialStoreAdapter } from '../auth/index.js';
import { createNodeProcessRunner, type RunProcess } from '../shared/process.js';
import { createDeviceCodeRequester, createPollTokenEndpoint, createRefreshTokenEndpoint } from './device-endpoints.js';
import { type FeedbackCommandDeps, type FeedbackCommandOptions, runFeedbackCommand } from './feedback-command.js';
import { createHubApiClient } from './http-client.js';
import { type PublishCommandDeps, type PublishCommandOptions, runPublishCommand } from './publish-command.js';
import type { SessionDeps } from './session.js';

const FEEDBACK_TYPES = ['improvement', 'review', 'bug'] as const;
const FEEDBACK_PRIORITIES = ['high', 'medium', 'low'] as const;

export interface ParsedArgs {
  readonly subcommand: string;
  readonly options: ReadonlyMap<string, string>;
}

/** `--key value` 形式のみ受け付ける (`--key=value` は非対応、フラグ単体の boolean オプションも今は無い)。 */
export function parseArgs(argv: readonly string[]): ParsedArgs {
  const [subcommand, ...rest] = argv;
  const options = new Map<string, string>();
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (token === undefined || !token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = rest[i + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`--${key} には値が必要です`);
    }
    options.set(key, value);
    i += 1;
  }
  return { subcommand: subcommand ?? '', options };
}

export function requireOption(options: ReadonlyMap<string, string>, key: string): string {
  const value = options.get(key);
  if (value === undefined) throw new Error(`--${key} は必須です`);
  return value;
}

function requireEnum<T extends string>(options: ReadonlyMap<string, string>, key: string, allowed: readonly T[]): T {
  const value = requireOption(options, key);
  if (!(allowed as readonly string[]).includes(value)) {
    throw new Error(`--${key} は ${allowed.join('/')} のいずれかである必要があります (受け取った値: ${value})`);
  }
  return value as T;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowEpochSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/** 認可 URL をブラウザで開く。開けなくても polling 自体は継続できるので失敗は無視する。 */
function openVerificationUrl(runProcess: RunProcess, url: string): void {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  void runProcess(command, args);
}

function buildSessionDeps(runProcess: RunProcess, hubBaseUrl: string, tenantSlug: string): SessionDeps {
  return {
    credentialStore: createCredentialStoreAdapter(runProcess),
    requestDeviceCode: createDeviceCodeRequester(hubBaseUrl),
    pollTokenEndpoint: createPollTokenEndpoint(hubBaseUrl, tenantSlug),
    refreshTokenEndpoint: createRefreshTokenEndpoint(hubBaseUrl, tenantSlug),
    sleep,
    now: nowEpochSeconds,
    openVerificationUrl: (url) => openVerificationUrl(runProcess, url),
    log: (message) => console.log(message),
  };
}

async function dispatchPublish(
  hubBaseUrl: string,
  tenantSlug: string,
  origin: string,
  options: ReadonlyMap<string, string>,
): Promise<number> {
  const wranglerConfigPath = options.get('wrangler-config');
  const publishOptions: PublishCommandOptions = {
    packageDir: requireOption(options, 'package-dir'),
    tenantSlug,
    projectId: requireOption(options, 'project-id'),
    target: publishTargetSchema.parse(requireOption(options, 'target')),
    visibility: publishVisibilitySchema.parse(requireOption(options, 'visibility')),
    hubBaseUrl,
    origin,
    // exactOptionalPropertyTypes: true のため、未指定時は key 自体を省く (undefined を代入しない)。
    ...(wranglerConfigPath === undefined ? {} : { wranglerConfigPath }),
  };
  const runProcess = createNodeProcessRunner();
  const deps: PublishCommandDeps = {
    ...buildSessionDeps(runProcess, hubBaseUrl, tenantSlug),
    runProcess,
    createHubApiClient,
  };
  const result = await runPublishCommand(publishOptions, deps);
  if (!result.ok) {
    console.error(result.reason);
    return 1;
  }
  console.log(`公開が完了しました (id=${result.request.id}, status=${result.request.status})`);
  if (result.deployedUrl !== null) console.log(`deploy URL: ${result.deployedUrl}`);
  return 0;
}

async function dispatchFeedback(
  hubBaseUrl: string,
  tenantSlug: string,
  origin: string,
  options: ReadonlyMap<string, string>,
): Promise<number> {
  const feedbackOptions: FeedbackCommandOptions = {
    tenantSlug,
    projectId: requireOption(options, 'project-id'),
    type: requireEnum(options, 'type', FEEDBACK_TYPES),
    priority: requireEnum(options, 'priority', FEEDBACK_PRIORITIES),
    body: requireOption(options, 'body'),
    hubBaseUrl,
    origin,
  };
  const runProcess = createNodeProcessRunner();
  const deps: FeedbackCommandDeps = {
    ...buildSessionDeps(runProcess, hubBaseUrl, tenantSlug),
    createHubApiClient,
  };
  await runFeedbackCommand(feedbackOptions, deps);
  console.log('feedback を送信しました');
  return 0;
}

export async function main(argv: readonly string[]): Promise<number> {
  const { subcommand, options } = parseArgs(argv);
  if (subcommand !== 'publish' && subcommand !== 'feedback') {
    console.error(`未知のサブコマンドです: "${subcommand}" (publish / feedback のいずれかを指定してください)`);
    return 1;
  }

  const hubBaseUrl = requireOption(options, 'hub-url');
  const tenantSlug = requireOption(options, 'tenant-slug');
  const origin = requireOption(options, 'origin');

  return subcommand === 'publish'
    ? dispatchPublish(hubBaseUrl, tenantSlug, origin, options)
    : dispatchFeedback(hubBaseUrl, tenantSlug, origin, options);
}
