/**
 * wrangler CLI 実行ラッパー (AD-5)。
 * exit code / stdout から成否と URL を判定するところまでが責務で、
 * health 確認・Catalog 昇格判定は行わない (Hub 側の責務、AD-5 帰結)。
 */
import type { RunProcess } from '../shared/process.js';

export interface WranglerDeployOutcome {
  readonly ok: boolean;
  readonly url: string | null;
  readonly exitCode: number;
  readonly errorMessage: string | null;
}

/** wrangler deploy の成功時 stdout に現れる `*.workers.dev` URL を抽出する。 */
const DEPLOY_URL_PATTERN = /https:\/\/\S*\.workers\.dev\S*/;

export function extractDeployUrl(stdout: string): string | null {
  const match = DEPLOY_URL_PATTERN.exec(stdout);
  return match ? match[0] : null;
}

export interface WranglerDeployArgs {
  readonly configPath: string;
  readonly env?: string;
}

export async function runWranglerDeploy(
  runProcess: RunProcess,
  args: WranglerDeployArgs,
): Promise<WranglerDeployOutcome> {
  const cliArgs = ['exec', 'wrangler', 'deploy', '--config', args.configPath];
  if (args.env !== undefined) cliArgs.push('--env', args.env);
  const result = await runProcess('pnpm', cliArgs);
  // Wrangler は deploy URL を出力した後、後処理の失敗などで非 0 終了することがある。
  // URL が分かるなら Hub へ orphan_candidate として記録できるよう、exit code より先に抽出する。
  const url = extractDeployUrl(result.stdout);
  if (result.exitCode !== 0) {
    return {
      ok: false,
      url,
      exitCode: result.exitCode,
      errorMessage: result.stderr.length > 0 ? result.stderr : 'wrangler deploy が失敗しました',
    };
  }
  if (url === null) {
    return {
      ok: false,
      url: null,
      exitCode: result.exitCode,
      errorMessage: 'wrangler の出力から URL を抽出できませんでした',
    };
  }
  return { ok: true, url, exitCode: result.exitCode, errorMessage: null };
}
