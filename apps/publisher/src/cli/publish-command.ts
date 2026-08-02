/**
 * `publish` サブコマンドのオーケストレーション (AD-1 cli/)。
 *
 * collect → manifest 補完 → ローカル pre-check → (未保存なら device flow / 保存済みなら refresh) →
 * Hub へ送信 → submit → (target=web_app かつ published なら) wrangler deploy → deployment 登録、
 * という一連の流れを 1 箇所にまとめる。各ステップの実装 (core/, auth/, deploy/, inspection-client/) は
 * 既に個別にテストされた純関数/薄い wrapper なので、ここでは「どの順で・どう繋ぐか」だけを扱う。
 *
 * access token は OS 資格情報域に保存しない (AD-4, credential-record.ts 冒頭コメント) ため、
 * 1 回の実行ごとに必ず refresh token からの再取得 (2 回目以降) か device flow (初回) を行う —
 * 「前回の access token をそのまま使い回す」経路は設計上存在しない。
 */
import type { InspectionFile } from '@harness-hub/inspection';
import type { PublishRequestView, PublishTarget, PublishVisibility } from '@harness-hub/schemas';

import { scopesForCommand } from '../auth/index.js';
import { buildPackageArchive, collectPackageFiles, completePackageManifest } from '../core/index.js';
import { registerWranglerDeployment, runWranglerDeploy } from '../deploy/index.js';
import { runLocalPreCheck } from '../inspection-client/index.js';
import type { RunProcess } from '../shared/process.js';
import type { HubApiClient, HubApiClientConfig } from './http-client.js';
import { obtainAccessToken, type SessionDeps } from './session.js';

export interface PublishCommandOptions {
  readonly packageDir: string;
  readonly tenantSlug: string;
  readonly projectId: string;
  readonly target: PublishTarget;
  readonly visibility: PublishVisibility;
  readonly hubBaseUrl: string;
  readonly origin: string;
  /** target='web_app' のときだけ使う wrangler.toml の path。 */
  readonly wranglerConfigPath?: string;
}

export interface PublishCommandDeps extends SessionDeps {
  readonly runProcess: RunProcess;
  readonly createHubApiClient: (config: HubApiClientConfig) => HubApiClient;
}

export type PublishCommandResult =
  | { readonly ok: true; readonly request: PublishRequestView; readonly deployedUrl: string | null }
  | { readonly ok: false; readonly reason: string };

function formatLocalFindings(findings: ReturnType<typeof runLocalPreCheck>['findings']): string {
  return findings.map((finding) => `- [${finding.ruleId}] ${finding.message}`).join('\n');
}

function formatHubFindings(findings: PublishRequestView['findings']): string {
  return findings.map((finding) => `- [${finding.rule_id}] ${finding.message}`).join('\n');
}

export async function runPublishCommand(
  options: PublishCommandOptions,
  deps: PublishCommandDeps,
): Promise<PublishCommandResult> {
  const files: readonly InspectionFile[] = collectPackageFiles(options.packageDir);

  const manifestResult = completePackageManifest(files);
  if (!manifestResult.ok) {
    return {
      ok: false,
      reason: `plugin.json の必須項目が不足しています: ${manifestResult.missingFields.join(', ')}`,
    };
  }

  const preCheck = runLocalPreCheck(files);
  const blockingFindings = preCheck.findings.filter((finding) => finding.severity === 'error');
  if (blockingFindings.length > 0) {
    return {
      ok: false,
      reason: `ローカル pre-check で修正が必要な項目が見つかりました:\n${formatLocalFindings(blockingFindings)}`,
    };
  }

  const scope = scopesForCommand('publish');
  const { accessToken, tenantId, workspaceId } = await obtainAccessToken(deps, options.tenantSlug, scope);
  const client = deps.createHubApiClient({
    baseUrl: options.hubBaseUrl,
    tenantId,
    workspaceId,
    accessToken,
    origin: options.origin,
  });

  const created = await client.postJson<PublishRequestView>('/api/v1/publish', {
    project_id: options.projectId,
    target: options.target,
    visibility: options.visibility,
  });

  await client.putBytes(`/api/v1/publish/${created.id}/package`, buildPackageArchive(files));

  const submitted = await client.postJson<PublishRequestView>(`/api/v1/publish/${created.id}/submit`, {});

  if (submitted.status === 'needs_fix') {
    return {
      ok: false,
      reason: `Hub 検査で修正が必要と判定されました (verdict=${submitted.verdict}):\n${formatHubFindings(submitted.findings)}`,
    };
  }
  if (submitted.status !== 'published') {
    return { ok: false, reason: `想定外の状態で終了しました (status=${submitted.status})` };
  }
  if (submitted.release_id === null) {
    return { ok: false, reason: '内部不整合: published 状態なのに release_id が空です' };
  }

  if (options.target !== 'web_app') {
    return { ok: true, request: submitted, deployedUrl: null };
  }
  if (options.wranglerConfigPath === undefined) {
    return { ok: false, reason: 'target=web_app には wranglerConfigPath が必要です' };
  }

  const deployOutcome = await runWranglerDeploy(deps.runProcess, { configPath: options.wranglerConfigPath });
  if (deployOutcome.url === null) {
    // Hub 側は既に published (Release/Catalog 反映済み)。wrangler の失敗はローカル実行の失敗であって
    // 公開自体の失敗ではないため、ここで ok:false にはしない (deployment 登録を諦めるだけ)。
    deps.log(`wrangler deploy に失敗しました: ${deployOutcome.errorMessage ?? '不明なエラー'}`);
    return { ok: true, request: submitted, deployedUrl: null };
  }

  // exit code が非 0 でも URL が出力されていれば、Hub は orphan_candidate として追跡できる。
  // URL を捨てると実際に作成された deployment が Hub から見えなくなる。
  if (!deployOutcome.ok) {
    deps.log(`wrangler deploy は非 0 で終了しました。deployment を orphan_candidate として登録します: ${deployOutcome.errorMessage ?? '不明なエラー'}`);
  }

  await registerWranglerDeployment(client, {
    projectId: options.projectId,
    channelId: submitted.channel_id,
    releaseId: submitted.release_id,
    url: deployOutcome.url,
    exitCode: deployOutcome.exitCode,
  });

  return { ok: true, request: submitted, deployedUrl: deployOutcome.url };
}
